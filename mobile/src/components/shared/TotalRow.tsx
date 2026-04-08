import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/colors";
import { Opacity } from "../../constants/opacity";
import { formatZAR } from "../../utils/currency";

interface TotalRowProps {
  totalInCents: number;
  totalVatInCents?: number;
  hasPending?: boolean;
  variant?: "dark" | "light";
}

export function TotalRow({
  totalInCents,
  totalVatInCents,
  hasPending = false,
  variant = "dark",
}: TotalRowProps) {
  console.log("TotalRow render:", { totalInCents, totalVatInCents, variant });
  const isLight = variant === "light";
  const containerStyle = isLight ? styles.containerLight : styles.containerDark;
  const labelStyle = isLight ? styles.labelLight : styles.labelDark;
  const amountStyle = isLight ? styles.amountLight : styles.amountDark;
  const vatStyle = isLight ? styles.vatLight : styles.vatDark;

  return (
    <View style={containerStyle}>
      {totalVatInCents !== undefined && totalVatInCents > 0 && (
        <View style={styles.row}>
          <Text style={vatStyle}>VAT (excl.)</Text>
          {hasPending ? (
            <ActivityIndicator
              size={12}
              color={isLight ? Colors.disabled : Colors.secondaryText}
            />
          ) : (
            <Text style={[vatStyle, styles.tabularNums]}>
              {formatZAR(totalVatInCents)}
            </Text>
          )}
        </View>
      )}
      <View style={styles.row}>
        <Text style={labelStyle}>Total</Text>
        <Text style={[amountStyle, styles.tabularNums]}>
          {formatZAR(totalInCents)}
        </Text>
      </View>
    </View>
  );
}

const baseContainer = {
  paddingTop: 12,
  borderTopWidth: 1,
  gap: 4,
} as const;

const styles = StyleSheet.create({
  containerDark: {
    ...baseContainer,
    paddingBottom: 36,
    paddingHorizontal: 24,
    borderTopColor: Colors.secondaryText,
  },
  containerLight: {
    ...baseContainer,
    paddingTop: 16,
    borderTopColor: Colors.disabled,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabularNums: {
    fontVariant: ["tabular-nums"],
  },
  labelDark: {
    fontSize: 18,
    color: Colors.secondaryText,
  },
  labelLight: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  amountDark: {
    fontSize: 20,
    color: Colors.secondaryText,
  },
  amountLight: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primaryText,
  },
  vatDark: {
    fontSize: 14,
    color: Colors.secondaryText,
    opacity: Opacity.secondary,
  },
  vatLight: {
    fontSize: 14,
    color: Colors.primaryText,
  },
});
