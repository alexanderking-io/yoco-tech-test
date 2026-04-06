import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/colors";
import { formatZAR } from "../../utils/currency";

interface AmountDisplayProps {
  cents: number;
}

export function AmountDisplay({ cents }: AmountDisplayProps) {
  return (
    <LinearGradient
      colors={[Colors.amountBgStart, Colors.amountBgEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <Text
        style={styles.amount}
        accessibilityLabel={`Current amount: ${formatZAR(cents)}`}
      >
        {formatZAR(cents)}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 42,
    fontWeight: "300",
    color: Colors.primaryText,
    fontVariant: ["tabular-nums"],
  },
});
