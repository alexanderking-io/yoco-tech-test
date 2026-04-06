import React, { useRef } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { LocalCharge } from "../../types";
import { ChargeItem } from "./ChargeItem";
import { TotalRow } from "../shared/TotalRow";
import { Colors } from "../../constants/colors";

interface ChargesListProps {
  charges: LocalCharge[];
  totalInCents: number;
  totalVatInCents?: number;
  isLoading: boolean;
  onDelete: (chargeId: string) => void;
  registerClosed?: boolean;
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No charges yet</Text>
      <Text style={styles.emptySubtext}>
        Use the keypad to enter an amount and tap ADD
      </Text>
    </View>
  );
}

export function ChargesList({
  charges,
  totalInCents,
  totalVatInCents,
  isLoading,
  onDelete,
  registerClosed = false,
}: ChargesListProps) {
  const listRef = useRef<FlatList<LocalCharge>>(null);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondaryBg} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={charges}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChargeItem
            charge={item}
            onDelete={onDelete}
            disabled={registerClosed}
          />
        )}
        ListEmptyComponent={EmptyState}
        style={styles.list}
        contentContainerStyle={
          charges.length === 0 ? styles.emptyListContent : styles.listContent
        }
        onContentSizeChange={() => {
          if (charges.length > 0) {
            listRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />
      <TotalRow totalInCents={totalInCents} totalVatInCents={totalVatInCents} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryBg,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.secondaryText,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.secondaryText,
    textAlign: "center",
  },
});
