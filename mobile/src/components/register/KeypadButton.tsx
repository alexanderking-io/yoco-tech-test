import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colors";

interface KeypadButtonProps {
  label: string;
  onPress: () => void;
}

export function KeypadButton({ label, onPress }: KeypadButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    margin: 0,
    height: 80,
    backgroundColor: Colors.buttonBg,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 22,
    fontWeight: "500",
    color: Colors.primaryText,
  },
});
