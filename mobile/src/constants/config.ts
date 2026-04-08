import { Platform } from 'react-native';
import Constants from 'expo-constants';

const buildTimeUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

// Build-time URL (set via API_BASE_URL env var during expo prebuild) takes
// precedence over the local dev defaults.
export const API_BASE_URL = buildTimeUrl ?? Platform.select({
  android: 'http://10.0.2.2:8080',  // Android emulator special alias → host machine
  ios: 'http://localhost:8080',       // iOS Simulator shares the host network
  default: 'http://localhost:8080',
});

export const MAX_AMOUNT_CENTS = 99_999_999; // R999,999.99
