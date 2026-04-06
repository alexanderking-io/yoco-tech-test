package com.yoco.cashregister.routes

import com.yoco.cashregister.model.RegisterStatus
import com.yoco.cashregister.service.RegisterService
import io.ktor.http.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Routing.registerRoutes(registerService: RegisterService) {

    route("/registers") {

        post {
            val register = registerService.create()
            call.respond(HttpStatusCode.Created, register)
        }

        get {
            val statusParam = call.request.queryParameters["status"]
            val status = statusParam?.let { RegisterStatus.fromParam(it) }
            val registers = registerService.list(status)
            call.respond(HttpStatusCode.OK, registers)
        }

        get("/{id}") {
            val id = parseUuid(call.parameters["id"], "id")
            val register = registerService.getById(id)
            call.respond(HttpStatusCode.OK, register)
        }

        patch("/{id}/close") {
            val id = parseUuid(call.parameters["id"], "id")
            val register = registerService.close(id)
            call.respond(HttpStatusCode.OK, register)
        }

        delete("/{id}") {
            val id = parseUuid(call.parameters["id"], "id")
            registerService.delete(id)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
