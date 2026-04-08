package com.yoco.cashregister

import com.yoco.cashregister.db.tables.Charges
import com.yoco.cashregister.db.tables.Fees
import com.yoco.cashregister.db.tables.Registers
import com.yoco.cashregister.model.*
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.Future
import kotlin.test.*

@Testcontainers
class IntegrationTest {

    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer("postgres:16-alpine").apply {
            withDatabaseName("cashregister")
            withUsername("cashregister")
            withPassword("cashregister")
        }
    }

    private fun ApplicationTestBuilder.configuredClient() = createClient {
        install(ContentNegotiation) { json() }
    }

    private fun testApp(block: suspend ApplicationTestBuilder.() -> Unit) = testApplication {
        environment {
            config = io.ktor.server.config.MapApplicationConfig(
                "database.url" to postgres.jdbcUrl,
                "database.user" to postgres.username,
                "database.password" to postgres.password,
            )
        }
        application {
            module()
            transaction {
                Fees.deleteAll()
                Charges.deleteAll()
                Registers.deleteAll()
            }
        }
        block()
    }

    // --- Health ---

    @Test
    fun `health check returns ok`() = testApp {
        val client = configuredClient()
        val response = client.get("/health")
        assertEquals(HttpStatusCode.OK, response.status)
    }

    // --- Registers ---

    @Test
    fun `create register returns 201`() = testApp {
        val client = configuredClient()
        val response = client.post("/registers")
        assertEquals(HttpStatusCode.Created, response.status)
        val register = response.body<RegisterResponse>()
        assertEquals(RegisterStatus.OPEN, register.status)
        assertNotNull(register.id)
    }

    @Test
    fun `list registers returns created registers`() = testApp {
        val client = configuredClient()
        client.post("/registers")
        val response = client.get("/registers")
        assertEquals(HttpStatusCode.OK, response.status)
        val registers = response.body<List<RegisterResponse>>()
        assertTrue(registers.isNotEmpty())
    }

    @Test
    fun `filter registers by status`() = testApp {
        val client = configuredClient()
        val created = client.post("/registers").body<RegisterResponse>()
        client.patch("/registers/${created.id}/close")

        val openRegisters = client.get("/registers?status=OPEN").body<List<RegisterResponse>>()
        assertTrue(openRegisters.none { it.id == created.id })

        val closedRegisters = client.get("/registers?status=CLOSED").body<List<RegisterResponse>>()
        assertTrue(closedRegisters.any { it.id == created.id })
    }

    @Test
    fun `get register by id`() = testApp {
        val client = configuredClient()
        val created = client.post("/registers").body<RegisterResponse>()
        val response = client.get("/registers/${created.id}")
        assertEquals(HttpStatusCode.OK, response.status)
        val register = response.body<RegisterResponse>()
        assertEquals(created.id, register.id)
    }

    @Test
    fun `get nonexistent register returns 404`() = testApp {
        val client = configuredClient()
        val response = client.get("/registers/${UUID.randomUUID()}")
        assertEquals(HttpStatusCode.NotFound, response.status)
    }

    @Test
    fun `close register returns 200`() = testApp {
        val client = configuredClient()
        val created = client.post("/registers").body<RegisterResponse>()
        val response = client.patch("/registers/${created.id}/close")
        assertEquals(HttpStatusCode.OK, response.status)
        val closed = response.body<RegisterResponse>()
        assertEquals(RegisterStatus.CLOSED, closed.status)
        assertNotNull(closed.closedAt)
    }

    @Test
    fun `close already closed register is idempotent`() = testApp {
        val client = configuredClient()
        val created = client.post("/registers").body<RegisterResponse>()
        val first = client.patch("/registers/${created.id}/close")
        val second = client.patch("/registers/${created.id}/close")
        assertEquals(HttpStatusCode.OK, first.status)
        assertEquals(HttpStatusCode.OK, second.status)
        val firstBody = first.body<RegisterResponse>()
        val secondBody = second.body<RegisterResponse>()
        assertEquals(RegisterStatus.CLOSED, secondBody.status)
        assertEquals(firstBody.closedAt, secondBody.closedAt)
    }

    @Test
    fun `filter registers by invalid status returns 400`() = testApp {
        val client = configuredClient()
        val response = client.get("/registers?status=POTATO")
        assertEquals(HttpStatusCode.BadRequest, response.status)
        val error = response.body<ErrorResponse>()
        assertEquals("INVALID_STATUS", error.error)
    }

    @Test
    fun `invalid UUID in path returns 400`() = testApp {
        val client = configuredClient()
        val response = client.get("/registers/not-a-uuid")
        assertEquals(HttpStatusCode.BadRequest, response.status)
        val error = response.body<ErrorResponse>()
        assertEquals("INVALID_UUID", error.error)
    }

    // --- Charges ---

    @Test
    fun `add charge returns 201`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val response = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 1500))
        }

        assertEquals(HttpStatusCode.Created, response.status)
        val charge = response.body<ChargeResponse>()
        assertEquals(1500L, charge.amountInCents)
        assertEquals(register.id, charge.registerId)
    }

    @Test
    fun `idempotent charge returns 200 on replay`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()
        val idempotencyKey = UUID.randomUUID().toString()

        val first = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", idempotencyKey)
            setBody(CreateChargeRequest(amountInCents = 2000))
        }
        assertEquals(HttpStatusCode.Created, first.status)

        val second = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", idempotencyKey)
            setBody(CreateChargeRequest(amountInCents = 2000))
        }
        assertEquals(HttpStatusCode.OK, second.status)

        val firstCharge = first.body<ChargeResponse>()
        val secondCharge = second.body<ChargeResponse>()
        assertEquals(firstCharge.id, secondCharge.id)
    }

    @Test
    fun `idempotency key reuse with different amount returns 422`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()
        val idempotencyKey = UUID.randomUUID().toString()

        client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", idempotencyKey)
            setBody(CreateChargeRequest(amountInCents = 1000))
        }

        val response = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", idempotencyKey)
            setBody(CreateChargeRequest(amountInCents = 2000))
        }

        assertEquals(HttpStatusCode.UnprocessableEntity, response.status)
        val error = response.body<ErrorResponse>()
        assertEquals("IDEMPOTENCY_KEY_REUSE", error.error)
    }

    @Test
    fun `idempotency key reuse with different register returns 422`() = testApp {
        val client = configuredClient()
        val register1 = client.post("/registers").body<RegisterResponse>()
        val register2 = client.post("/registers").body<RegisterResponse>()
        val idempotencyKey = UUID.randomUUID().toString()

        client.post("/registers/${register1.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", idempotencyKey)
            setBody(CreateChargeRequest(amountInCents = 1000))
        }

        val response = client.post("/registers/${register2.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", idempotencyKey)
            setBody(CreateChargeRequest(amountInCents = 1000))
        }

        assertEquals(HttpStatusCode.UnprocessableEntity, response.status)
        val error = response.body<ErrorResponse>()
        assertEquals("IDEMPOTENCY_KEY_REUSE", error.error)
    }

    @Test
    fun `add charge without idempotency key returns 400`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val response = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            setBody(CreateChargeRequest(amountInCents = 1000))
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
        val error = response.body<ErrorResponse>()
        assertEquals("MISSING_IDEMPOTENCY_KEY", error.error)
    }

    @Test
    fun `add zero amount returns 422`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val response = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 0))
        }

        assertEquals(HttpStatusCode.UnprocessableEntity, response.status)
        val error = response.body<ErrorResponse>()
        assertEquals("INVALID_AMOUNT", error.error)
    }

    @Test
    fun `add negative amount returns 422`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val response = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = -100))
        }

        assertEquals(HttpStatusCode.UnprocessableEntity, response.status)
    }

    @Test
    fun `add charge exceeding max returns 422`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val response = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 100_000_000))
        }

        assertEquals(HttpStatusCode.UnprocessableEntity, response.status)
        val error = response.body<ErrorResponse>()
        assertEquals("AMOUNT_TOO_LARGE", error.error)
    }

    @Test
    fun `add charge at max boundary succeeds`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val response = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 99_999_999))
        }

        assertEquals(HttpStatusCode.Created, response.status)
        val charge = response.body<ChargeResponse>()
        assertEquals(99_999_999L, charge.amountInCents)
    }

    @Test
    fun `add charge to closed register returns 422`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()
        client.patch("/registers/${register.id}/close")

        val response = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 1000))
        }

        assertEquals(HttpStatusCode.UnprocessableEntity, response.status)
        val error = response.body<ErrorResponse>()
        assertEquals("REGISTER_CLOSED", error.error)
    }

    @Test
    fun `list charges with total`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 1000))
        }
        client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 2500))
        }

        val response = client.get("/registers/${register.id}/charges")
        assertEquals(HttpStatusCode.OK, response.status)
        val chargesList = response.body<ChargesListResponse>()
        assertEquals(2, chargesList.charges.size)
        assertEquals(3500L, chargesList.totalInCents)
    }

    @Test
    fun `delete charge returns 204`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val charge = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 5000))
        }.body<ChargeResponse>()

        val deleteResponse = client.delete("/registers/${register.id}/charges/${charge.id}")
        assertEquals(HttpStatusCode.NoContent, deleteResponse.status)

        // Verify soft-deleted charge is excluded from list and total
        val chargesList = client.get("/registers/${register.id}/charges").body<ChargesListResponse>()
        assertEquals(0, chargesList.charges.size)
        assertEquals(0L, chargesList.totalInCents)
    }

    @Test
    fun `delete charge from closed register returns 422`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val charge = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 1000))
        }.body<ChargeResponse>()

        client.patch("/registers/${register.id}/close")

        val response = client.delete("/registers/${register.id}/charges/${charge.id}")
        assertEquals(HttpStatusCode.UnprocessableEntity, response.status)
    }

    @Test
    fun `delete nonexistent charge returns 404`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val response = client.delete("/registers/${register.id}/charges/${UUID.randomUUID()}")
        assertEquals(HttpStatusCode.NotFound, response.status)
    }

    @Test
    fun `delete already deleted charge is idempotent`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val charge = client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 1000))
        }.body<ChargeResponse>()

        val first = client.delete("/registers/${register.id}/charges/${charge.id}")
        val second = client.delete("/registers/${register.id}/charges/${charge.id}")
        assertEquals(HttpStatusCode.NoContent, first.status)
        assertEquals(HttpStatusCode.NoContent, second.status)
    }

    // --- Register delete idempotency ---

    @Test
    fun `delete register is idempotent`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()
        client.patch("/registers/${register.id}/close")

        val first = client.delete("/registers/${register.id}")
        val second = client.delete("/registers/${register.id}")
        assertEquals(HttpStatusCode.NoContent, first.status)
        assertEquals(HttpStatusCode.NoContent, second.status)
    }

    @Test
    fun `delete register cascades soft-delete to charges`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 1000))
        }
        client.post("/registers/${register.id}/charges") {
            contentType(ContentType.Application.Json)
            header("Idempotency-Key", UUID.randomUUID().toString())
            setBody(CreateChargeRequest(amountInCents = 2000))
        }

        client.patch("/registers/${register.id}/close")
        client.delete("/registers/${register.id}")

        val response = client.get("/registers/${register.id}/charges")
        assertEquals(HttpStatusCode.NotFound, response.status)
    }

    @Test
    fun `deleted register is excluded from list and get`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()
        client.patch("/registers/${register.id}/close")
        client.delete("/registers/${register.id}")

        val getResponse = client.get("/registers/${register.id}")
        assertEquals(HttpStatusCode.NotFound, getResponse.status)

        val listResponse = client.get("/registers").body<List<RegisterResponse>>()
        assertTrue(listResponse.none { it.id == register.id })
    }

    // --- Concurrency ---

    @Test
    fun `concurrent register close is safe and idempotent`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val latch = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)

        val futures = (1..2).map {
            executor.submit<HttpStatusCode> {
                latch.await()
                kotlinx.coroutines.runBlocking {
                    client.patch("/registers/${register.id}/close").status
                }
            }
        }

        latch.countDown()
        val statuses = futures.map { it.get() }
        executor.shutdown()

        assertTrue(statuses.all { it == HttpStatusCode.OK }, "Both close requests should return 200, got: $statuses")
    }

    @Test
    fun `concurrent charge with close prevents charge on closed register`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()

        val latch = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)

        val closeFuture = executor.submit<HttpStatusCode> {
            latch.await()
            kotlinx.coroutines.runBlocking {
                client.patch("/registers/${register.id}/close").status
            }
        }

        val chargeFuture = executor.submit<Pair<HttpStatusCode, String>> {
            latch.await()
            kotlinx.coroutines.runBlocking {
                val resp = client.post("/registers/${register.id}/charges") {
                    contentType(ContentType.Application.Json)
                    header("Idempotency-Key", UUID.randomUUID().toString())
                    setBody(CreateChargeRequest(amountInCents = 1000))
                }
                Pair(resp.status, resp.bodyAsText())
            }
        }

        latch.countDown()
        val closeStatus = closeFuture.get()
        val (chargeStatus, _) = chargeFuture.get()
        executor.shutdown()

        assertEquals(HttpStatusCode.OK, closeStatus)
        // Charge either succeeded (201) before close, or was rejected (422) after close
        assertTrue(
            chargeStatus == HttpStatusCode.Created || chargeStatus == HttpStatusCode.UnprocessableEntity,
            "Charge should be 201 or 422, got: $chargeStatus"
        )

        // If the charge was created, verify it was created while register was still open
        if (chargeStatus == HttpStatusCode.Created) {
            val charges = client.get("/registers/${register.id}/charges").body<ChargesListResponse>()
            assertEquals(1, charges.charges.size)
        }
    }

    @Test
    fun `concurrent idempotent charges return same charge`() = testApp {
        val client = configuredClient()
        val register = client.post("/registers").body<RegisterResponse>()
        val idempotencyKey = UUID.randomUUID().toString()

        val latch = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)

        val futures = (1..2).map {
            executor.submit<Pair<HttpStatusCode, ChargeResponse>> {
                latch.await()
                kotlinx.coroutines.runBlocking {
                    val resp = client.post("/registers/${register.id}/charges") {
                        contentType(ContentType.Application.Json)
                        header("Idempotency-Key", idempotencyKey)
                        setBody(CreateChargeRequest(amountInCents = 3000))
                    }
                    Pair(resp.status, resp.body<ChargeResponse>())
                }
            }
        }

        latch.countDown()
        val results = futures.map { it.get() }
        executor.shutdown()

        val statuses = results.map { it.first }.toSet()
        val chargeIds = results.map { it.second.id }.toSet()

        // One should be 201, the other 200
        assertEquals(setOf(HttpStatusCode.Created, HttpStatusCode.OK), statuses,
            "Expected one 201 and one 200, got: $statuses")
        // Both should return the same charge
        assertEquals(1, chargeIds.size, "Both responses should return the same charge ID")
    }
}
