import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useBucketContext } from "../context";
import { useState } from "react";
import Button from "@/components/ui/button";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import {
  Clock,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Trash,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { Alert, Loading } from "react-daisyui";
import LifecycleRuleDialog from "./lifecycle-rule-dialog";
import { usePermission } from "@/hooks/usePermission";

export type LifecycleRule = {
  id: string;
  status: string;
  prefix: string;
  expirationDays: number;
  abortMultipartDays: number;
};

type LifecycleConfig = {
  rules: LifecycleRule[];
};

const LifecycleTab = () => {
  const { bucketName } = useBucketContext();
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<LifecycleRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { canManageLifecycle } = usePermission();

  const { data, isLoading, error } = useQuery({
    queryKey: ["lifecycle", bucketName],
    queryFn: () => api.get<LifecycleConfig>(`/lifecycle/${bucketName}`),
  });

  const saveMutation = useMutation({
    mutationFn: (config: LifecycleConfig) =>
      api.post(`/lifecycle/${bucketName}`, { body: config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lifecycle", bucketName] });
      toast.success("Lifecycle rules saved");
    },
    onError: handleError,
  });

  const rules = data?.rules || [];

  const onAddRule = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const onEditRule = (rule: LifecycleRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const onSaveRule = (rule: LifecycleRule) => {
    const updated = editingRule
      ? rules.map((r) => (r.id === editingRule.id ? rule : r))
      : [...rules, rule];
    saveMutation.mutate({ rules: updated });
    setDialogOpen(false);
  };

  const onDeleteRule = (ruleId: string) => {
    if (!window.confirm("Delete this lifecycle rule?")) return;
    const updated = rules.filter((r) => r.id !== ruleId);
    saveMutation.mutate({ rules: updated });
  };

  const onToggleRule = (ruleId: string) => {
    const updated = rules.map((r) =>
      r.id === ruleId
        ? { ...r, status: r.status === "Enabled" ? "Disabled" : "Enabled" }
        : r
    );
    saveMutation.mutate({ rules: updated });
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
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium">Lifecycle Rules</h3>
          <p className="text-xs opacity-50 mt-0.5">
            Automatically expire or clean up objects based on rules
          </p>
        </div>
        {canManageLifecycle && (
          <Button size="sm" color="primary" onClick={onAddRule} className="gap-1">
            <Plus size={14} />
            Add Rule
          </Button>
        )}
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-10 h-10 mx-auto opacity-20 mb-3" />
          <p className="text-sm opacity-50">No lifecycle rules configured</p>
          <p className="text-xs opacity-30 mt-1">
            Add rules to auto-expire objects or clean up incomplete uploads
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => onEditRule(rule)}
              onDelete={() => onDeleteRule(rule.id)}
              onToggle={() => onToggleRule(rule.id)}
              saving={saveMutation.isPending}
              canManage={canManageLifecycle}
            />
          ))}
        </div>
      )}

      {saveMutation.isPending && (
        <div className="flex items-center gap-2 mt-4 text-xs opacity-50">
          <Loader2 size={12} className="animate-spin" />
          Saving...
        </div>
      )}

      <LifecycleRuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={onSaveRule}
        rule={editingRule}
        existingIds={rules.map((r) => r.id)}
      />
    </div>
  );
};

type RuleCardProps = {
  rule: LifecycleRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  saving: boolean;
  canManage: boolean;
};

const RuleCard = ({ rule, onEdit, onDelete, onToggle, saving, canManage }: RuleCardProps) => {
  const isEnabled = rule.status === "Enabled";

  return (
    <div
      className={`border rounded-lg p-4 ${
        isEnabled ? "border-base-300" : "border-base-300/50 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium truncate">
              {rule.id}
            </span>
            <span
              className={`badge badge-xs ${
                isEnabled ? "badge-success" : "badge-ghost"
              }`}
            >
              {rule.status}
            </span>
          </div>

          <div className="mt-2 space-y-1">
            {rule.prefix && (
              <p className="text-xs opacity-60">
                <span className="font-medium">Prefix:</span>{" "}
                <code className="bg-base-200 px-1 rounded">{rule.prefix}</code>
              </p>
            )}
            {!rule.prefix && (
              <p className="text-xs opacity-40">Applies to all objects</p>
            )}

            <div className="flex flex-wrap gap-3 mt-1.5">
              {rule.expirationDays > 0 && (
                <span className="text-xs flex items-center gap-1">
                  <AlertTriangle size={12} className="text-warning" />
                  Expire after{" "}
                  <strong>
                    {rule.expirationDays} day{rule.expirationDays !== 1 ? "s" : ""}
                  </strong>
                </span>
              )}
              {rule.abortMultipartDays > 0 && (
                <span className="text-xs flex items-center gap-1">
                  <Clock size={12} className="text-info" />
                  Abort multipart after{" "}
                  <strong>
                    {rule.abortMultipartDays} day
                    {rule.abortMultipartDays !== 1 ? "s" : ""}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              color="ghost"
              onClick={onToggle}
              disabled={saving}
              title={isEnabled ? "Disable" : "Enable"}
            >
              {isEnabled ? <PowerOff size={14} /> : <Power size={14} />}
            </Button>
            <Button size="sm" color="ghost" onClick={onEdit} disabled={saving}>
              <Pencil size={14} />
            </Button>
            <Button
              size="sm"
              color="ghost"
              onClick={onDelete}
              disabled={saving}
              className="text-error"
            >
              <Trash size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LifecycleTab;
