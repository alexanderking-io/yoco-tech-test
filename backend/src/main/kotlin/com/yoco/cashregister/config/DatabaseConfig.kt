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
        val rawUrl = environment.config.property("database.url").getString()

        // Railway injects a connection-string-style DATABASE_URL
        // e.g. postgresql://user:pass@host:5432/db — convert to JDBC components.
        val (url, user, password) = if (rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://")) {
            val uri = java.net.URI(rawUrl)
            val userInfo = uri.userInfo.split(":")
            val query = if (uri.query != null) "?${uri.query}" else ""
            Triple(
                "jdbc:postgresql://${uri.host}:${uri.port}${uri.path}$query",
                userInfo[0],
                userInfo.getOrElse(1) { "" }
            )
        } else {
            Triple(
                rawUrl,
                environment.config.property("database.user").getString(),
                environment.config.property("database.password").getString()
            )
        }

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
