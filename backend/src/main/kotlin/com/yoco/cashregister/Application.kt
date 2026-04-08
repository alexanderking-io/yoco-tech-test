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
