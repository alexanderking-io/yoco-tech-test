package com.yoco.cashregister

import com.yoco.cashregister.config.DatabaseConfig
import com.yoco.cashregister.plugins.configureCORS
import com.yoco.cashregister.plugins.configureCallLogging
import com.yoco.cashregister.plugins.configureSerialization
import com.yoco.cashregister.plugins.configureStatusPages
import com.yoco.cashregister.routes.chargeRoutes
import com.yoco.cashregister.routes.healthRoutes
import com.yoco.cashregister.routes.registerRoutes
import com.yoco.cashregister.service.ChargeService
import com.yoco.cashregister.service.RegisterService
import io.ktor.server.application.*
import io.ktor.server.routing.*

// PRODUCTION NOTE: In a production POS system, this service would sit behind an API gateway
// with authentication (e.g., OAuth2/JWT), rate limiting per device, and TLS termination.

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    val dataSource = DatabaseConfig.init(environment)

    val registerService = RegisterService()
    val chargeService = ChargeService(registerService)

    configureSerialization()
    configureStatusPages()
    configureCallLogging()
    configureCORS()

    routing {
        healthRoutes(dataSource)
        registerRoutes(registerService)
        chargeRoutes(chargeService)
    }
}
