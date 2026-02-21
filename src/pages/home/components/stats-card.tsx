import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value?: string | number | null;
  icon: LucideIcon;
  valueClassName?: string;
  children?: React.ReactNode;
};

const StatsCard = ({
  title,
  value,
  icon: Icon,
  valueClassName,
  children,
}: Props) => {
  return (
    <div className="bg-base-100 rounded-box p-3 md:p-4 flex flex-row items-center gap-2">
      <div className="shrink-0">
        <Icon size={22} className="opacity-60" />
      </div>

      <div className="flex-1 min-w-0">
        {children != null ? (
          children
        ) : (
          <p
            className={cn(
              "text-lg md:text-xl font-bold truncate",
              valueClassName
            )}
          >
            {typeof value === "undefined" ? "..." : value}
          </p>
        )}
        <p className="text-xs opacity-50 truncate">{title}</p>
      </div>
    </div>
  );
};

export default StatsCard;
