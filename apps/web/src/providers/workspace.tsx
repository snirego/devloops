import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { createContext, useContext, useEffect, useState } from "react";

import { api } from "~/utils/api";
import {
  applyBrandColors,
  cacheBrandColor,
  getCachedBrandColor,
  DEFAULT_BRAND_COLOR,
} from "~/utils/brandColors";

interface WorkspaceContextProps {
  workspace: Workspace;
  isLoading: boolean;
  hasLoaded: boolean;
  switchWorkspace: (_workspace: Workspace) => void;
  availableWorkspaces: Workspace[];
}

interface Workspace {
  name: string;
  description: string | null | undefined;
  publicId: string;
  slug: string | undefined;
  plan: "free" | "pro" | "enterprise" | undefined;
  role: "super-admin" | "admin" | "member" | "tester" | "guest";
  brandColor: string | null | undefined;
}

const initialWorkspace: Workspace = {
  name: "",
  description: null,
  publicId: "",
  slug: "",
  plan: "free",
  role: "member",
  brandColor: DEFAULT_BRAND_COLOR,
};

const initialAvailableWorkspaces: Workspace[] = [];

export const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(
  undefined,
);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>(
    initialAvailableWorkspaces,
  );
  const [hasLoaded, setHasLoaded] = useState(false);

  const workspacePublicId = useSearchParams().get("workspacePublicId");

  const { data, isLoading } = api.workspace.all.useQuery();
  const utils = api.useUtils();

  const switchWorkspace = (_workspace: Workspace) => {
    localStorage.setItem("workspacePublicId", _workspace.publicId);

    setWorkspace(_workspace);

    // Refetch workspace data to ensure availableWorkspaces is up to date
    void utils.workspace.all.refetch();

    router.push(`/boards`);
  };

  useEffect(() => {
    if (!data?.length) {
      if (!isLoading) setHasLoaded(true);
      return;
    }

    const storedWorkspaceId: string | null =
      workspacePublicId ?? localStorage.getItem("workspacePublicId");

    if (data.length) {
      const workspaces = data.map(({ workspace, role }) => ({
        role,
        publicId: workspace.publicId,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        plan: workspace.plan,
        brandColor: workspace.brandColor,
        hasLoaded: true,
      })) as Workspace[];

      if (workspaces.length) setAvailableWorkspaces(workspaces);
    }

    if (storedWorkspaceId !== null) {
      const newData = data;
      const selectedWorkspace = newData.find(
        ({ workspace }) => workspace.publicId === storedWorkspaceId,
      );

      if (!selectedWorkspace?.workspace) return;

      setWorkspace({
        publicId: selectedWorkspace.workspace.publicId,
        name: selectedWorkspace.workspace.name,
        slug: selectedWorkspace.workspace.slug,
        plan: selectedWorkspace.workspace.plan,
        description: selectedWorkspace.workspace.description,
        role: selectedWorkspace.role,
        brandColor: selectedWorkspace.workspace.brandColor,
      });

      if (workspacePublicId) {
        router.push(`/boards`);
        localStorage.setItem("workspacePublicId", workspacePublicId);
      }
    } else {
      const primaryWorkspace = data[0]?.workspace;
      const primaryWorkspaceRole = data[0]?.role;

      if (!primaryWorkspace || !primaryWorkspaceRole) return;
      localStorage.setItem("workspacePublicId", primaryWorkspace.publicId);
      setWorkspace({
        publicId: primaryWorkspace.publicId,
        name: primaryWorkspace.name,
        slug: primaryWorkspace.slug,
        plan: primaryWorkspace.plan,
        description: primaryWorkspace.description,
        role: primaryWorkspaceRole,
        brandColor: primaryWorkspace.brandColor,
      });
    }
  }, [data, isLoading, workspacePublicId, router]);

  // Apply brand color CSS variables whenever workspace changes.
  // Also persist to localStorage so the next page load can apply instantly.
  useEffect(() => {
    const color = workspace.brandColor || DEFAULT_BRAND_COLOR;
    applyBrandColors(color);
    cacheBrandColor(color);
  }, [workspace.brandColor]);

  // On first mount, apply cached brand color immediately (before DB fetch).
  // This eliminates the flash of default color.
  useEffect(() => {
    const cached = getCachedBrandColor();
    if (cached && /^#[0-9a-fA-F]{6}$/.test(cached)) {
      applyBrandColors(cached);
    }
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        isLoading,
        hasLoaded,
        availableWorkspaces,
        switchWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextProps => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
