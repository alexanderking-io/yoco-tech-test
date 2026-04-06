package com.yoco.cashregister.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.*

fun Application.configureCORS() {
    install(CORS) {
        anyHost()
        allowHeader(HttpHeaders.ContentType)
        allowHeader("Idempotency-Key")
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Patch)
        allowMethod(HttpMethod.Delete)
        // PRODUCTION NOTE: In production, CORS should be restricted to specific origins
        // (e.g., the mobile app's API domain) rather than allowing any host.
    }
}
