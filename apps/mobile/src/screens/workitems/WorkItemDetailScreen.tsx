import React, { useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { WorkItemsStackParamList } from "~/navigation/types";
import { trpc } from "~/lib/trpc";
import StatusBadge from "~/components/StatusBadge";
import ActionButton from "~/components/ActionButton";

type Props = NativeStackScreenProps<WorkItemsStackParamList, "WorkItemDetail">;

const VALID_TRANSITIONS: Record<string, string[]> = {
  Draft: ["PendingApproval", "Canceled"],
  PendingApproval: ["Approved", "Rejected", "OnHold", "Canceled"],
  Approved: ["InProgress", "OnHold", "Canceled"],
  Rejected: ["PendingApproval", "Canceled"],
  OnHold: ["PendingApproval", "Approved", "Canceled"],
  InProgress: ["NeedsReview", "Done", "Failed", "OnHold", "Canceled"],
  NeedsReview: ["InProgress", "Done", "Failed", "Canceled"],
  Done: [],
  Failed: ["InProgress", "PendingApproval", "Canceled"],
  Canceled: [],
};

const ACTION_COLORS: Record<string, string> = {
  Approved: "#10b981",
  Rejected: "#ef4444",
  OnHold: "#6366f1",
  PendingApproval: "#f59e0b",
  InProgress: "#3b82f6",
  NeedsReview: "#a855f7",
  Done: "#22c55e",
  Failed: "#dc2626",
  Canceled: "#64748b",
};

export default function WorkItemDetailScreen({ route, navigation }: Props) {
  const { publicId } = route.params;
  const utils = trpc.useUtils();
  const [reasonText, setReasonText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const { data: item, isLoading, refetch, isRefetching } = trpc.workItem.byPublicId.useQuery(
    { publicId },
  );

  const approve = trpc.workItem.approve.useMutation({ onSuccess: invalidate });
  const reject = trpc.workItem.reject.useMutation({ onSuccess: invalidate });
  const hold = trpc.workItem.hold.useMutation({ onSuccess: invalidate });
  const start = trpc.workItem.start.useMutation({ onSuccess: invalidate });
  const markDone = trpc.workItem.markDone.useMutation({ onSuccess: invalidate });
  const markFailed = trpc.workItem.markFailed.useMutation({ onSuccess: invalidate });
  const markNeedsReview = trpc.workItem.markNeedsReview.useMutation({ onSuccess: invalidate });
  const cancel = trpc.workItem.cancel.useMutation({ onSuccess: invalidate });
  const updateFields = trpc.workItem.updateFields.useMutation({ onSuccess: invalidate });

  function invalidate() {
    utils.workItem.byPublicId.invalidate({ publicId });
    utils.workItem.list.invalidate();
  }

  const performAction = (targetStatus: string) => {
    const needsReason = ["Rejected", "OnHold", "Failed"].includes(targetStatus);
    if (needsReason && !reasonText.trim()) {
      Alert.alert("Reason required", "Please enter a reason before proceeding.");
      return;
    }

    const map: Record<string, () => void> = {
      Approved: () => approve.mutate({ publicId }),
      Rejected: () => reject.mutate({ publicId, reason: reasonText.trim() }),
      OnHold: () => hold.mutate({ publicId, reason: reasonText.trim() }),
      InProgress: () => start.mutate({ publicId }),
      NeedsReview: () => markNeedsReview.mutate({ publicId }),
      Done: () => markDone.mutate({ publicId }),
      Failed: () => markFailed.mutate({ publicId, reason: reasonText.trim() }),
      Canceled: () => cancel.mutate({ publicId }),
      PendingApproval: () => approve.mutate({ publicId }),
    };

    map[targetStatus]?.();
    setReasonText("");
  };

  const saveEdit = () => {
    const fields: { publicId: string; title?: string; structuredDescription?: string | null } = { publicId };
    if (editTitle.trim()) fields.title = editTitle.trim();
    if (editDesc.trim()) fields.structuredDescription = editDesc.trim();
    updateFields.mutate(fields);
    setEditMode(false);
  };

  if (isLoading || !item) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const possibleTransitions = VALID_TRANSITIONS[item.status] ?? [];
  const needsReasonStatuses = ["Rejected", "OnHold", "Failed"];
  const showReasonInput = possibleTransitions.some((s) => needsReasonStatuses.includes(s));
  const acceptanceCriteria = (item.acceptanceCriteriaJson as string[] | null) ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#818cf8" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <StatusBadge status={item.status} />
        {item.priority && (
          <Text style={[styles.priority, { color: ACTION_COLORS[item.status] ?? "#94a3b8" }]}>
            {item.priority}
          </Text>
        )}
      </View>

      {/* Title */}
      {editMode ? (
        <TextInput
          style={styles.editInput}
          value={editTitle}
          onChangeText={setEditTitle}
          placeholder="Title"
          placeholderTextColor="#64748b"
        />
      ) : (
        <Text style={styles.title}>{item.title}</Text>
      )}

      {/* Meta */}
      <View style={styles.metaRow}>
        {item.type && <Text style={styles.metaChip}>{item.type}</Text>}
        {item.riskLevel && <Text style={styles.metaChip}>Risk: {item.riskLevel}</Text>}
        <Text style={styles.metaId}>{item.publicId.slice(0, 12)}</Text>
      </View>

      {/* Description */}
      <Text style={styles.sectionTitle}>Description</Text>
      {editMode ? (
        <TextInput
          style={[styles.editInput, styles.editMultiline]}
          value={editDesc}
          onChangeText={setEditDesc}
          placeholder="Description"
          placeholderTextColor="#64748b"
          multiline
        />
      ) : (
        <Text style={styles.description}>
          {item.structuredDescription || "No description provided."}
        </Text>
      )}

      {/* Acceptance Criteria */}
      {acceptanceCriteria.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Acceptance Criteria</Text>
          {acceptanceCriteria.map((ac, i) => (
            <View key={i} style={styles.acRow}>
              <Text style={styles.acBullet}>•</Text>
              <Text style={styles.acText}>{ac}</Text>
            </View>
          ))}
        </>
      )}

      {/* Edit toggle */}
      {!editMode && possibleTransitions.length > 0 && (
        <ActionButton
          label="Edit Fields"
          onPress={() => {
            setEditTitle(item.title);
            setEditDesc(item.structuredDescription ?? "");
            setEditMode(true);
          }}
          color="#334155"
          compact
        />
      )}
      {editMode && (
        <View style={styles.editActions}>
          <ActionButton label="Save" onPress={saveEdit} loading={updateFields.isPending} compact />
          <ActionButton label="Cancel" onPress={() => setEditMode(false)} color="#64748b" compact />
        </View>
      )}

      {/* Reason input */}
      {showReasonInput && !editMode && (
        <TextInput
          style={[styles.editInput, { marginTop: 16 }]}
          value={reasonText}
          onChangeText={setReasonText}
          placeholder="Reason (required for reject / hold / fail)"
          placeholderTextColor="#64748b"
        />
      )}

      {/* Action buttons */}
      {possibleTransitions.length > 0 && !editMode && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Actions</Text>
          <View style={styles.actions}>
            {possibleTransitions.map((target) => (
              <ActionButton
                key={target}
                label={target.replace(/([A-Z])/g, " $1").trim()}
                onPress={() => performAction(target)}
                color={ACTION_COLORS[target] ?? "#6366f1"}
                loading={
                  approve.isPending ||
                  reject.isPending ||
                  hold.isPending ||
                  start.isPending ||
                  markDone.isPending ||
                  markFailed.isPending ||
                  markNeedsReview.isPending ||
                  cancel.isPending
                }
                compact
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  loadingText: { color: "#64748b", fontSize: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  priority: { fontSize: 14, fontWeight: "800" },
  title: { fontSize: 20, fontWeight: "700", color: "#f8fafc", marginBottom: 12, lineHeight: 28 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  metaChip: { fontSize: 11, fontWeight: "600", color: "#94a3b8", backgroundColor: "#334155", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: "hidden" },
  metaId: { fontSize: 11, color: "#64748b", fontFamily: "monospace" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 8 },
  description: { fontSize: 14, color: "#cbd5e1", lineHeight: 22, marginBottom: 16 },
  acRow: { flexDirection: "row", gap: 8, marginBottom: 4, paddingRight: 16 },
  acBullet: { color: "#818cf8", fontSize: 14 },
  acText: { color: "#cbd5e1", fontSize: 13, lineHeight: 20, flex: 1 },
  editInput: { backgroundColor: "#1e293b", borderRadius: 10, padding: 12, fontSize: 14, color: "#f8fafc", borderWidth: 1, borderColor: "#334155", marginBottom: 8 },
  editMultiline: { minHeight: 80, textAlignVertical: "top" },
  editActions: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 16 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
});
