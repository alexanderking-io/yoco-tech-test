package com.yoco.cashregister.model

import kotlinx.serialization.Serializable

enum class FeeType {
    VAT,
}

@Serializable
enum class RegisterStatus {
    OPEN, CLOSED;

    companion object {
        fun fromParam(value: String): RegisterStatus {
            return try {
                valueOf(value.uppercase())
            } catch (_: IllegalArgumentException) {
                throw com.yoco.cashregister.model.BadRequestException(
                    "INVALID_STATUS",
                    "Invalid status '$value'. Valid values: ${entries.joinToString()}"
                )
            }
        }
    }
}

@Serializable
data class RegisterResponse(
    val id: String,
    val status: RegisterStatus,
    val createdAt: String,
    val closedAt: String? = null,
    val totalInCents: Long,
)

@Serializable
data class ChargeResponse(
    val id: String,
    val registerId: String,
    val amountInCents: Long,
    val vatInCents: Long = 0,
    val createdAt: String,
)

@Serializable
data class ChargesListResponse(
    val charges: List<ChargeResponse>,
    val totalInCents: Long,
    val totalVatInCents: Long = 0,
)

@Serializable
data class CreateChargeRequest(
    val amountInCents: Long,
)

@Serializable
data class ErrorResponse(
    val error: String,
    val message: String,
)
