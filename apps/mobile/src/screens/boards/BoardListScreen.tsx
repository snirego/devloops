import React from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { BoardsStackParamList } from "~/navigation/types";
import { useWorkspace } from "~/hooks/useWorkspace";
import { trpc } from "~/lib/trpc";

type Props = NativeStackScreenProps<BoardsStackParamList, "BoardList">;

export default function BoardListScreen({ navigation }: Props) {
  const { workspacePublicId } = useWorkspace();

  const { data, isLoading, refetch, isRefetching } = trpc.board.all.useQuery(
    { workspacePublicId: workspacePublicId ?? "" },
    { enabled: !!workspacePublicId },
  );

  const boards = data ?? [];

  return (
    <View style={styles.container}>
      {!workspacePublicId ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Select a workspace in Settings to see boards.</Text>
        </View>
      ) : (
        <FlatList
          data={boards}
          keyExtractor={(item: { publicId: string }) => item.publicId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#818cf8" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{isLoading ? "Loading..." : "No boards"}</Text>
            </View>
          }
          renderItem={({ item }: { item: { publicId: string; name: string; description: string | null; colour: string | null } }) => (
            <Pressable
              style={[styles.card, { borderLeftColor: item.colour ?? "#6366f1" }]}
              onPress={() =>
                navigation.navigate("BoardDetail", {
                  boardPublicId: item.publicId,
                  title: item.name,
                })
              }
            >
              <Text style={styles.boardName}>{item.name}</Text>
              {item.description && (
                <Text style={styles.boardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  list: { padding: 12 },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  boardName: { fontSize: 16, fontWeight: "700", color: "#f8fafc", marginBottom: 4 },
  boardDesc: { fontSize: 13, color: "#94a3b8", lineHeight: 19 },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});
