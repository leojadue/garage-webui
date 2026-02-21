import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Toggle } from "react-daisyui";
import { InputField } from "@/components/ui/input";
import Button from "@/components/ui/button";
import { editUserSchema, EditUserSchema } from "../schema";
import { useUpdateUser, useRoles } from "../hooks";
import type { User } from "../types";
import FormControl from "@/components/ui/form-control";

type Props = {
  open: boolean;
  onClose: () => void;
  user: User | null;
};

const EditUserDialog = ({ open, onClose, user }: Props) => {
  const form = useForm<EditUserSchema>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { username: "", email: "", role: "viewer", is_active: true },
  });

  const updateUser = useUpdateUser();
  const { data: roles } = useRoles();

  useEffect(() => {
    if (user && open) {
      form.reset({
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      });
    }
  }, [user, open]);

  const onSubmit = form.handleSubmit((values) => {
    if (!user) return;
    updateUser.mutate(
      { id: user.id, ...values },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  });

  return (
    <Modal open={open} backdrop>
      <Modal.Header>Edit User</Modal.Header>
      <Modal.Body>
        <form onSubmit={onSubmit} className="space-y-2">
          <InputField form={form} name="username" title="Username" placeholder="Enter username" />
          <InputField form={form} name="email" title="Email" placeholder="Enter email (optional)" />

          <FormControl
            form={form}
            name="role"
            title="Role"
            render={(field) => (
              <select {...field} value={String(field.value)} className="select select-bordered w-full">
                {(roles || []).map((role) => (
                  <option key={role.name} value={role.name}>
                    {role.name} — {role.description}
                  </option>
                ))}
              </select>
            )}
          />

          <FormControl
            form={form}
            name="is_active"
            title="Active"
            render={(field) => (
              <Toggle
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
                color="primary"
              />
            )}
          />
        </form>
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="primary" onClick={onSubmit} loading={updateUser.isPending}>
          Save
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default EditUserDialog;
