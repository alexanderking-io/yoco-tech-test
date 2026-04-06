package com.yoco.cashregister.config

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.server.application.*
import org.flywaydb.core.Flyway
import org.jetbrains.exposed.sql.Database
import org.slf4j.LoggerFactory
import javax.sql.DataSource

object DatabaseConfig {
    private val logger = LoggerFactory.getLogger(DatabaseConfig::class.java)

    private var currentDataSource: HikariDataSource? = null

    fun init(environment: ApplicationEnvironment): DataSource {
        val url = environment.config.property("database.url").getString()
        val user = environment.config.property("database.user").getString()
        val password = environment.config.property("database.password").getString()

        // Reuse existing pool if connecting to the same URL (important for test reuse)
        val existing = currentDataSource
        if (existing != null && !existing.isClosed && existing.jdbcUrl == url) {
            runMigrations(existing)
            return existing
        }

        existing?.close()
        val dataSource = createDataSource(url, user, password)
        currentDataSource = dataSource
        runMigrations(dataSource)
        Database.connect(dataSource)

        logger.info("Database initialized successfully")
        return dataSource
    }

    private fun createDataSource(url: String, user: String, password: String): HikariDataSource {
        val config = HikariConfig().apply {
            jdbcUrl = url
            username = user
            this.password = password
            maximumPoolSize = 10
            isAutoCommit = false
            // PRODUCTION NOTE: In production, connection pool sizing should be tuned based on
            // expected concurrent transaction volume and database server capacity.
            validate()
        }
        return HikariDataSource(config)
    }

    private fun runMigrations(dataSource: DataSource) {
        val flyway = Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .load()

        val result = flyway.migrate()
        logger.info("Flyway executed ${result.migrationsExecuted} migration(s), " +
            "schema version: ${result.targetSchemaVersion}")
    }
}
