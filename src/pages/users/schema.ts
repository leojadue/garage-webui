import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  email: z.string().email("Invalid email").or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  role: z.string().min(1, "Role is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  email: z.string().email("Invalid email").or(z.literal("")),
  role: z.string().min(1, "Role is required"),
  is_active: z.boolean(),
});

export type EditUserSchema = z.infer<typeof editUserSchema>;

export const makeChangePasswordSchema = (isSelf: boolean) =>
  z.object({
    old_password: isSelf
      ? z.string().min(1, "Current password is required")
      : z.string().optional(),
    new_password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string(),
  }).refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// Use the self variant as the default type
export type ChangePasswordSchema = z.infer<ReturnType<typeof makeChangePasswordSchema>>;
