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

import type { ChatsStackParamList } from "~/navigation/types";
import { useWorkspace } from "~/hooks/useWorkspace";
import { trpc } from "~/lib/trpc";
import StatusBadge from "~/components/StatusBadge";

type Props = NativeStackScreenProps<ChatsStackParamList, "ThreadList">;

export default function ThreadListScreen({ navigation }: Props) {
  const { workspacePublicId } = useWorkspace();

  const { data, isLoading, refetch, isRefetching } = trpc.chat.listThreads.useQuery(
    { workspacePublicId: workspacePublicId ?? "", limit: 50 },
    { enabled: !!workspacePublicId },
  );

  const threads = data ?? [];

  return (
    <View style={styles.container}>
      {!workspacePublicId ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Select a workspace in Settings to see chats.</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item: { publicId: string }) => item.publicId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#818cf8" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{isLoading ? "Loading..." : "No threads"}</Text>
            </View>
          }
          renderItem={({ item }: { item: { publicId: string; title: string | null; status: string; primarySource?: string; lastActivityAt?: string | null; createdAt: string } }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate("ThreadDetail", {
                  threadPublicId: item.publicId,
                  title: item.title ?? undefined,
                })
              }
            >
              <View style={styles.topRow}>
                <StatusBadge status={item.status} small />
                {item.primarySource && (
                  <Text style={styles.source}>{item.primarySource}</Text>
                )}
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {item.title || "Untitled thread"}
              </Text>
              <Text style={styles.time}>
                {new Date(item.lastActivityAt ?? item.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
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
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  source: { fontSize: 10, color: "#64748b", fontWeight: "600" },
  title: { fontSize: 15, fontWeight: "600", color: "#f8fafc", marginBottom: 6, lineHeight: 21 },
  time: { fontSize: 11, color: "#64748b" },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});
