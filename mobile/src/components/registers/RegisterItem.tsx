import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/colors";
import { formatZAR } from "../../utils/currency";
import { formatDate, formatTime } from "../../utils/date";
import { Register } from "../../types";
import { RegisterStatus } from "../shared/RegisterStatus";

interface RegisterItemProps {
  register: Register;
  totalInCents: number;
  onPress: () => void;
  onClose?: () => void;
  onDelete?: () => void;
}

export function RegisterItem({
  register,
  totalInCents,
  onPress,
  onClose,
  onDelete,
}: RegisterItemProps) {
  const isOpen = register.status === "OPEN";

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.info}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <RegisterStatus status={register.status} />
        <Text style={styles.total}>{formatZAR(totalInCents)}</Text>
        <Text style={styles.time}>{formatTime(register.createdAt)}</Text>
        <Text style={styles.date}>{formatDate(register.createdAt)}</Text>
      </TouchableOpacity>
      {isOpen && onClose && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      )}
      {!isOpen && onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    marginBottom: StyleSheet.hairlineWidth,
    overflow: "hidden",
    gap: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 0.75,
    backgroundColor: Colors.buttonBg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
  total: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primaryText,
    fontVariant: ["tabular-nums"],
  },
  time: {
    fontSize: 13,
    color: Colors.primaryText,
  },
  date: {
    fontSize: 13,
    color: Colors.primaryText,
  },
  closeButton: {
    justifyContent: "center",
    alignItems: "center",
    flex: 0.25,
    backgroundColor: Colors.buttonBg,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
    flex: 0.25,
    backgroundColor: Colors.buttonBg,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.error,
  },
});
