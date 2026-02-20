import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "~/hooks/useAuth";
import { trpc } from "~/lib/trpc";

interface WorkspaceState {
  workspacePublicId: string | null;
  setWorkspacePublicId: (id: string | null) => void;
  isLoadingWorkspaces: boolean;
}

const WorkspaceContext = createContext<WorkspaceState>({
  workspacePublicId: null,
  setWorkspacePublicId: () => {},
  isLoadingWorkspaces: true,
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [workspacePublicId, setWs] = useState<string | null>(null);

  const { data: workspaces, isLoading, error } = trpc.workspace.all.useQuery(
    undefined,
    { enabled: !!session },
  );

  useEffect(() => {
    if (error) {
      console.warn("[workspace] fetch error:", error.message);
    }
  }, [error]);

  useEffect(() => {
    if (!workspacePublicId && workspaces && workspaces.length > 0) {
      const first = workspaces[0];
      const id = first.workspace?.publicId ?? (first as any).publicId;
      if (id) setWs(id);
    }
  }, [workspaces, workspacePublicId]);

  const setWorkspacePublicId = useCallback((id: string | null) => setWs(id), []);

  return React.createElement(
    WorkspaceContext.Provider,
    { value: { workspacePublicId, setWorkspacePublicId, isLoadingWorkspaces: isLoading } },
    children,
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
