package com.yoco.cashregister.service

import com.yoco.cashregister.db.tables.Charges
import com.yoco.cashregister.db.tables.Fees
import com.yoco.cashregister.db.tables.Registers
import com.yoco.cashregister.model.*
import com.yoco.cashregister.model.RegisterStatus
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.isNull
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

class RegisterService {

    fun create(): RegisterResponse = transaction {
        val now = OffsetDateTime.now()
        val id = UUID.randomUUID()

        Registers.insert {
            it[Registers.id] = id
            it[status] = RegisterStatus.OPEN.name
            it[createdAt] = now
        }

        toResponse(Registers.selectAll().where { Registers.id eq id }.single(), 0L)
    }

    fun getById(id: UUID): RegisterResponse = transaction {
        val row = Registers.selectAll().where { (Registers.id eq id) and (Registers.deletedAt.isNull()) }
            .singleOrNull()
            ?: throw NotFoundException("REGISTER_NOT_FOUND", "Register $id not found")
        toResponse(row, chargeTotalForRegister(id))
    }

    fun list(status: RegisterStatus? = null): List<RegisterResponse> = transaction {
        val baseCondition = Registers.deletedAt.isNull()
        val query = if (status != null) {
            Registers.selectAll().where { baseCondition and (Registers.status eq status.name) }
        } else {
            Registers.selectAll().where { baseCondition }
        }
        val registerRows = query.orderBy(Registers.createdAt, SortOrder.DESC).toList()

        val registerIds = registerRows.map { it[Registers.id] }

        // Batch-fetch charge totals in a single query to avoid N+1
        val totalsByRegister = if (registerIds.isNotEmpty()) {
            Charges.select(Charges.registerId, Charges.amountCents.sum())
                .where { (Charges.registerId inList registerIds) and (Charges.deletedAt.isNull()) }
                .groupBy(Charges.registerId)
                .associate { it[Charges.registerId] to (it[Charges.amountCents.sum()] ?: 0L) }
        } else {
            emptyMap()
        }

        registerRows.map { toResponse(it, totalsByRegister[it[Registers.id]] ?: 0L) }
    }

    fun close(id: UUID): RegisterResponse = transaction {
        val register = Registers.selectAll()
            .where { (Registers.id eq id) and (Registers.deletedAt.isNull()) }
            .forUpdate()
            .singleOrNull()
            ?: throw NotFoundException("REGISTER_NOT_FOUND", "Register $id not found")

        if (register[Registers.status] == RegisterStatus.CLOSED.name) {
            return@transaction toResponse(register, chargeTotalForRegister(id))
        }

        val now = OffsetDateTime.now()
        Registers.update({ Registers.id eq id }) {
            it[status] = RegisterStatus.CLOSED.name
            it[closedAt] = now
        }

        val closed = Registers.selectAll().where { Registers.id eq id }.single()
        toResponse(closed, chargeTotalForRegister(id))
    }

    fun delete(id: UUID): Unit = transaction {
        val register = Registers.selectAll().where { Registers.id eq id }
            .forUpdate()
            .singleOrNull()
            ?: throw NotFoundException("REGISTER_NOT_FOUND", "Register $id not found")

        // Already soft-deleted — idempotent success
        if (register[Registers.deletedAt] != null) {
            return@transaction
        }

        if (register[Registers.status] == RegisterStatus.OPEN.name) {
            throw ValidationException(
                "REGISTER_OPEN",
                "Cannot delete an open register. Close it first."
            )
        }

        val now = OffsetDateTime.now()

        // Cascade soft-delete to fees on charges that aren't already deleted
        val chargeIds = Charges.select(Charges.id)
            .where { (Charges.registerId eq id) and (Charges.deletedAt.isNull()) }
            .map { it[Charges.id] }

        if (chargeIds.isNotEmpty()) {
            Fees.update({ (Fees.chargeId inList chargeIds) and (Fees.deletedAt.isNull()) }) {
                it[deletedAt] = now
            }
        }

        Charges.update({ (Charges.registerId eq id) and (Charges.deletedAt.isNull()) }) {
            it[deletedAt] = now
        }

        Registers.update({ Registers.id eq id }) {
            it[deletedAt] = now
        }
    }

    /**
     * Asserts the register is open, acquiring a row-level lock (FOR UPDATE).
     * Must be called within an existing transaction — does not start its own.
     */
    /** Asserts the register exists and is not soft-deleted. Must be called within a transaction. */
    fun assertExists(registerId: UUID) {
        Registers.selectAll()
            .where { (Registers.id eq registerId) and (Registers.deletedAt.isNull()) }
            .singleOrNull()
            ?: throw NotFoundException("REGISTER_NOT_FOUND", "Register $registerId not found")
    }

    fun assertOpenLocking(registerId: UUID) {
        val register = Registers.selectAll()
            .where { (Registers.id eq registerId) and (Registers.deletedAt.isNull()) }
            .forUpdate()
            .singleOrNull()
            ?: throw NotFoundException("REGISTER_NOT_FOUND", "Register $registerId not found")

        if (register[Registers.status] != RegisterStatus.OPEN.name) {
            throw ValidationException(
                "REGISTER_CLOSED",
                "Cannot modify charges on closed register $registerId"
            )
        }
    }

    /** Sum of non-deleted charge amounts for a single register. Must be called within a transaction. */
    private fun chargeTotalForRegister(registerId: UUID): Long {
        return Charges.select(Charges.amountCents.sum())
            .where { (Charges.registerId eq registerId) and (Charges.deletedAt.isNull()) }
            .singleOrNull()
            ?.let { it[Charges.amountCents.sum()] }
            ?: 0L
    }

    private fun toResponse(row: ResultRow, totalInCents: Long) = RegisterResponse(
        id = row[Registers.id].toString(),
        status = RegisterStatus.valueOf(row[Registers.status]),
        createdAt = row[Registers.createdAt].format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        closedAt = row[Registers.closedAt]?.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        totalInCents = totalInCents,
    )
}
