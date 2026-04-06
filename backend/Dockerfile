# Multi-stage build for the Cash Register API
#
# Usage: docker compose up (from project root)

# Stage 1: Build
FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

# Copy Gradle wrapper and build config first for dependency layer caching
COPY gradlew .
COPY gradle/ gradle/
COPY build.gradle.kts settings.gradle.kts gradle.properties ./

# Download dependencies (cached unless build files change)
RUN ./gradlew dependencies --no-daemon || true

# Copy source and build
COPY src/ src/
RUN ./gradlew buildFatJar --no-daemon

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=build /app/build/libs/cashregister.jar ./cashregister.jar

# Install curl for Docker health checks
RUN apk add --no-cache curl

USER app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "cashregister.jar"]
