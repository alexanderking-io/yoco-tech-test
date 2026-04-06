package com.yoco.cashregister.db.tables

import com.yoco.cashregister.model.RegisterStatus
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone

object Registers : Table("registers") {
    val id = uuid("id")
    val status = varchar("status", 10).default(RegisterStatus.OPEN.name)
    val createdAt = timestampWithTimeZone("created_at")
    val closedAt = timestampWithTimeZone("closed_at").nullable()
    val deletedAt = timestampWithTimeZone("deleted_at").nullable()

    override val primaryKey = PrimaryKey(id)
}
