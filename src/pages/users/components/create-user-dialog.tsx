import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "react-daisyui";
import { InputField } from "@/components/ui/input";
import Button from "@/components/ui/button";
import { createUserSchema, CreateUserSchema } from "../schema";
import { useCreateUser, useRoles } from "../hooks";
import FormControl from "@/components/ui/form-control";

type Props = {
  open: boolean;
  onClose: () => void;
};

const CreateUserDialog = ({ open, onClose }: Props) => {
  const form = useForm<CreateUserSchema>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "", role: "viewer" },
  });

  const createUser = useCreateUser();
  const { data: roles } = useRoles();

  const onSubmit = form.handleSubmit((values) => {
    createUser.mutate(
      { username: values.username, email: values.email, password: values.password, role: values.role },
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
      <Modal.Header>Create User</Modal.Header>
      <Modal.Body>
        <form onSubmit={onSubmit} className="space-y-2">
          <InputField form={form} name="username" title="Username" placeholder="Enter username" />
          <InputField form={form} name="email" title="Email" placeholder="Enter email (optional)" />
          <InputField form={form} name="password" title="Password" type="password" placeholder="Enter password" />
          <InputField form={form} name="confirmPassword" title="Confirm Password" type="password" placeholder="Confirm password" />

          <FormControl
            form={form}
            name="role"
            title="Role"
            render={(field) => (
              <select {...field} className="select select-bordered w-full">
                {(roles || []).map((role) => (
                  <option key={role.name} value={role.name}>
                    {role.name} — {role.description}
                  </option>
                ))}
              </select>
            )}
          />
        </form>
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="primary" onClick={onSubmit} loading={createUser.isPending}>
          Create
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default CreateUserDialog;
