import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";

type LoadingProps = {
  variant: "loading";
  message?: string;
};

type ErrorProps = {
  variant: "error";
  title?: string;
  message: string;
  onRetry: () => void;
};

type FullScreenStateProps = LoadingProps | ErrorProps;

export function FullScreenState(props: FullScreenStateProps) {
  if (props.variant === "loading") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator size="large" color={Colors.secondaryText} />
        {props.message && (
          <Text style={styles.loadingText}>{props.message}</Text>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {props.title && <Text style={styles.errorTitle}>{props.title}</Text>}
      <Text style={styles.errorMessage}>{props.message}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={props.onRetry}
        activeOpacity={0.7}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondaryBg,
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.secondaryText,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.secondaryText,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.error,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: Colors.buttonBg,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primaryText,
  },
});
