package com.yoco.cashregister.routes

import com.yoco.cashregister.model.CreateChargeRequest
import com.yoco.cashregister.service.ChargeService
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Routing.chargeRoutes(chargeService: ChargeService) {

    route("/registers/{registerId}/charges") {

        post {
            val registerId = parseUuid(call.parameters["registerId"], "registerId")
            val idempotencyKey = parseIdempotencyKey(call.request.header("Idempotency-Key"))

            val request = call.receive<CreateChargeRequest>()

            val (charge, isNew) = chargeService.addCharge(registerId, request.amountInCents, idempotencyKey)
            val statusCode = if (isNew) HttpStatusCode.Created else HttpStatusCode.OK
            call.respond(statusCode, charge)
        }

        get {
            val registerId = parseUuid(call.parameters["registerId"], "registerId")
            val chargesList = chargeService.listByRegister(registerId)
            call.respond(HttpStatusCode.OK, chargesList)
        }

        delete("/{chargeId}") {
            val registerId = parseUuid(call.parameters["registerId"], "registerId")
            val chargeId = parseUuid(call.parameters["chargeId"], "chargeId")

            chargeService.delete(registerId, chargeId)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
