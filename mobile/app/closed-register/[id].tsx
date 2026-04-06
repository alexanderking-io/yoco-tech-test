import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/constants/colors";
import { Register, Charge } from "../../src/types";
import { RegisterSummaryCard } from "../../src/components/closed-register/RegisterSummaryCard";
import { RegisterChargeItem } from "../../src/components/closed-register/RegisterChargeItem";
import { FullScreenState } from "../../src/components/shared/FullScreenState";
import * as registersApi from "../../src/api/registers";
import * as chargesApi from "../../src/api/charges";
import { isAbortError } from "../../src/utils/abort";

export default function ClosedRegisterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [register, setRegister] = useState<Register | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [totalInCents, setTotalInCents] = useState(0);
  const [totalVatInCents, setTotalVatInCents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const [register, chargesResponse] = await Promise.all([
          registersApi.getRegister(id, signal),
          chargesApi.getCharges(id, signal),
        ]);

        if (signal?.aborted) {
          return;
        }

        setRegister(register);
        setCharges(chargesResponse.charges);
        setTotalInCents(chargesResponse.totalInCents);
        setTotalVatInCents(chargesResponse.totalVatInCents);
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }

        setError(
          err instanceof Error ? err.message : `Failed to load register ${id}`,
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const handleCloseRegister = async () => {
    if (!register || register.status !== "OPEN") {
      return;
    }

    try {
      const closed = await registersApi.closeRegister(register.id);
      setRegister(closed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to close register ${register.id}`,
      );
    }
  };

  if (isLoading) {
    return <FullScreenState variant="loading" />;
  }

  if (error) {
    return (
      <FullScreenState
        variant="error"
        message={error}
        onRetry={() => loadData()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Text style={styles.backText}>← Registers</Text>
      </TouchableOpacity>

      {register && (
        <RegisterSummaryCard
          register={register}
          totalInCents={totalInCents}
          totalVatInCents={totalVatInCents}
          onClose={register.status === "OPEN" ? handleCloseRegister : undefined}
        />
      )}

      <FlatList
        data={charges}
        keyExtractor={(item) => item.id}
        style={styles.chargesList}
        contentContainerStyle={
          charges.length === 0
            ? styles.emptyListContent
            : styles.chargesContainer
        }
        renderItem={({ item }) => <RegisterChargeItem charge={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No charges in this register</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryBg,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.secondaryText,
  },
  chargesContainer: {
    paddingTop: 24,
    gap: 24,
  },
  chargesList: {
    flex: 1,
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
});
