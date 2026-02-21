import { Dropdown } from "react-daisyui";
import { Object } from "./types";
import Button from "@/components/ui/button";
import {
  DownloadIcon,
  EllipsisVertical,
  Eye,
  FileArchive,
  FolderInput,
  Pencil,
  Share2,
  Trash,
} from "lucide-react";
import { useDeleteObject } from "./hooks";
import { useBucketContext } from "../context";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import { API_URL } from "@/lib/api";
import { shareDialog } from "./share-dialog";
import { renameDialog } from "./rename-dialog";
import { moveDialog } from "./move-dialog";
import { previewDialog } from "./preview-dialog";

type Props = {
  prefix?: string;
  object: Pick<Object, "objectKey" | "url">;
  end?: boolean;
};

const ObjectActions = ({ prefix = "", object, end }: Props) => {
  const { bucketName } = useBucketContext();
  const queryClient = useQueryClient();
  const isDirectory = object.objectKey.endsWith("/");

  const deleteObject = useDeleteObject(bucketName, {
    onSuccess: () => {
      toast.success("Object deleted!");
      queryClient.invalidateQueries({ queryKey: ["browse", bucketName] });
    },
    onError: handleError,
  });

  const onDownload = () => {
    window.open(API_URL + object.url + "?dl=1", "_blank");
  };

  const onDownloadZip = () => {
    const fullPrefix = prefix + object.objectKey;
    window.open(
      API_URL + `/zip/${bucketName}?prefix=${encodeURIComponent(fullPrefix)}`,
      "_blank"
    );
  };

  const onDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete this ${
          isDirectory ? "directory and its content" : "object"
        }?`
      )
    ) {
      deleteObject.mutate({
        key: prefix + object.objectKey,
        recursive: isDirectory,
      });
    }
  };

  return (
    <td className="!p-0 w-auto">
      <span className="w-full flex flex-row justify-end pr-2">
        {!isDirectory && (
          <Button icon={DownloadIcon} color="ghost" onClick={onDownload} />
        )}
        {isDirectory && (
          <Button icon={FileArchive} color="ghost" onClick={onDownloadZip} title="Download as ZIP" />
        )}

        <Dropdown end vertical={end ? "top" : "bottom"}>
          <Dropdown.Toggle button={false}>
            <Button icon={EllipsisVertical} color="ghost" />
          </Dropdown.Toggle>

          <Dropdown.Menu className="gap-y-1 min-w-[160px]">
            {!isDirectory && (
              <Dropdown.Item
                onClick={() =>
                  previewDialog.open({
                    object: object as Object,
                    prefix,
                  })
                }
              >
                <Eye size={16} /> Preview
              </Dropdown.Item>
            )}
            {!isDirectory && (
              <Dropdown.Item
                onClick={() =>
                  shareDialog.open({ key: object.objectKey, prefix })
                }
              >
                <Share2 size={16} /> Share
              </Dropdown.Item>
            )}
            {isDirectory && (
              <Dropdown.Item onClick={onDownloadZip}>
                <FileArchive size={16} /> Download as ZIP
              </Dropdown.Item>
            )}
            <Dropdown.Item
              onClick={() =>
                renameDialog.open({
                  key: object.objectKey,
                  prefix,
                  isDirectory,
                })
              }
            >
              <Pencil size={16} /> Rename
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() =>
                moveDialog.open({
                  key: object.objectKey,
                  prefix,
                  isDirectory,
                })
              }
            >
              <FolderInput size={16} /> Move to...
            </Dropdown.Item>
            <Dropdown.Item
              className="text-error bg-error/10"
              onClick={onDelete}
            >
              <Trash size={16} /> Delete
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </span>
    </td>
  );
};

export default ObjectActions;
