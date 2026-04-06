import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/colors';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
        <Text style={styles.dismissText}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: Colors.white,
  },
  dismiss: {
    marginLeft: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
});
