import { createDisclosure } from "@/lib/disclosure";
import { Modal } from "react-daisyui";
import { useBucketContext } from "../context";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import { Loader2, Pencil } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export const renameDialog = createDisclosure<{
  key: string;
  prefix: string;
  isDirectory: boolean;
}>();

const RenameDialog = () => {
  const { isOpen, data, dialogRef } = renameDialog.use();
  const { bucketName } = useBucketContext();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const currentName = data?.isDirectory
    ? data.key.replace(/\/$/, "").split("/").pop() || ""
    : data?.key || "";

  useEffect(() => {
    if (isOpen && data) {
      setNewName(currentName);
      setLoading(false);
    }
  }, [isOpen, data]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!data || !newName.trim() || newName === currentName) return;

    const sourceKey = data.prefix + data.key;
    let destKey: string;

    if (data.isDirectory) {
      destKey = data.prefix + newName + "/";
    } else {
      // Preserve extension if renaming file
      const oldExt = data.key.includes(".")
        ? data.key.substring(data.key.lastIndexOf("."))
        : "";
      const newHasExt = newName.includes(".");
      destKey = data.prefix + (newHasExt ? newName : newName + oldExt);
    }

    setLoading(true);
    try {
      await api.post("/objects/copy", {
        body: {
          sourceBucket: bucketName,
          sourceKey,
          destBucket: bucketName,
          destKey,
          deleteSource: true,
        },
      });
      toast.success(`Renamed to "${data.isDirectory ? newName + "/" : destKey.split("/").pop()}"`);
      queryClient.invalidateQueries({ queryKey: ["browse", bucketName] });
      renameDialog.close();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal ref={dialogRef} open={isOpen} backdrop>
      <Modal.Header>
        <div className="flex items-center gap-2">
          <Pencil className="w-5 h-5" />
          Rename {data?.isDirectory ? "Folder" : "File"}
        </div>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={onSubmit}>
          <label className="label label-text text-xs opacity-70">
            New name
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            disabled={loading}
            onFocus={(e) => {
              // Select name without extension
              const dotIdx = e.target.value.lastIndexOf(".");
              if (dotIdx > 0 && !data?.isDirectory) {
                e.target.setSelectionRange(0, dotIdx);
              } else {
                e.target.select();
              }
            }}
          />
          {!data?.isDirectory && currentName.includes(".") && (
            <p className="text-xs opacity-50 mt-1">
              Tip: extension will be preserved if not included
            </p>
          )}
        </form>
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={() => renameDialog.close()} disabled={loading}>
          Cancel
        </Button>
        <Button
          color="primary"
          onClick={() => onSubmit()}
          disabled={loading || !newName.trim() || newName === currentName}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Rename
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default RenameDialog;
