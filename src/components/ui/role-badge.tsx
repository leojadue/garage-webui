import { cn } from "@/lib/utils";

type Props = {
  role: string;
  className?: string;
};

const roleStyles: Record<string, string> = {
  admin: "badge-primary",
  editor: "badge-secondary",
  viewer: "badge-ghost",
};

const RoleBadge = ({ role, className }: Props) => {
  return (
    <span className={cn("badge badge-sm", roleStyles[role] || "badge-ghost", className)}>
      {role}
    </span>
  );
};

export default RoleBadge;
