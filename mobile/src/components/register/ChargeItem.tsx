import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/colors";
import { Opacity } from "../../constants/opacity";
import { formatZAR } from "../../utils/currency";
import { LocalCharge } from "../../types";

interface ChargeItemProps {
  charge: LocalCharge;
  onDelete: (chargeId: string) => void;
  disabled?: boolean;
}

export function ChargeItem({
  charge,
  onDelete,
  disabled = false,
}: ChargeItemProps) {
  return (
    <View style={[styles.container, charge.isPending && styles.pending]}>
      <Text style={styles.amount}>{formatZAR(charge.amountInCents)}</Text>
      <TouchableOpacity
        style={[styles.deleteButton, disabled && styles.disabledButton]}
        onPress={() => onDelete(charge.id)}
        disabled={disabled || charge.isPending}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Delete charge ${formatZAR(charge.amountInCents)}`}
      >
        <Text style={styles.deleteText}>DEL</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  pending: {
    opacity: Opacity.disabled,
  },
  amount: {
    fontSize: 18,
    fontWeight: "400",
    color: Colors.secondaryText,
    fontVariant: ["tabular-nums"],
    marginRight: 16,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: Colors.secondaryBg,
    borderWidth: 1,
    borderColor: Colors.secondaryText,
  },
  disabledButton: {
    opacity: Opacity.disabled,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.secondaryText,
  },
});
