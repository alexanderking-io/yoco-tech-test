import * as Crypto from 'expo-crypto';

/**
 * Generates a cryptographically random UUID v4 for use as an idempotency key.
 */
export function generateIdempotencyKey(): string {
  return Crypto.randomUUID();
}
