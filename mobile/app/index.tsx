import React, { useState, useCallback, useRef } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../src/constants/colors";
import { Register } from "../src/types";
import { RegisterItem } from "../src/components/registers/RegisterItem";
import { FullScreenState } from "../src/components/shared/FullScreenState";
import * as registersApi from "../src/api/registers";
import { isAbortError } from "../src/utils/abort";

export default function RegistersScreen() {
  const router = useRouter();
  const hasAutoRedirected = useRef(false);

  const [registers, setRegisters] = useState<Register[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionsInFlight, setActionsInFlight] = useState<Set<string>>(new Set());

  const hasLoadedOnce = useRef(false);

  const loadRegisters = useCallback(async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setIsLoading(true);
    setError(null);
    try {
      const allRegisters = await registersApi.listRegisters(undefined, signal);
      if (signal?.aborted) return;
      setRegisters(allRegisters);

      // On first load, auto-redirect to an open register or create one
      if (!hasAutoRedirected.current) {
        const openRegister = allRegisters.find((r) => r.status === "OPEN");
        if (openRegister) {
          hasAutoRedirected.current = true;
          router.push(`/register/${openRegister.id}`);
        } else {
          const newRegister = await registersApi.createRegister();
          hasAutoRedirected.current = true;
          router.push(`/register/${newRegister.id}`);
        }
      }
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : "Failed to load registers");
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        hasLoadedOnce.current = true;
      }
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      loadRegisters(controller.signal);
      return () => controller.abort();
    }, [loadRegisters]),
  );

  const handleCloseRegister = useCallback(async (registerId: string) => {
    setActionsInFlight((prev) => new Set(prev).add(registerId));
    try {
      const closed = await registersApi.closeRegister(registerId);
      setRegisters((prev) =>
        prev.map((r) =>
          r.id === registerId ? closed : r,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to close register ${registerId}`);
    } finally {
      setActionsInFlight((prev) => { const next = new Set(prev); next.delete(registerId); return next; });
    }
  }, []);

  const handleDeleteRegister = useCallback(async (registerId: string) => {
    setActionsInFlight((prev) => new Set(prev).add(registerId));
    try {
      await registersApi.deleteRegister(registerId);
      setRegisters((prev) => prev.filter((r) => r.id !== registerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete register ${registerId}`);
    } finally {
      setActionsInFlight((prev) => { const next = new Set(prev); next.delete(registerId); return next; });
    }
  }, []);

  const handleNewRegister = useCallback(async () => {
    try {
      const register = await registersApi.createRegister();
      router.push(`/register/${register.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create register");
    }
  }, [router]);

  if (isLoading) {
    return <FullScreenState variant="loading" message="Loading..." />;
  }

  if (error) {
    return (
      <FullScreenState
        variant="error"
        message={error}
        onRetry={() => loadRegisters()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Registers</Text>
      </View>

      <FlatList
        data={registers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RegisterItem
            register={item}
            totalInCents={item.totalInCents}
            loading={actionsInFlight.has(item.id)}
            onPress={() =>
              item.status === "OPEN"
                ? router.push(`/register/${item.id}`)
                : router.push(`/closed-register/${item.id}`)
            }
            onClose={
              item.status === "OPEN"
                ? () => handleCloseRegister(item.id)
                : undefined
            }
            onDelete={
              item.status === "CLOSED"
                ? () => handleDeleteRegister(item.id)
                : undefined
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No registers yet</Text>
          </View>
        }
        contentContainerStyle={
          registers.length === 0 ? styles.emptyListContent : undefined
        }
      />

      <TouchableOpacity
        style={styles.newRegisterButton}
        onPress={handleNewRegister}
        activeOpacity={0.7}
      >
        <Text style={styles.newRegisterText}>New Register</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryBg,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.secondaryText,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.secondaryText,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  newRegisterButton: {
    margin: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.buttonBg,
    alignItems: "center",
  },
  newRegisterText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primaryText,
  },
});
