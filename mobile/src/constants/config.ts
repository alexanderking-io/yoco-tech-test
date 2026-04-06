import { Platform } from 'react-native';

// PRODUCTION NOTE: In a production app, the API base URL would be configured per
// environment (dev/staging/prod) via environment variables or a build-time config.
// For local development, point this at your Docker host.
export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8080',  // Android emulator special alias → host machine
  ios: 'http://localhost:8080',       // iOS Simulator shares the host network
  default: 'http://localhost:8080',
});

export const MAX_AMOUNT_CENTS = 99_999_999; // R999,999.99
