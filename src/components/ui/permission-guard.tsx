import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";

const roleLevels: Record<string, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

type Props = {
  minRole: "viewer" | "editor" | "admin";
  children: ReactNode;
  fallback?: ReactNode;
};

const PermissionGuard = ({ minRole, children, fallback = null }: Props) => {
  const { role } = usePermission();
  const userLevel = roleLevels[role] ?? 0;
  const requiredLevel = roleLevels[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
