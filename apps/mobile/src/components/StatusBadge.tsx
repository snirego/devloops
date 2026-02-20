import React from "react";
import { StyleSheet, Text, View } from "react-native";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Draft: { bg: "#334155", text: "#94a3b8" },
  PendingApproval: { bg: "#fef3c7", text: "#92400e" },
  Approved: { bg: "#d1fae5", text: "#065f46" },
  Rejected: { bg: "#fecdd3", text: "#9f1239" },
  OnHold: { bg: "#e0e7ff", text: "#3730a3" },
  InProgress: { bg: "#dbeafe", text: "#1e40af" },
  NeedsReview: { bg: "#fae8ff", text: "#7e22ce" },
  Done: { bg: "#bbf7d0", text: "#14532d" },
  Failed: { bg: "#fee2e2", text: "#991b1b" },
  Canceled: { bg: "#e2e8f0", text: "#475569" },
  // Thread statuses
  Open: { bg: "#dbeafe", text: "#1e40af" },
  WaitingOnUser: { bg: "#fef3c7", text: "#92400e" },
  Resolved: { bg: "#bbf7d0", text: "#14532d" },
  Closed: { bg: "#e2e8f0", text: "#475569" },
};

interface Props {
  status: string;
  small?: boolean;
}

export default function StatusBadge({ status, small }: Props) {
  const colors = STATUS_COLORS[status] ?? { bg: "#334155", text: "#cbd5e1" };
  const label = status.replace(/([A-Z])/g, " $1").trim();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, small && styles.small]}>
      <Text style={[styles.text, { color: colors.text }, small && styles.smallText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
  smallText: {
    fontSize: 10,
  },
});
