import { useAuth } from "./useAuth";

export const usePermission = () => {
  const { user, isMultiUser, isLoading } = useAuth();

  // While auth is loading, assume minimum permissions to prevent UI flicker
  if (isLoading) {
    return {
      role: "viewer" as const,
      isAdmin: false,
      canWrite: false,
      canManageUsers: false,
      canManageCluster: false,
      canManageLifecycle: false,
    };
  }

  // In non-multi-user mode, everyone is admin
  if (!isMultiUser) {
    return {
      role: "admin" as const,
      isAdmin: true,
      canWrite: true,
      canManageUsers: false, // No user management in legacy mode
      canManageCluster: true,
      canManageLifecycle: true,
    };
  }

  const role = user?.role ?? "viewer";

  return {
    role,
    isAdmin: role === "admin",
    canWrite: role === "admin" || role === "editor",
    canManageUsers: role === "admin",
    canManageCluster: role === "admin",
    canManageLifecycle: role === "admin",
  };
};
