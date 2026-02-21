import { createDisclosure } from "@/lib/disclosure";
import { Modal } from "react-daisyui";
import { useBucketContext } from "../context";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import api from "@/lib/api";

export const shareDialog = createDisclosure<{ key: string; prefix: string }>();

const EXPIRATION_OPTIONS = [
  { label: "15 minutes", seconds: 900 },
  { label: "1 hour", seconds: 3600 },
  { label: "6 hours", seconds: 21600 },
  { label: "12 hours", seconds: 43200 },
  { label: "24 hours", seconds: 86400 },
  { label: "3 days", seconds: 259200 },
  { label: "7 days", seconds: 604800 },
];

const ShareDialog = () => {
  const { isOpen, data, dialogRef } = shareDialog.use();
  const { bucketName } = useBucketContext();
  const [expires, setExpires] = useState(3600);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullKey = (data?.prefix || "") + (data?.key || "");

  useEffect(() => {
    if (!isOpen) {
      setUrl(null);
      setError(null);
      setLoading(false);
      return;
    }
    generateUrl(expires);
  }, [isOpen, data]);

  const generateUrl = async (expiresIn: number) => {
    if (!data?.key || !bucketName) return;
    setLoading(true);
    setError(null);
    setUrl(null);

    try {
      const result = await api.get<{ url: string; expiresIn: number }>(
        `/presign/${bucketName}/${fullKey}`,
        { params: { expires: expiresIn } }
      );
      setUrl(result.url);
    } catch (err) {
      setError((err as Error)?.message || "Failed to generate share link");
    } finally {
      setLoading(false);
    }
  };

  const handleExpiresChange = (value: number) => {
    setExpires(value);
    generateUrl(value);
  };

  return (
    <Modal ref={dialogRef} open={isOpen} backdrop>
      <Modal.Header className="truncate">Share {data?.key || ""}</Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <label className="label label-text text-xs opacity-70">
            Link expires in
          </label>
          <div className="flex flex-wrap gap-1.5">
            {EXPIRATION_OPTIONS.map((opt) => (
              <button
                key={opt.seconds}
                onClick={() => handleExpiresChange(opt.seconds)}
                className={`btn btn-xs ${
                  expires === opt.seconds
                    ? "btn-primary"
                    : "btn-ghost bg-base-200"
                }`}
              >
                {expires === opt.seconds && (
                  <Check className="w-3 h-3" />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="alert alert-error text-sm mb-3">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-4 justify-center text-sm opacity-60">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating link...
          </div>
        )}

        {url && !loading && (
          <div className="space-y-3">
            <div className="bg-base-200 rounded-lg p-3 break-all text-sm font-mono select-all max-h-24 overflow-y-auto">
              {url}
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                color="primary"
                onClick={() => copyToClipboard(url)}
              >
                <Copy className="w-4 h-4" />
                Copy link
              </Button>
              <Button
                className="flex-1"
                color="ghost"
                onClick={() => window.open(url, "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
                Open in browser
              </Button>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={() => shareDialog.close()}>Close</Button>
      </Modal.Actions>
    </Modal>
  );
};

export default ShareDialog;
