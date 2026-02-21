import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

type AuthUser = {
  id: number;
  username: string;
  role: string;
};

type AuthResponse = {
  enabled: boolean;
  authenticated: boolean;
  multi_user: boolean;
  user: AuthUser | null;
};

export const useAuth = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: () => api.get<AuthResponse>("/auth/status"),
    retry: false,
  });
  return {
    isLoading,
    isEnabled: data?.enabled,
    isAuthenticated: data?.authenticated,
    isMultiUser: data?.multi_user ?? false,
    user: data?.user ?? null,
  };
};
