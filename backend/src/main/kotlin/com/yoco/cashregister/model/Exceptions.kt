package com.yoco.cashregister.model

import io.ktor.http.*

sealed class ApiException(
    val statusCode: HttpStatusCode,
    val errorCode: String,
    override val message: String,
) : RuntimeException(message)

class NotFoundException(
    errorCode: String,
    message: String,
) : ApiException(HttpStatusCode.NotFound, errorCode, message)

class ValidationException(
    errorCode: String,
    message: String,
) : ApiException(HttpStatusCode.UnprocessableEntity, errorCode, message)

class BadRequestException(
    errorCode: String,
    message: String,
) : ApiException(HttpStatusCode.BadRequest, errorCode, message)
