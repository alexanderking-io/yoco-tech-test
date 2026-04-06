import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/colors";
import { formatDate, formatTime } from "../../utils/date";
import { Register } from "../../types";
import { RegisterStatus } from "../shared/RegisterStatus";
import { TotalRow } from "../shared/TotalRow";

interface RegisterSummaryCardProps {
  register: Register;
  totalInCents: number;
  totalVatInCents: number;
  onClose?: () => void;
}

export function RegisterSummaryCard({
  register,
  totalInCents,
  totalVatInCents,
  onClose,
}: RegisterSummaryCardProps) {
  const isOpen = register.status === "OPEN";

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <RegisterStatus status={register.status} />
        <View>
          <Text style={styles.dateText}>{formatDate(register.createdAt)}</Text>
          <Text style={styles.dateText}>{formatTime(register.createdAt)}</Text>
        </View>
      </View>

      <TotalRow
        totalInCents={totalInCents}
        totalVatInCents={totalVatInCents}
        variant="light"
      />

      {isOpen && onClose && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.closeButtonText}>Close Register</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.buttonBg,
    padding: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    color: Colors.disabled,
    textAlign: "right",
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.secondaryBg,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.secondaryText,
  },
});
