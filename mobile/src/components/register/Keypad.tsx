import React from "react";
import { StyleSheet, View } from "react-native";
import { KeypadButton } from "./KeypadButton";
import { Colors } from "../../constants/colors";

interface KeypadProps {
  onDigit: (digit: number) => void;
  onDelete: () => void;
  onAdd: () => void;
}

export function Keypad({ onDigit, onDelete, onAdd }: KeypadProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <KeypadButton label="1" onPress={() => onDigit(1)} />
        <KeypadButton label="2" onPress={() => onDigit(2)} />
        <KeypadButton label="3" onPress={() => onDigit(3)} />
      </View>
      <View style={styles.row}>
        <KeypadButton label="4" onPress={() => onDigit(4)} />
        <KeypadButton label="5" onPress={() => onDigit(5)} />
        <KeypadButton label="6" onPress={() => onDigit(6)} />
      </View>
      <View style={styles.row}>
        <KeypadButton label="7" onPress={() => onDigit(7)} />
        <KeypadButton label="8" onPress={() => onDigit(8)} />
        <KeypadButton label="9" onPress={() => onDigit(9)} />
      </View>
      <View style={styles.row}>
        <KeypadButton label="DEL" onPress={onDelete} />
        <KeypadButton label="0" onPress={() => onDigit(0)} />
        <KeypadButton label="ADD" onPress={onAdd} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 1,
    gap: 1,
    backgroundColor: Colors.secondaryBg,
  },
  row: {
    flexDirection: "row",
    gap: 1,
  },
});
