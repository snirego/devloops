import React from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { BoardsStackParamList } from "~/navigation/types";
import { trpc } from "~/lib/trpc";

type Props = NativeStackScreenProps<BoardsStackParamList, "BoardDetail">;

interface Card {
  publicId: string;
  title: string;
  position: number;
}

interface List {
  publicId: string;
  title: string;
  cards: Card[];
}

export default function BoardDetailScreen({ route }: Props) {
  const { boardPublicId } = route.params;

  const { data, isLoading, refetch, isRefetching } = trpc.board.byId.useQuery(
    { boardPublicId },
  );

  const board = data as { name?: string; lists?: List[] } | undefined;
  const lists = (board?.lists ?? []) as List[];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.columnsContainer}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#818cf8" />}
    >
      {lists.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No lists on this board.</Text>
        </View>
      ) : (
        lists.map((list) => (
          <View key={list.publicId} style={styles.column}>
            <Text style={styles.columnTitle}>{list.title}</Text>
            <FlatList
              data={(list.cards ?? []).sort((a: Card, b: Card) => a.position - b.position)}
              keyExtractor={(card: Card) => card.publicId}
              scrollEnabled={false}
              renderItem={({ item: card }: { item: Card }) => (
                <View style={styles.cardItem}>
                  <Text style={styles.cardTitle} numberOfLines={3}>
                    {card.title}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.noCards}>No cards</Text>
              }
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  columnsContainer: { paddingHorizontal: 8, paddingVertical: 12, gap: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  loadingText: { color: "#64748b", fontSize: 14 },
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", minWidth: 300 },
  emptyText: { color: "#64748b", fontSize: 14 },
  column: {
    width: 260,
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
    alignSelf: "flex-start",
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  cardItem: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTitle: { fontSize: 13, color: "#f8fafc", lineHeight: 19 },
  noCards: { fontSize: 12, color: "#64748b", fontStyle: "italic", paddingVertical: 8 },
});
