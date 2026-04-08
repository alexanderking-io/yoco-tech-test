package com.yoco.cashregister.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone

object Charges : Table("charges") {
    val id = uuid("id")
    val registerId = uuid("register_id").references(Registers.id)
    val amountCents = long("amount_cents")
    val idempotencyKey = uuid("idempotency_key").uniqueIndex()
    val createdAt = timestampWithTimeZone("created_at")
    val deletedAt = timestampWithTimeZone("deleted_at").nullable()

    override val primaryKey = PrimaryKey(id)
}
