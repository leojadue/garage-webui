import Button from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash, X } from "lucide-react";
import { useBucketContext } from "../context";
import { useDeleteObject } from "./hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import { Modal } from "react-daisyui";
import { useRef, useState } from "react";
import { usePermission } from "@/hooks/usePermission";

type Props = {
  selectedKeys: Set<string>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  prefix: string;
};

const BulkActions = ({ selectedKeys, setSelectedKeys, prefix }: Props) => {
  const { bucketName } = useBucketContext();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { canWrite } = usePermission();

  const deleteObject = useDeleteObject(bucketName, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browse", bucketName] });
    },
    onError: handleError,
  });

  if (selectedKeys.size === 0 || !canWrite) return null;

  const count = selectedKeys.size;
  const hasFolders = [...selectedKeys].some((k) => k.endsWith("/"));

  const onConfirmDelete = async () => {
    setDeleting(true);
    const keys = [...selectedKeys];
    const results = await Promise.allSettled(
      keys.map((key) => {
        const isDir = key.endsWith("/");
        return deleteObject.mutateAsync({ key: prefix + key, recursive: isDir });
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      toast.warning(`${succeeded} deleted, ${failed} failed`);
    } else {
      toast.success(`${count} item${count > 1 ? "s" : ""} deleted`);
    }

    queryClient.invalidateQueries({ queryKey: ["browse", bucketName] });
    setSelectedKeys(new Set());
    setConfirmOpen(false);
    setDeleting(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-y border-primary/20">
        <span className="text-sm font-medium">
          {count} selected
        </span>
        <div className="flex-1" />
        <Button
          size="sm"
          color="error"
          onClick={() => setConfirmOpen(true)}
          className="gap-1"
        >
          <Trash size={14} />
          Delete
        </Button>
        <Button
          size="sm"
          color="ghost"
          onClick={() => setSelectedKeys(new Set())}
          className="gap-1"
        >
          <X size={14} />
          Clear
        </Button>
      </div>

      <Modal ref={dialogRef} open={confirmOpen} backdrop className="max-w-md">
        <Modal.Body>
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mb-4">
              <AlertTriangle size={28} className="text-error" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Delete {count} item{count > 1 ? "s" : ""}?
            </h3>
            <p className="text-sm opacity-60 max-w-xs">
              {hasFolders
                ? "This will permanently delete the selected files and folders including all their contents."
                : "This will permanently delete the selected files."}
            </p>
            <p className="text-xs opacity-40 mt-2">This action cannot be undone.</p>
          </div>
        </Modal.Body>
        <Modal.Actions className="justify-center gap-3 pb-6">
          <Button
            color="ghost"
            onClick={() => setConfirmOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            color="error"
            onClick={onConfirmDelete}
            disabled={deleting}
            className="gap-2 min-w-[120px]"
          >
            {deleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash size={16} />
                Delete
              </>
            )}
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
};

export default BulkActions;
