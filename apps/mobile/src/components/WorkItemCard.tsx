import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import StatusBadge from "./StatusBadge";

interface Props {
  title: string;
  status: string;
  type?: string;
  priority?: string;
  publicId: string;
  onPress: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  Bug: "Bug",
  Feature: "Feature",
  Chore: "Chore",
  Docs: "Docs",
};

const PRIORITY_COLOR: Record<string, string> = {
  P0: "#ef4444",
  P1: "#f97316",
  P2: "#eab308",
  P3: "#22c55e",
};

export default function WorkItemCard({ title, status, type, priority, publicId, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        <StatusBadge status={status} small />
        {priority && (
          <Text style={[styles.priority, { color: PRIORITY_COLOR[priority] ?? "#94a3b8" }]}>
            {priority}
          </Text>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.bottomRow}>
        {type && <Text style={styles.type}>{TYPE_LABEL[type] ?? type}</Text>}
        <Text style={styles.id}>{publicId.slice(0, 8)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 8,
    lineHeight: 21,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  type: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  priority: {
    fontSize: 12,
    fontWeight: "800",
  },
  id: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "monospace",
  },
});
