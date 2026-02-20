import React from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "~/hooks/useAuth";
import { useWorkspace } from "~/hooks/useWorkspace";
import { trpc } from "~/lib/trpc";
import ActionButton from "~/components/ActionButton";

export default function SettingsScreen() {
  const { user, session, signOut } = useAuth();
  const { workspacePublicId, setWorkspacePublicId } = useWorkspace();

  const { data: rawWorkspaces, isLoading, refetch, isRefetching } = trpc.workspace.all.useQuery(
    undefined,
    { enabled: !!session },
  );

  const workspaces = (rawWorkspaces ?? []).map((item: any) => ({
    publicId: item.workspace?.publicId ?? item.publicId,
    name: item.workspace?.name ?? item.name,
  }));

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* User info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.email ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.email}>{user?.email ?? "Unknown"}</Text>
            <Text style={styles.userId}>{user?.id?.slice(0, 12) ?? ""}</Text>
          </View>
        </View>
      </View>

      {/* Workspace picker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workspace</Text>
        {!workspacePublicId && (
          <Text style={styles.hint}>Select a workspace to load boards and chats.</Text>
        )}
        <FlatList
          data={workspaces}
          keyExtractor={(item: { publicId: string }) => item.publicId}
          scrollEnabled={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#818cf8" />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{isLoading ? "Loading..." : "No workspaces found"}</Text>
          }
          renderItem={({ item }: { item: { publicId: string; name: string } }) => {
            const isSelected = item.publicId === workspacePublicId;
            return (
              <Pressable
                style={[styles.wsCard, isSelected && styles.wsCardSelected]}
                onPress={() => setWorkspacePublicId(item.publicId)}
              >
                <Text style={[styles.wsName, isSelected && styles.wsNameSelected]}>
                  {item.name}
                </Text>
                {isSelected && <Text style={styles.checkmark}>Active</Text>}
              </Pressable>
            );
          }}
        />
      </View>

      {/* Sign out */}
      <View style={styles.section}>
        <ActionButton label="Sign Out" onPress={handleSignOut} color="#dc2626" />
      </View>

      <Text style={styles.version}>Devloops Mobile v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  userInfo: { flex: 1 },
  email: { fontSize: 15, fontWeight: "600", color: "#f8fafc" },
  userId: { fontSize: 11, color: "#64748b", marginTop: 2, fontFamily: "monospace" },
  hint: { fontSize: 12, color: "#f59e0b", marginBottom: 8 },
  wsCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wsCardSelected: {
    borderColor: "#6366f1",
    backgroundColor: "#312e81",
  },
  wsName: { fontSize: 14, fontWeight: "600", color: "#f8fafc" },
  wsNameSelected: { color: "#c7d2fe" },
  checkmark: { fontSize: 11, fontWeight: "700", color: "#818cf8" },
  emptyText: { color: "#64748b", fontSize: 13 },
  version: { textAlign: "center", color: "#475569", fontSize: 11, marginTop: 8 },
});
