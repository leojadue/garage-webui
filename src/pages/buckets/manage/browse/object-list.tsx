import { Alert, Loading, Table } from "react-daisyui";
import { useBrowseObjects } from "./hooks";
import { dayjs, readableBytes } from "@/lib/utils";
import mime from "mime/lite";
import { Object } from "./types";
import { API_URL } from "@/lib/api";
import {
  CircleXIcon,
  FileArchive,
  FileIcon,
  FileType,
  Folder,
} from "lucide-react";
import { useBucketContext } from "../context";
import ObjectActions from "./object-actions";
import GotoTopButton from "@/components/ui/goto-top-btn";
import { previewDialog } from "./preview-dialog";
import { usePermission } from "@/hooks/usePermission";

type Props = {
  prefix?: string;
  onPrefixChange?: (prefix: string) => void;
  selectedKeys: Set<string>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const ObjectList = ({
  prefix,
  onPrefixChange,
  selectedKeys,
  setSelectedKeys,
}: Props) => {
  const { bucketName } = useBucketContext();
  const { canWrite } = usePermission();
  const { data, error, isLoading } = useBrowseObjects(bucketName, {
    prefix,
    limit: 1000,
  });

  const onObjectClick = (object: Object) => {
    previewDialog.open({ object, prefix: prefix || "" });
  };

  const allKeys = [
    ...(data?.prefixes || []),
    ...(data?.objects?.map((o) => o.objectKey) || []),
  ];

  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allKeys));
    }
  };

  const toggleSelect = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="overflow-x-auto min-h-[400px]">
      <Table>
        <Table.Head>
          <span className="flex items-center gap-2">
            {canWrite && allKeys.length > 0 && (
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
            )}
            Name
          </span>
          <span>Size</span>
          <span>Last Modified</span>
        </Table.Head>

        <Table.Body>
          {isLoading ? (
            <tr>
              <td colSpan={4}>
                <div className="h-[320px] flex items-center justify-center">
                  <Loading />
                </div>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={4}>
                <Alert status="error" icon={<CircleXIcon />}>
                  <span>{error.message}</span>
                </Alert>
              </td>
            </tr>
          ) : !data?.prefixes?.length && !data?.objects?.length ? (
            <tr>
              <td className="text-center py-16" colSpan={4}>
                No objects
              </td>
            </tr>
          ) : null}

          {data?.prefixes.map((dirPrefix) => (
            <tr
              key={dirPrefix}
              className="hover:bg-neutral/60 hover:text-neutral-content group"
            >
              <td>
                <span className="flex items-center gap-2 font-normal">
                  {canWrite && (
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={selectedKeys.has(dirPrefix)}
                      onClick={(e) => toggleSelect(dirPrefix, e)}
                      readOnly
                    />
                  )}
                  <span
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    role="button"
                    onClick={() => onPrefixChange?.(dirPrefix)}
                  >
                    <Folder size={20} className="text-primary" />
                    {dirPrefix
                      .substring(0, dirPrefix.lastIndexOf("/"))
                      .split("/")
                      .pop()}
                  </span>
                </span>
              </td>
              <td colSpan={2} />
              <ObjectActions object={{ objectKey: dirPrefix, url: "" }} />
            </tr>
          ))}

          {data?.objects.map((object, idx) => {
            const extIdx = object.objectKey.lastIndexOf(".");
            const filename =
              extIdx >= 0
                ? object.objectKey.substring(0, extIdx)
                : object.objectKey;
            const ext = extIdx >= 0 ? object.objectKey.substring(extIdx) : null;

            return (
              <tr
                key={object.objectKey}
                className="hover:bg-neutral/60 hover:text-neutral-content group"
              >
                <td>
                  <span className="flex items-center font-normal w-full">
                    {canWrite && (
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary mr-2"
                        checked={selectedKeys.has(object.objectKey)}
                        onClick={(e) => toggleSelect(object.objectKey, e)}
                        readOnly
                      />
                    )}
                    <span
                      className="flex items-center cursor-pointer flex-1"
                      role="button"
                      onClick={() => onObjectClick(object)}
                    >
                      <FilePreview ext={ext?.substring(1)} object={object} />
                      <span className="truncate max-w-[40vw]">{filename}</span>
                      {ext && <span className="text-base-content/60">{ext}</span>}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap">
                  {readableBytes(object.size)}
                </td>
                <td className="whitespace-nowrap">
                  {dayjs(object.lastModified).fromNow()}
                </td>
                <ObjectActions
                  prefix={data.prefix}
                  object={object}
                  end={
                    idx >= data.objects.length - 2 && data.objects.length > 5
                  }
                />
              </tr>
            );
          })}
        </Table.Body>
      </Table>

      <GotoTopButton />
    </div>
  );
};

type FilePreviewProps = {
  ext?: string | null;
  object: Object;
};

const FilePreview = ({ ext, object }: FilePreviewProps) => {
  const type = mime.getType(ext || "")?.split("/")[0];
  let Icon = FileIcon;

  if (
    ["zip", "rar", "7z", "iso", "tar", "gz", "bz2", "xz"].includes(ext || "")
  ) {
    Icon = FileArchive;
  }

  if (type === "image") {
    const thumbnailSupport = ["jpg", "jpeg", "png", "gif"].includes(ext || "");
    return (
      <img
        src={API_URL + object.url + (thumbnailSupport ? "?thumb=1" : "?view=1")}
        alt={object.objectKey}
        className="size-5 object-cover overflow-hidden mr-2"
      />
    );
  }

  if (type === "text") {
    Icon = FileType;
  }

  return (
    <Icon
      size={20}
      className="text-base-content/60 group-hover:text-neutral-content/80 mr-2"
    />
  );
};

export default ObjectList;
