package com.yoco.cashregister.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone

// PRODUCTION NOTE: In a production system, this table would include a column-level encryption
// strategy (e.g., pgcrypto) for PCI-DSS compliance on financial data. An immutable audit_log
// table would also track all mutations for reconciliation and regulatory reporting.

object Charges : Table("charges") {
    val id = uuid("id")
    val registerId = uuid("register_id").references(Registers.id)
    val amountCents = long("amount_cents")
    val idempotencyKey = uuid("idempotency_key").uniqueIndex()
    val createdAt = timestampWithTimeZone("created_at")
    val deletedAt = timestampWithTimeZone("deleted_at").nullable()

    override val primaryKey = PrimaryKey(id)
}
