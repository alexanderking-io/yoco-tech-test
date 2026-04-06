package com.yoco.cashregister.plugins

import com.yoco.cashregister.model.ApiException
import com.yoco.cashregister.model.ErrorResponse
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import org.slf4j.LoggerFactory

private val logger = LoggerFactory.getLogger("StatusPages")

fun Application.configureStatusPages() {
    install(StatusPages) {
        exception<ApiException> { call, cause ->
            logger.warn("API error: [${cause.errorCode}] ${cause.message}")
            call.respond(cause.statusCode, ErrorResponse(cause.errorCode, cause.message))
        }

        exception<kotlinx.serialization.SerializationException> { call, cause ->
            logger.warn("Deserialization error: ${cause.message}")
            call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse("MALFORMED_REQUEST", "Invalid request body: ${cause.message}")
            )
        }

        exception<Throwable> { call, cause ->
            logger.error("Unhandled exception", cause)
            call.respond(
                HttpStatusCode.InternalServerError,
                ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred")
            )
        }
    }
}
