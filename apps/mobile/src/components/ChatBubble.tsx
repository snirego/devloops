import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  senderName: string;
  senderType: "internal" | "external" | string;
  text: string;
  timestamp?: string;
  visibility?: "public" | "internal" | string;
}

export default function ChatBubble({ senderName, senderType, text, timestamp, visibility }: Props) {
  const isInternal = senderType === "internal";

  return (
    <View style={[styles.row, isInternal && styles.rowRight]}>
      <View style={[styles.bubble, isInternal ? styles.internal : styles.external]}>
        <View style={styles.header}>
          <Text style={[styles.sender, isInternal && styles.senderInternal]}>{senderName}</Text>
          {visibility === "internal" && (
            <Text style={styles.internalTag}>internal</Text>
          )}
        </View>
        <Text style={[styles.text, isInternal && styles.textInternal]}>{text}</Text>
        {timestamp && (
          <Text style={[styles.time, isInternal && styles.timeInternal]}>
            {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  rowRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 14,
    padding: 12,
  },
  internal: {
    backgroundColor: "#312e81",
    borderBottomRightRadius: 4,
  },
  external: {
    backgroundColor: "#1e293b",
    borderBottomLeftRadius: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  sender: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
  senderInternal: {
    color: "#c7d2fe",
  },
  internalTag: {
    fontSize: 9,
    color: "#a78bfa",
    fontWeight: "600",
    backgroundColor: "#1e1b4b",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  text: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 20,
  },
  textInternal: {
    color: "#e0e7ff",
  },
  time: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
    textAlign: "right",
  },
  timeInternal: {
    color: "#818cf8",
  },
});
