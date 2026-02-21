import { createDisclosure } from "@/lib/disclosure";
import { Modal } from "react-daisyui";
import { useBucketContext } from "../context";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Home,
  Loader2,
  MoveRight,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { GetObjectsResult } from "./types";

export const moveDialog = createDisclosure<{
  key: string;
  prefix: string;
  isDirectory: boolean;
}>();

type BucketListItem = {
  globalAliases: string[];
};

const MoveDialog = () => {
  const { isOpen, data, dialogRef } = moveDialog.use();
  const { bucketName } = useBucketContext();
  const queryClient = useQueryClient();
  const [destBucket, setDestBucket] = useState(bucketName);
  const [destPrefix, setDestPrefix] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch bucket list for cross-bucket moves
  const { data: buckets } = useQuery({
    queryKey: ["buckets-list"],
    queryFn: () => api.get<BucketListItem[]>("/buckets"),
    enabled: isOpen,
  });

  // Fetch folders in current destination
  const { data: destContents, isLoading: foldersLoading } = useQuery({
    queryKey: ["browse", destBucket, { prefix: destPrefix, limit: 200 }],
    queryFn: () =>
      api.get<GetObjectsResult>(`/browse/${destBucket}`, {
        params: { prefix: destPrefix, limit: 200 },
      }),
    enabled: isOpen && !!destBucket,
  });

  useEffect(() => {
    if (isOpen && data) {
      setDestBucket(bucketName);
      setDestPrefix(data.prefix);
      setLoading(false);
    }
  }, [isOpen, data]);

  const bucketNames =
    buckets
      ?.flatMap((b) => b.globalAliases)
      .filter((n): n is string => !!n)
      .sort() || [];

  const folders = destContents?.prefixes || [];

  const sourceFullKey = (data?.prefix || "") + (data?.key || "");
  const objectName = data?.isDirectory
    ? data.key.replace(/\/$/, "").split("/").pop() + "/"
    : data?.key || "";
  const destFullKey = destPrefix + objectName;

  const isSameLocation =
    destBucket === bucketName && destFullKey === sourceFullKey;

  const onMove = async () => {
    if (!data || isSameLocation) return;

    setLoading(true);
    try {
      await api.post("/objects/copy", {
        body: {
          sourceBucket: bucketName,
          sourceKey: sourceFullKey,
          destBucket,
          destKey: destFullKey,
          deleteSource: true,
        },
      });

      const destLabel =
        destBucket === bucketName
          ? destPrefix || "/"
          : `${destBucket}/${destPrefix}`;
      toast.success(`Moved to ${destLabel}`);
      queryClient.invalidateQueries({ queryKey: ["browse"] });
      moveDialog.close();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Breadcrumb for current path
  const pathParts = destPrefix
    .split("/")
    .filter((p) => p);

  return (
    <Modal ref={dialogRef} open={isOpen} backdrop>
      <Modal.Header>
        <div className="flex items-center gap-2">
          <MoveRight className="w-5 h-5" />
          Move "{data?.key?.replace(/\/$/, "").split("/").pop()}"
        </div>
      </Modal.Header>
      <Modal.Body>
        {/* Bucket selector */}
        {bucketNames.length > 1 && (
          <div className="mb-3">
            <label className="label label-text text-xs opacity-70">
              Destination bucket
            </label>
            <select
              className="select select-bordered select-sm w-full"
              value={destBucket}
              onChange={(e) => {
                setDestBucket(e.target.value);
                setDestPrefix("");
              }}
            >
              {bucketNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                  {name === bucketName ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Path breadcrumb */}
        <label className="label label-text text-xs opacity-70">
          Destination folder
        </label>
        <div className="flex items-center gap-1 text-sm mb-2 flex-wrap">
          <button
            className={`btn btn-xs ${
              destPrefix === "" ? "btn-primary" : "btn-ghost"
            }`}
            onClick={() => setDestPrefix("")}
          >
            <Home className="w-3 h-3" />
            {destBucket}
          </button>
          {pathParts.map((part, i) => {
            const prefix = pathParts.slice(0, i + 1).join("/") + "/";
            return (
              <span key={prefix} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 opacity-40" />
                <button
                  className={`btn btn-xs ${
                    destPrefix === prefix ? "btn-primary" : "btn-ghost"
                  }`}
                  onClick={() => setDestPrefix(prefix)}
                >
                  {part}
                </button>
              </span>
            );
          })}
        </div>

        {/* Folder list */}
        <div className="border border-base-300 rounded-lg max-h-48 overflow-y-auto">
          {foldersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin opacity-50" />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-6 text-sm opacity-50">
              No subfolders
            </div>
          ) : (
            folders.map((folder) => {
              const folderName = folder
                .replace(destPrefix, "")
                .replace(/\/$/, "");
              // Don't show source folder as target
              const isSource =
                destBucket === bucketName && folder === sourceFullKey;
              if (isSource) return null;
              return (
                <button
                  key={folder}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-base-200 text-sm text-left transition-colors"
                  onClick={() => setDestPrefix(folder)}
                >
                  {destPrefix === folder ? (
                    <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <span className="truncate">{folderName}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Destination preview */}
        <div className="mt-3 px-3 py-2 bg-base-200 rounded-lg text-xs font-mono break-all">
          <span className="opacity-50">Moving to: </span>
          {destBucket}/{destFullKey}
        </div>
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={() => moveDialog.close()} disabled={loading}>
          Cancel
        </Button>
        <Button
          color="primary"
          onClick={onMove}
          disabled={loading || isSameLocation}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Move here
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default MoveDialog;
