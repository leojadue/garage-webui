import Button from "@/components/ui/button";
import { Trash, X } from "lucide-react";
import { useBucketContext } from "../context";
import { useDeleteObject } from "./hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";

type Props = {
  selectedKeys: Set<string>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  prefix: string;
};

const BulkActions = ({ selectedKeys, setSelectedKeys, prefix }: Props) => {
  const { bucketName } = useBucketContext();
  const queryClient = useQueryClient();

  const deleteObject = useDeleteObject(bucketName, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browse", bucketName] });
    },
    onError: handleError,
  });

  if (selectedKeys.size === 0) return null;

  const onBulkDelete = () => {
    const count = selectedKeys.size;
    if (
      !window.confirm(
        `Are you sure you want to delete ${count} selected item${count > 1 ? "s" : ""}?`
      )
    ) {
      return;
    }

    let completed = 0;
    selectedKeys.forEach((key) => {
      const isDir = key.endsWith("/");
      deleteObject.mutate(
        { key: prefix + key, recursive: isDir },
        {
          onSuccess: () => {
            completed++;
            if (completed === count) {
              toast.success(`${count} item${count > 1 ? "s" : ""} deleted`);
              setSelectedKeys(new Set());
            }
          },
        }
      );
    });
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-y border-primary/20">
      <span className="text-sm font-medium">
        {selectedKeys.size} selected
      </span>
      <div className="flex-1" />
      <Button
        size="sm"
        color="error"
        onClick={onBulkDelete}
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
  );
};

export default BulkActions;
