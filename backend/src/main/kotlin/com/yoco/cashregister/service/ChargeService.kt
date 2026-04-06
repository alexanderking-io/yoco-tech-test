package com.yoco.cashregister.service

import com.yoco.cashregister.db.tables.Charges
import com.yoco.cashregister.db.tables.Fees
import com.yoco.cashregister.model.*
import org.jetbrains.exposed.exceptions.ExposedSQLException
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.isNull
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

// PRODUCTION NOTE: Idempotency keys should have a TTL (e.g., 24 hours) to prevent unbounded
// index growth. A background job would periodically clean up expired keys. For this demo,
// keys are retained indefinitely as the data volume is small.

class ChargeService(private val registerService: RegisterService) {

    companion object {
        const val MAX_AMOUNT_CENTS = 99_999_999 // R999,999.99
    }

    /**
     * Adds a charge to a register. If the idempotency key already exists, returns the
     * existing charge (standard idempotent behavior for safe retries on flaky networks).
     *
     * @return Pair<ChargeResponse, Boolean> where Boolean is true if newly created (201),
     *         false if replayed from existing (200).
     */
    fun addCharge(registerId: UUID, amountCents: Long, idempotencyKey: UUID): Pair<ChargeResponse, Boolean> {
        try {
            return transaction {
                // Check for existing charge with this idempotency key
                val existing = Charges.selectAll()
                    .where { Charges.idempotencyKey eq idempotencyKey }
                    .singleOrNull()

                if (existing != null) {
                    if (existing[Charges.registerId] != registerId || existing[Charges.amountCents] != amountCents) {
                        throw ValidationException(
                            "IDEMPOTENCY_KEY_REUSE",
                            "Idempotency key $idempotencyKey was already used with different parameters"
                        )
                    }
                    return@transaction Pair(toResponse(existing), false)
                }

                validateAmount(amountCents)

                // Lock the register row to prevent concurrent close
                registerService.assertOpenLocking(registerId)

                val now = OffsetDateTime.now()
                val id = UUID.randomUUID()

                Charges.insert {
                    it[Charges.id] = id
                    it[Charges.registerId] = registerId
                    it[Charges.amountCents] = amountCents
                    it[Charges.idempotencyKey] = idempotencyKey
                    it[createdAt] = now
                }

                // Create VAT fee row in the same transaction
                val vatAmount = VatService.calculateVat(amountCents)
                Fees.insert {
                    it[Fees.id] = UUID.randomUUID()
                    it[Fees.chargeId] = id
                    it[feeType] = FeeType.VAT.name
                    it[rateBasisPoints] = VatService.VAT_RATE_BASIS_POINTS
                    it[Fees.amountCents] = vatAmount
                    it[createdAt] = now
                }

                val charge = Charges.selectAll().where { Charges.id eq id }.single()
                Pair(toResponse(charge), true)
            }
        } catch (e: ExposedSQLException) {
            // 23505 = unique_violation — concurrent insert with same idempotency key won the race
            if (e.sqlState == "23505") {
                // Mirror the payload validation from the normal idempotency path (lines 41-46).
                // This race is near-impossible to trigger in a sequential test — the existing
                // concurrency test exercises this catch block; the check itself is identical
                // to the non-race path and is verified by inspection.
                return transaction {
                    val existing = Charges.selectAll()
                        .where { Charges.idempotencyKey eq idempotencyKey }
                        .single()
                    if (existing[Charges.registerId] != registerId || existing[Charges.amountCents] != amountCents) {
                        throw ValidationException(
                            "IDEMPOTENCY_KEY_REUSE",
                            "Idempotency key $idempotencyKey was already used with different parameters"
                        )
                    }
                    Pair(toResponse(existing), false)
                }
            }
            throw e
        }
    }

    fun listByRegister(registerId: UUID): ChargesListResponse = transaction {
        registerService.assertExists(registerId)

        val chargeRows = Charges.selectAll()
            .where { (Charges.registerId eq registerId) and (Charges.deletedAt.isNull()) }
            .orderBy(Charges.createdAt, SortOrder.ASC)
            .toList()

        val chargeIds = chargeRows.map { it[Charges.id] }

        // Batch-fetch all VAT fees in a single query to avoid N+1
        val vatByChargeId = if (chargeIds.isNotEmpty()) {
            Fees.selectAll()
                .where { (Fees.chargeId inList chargeIds) and (Fees.feeType eq FeeType.VAT.name) and (Fees.deletedAt.isNull()) }
                .associate { it[Fees.chargeId] to it[Fees.amountCents] }
        } else {
            emptyMap()
        }

        val total = chargeRows.sumOf { it[Charges.amountCents] }
        val totalVat = vatByChargeId.values.sum()
        val charges = chargeRows.map { toResponse(it, vatByChargeId[it[Charges.id]]) }

        ChargesListResponse(charges = charges, totalInCents = total, totalVatInCents = totalVat)
    }

    fun delete(registerId: UUID, chargeId: UUID): Unit = transaction {
        val charge = Charges.selectAll()
            .where { (Charges.id eq chargeId) and (Charges.registerId eq registerId) }
            .singleOrNull()
            ?: throw NotFoundException("CHARGE_NOT_FOUND", "Charge $chargeId not found in register $registerId")

        // Already soft-deleted — idempotent success
        if (charge[Charges.deletedAt] != null) {
            return@transaction
        }

        // Lock the register row to prevent concurrent close
        registerService.assertOpenLocking(registerId)

        val now = OffsetDateTime.now()

        Fees.update({ (Fees.chargeId eq chargeId) and (Fees.deletedAt.isNull()) }) {
            it[deletedAt] = now
        }

        Charges.update({ Charges.id eq chargeId }) {
            it[deletedAt] = now
        }
    }

    private fun validateAmount(amountCents: Long) {
        if (amountCents <= 0) {
            throw ValidationException("INVALID_AMOUNT", "Amount must be greater than zero")
        }
        if (amountCents > MAX_AMOUNT_CENTS) {
            throw ValidationException(
                "AMOUNT_TOO_LARGE",
                "Amount must be less than R1,000,000 (max $MAX_AMOUNT_CENTS cents)"
            )
        }
    }

    /** Single-charge path — queries the fee individually. */
    private fun toResponse(row: ResultRow): ChargeResponse {
        val chargeId = row[Charges.id]
        val vatFee = Fees.selectAll()
            .where { (Fees.chargeId eq chargeId) and (Fees.feeType eq FeeType.VAT.name) and (Fees.deletedAt.isNull()) }
            .singleOrNull()
        return toResponse(row, vatFee?.get(Fees.amountCents))
    }

    /** Shared builder — accepts a pre-fetched VAT amount (from batch or single query). */
    private fun toResponse(row: ResultRow, vatAmountCents: Long?): ChargeResponse {
        return ChargeResponse(
            id = row[Charges.id].toString(),
            registerId = row[Charges.registerId].toString(),
            amountInCents = row[Charges.amountCents],
            vatInCents = vatAmountCents ?: 0,
            createdAt = row[Charges.createdAt].format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        )
    }
}
