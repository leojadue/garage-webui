import { createDisclosure } from "@/lib/disclosure";
import { Modal } from "react-daisyui";
import { API_URL } from "@/lib/api";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import { readableBytes, dayjs } from "@/lib/utils";
import {
  Download,
  ExternalLink,
  FileIcon,
  Loader2,
  X,
} from "lucide-react";
import { Object } from "./types";

type PreviewData = {
  object: Object;
  prefix: string;
};

export const previewDialog = createDisclosure<PreviewData>();

type FileCategory = "image" | "video" | "audio" | "pdf" | "text" | "other";

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "json", "xml", "yaml", "yml", "js", "ts", "tsx", "jsx",
  "css", "html", "htm", "py", "go", "sh", "bash", "sql", "log", "csv",
  "env", "toml", "ini", "cfg", "conf", "makefile", "dockerfile", "rs",
  "rb", "php", "java", "c", "cpp", "h", "hpp", "gitignore", "dockerignore",
  "lock",
]);

const getFileCategory = (filename: string): FileCategory => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "ico", "bmp", "avif", "svg"].includes(ext))
    return "image";
  if (["mp4", "webm", "ogg", "mov"].includes(ext)) return "video";
  if (["mp3", "wav", "flac", "aac", "m4a"].includes(ext)) return "audio";
  if (ext === "pdf") return "pdf";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "other";
};

const PreviewDialog = () => {
  const { isOpen, data, dialogRef } = previewDialog.use();

  if (!isOpen || !data) return null;

  const { object, prefix } = data;
  const viewUrl = API_URL + object.url + "?view=1";
  const downloadUrl = API_URL + object.url + "?dl=1";
  const filename = object.objectKey;
  const category = getFileCategory(filename);

  return (
    <Modal
      ref={dialogRef}
      open={isOpen}
      backdrop
      className={`max-w-5xl w-[95vw] ${
        category === "text" || category === "pdf" ? "max-h-[90vh]" : ""
      }`}
    >
      <Modal.Header className="flex items-center gap-2 pr-2">
        <span className="truncate flex-1 text-sm font-medium">
          {prefix}
          <span className="font-semibold">{filename}</span>
        </span>
        <span className="text-xs opacity-50 whitespace-nowrap">
          {readableBytes(object.size)}
        </span>
        <button
          className="btn btn-ghost btn-sm btn-circle"
          onClick={() => previewDialog.close()}
        >
          <X size={16} />
        </button>
      </Modal.Header>

      <Modal.Body className="p-0 overflow-hidden">
        <PreviewContent
          category={category}
          viewUrl={viewUrl}
          filename={filename}
          object={object}
        />
      </Modal.Body>

      <Modal.Actions>
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs opacity-40 flex-1">
            {dayjs(object.lastModified).format("YYYY-MM-DD HH:mm:ss")}
          </span>
          <Button
            size="sm"
            color="ghost"
            onClick={() => window.open(viewUrl, "_blank")}
          >
            <ExternalLink size={14} />
            Open in tab
          </Button>
          <Button
            size="sm"
            color="primary"
            onClick={() => window.open(downloadUrl, "_blank")}
          >
            <Download size={14} />
            Download
          </Button>
        </div>
      </Modal.Actions>
    </Modal>
  );
};

type PreviewContentProps = {
  category: FileCategory;
  viewUrl: string;
  filename: string;
  object: Object;
};

const PreviewContent = ({
  category,
  viewUrl,
  filename,
  object,
}: PreviewContentProps) => {
  switch (category) {
    case "image":
      return <ImagePreview url={viewUrl} alt={filename} />;
    case "video":
      return <VideoPreview url={viewUrl} />;
    case "audio":
      return <AudioPreview url={viewUrl} filename={filename} size={object.size} />;
    case "pdf":
      return <PdfPreview url={viewUrl} />;
    case "text":
      return <TextPreview url={viewUrl} filename={filename} />;
    default:
      return <OtherPreview filename={filename} size={object.size} />;
  }
};

const ImagePreview = ({ url, alt }: { url: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="flex items-center justify-center bg-base-300/50 min-h-[200px] relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin opacity-40" />
        </div>
      )}
      <img
        src={url}
        alt={alt}
        className="max-h-[70vh] max-w-full object-contain"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

const VideoPreview = ({ url }: { url: string }) => (
  <div className="flex items-center justify-center bg-black">
    <video
      src={url}
      controls
      autoPlay
      className="max-h-[70vh] max-w-full"
    >
      Your browser does not support the video tag.
    </video>
  </div>
);

const AudioPreview = ({
  url,
  filename,
  size,
}: {
  url: string;
  filename: string;
  size: number;
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 gap-6 bg-base-300/30">
    <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
      <FileIcon size={40} className="text-primary" />
    </div>
    <div className="text-center">
      <p className="font-medium">{filename}</p>
      <p className="text-sm opacity-50">{readableBytes(size)}</p>
    </div>
    <audio src={url} controls autoPlay className="w-full max-w-md" />
  </div>
);

const PdfPreview = ({ url }: { url: string }) => (
  <iframe src={url} className="w-full h-[70vh] border-0" title="PDF Preview" />
);

const TextPreview = ({
  url,
  filename,
}: {
  url: string;
  filename: string;
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setContent(null);

    fetch(url, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        // Limit display to 500KB to prevent browser freeze
        if (text.length > 500_000) {
          setContent(
            text.substring(0, 500_000) + "\n\n--- Truncated (500KB limit) ---"
          );
        } else {
          setContent(text);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin opacity-40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-error text-sm">
        Failed to load preview: {error}
      </div>
    );
  }

  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const isJson = ext === "json";

  let displayContent = content || "";
  if (isJson) {
    try {
      displayContent = JSON.stringify(JSON.parse(displayContent), null, 2);
    } catch {
      // not valid JSON, show as-is
    }
  }

  return (
    <div className="overflow-auto max-h-[70vh] bg-base-300/30">
      <pre className="p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words select-all">
        {displayContent}
      </pre>
    </div>
  );
};

const OtherPreview = ({
  filename,
  size,
}: {
  filename: string;
  size: number;
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
    <div className="w-20 h-20 rounded-2xl bg-base-300 flex items-center justify-center">
      <FileIcon size={36} className="opacity-40" />
    </div>
    <div className="text-center">
      <p className="font-medium">{filename}</p>
      <p className="text-sm opacity-50">{readableBytes(size)}</p>
    </div>
    <p className="text-sm opacity-40">No preview available for this file type</p>
  </div>
);

export default PreviewDialog;
