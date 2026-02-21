import Page from "@/context/page-context";
import { useNodesHealth } from "./hooks";
import StatsCard from "./components/stats-card";
import {
  Database,
  FileBox,
  HardDrive,
  Leaf,
  PieChart,
  Package,
  FolderOpen,
} from "lucide-react";
import { cn, readableBytes, ucfirst } from "@/lib/utils";
import { useBuckets } from "../buckets/hooks";
import { useMemo } from "react";
import { Bucket } from "../buckets/types";

const BUCKET_COLORS = [
  "bg-primary",
  "bg-secondary",
  "bg-accent",
  "bg-info",
  "bg-success",
  "bg-warning",
  "bg-error",
  "bg-primary/60",
  "bg-secondary/60",
  "bg-accent/60",
];

const HomePage = () => {
  const { data: health } = useNodesHealth();
  const { data: buckets } = useBuckets();

  const stats = useMemo(() => {
    if (!buckets) return null;
    const totalBytes = buckets.reduce((acc, b) => acc + b.bytes, 0);
    const totalObjects = buckets.reduce((acc, b) => acc + b.objects, 0);
    const sorted = [...buckets].sort((a, b) => b.bytes - a.bytes);
    return { totalBytes, totalObjects, sorted };
  }, [buckets]);

  const partitionPct =
    health && health.partitions > 0
      ? Math.round((health.partitionsAllOk / health.partitions) * 100)
      : 0;

  const nodesPct =
    health && health.storageNodes > 0
      ? Math.round((health.storageNodesUp / health.storageNodes) * 100)
      : 0;

  return (
    <div className="container">
      <Page title="Dashboard" />

      {/* Top stats row */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <StatsCard
          title="Status"
          icon={Leaf}
          value={ucfirst(health?.status)}
          valueClassName={cn(
            health?.status === "healthy"
              ? "text-success"
              : health?.status === "degraded"
                ? "text-warning"
                : "text-error"
          )}
        />
        <StatsCard
          title="Storage Nodes"
          icon={HardDrive}
          value={
            health
              ? `${health.storageNodesUp} / ${health.storageNodes}`
              : undefined
          }
        />
        <StatsCard
          title="Partitions OK"
          icon={FileBox}
          value={
            health
              ? `${health.partitionsAllOk} / ${health.partitions}`
              : undefined
          }
        />
        <StatsCard
          title="Total Storage"
          icon={PieChart}
          value={readableBytes(stats?.totalBytes)}
        />
        <StatsCard
          title="Total Objects"
          icon={Package}
          value={stats?.totalObjects}
        />
      </section>

      {/* Health gauges */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-base-100 rounded-box p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-2">
              <Database size={16} /> Node Health
            </span>
            <span className="text-sm font-bold">{nodesPct}%</span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-3">
            <div
              className={cn(
                "h-3 rounded-full transition-all duration-500",
                nodesPct === 100
                  ? "bg-success"
                  : nodesPct >= 50
                    ? "bg-warning"
                    : "bg-error"
              )}
              style={{ width: `${nodesPct}%` }}
            />
          </div>
          <p className="text-xs opacity-50 mt-2">
            {health?.storageNodesUp ?? "..."} of {health?.storageNodes ?? "..."}{" "}
            storage nodes active
          </p>
        </div>

        <div className="bg-base-100 rounded-box p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-2">
              <FileBox size={16} /> Partition Health
            </span>
            <span className="text-sm font-bold">{partitionPct}%</span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-3">
            <div
              className={cn(
                "h-3 rounded-full transition-all duration-500",
                partitionPct === 100
                  ? "bg-success"
                  : partitionPct >= 50
                    ? "bg-warning"
                    : "bg-error"
              )}
              style={{ width: `${partitionPct}%` }}
            />
          </div>
          <p className="text-xs opacity-50 mt-2">
            {health?.partitionsAllOk ?? "..."} of {health?.partitions ?? "..."}{" "}
            partitions fully healthy ·{" "}
            {health?.partitionsQuorum ?? "..."} quorum
          </p>
        </div>
      </section>

      {/* Storage by bucket */}
      {stats && stats.sorted.length > 0 && (
        <section className="bg-base-100 rounded-box p-5 mt-6">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <FolderOpen size={16} /> Storage by Bucket
          </h3>
          <div className="space-y-3">
            {stats.sorted.map((bucket, idx) => (
              <BucketBar
                key={bucket.id}
                bucket={bucket}
                maxBytes={stats.sorted[0].bytes}
                totalBytes={stats.totalBytes}
                color={BUCKET_COLORS[idx % BUCKET_COLORS.length]}
              />
            ))}
          </div>
        </section>
      )}

      {/* Bucket table */}
      {stats && stats.sorted.length > 0 && (
        <section className="bg-base-100 rounded-box p-5 mt-6">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Package size={16} /> Bucket Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Bucket</th>
                  <th className="text-right">Objects</th>
                  <th className="text-right">Storage</th>
                  <th className="text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.sorted.map((bucket) => {
                  const name =
                    bucket.globalAliases?.[0] ||
                    bucket.localAliases?.[0]?.alias ||
                    bucket.id.substring(0, 12);
                  const pct =
                    stats.totalBytes > 0
                      ? ((bucket.bytes / stats.totalBytes) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <tr key={bucket.id} className="hover">
                      <td className="font-mono text-sm">{name}</td>
                      <td className="text-right tabular-nums">
                        {bucket.objects.toLocaleString()}
                      </td>
                      <td className="text-right tabular-nums">
                        {readableBytes(bucket.bytes)}
                      </td>
                      <td className="text-right tabular-nums">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td>Total</td>
                  <td className="text-right tabular-nums">
                    {stats.totalObjects.toLocaleString()}
                  </td>
                  <td className="text-right tabular-nums">
                    {readableBytes(stats.totalBytes)}
                  </td>
                  <td className="text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

type BucketBarProps = {
  bucket: Bucket;
  maxBytes: number;
  totalBytes: number;
  color: string;
};

const BucketBar = ({ bucket, maxBytes, totalBytes, color }: BucketBarProps) => {
  const name =
    bucket.globalAliases?.[0] ||
    bucket.localAliases?.[0]?.alias ||
    bucket.id.substring(0, 12);
  const pct = maxBytes > 0 ? (bucket.bytes / maxBytes) * 100 : 0;
  const totalPct =
    totalBytes > 0 ? ((bucket.bytes / totalBytes) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-mono truncate mr-2">{name}</span>
        <span className="text-xs opacity-60 whitespace-nowrap">
          {readableBytes(bucket.bytes)} · {bucket.objects} obj · {totalPct}%
        </span>
      </div>
      <div className="w-full bg-base-300 rounded-full h-2.5">
        <div
          className={cn("h-2.5 rounded-full transition-all duration-700", color)}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
    </div>
  );
};

export default HomePage;
