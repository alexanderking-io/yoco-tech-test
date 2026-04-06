import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/colors";
import { formatZAR } from "../../utils/currency";
import { formatTime } from "../../utils/date";
import { Charge } from "../../types";

interface RegisterChargeItemProps {
  charge: Charge;
}

export function RegisterChargeItem({ charge }: RegisterChargeItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.time}>{formatTime(charge.createdAt)}</Text>
        <View style={styles.amounts}>
          <Text style={styles.amount}>{formatZAR(charge.amountInCents)}</Text>
          <Text style={styles.vat}>VAT {formatZAR(charge.vatInCents)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.secondaryBg,
    borderWidth: 1,
    borderColor: Colors.secondaryText,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  time: {
    fontSize: 13,
    color: Colors.secondaryText,
    fontVariant: ["tabular-nums"],
  },
  amounts: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 18,
    fontWeight: "400",
    color: Colors.secondaryText,
    fontVariant: ["tabular-nums"],
  },
  vat: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontVariant: ["tabular-nums"],
  },
});
