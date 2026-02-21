import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "react-daisyui";
import { InputField } from "@/components/ui/input";
import Button from "@/components/ui/button";
import { makeChangePasswordSchema, ChangePasswordSchema } from "../schema";
import { useChangePassword } from "../hooks";
import type { User } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  isSelf: boolean;
};

const ChangePasswordDialog = ({ open, onClose, user, isSelf }: Props) => {
  const schema = useMemo(() => makeChangePasswordSchema(isSelf), [isSelf]);

  const form = useForm<ChangePasswordSchema>({
    resolver: zodResolver(schema),
    defaultValues: { old_password: "", new_password: "", confirm_password: "" },
  });

  const changePassword = useChangePassword();

  const onSubmit = form.handleSubmit((values) => {
    if (!user) return;
    changePassword.mutate(
      {
        id: user.id,
        old_password: isSelf ? values.old_password : undefined,
        new_password: values.new_password,
      },
      {
        onSuccess: () => {
          form.reset();
          onClose();
        },
      }
    );
  });

  return (
    <Modal open={open} backdrop>
      <Modal.Header>
        Change Password {user ? `— ${user.username}` : ""}
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={onSubmit} className="space-y-2">
          {isSelf && (
            <InputField
              form={form}
              name="old_password"
              title="Current Password"
              type="password"
              placeholder="Enter current password"
            />
          )}
          <InputField
            form={form}
            name="new_password"
            title="New Password"
            type="password"
            placeholder="Enter new password"
          />
          <InputField
            form={form}
            name="confirm_password"
            title="Confirm New Password"
            type="password"
            placeholder="Confirm new password"
          />
        </form>
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="primary" onClick={onSubmit} loading={changePassword.isPending}>
          Change Password
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default ChangePasswordDialog;
