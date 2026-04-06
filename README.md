# Cash Register

React Native (Expo) + Kotlin (Ktor) + PostgreSQL.

## Structure

```
├── backend/             Kotlin/Ktor REST API
├── mobile/              React Native (Expo) app
├── docker-compose.yml   Postgres + API
├── build-apk.sh         Build APK script
```

## Quick Start

### Backend (Docker)

```bash
docker compose up -d
# API on :8080, Postgres on :5432, migrations run automatically
```

### Backend (local, requires Java 21)

```bash
cd backend && ./gradlew run
```

### Mobile

```bash
cd mobile && npm install && npx expo start
# Press 'i' for iOS Simulator, 'a' for Android Emulator
```

> Android emulator uses `10.0.2.2:8080` to reach the host. iOS uses `localhost:8080`. Edit `mobile/src/constants/config.ts` for physical devices.

## Tests

```bash
cd backend && ./gradlew test    # requires Docker for Testcontainers
cd mobile && npm test
```

## Build APK

```bash
./build-apk.sh
# Output: ./cash-register.apk
```

## API

| Method   | Path                                 | Description                                                |
| -------- | ------------------------------------ | ---------------------------------------------------------- |
| `GET`    | `/health`                            | Health check                                               |
| `POST`   | `/registers`                         | Create register                                            |
| `GET`    | `/registers`                         | List registers (`?status=OPEN`)                            |
| `GET`    | `/registers/{id}`                    | Get register                                               |
| `PATCH`  | `/registers/{id}/close`              | Close register                                             |
| `DELETE` | `/registers/{id}`                    | Soft-delete register                                       |
| `POST`   | `/registers/{id}/charges`            | Add charge (idempotent, requires `Idempotency-Key` header) |
| `GET`    | `/registers/{id}/charges`            | List charges + totals                                      |
| `DELETE` | `/registers/{id}/charges/{chargeId}` | Soft-delete charge                                         |

## Extras I would have liked to do

- Auth
- Pagination on registers/charges
- Processing fees (got to VAT but wanted to do processing fees)
- Multicurrency Support
- Deployment
- General UI/UX
  - Haptic Feedback on max amount entry or entering 0 values
  - Swipe to delete
  - Receipt screen with share/print on closing register
