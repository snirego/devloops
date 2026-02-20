import React, { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { WorkItemsStackParamList } from "~/navigation/types";
import { useWorkspace } from "~/hooks/useWorkspace";
import { trpc } from "~/lib/trpc";
import WorkItemCard from "~/components/WorkItemCard";

const ALL_STATUSES = [
  "PendingApproval",
  "Approved",
  "InProgress",
  "NeedsReview",
  "OnHold",
  "Rejected",
  "Done",
  "Failed",
  "Canceled",
  "Draft",
] as const;

type Status = (typeof ALL_STATUSES)[number];

type Props = NativeStackScreenProps<WorkItemsStackParamList, "WorkItemsList">;

export default function WorkItemsListScreen({ navigation }: Props) {
  const { workspacePublicId } = useWorkspace();
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>(["PendingApproval", "Approved", "InProgress", "NeedsReview"]);

  const { data, isLoading, refetch, isRefetching } = trpc.workItem.list.useQuery(
    {
      workspacePublicId: workspacePublicId ?? undefined,
      statuses: selectedStatuses.length > 0 ? [...selectedStatuses] : undefined,
      limit: 100,
    },
    { enabled: true },
  );

  const toggleStatus = useCallback((s: Status) => {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }, []);

  const items = data ?? [];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersInner}>
        {ALL_STATUSES.map((s) => {
          const active = selectedStatuses.includes(s);
          return (
            <Pressable
              key={s}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleStatus(s)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {s.replace(/([A-Z])/g, " $1").trim()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(item: { publicId: string }) => item.publicId}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#818cf8" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{isLoading ? "Loading..." : "No work items"}</Text>
          </View>
        }
        renderItem={({ item }: { item: { publicId: string; title: string; status: string; type?: string; priority?: string } }) => (
          <WorkItemCard
            publicId={item.publicId}
            title={item.title}
            status={item.status}
            type={item.type}
            priority={item.priority}
            onPress={() => navigation.navigate("WorkItemDetail", { publicId: item.publicId })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  filters: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: "#334155" },
  filtersInner: { paddingHorizontal: 12, alignItems: "center", gap: 6, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipActive: { backgroundColor: "#312e81", borderColor: "#6366f1" },
  chipText: { fontSize: 11, fontWeight: "600", color: "#94a3b8" },
  chipTextActive: { color: "#c7d2fe" },
  list: { padding: 12 },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 14 },
});
