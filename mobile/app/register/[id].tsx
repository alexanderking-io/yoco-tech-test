import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AmountDisplay } from "../../src/components/register/AmountDisplay";
import { Keypad } from "../../src/components/register/Keypad";
import { ChargesList } from "../../src/components/register/ChargesList";
import { ErrorBanner } from "../../src/components/register/ErrorBanner";
import { FullScreenState } from "../../src/components/shared/FullScreenState";
import { useAmountInput } from "../../src/hooks/useAmountInput";
import { useCharges } from "../../src/hooks/useCharges";
import { Colors } from "../../src/constants/colors";
import { Register } from "../../src/types";
import * as registersApi from "../../src/api/registers";
import { isAbortError } from "../../src/utils/abort";

export default function CashRegisterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [register, setRegister] = useState<Register | null>(null);
  const [registerLoading, setRegisterLoading] = useState(true);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const loadRegister = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) {
        return;
      }

      setRegisterLoading(true);
      setRegisterError(null);
      try {
        const found = await registersApi.getRegister(id, signal);
        if (signal?.aborted) {
          return;
        }
        setRegister(found);
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }

        setRegisterError(
          err instanceof Error ? err.message : `Failed to load register ${id}`,
        );
      } finally {
        if (!signal?.aborted) {
          setRegisterLoading(false);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadRegister(controller.signal);

    return () => controller.abort();
  }, [loadRegister]);

  const {
    charges,
    totalInCents,
    totalVatInCents,
    isLoading: chargesLoading,
    error: chargesError,
    addCharge,
    deleteCharge,
    dismissError,
  } = useCharges(register?.id ?? null, {
    onRegisterClosed: () => loadRegister(),
  });

  const { cents, appendDigit, deleteDigit, reset, isZero } = useAmountInput();

  const handleAdd = async () => {
    if (isZero || !register || isRegisterClosed) return;
    const success = await addCharge(cents);
    if (success) reset();
  };

  const isRegisterClosed = register?.status === "CLOSED";
  const error = registerError || chargesError;

  if (registerLoading) {
    return <FullScreenState variant="loading" message="Loading register..." />;
  }

  if (registerError && !register) {
    return (
      <FullScreenState
        variant="error"
        title="Unable to load register"
        message={registerError}
        onRetry={() => loadRegister()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.registerHeader}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.registerBackLink}>← Registers</Text>
        </TouchableOpacity>

        {error && <ErrorBanner message={error} onDismiss={dismissError} />}

        <AmountDisplay cents={cents} />

        <Keypad
          onDigit={appendDigit}
          onDelete={deleteDigit}
          onAdd={handleAdd}
        />

        <ChargesList
          charges={charges}
          totalInCents={totalInCents}
          totalVatInCents={totalVatInCents}
          isLoading={chargesLoading}
          onDelete={deleteCharge}
          registerClosed={isRegisterClosed}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.secondaryBg,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  registerHeader: {
    backgroundColor: Colors.secondaryBg,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  registerBackLink: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.secondaryText,
  },
});
