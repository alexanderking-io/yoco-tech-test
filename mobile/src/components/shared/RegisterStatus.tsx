import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/colors";

interface RegisterStatusProps {
  status: "OPEN" | "CLOSED";
  label?: string;
}

export function RegisterStatus({ status, label }: RegisterStatusProps) {
  const isOpen = status === "OPEN";

  return (
    <View style={styles.container}>
      <View style={[styles.dot, isOpen ? styles.openDot : styles.closedDot]} />
      <Text style={styles.text}>{label ?? (isOpen ? "Open" : "Closed")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  openDot: {
    backgroundColor: Colors.statusOpen,
  },
  closedDot: {
    backgroundColor: Colors.disabled,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primaryText,
  },
});
