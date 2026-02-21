import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import type { User, Role } from "./types";

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/users"),
  });
};

export const useRoles = () => {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<Role[]>("/roles"),
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; email: string; password: string; role: string }) =>
      api.post<User>("/users", { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
    },
    onError: handleError,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; username: string; email: string; role: string; is_active: boolean }) =>
      api.put<User>(`/users/${id}`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
    },
    onError: handleError,
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
    },
    onError: handleError,
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; old_password?: string; new_password: string }) =>
      api.put(`/users/${id}/password`, { body }),
    onSuccess: () => {
      toast.success("Password changed");
    },
    onError: handleError,
  });
};
