package com.yoco.cashregister.db.tables

import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone

object Fees : Table("fees") {
    val id = uuid("id")
    val chargeId = uuid("charge_id").references(Charges.id, onDelete = ReferenceOption.CASCADE)
    val feeType = varchar("fee_type", 50)
    val rateBasisPoints = integer("rate_basis_points")
    val amountCents = long("amount_cents")
    val createdAt = timestampWithTimeZone("created_at")
    val deletedAt = timestampWithTimeZone("deleted_at").nullable()

    override val primaryKey = PrimaryKey(id)
}
