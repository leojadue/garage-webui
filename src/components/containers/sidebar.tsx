import { cn, ucfirst } from "@/lib/utils";
import {
  ArchiveIcon,
  HardDrive,
  KeySquare,
  LayoutDashboard,
  LogOut,
  Palette,
  Users,
} from "lucide-react";
import { Dropdown, Menu } from "react-daisyui";
import { Link, useLocation } from "react-router-dom";
import Button from "../ui/button";
import RoleBadge from "../ui/role-badge";
import { themes } from "@/app/themes";
import appStore from "@/stores/app-store";
import garageLogo from "@/assets/garage-logo.svg";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import * as utils from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";

type PageDef = {
  icon: typeof LayoutDashboard;
  title: string;
  path: string;
  exact?: boolean;
  minRole?: "admin" | "editor" | "viewer";
};

const allPages: PageDef[] = [
  { icon: LayoutDashboard, title: "Dashboard", path: "/", exact: true },
  { icon: HardDrive, title: "Cluster", path: "/cluster", minRole: "admin" },
  { icon: ArchiveIcon, title: "Buckets", path: "/buckets" },
  { icon: KeySquare, title: "Keys", path: "/keys", minRole: "admin" },
  { icon: Users, title: "Users", path: "/users", minRole: "admin" },
];

const roleLevels: Record<string, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

const Sidebar = () => {
  const { pathname } = useLocation();
  const auth = useAuth();
  const { role, isAdmin } = usePermission();

  // Filter pages based on role. In non-multi-user mode show all except Users.
  const pages = allPages.filter((page) => {
    if (page.path === "/users" && !auth.isMultiUser) return false;
    if (!page.minRole) return true;
    return (roleLevels[role] ?? 0) >= (roleLevels[page.minRole] ?? 0);
  });

  return (
    <aside className="bg-base-100 border-r border-base-300/30 w-[80%] md:w-[250px] flex flex-col items-stretch overflow-hidden h-full">
      <div className="p-4">
        <img
          src={garageLogo}
          alt="logo"
          className="w-full max-w-[100px] mx-auto"
        />
        <p className="text-sm font-medium text-center">WebUI</p>
      </div>

      <Menu className="gap-y-1 flex-1 overflow-y-auto">
        {pages.map((page) => {
          const isActive = page.exact
            ? pathname === page.path
            : pathname.startsWith(page.path);
          return (
            <Menu.Item key={page.path}>
              <Link
                to={page.path}
                className={cn(
                  "h-12 flex items-center px-6",
                  isActive &&
                    "bg-primary text-primary-content hover:bg-primary/60 focus:bg-primary focus:text-primary-content"
                )}
              >
                <page.icon size={18} />
                <p>{page.title}</p>
              </Link>
            </Menu.Item>
          );
        })}
      </Menu>

      <div className="py-2 px-4">
        {auth.isMultiUser && auth.user && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <span className="text-sm truncate flex-1">{auth.user.username}</span>
            <RoleBadge role={auth.user.role} />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Dropdown vertical="top">
            <Dropdown.Toggle button={false}>
              <Button icon={Palette} color="ghost">
                {!auth.isEnabled ? "Theme" : null}
              </Button>
            </Dropdown.Toggle>

            <Dropdown.Menu className="max-h-[500px] overflow-y-auto">
              {themes.map((theme) => (
                <Dropdown.Item
                  key={theme}
                  onClick={() => appStore.setTheme(theme)}
                >
                  {ucfirst(theme)}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          {auth.isEnabled ? <LogoutButton /> : null}
        </div>
      </div>
    </aside>
  );
};

const LogoutButton = () => {
  const logout = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      window.location.href = utils.url("/auth/login");
    },
    onError: (err) => {
      toast.error(err?.message || "Unknown error");
    },
  });

  return (
    <Button className="flex-1" icon={LogOut} onClick={() => logout.mutate()}>
      Logout
    </Button>
  );
};

export default Sidebar;
