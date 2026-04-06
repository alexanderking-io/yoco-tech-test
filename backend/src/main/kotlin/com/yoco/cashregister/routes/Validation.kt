package com.yoco.cashregister.routes

import com.yoco.cashregister.model.BadRequestException
import java.util.UUID

/**
 * Parses a path parameter as a UUID, throwing a structured 400 error if malformed.
 */
fun parseUuid(value: String?, name: String): UUID {
    if (value.isNullOrBlank()) {
        throw BadRequestException("MISSING_PARAMETER", "Path parameter '$name' is required")
    }
    return try {
        UUID.fromString(value)
    } catch (_: IllegalArgumentException) {
        throw BadRequestException("INVALID_UUID", "'$name' must be a valid UUID, got: $value")
    }
}

/**
 * Parses the Idempotency-Key header as a UUID.
 */
fun parseIdempotencyKey(headerValue: String?): UUID {
    if (headerValue.isNullOrBlank()) {
        throw BadRequestException(
            "MISSING_IDEMPOTENCY_KEY",
            "Idempotency-Key header is required for this operation"
        )
    }
    return try {
        UUID.fromString(headerValue)
    } catch (_: IllegalArgumentException) {
        throw BadRequestException(
            "INVALID_IDEMPOTENCY_KEY",
            "Idempotency-Key must be a valid UUID, got: $headerValue"
        )
    }
}
