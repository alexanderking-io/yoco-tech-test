import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="register/[id]" />
          <Stack.Screen name="closed-register/[id]" />
        </Stack>
      </ErrorBoundary>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
