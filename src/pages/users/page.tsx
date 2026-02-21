import { useState } from "react";
import { Alert, Card, Loading, Table } from "react-daisyui";
import { KeySquare, Pencil, Plus, Trash, Users as UsersIcon } from "lucide-react";
import Button from "@/components/ui/button";
import RoleBadge from "@/components/ui/role-badge";
import { useUsers, useDeleteUser } from "./hooks";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/utils";
import type { User } from "./types";
import CreateUserDialog from "./components/create-user-dialog";
import EditUserDialog from "./components/edit-user-dialog";
import ChangePasswordDialog from "./components/change-password-dialog";
import Page from "@/context/page-context";

export default function UsersPage() {

  const { data: users, isLoading, error } = useUsers();
  const auth = useAuth();
  const deleteUser = useDeleteUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);

  const onDelete = (user: User) => {
    if (window.confirm(`Delete user "${user.username}"? This action cannot be undone.`)) {
      deleteUser.mutate(user.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert status="error">
          <span>{(error as Error).message}</span>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <Page title="Users" />
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm opacity-50">
            Manage users and their access levels
          </p>
        </div>
        <Button color="primary" size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
          <Plus size={14} />
          Add User
        </Button>
      </div>

      <Card>
        {!users?.length ? (
          <div className="text-center py-16">
            <UsersIcon className="w-10 h-10 mx-auto opacity-20 mb-3" />
            <p className="text-sm opacity-50">No users yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Table.Head>
                <span>Username</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Created</span>
                <span />
              </Table.Head>
              <Table.Body>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral/60 hover:text-neutral-content">
                    <td className="font-medium">{user.username}</td>
                    <td className="opacity-60">{user.email || "—"}</td>
                    <td>
                      <RoleBadge role={user.role} />
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${
                          user.is_active ? "badge-success" : "badge-ghost"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap opacity-60">
                      {dayjs(user.created_at).fromNow()}
                    </td>
                    <td className="!p-0">
                      <span className="flex flex-row justify-end gap-1 pr-2">
                        <Button
                          size="sm"
                          color="ghost"
                          onClick={() => setPasswordUser(user)}
                          title="Change password"
                        >
                          <KeySquare size={14} />
                        </Button>
                        <Button
                          size="sm"
                          color="ghost"
                          onClick={() => setEditUser(user)}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          color="ghost"
                          className="text-error"
                          onClick={() => onDelete(user)}
                          title="Delete"
                        >
                          <Trash size={14} />
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </Card>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditUserDialog open={!!editUser} onClose={() => setEditUser(null)} user={editUser} />
      <ChangePasswordDialog
        open={!!passwordUser}
        onClose={() => setPasswordUser(null)}
        user={passwordUser}
        isSelf={passwordUser?.id === auth.user?.id}
      />
    </div>
  );
}
