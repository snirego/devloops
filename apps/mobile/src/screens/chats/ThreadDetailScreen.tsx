import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { ChatsStackParamList } from "~/navigation/types";
import { trpc } from "~/lib/trpc";
import ChatBubble from "~/components/ChatBubble";
import StatusBadge from "~/components/StatusBadge";

type Props = NativeStackScreenProps<ChatsStackParamList, "ThreadDetail">;

export default function ThreadDetailScreen({ route }: Props) {
  const { threadPublicId } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const [text, setText] = useState("");
  const utils = trpc.useUtils();

  const { data, isLoading, refetch, isRefetching } = trpc.chat.getMessages.useQuery(
    { threadPublicId },
  );

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      setText("");
      utils.chat.getMessages.invalidate({ threadPublicId });
      utils.chat.listThreads.invalidate();
    },
  });

  const updateStatus = trpc.chat.updateStatus.useMutation({
    onSuccess: () => {
      utils.chat.getMessages.invalidate({ threadPublicId });
      utils.chat.listThreads.invalidate();
    },
  });

  const thread = data?.thread;
  const messages = data?.messages ?? [];

  const handleSend = () => {
    if (!text.trim()) return;
    sendMutation.mutate({ threadPublicId, rawText: text.trim() });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Thread info bar */}
      {thread && (
        <View style={styles.infoBar}>
          <StatusBadge status={thread.status} small />
          <View style={styles.statusActions}>
            {thread.status !== "Resolved" && (
              <Pressable
                style={styles.statusBtn}
                onPress={() => updateStatus.mutate({ threadPublicId, status: "Resolved" })}
              >
                <Text style={styles.statusBtnText}>Resolve</Text>
              </Pressable>
            )}
            {thread.status !== "Closed" && (
              <Pressable
                style={styles.statusBtn}
                onPress={() => updateStatus.mutate({ threadPublicId, status: "Closed" })}
              >
                <Text style={styles.statusBtnText}>Close</Text>
              </Pressable>
            )}
            {(thread.status === "Resolved" || thread.status === "Closed") && (
              <Pressable
                style={styles.statusBtn}
                onPress={() => updateStatus.mutate({ threadPublicId, status: "Open" })}
              >
                <Text style={styles.statusBtnText}>Reopen</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item: { id?: number; publicId: string }) => item.publicId}
        contentContainerStyle={styles.messagesList}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#818cf8" />}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{isLoading ? "Loading..." : "No messages yet"}</Text>
          </View>
        }
        renderItem={({ item }: { item: { publicId: string; senderName: string | null; senderType: string; rawText: string; createdAt: string; visibility: string } }) => (
          <ChatBubble
            senderName={item.senderName ?? "Unknown"}
            senderType={item.senderType}
            text={item.rawText}
            timestamp={item.createdAt}
            visibility={item.visibility}
          />
        )}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#64748b"
          multiline
          maxLength={50000}
        />
        <Pressable
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    backgroundColor: "#1e293b",
  },
  statusActions: { flexDirection: "row", gap: 8 },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#334155",
  },
  statusBtnText: { fontSize: 11, fontWeight: "600", color: "#cbd5e1" },
  messagesList: { paddingVertical: 12 },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    backgroundColor: "#1e293b",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#f8fafc",
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sendBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
