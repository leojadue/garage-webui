import { Modal } from "react-daisyui";
import Button from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { LifecycleRule } from "./lifecycle-tab";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (rule: LifecycleRule) => void;
  rule: LifecycleRule | null;
  existingIds: string[];
};

const EXPIRATION_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
  { label: "365 days", days: 365 },
];

const LifecycleRuleDialog = ({
  open,
  onClose,
  onSave,
  rule,
  existingIds,
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [id, setId] = useState("");
  const [prefix, setPrefix] = useState("");
  const [expirationDays, setExpirationDays] = useState(0);
  const [abortMultipartDays, setAbortMultipartDays] = useState(0);
  const [error, setError] = useState("");

  const isEditing = !!rule;

  useEffect(() => {
    if (open) {
      if (rule) {
        setId(rule.id);
        setPrefix(rule.prefix);
        setExpirationDays(rule.expirationDays);
        setAbortMultipartDays(rule.abortMultipartDays);
      } else {
        setId("");
        setPrefix("");
        setExpirationDays(30);
        setAbortMultipartDays(7);
      }
      setError("");
    }
  }, [open, rule]);

  const validate = (): string | null => {
    if (!id.trim()) return "Rule ID is required";
    if (!isEditing && existingIds.includes(id.trim())) return "Rule ID already exists";
    if (expirationDays <= 0 && abortMultipartDays <= 0)
      return "At least one action is required";
    return null;
  };

  const onSubmit = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    onSave({
      id: id.trim(),
      status: rule?.status || "Enabled",
      prefix: prefix.trim(),
      expirationDays,
      abortMultipartDays,
    });
  };

  return (
    <Modal ref={dialogRef} open={open} backdrop>
      <Modal.Header>
        {isEditing ? `Edit Rule "${rule.id}"` : "New Lifecycle Rule"}
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          {/* Rule ID */}
          <div>
            <label className="label label-text text-xs opacity-70">
              Rule ID
            </label>
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              placeholder="e.g. expire-logs"
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={isEditing}
            />
          </div>

          {/* Prefix filter */}
          <div>
            <label className="label label-text text-xs opacity-70">
              Prefix Filter{" "}
              <span className="opacity-50">(optional — empty = all objects)</span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm w-full font-mono"
              placeholder="e.g. logs/ or temp/"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </div>

          {/* Object expiration */}
          <div>
            <label className="label label-text text-xs opacity-70">
              Expire objects after (days)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="input input-bordered input-sm w-24"
                min={0}
                value={expirationDays || ""}
                onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
              <span className="text-xs opacity-50">days</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EXPIRATION_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  className={`btn btn-xs ${
                    expirationDays === preset.days
                      ? "btn-primary"
                      : "btn-ghost bg-base-200"
                  }`}
                  onClick={() => setExpirationDays(preset.days)}
                >
                  {preset.label}
                </button>
              ))}
              {expirationDays > 0 && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => setExpirationDays(0)}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Abort incomplete multipart */}
          <div>
            <label className="label label-text text-xs opacity-70">
              Abort incomplete multipart uploads after (days)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="input input-bordered input-sm w-24"
                min={0}
                value={abortMultipartDays || ""}
                onChange={(e) =>
                  setAbortMultipartDays(parseInt(e.target.value) || 0)
                }
                placeholder="0"
              />
              <span className="text-xs opacity-50">days</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                className={`btn btn-xs ${
                  abortMultipartDays === 1
                    ? "btn-primary"
                    : "btn-ghost bg-base-200"
                }`}
                onClick={() => setAbortMultipartDays(1)}
              >
                1 day
              </button>
              <button
                type="button"
                className={`btn btn-xs ${
                  abortMultipartDays === 7
                    ? "btn-primary"
                    : "btn-ghost bg-base-200"
                }`}
                onClick={() => setAbortMultipartDays(7)}
              >
                7 days
              </button>
              <button
                type="button"
                className={`btn btn-xs ${
                  abortMultipartDays === 14
                    ? "btn-primary"
                    : "btn-ghost bg-base-200"
                }`}
                onClick={() => setAbortMultipartDays(14)}
              >
                14 days
              </button>
              {abortMultipartDays > 0 && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => setAbortMultipartDays(0)}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-error text-sm py-2">{error}</div>
          )}
        </div>
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="primary" onClick={onSubmit}>
          {isEditing ? "Save Changes" : "Create Rule"}
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default LifecycleRuleDialog;
