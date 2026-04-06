package com.yoco.cashregister.routes

import io.ktor.http.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import java.sql.Connection
import javax.sql.DataSource

@Serializable
private data class HealthResponse(val status: String)

fun Routing.healthRoutes(dataSource: DataSource) {
    get("/health") {
        val isHealthy = try {
            dataSource.connection.use { conn: Connection ->
                conn.isReadOnly = true
                conn.prepareStatement("SELECT 1").use { it.executeQuery().next() }
            }
        } catch (_: Exception) {
            false
        }

        if (isHealthy) {
            call.respond(HttpStatusCode.OK, HealthResponse(status = "ok"))
        } else {
            call.respond(HttpStatusCode.ServiceUnavailable, HealthResponse(status = "unhealthy"))
        }
    }
}
