import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  Filter,
  Download,
  ShieldAlert,
  RotateCcw,
  DollarSign,
  Package,
  Users,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { apiService, AuditLog } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface AuditLogsTabProps {
  userMode: "admin" | "gangmember" | "viewer2";
}

export function AuditLogsTab({ userMode }: AuditLogsTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    let isSubscribed = true;

    apiService.getAuditLogs()
      .then((data) => {
        if (isSubscribed) {
          setLogs(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching audit logs:", err);
        if (isSubscribed) setLoading(false);
      });

    const unsubscribe = apiService.subscribeToAuditLogs((newLogs) => {
      if (isSubscribed && Array.isArray(newLogs)) {
        setLogs(newLogs);
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getCategoryBadge = (category: string) => {
    if (category === "dues") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-orbitron font-bold uppercase bg-amber-50 border border-amber-200 text-amber-700">
          Weekly Dues
        </span>
      );
    }
    if (category === "reset") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-orbitron font-bold uppercase bg-rose-50 border border-rose-200 text-rose-700 animate-pulse">
          Cycle Reset
        </span>
      );
    }
    if (category === "inventory") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-orbitron font-bold uppercase bg-blue-50 border border-blue-200 text-blue-700">
          Stash / Armory
        </span>
      );
    }
    if (category === "members") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-orbitron font-bold uppercase bg-purple-50 border border-purple-200 text-purple-700">
          Roster
        </span>
      );
    }
    if (category === "vault") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-orbitron font-bold uppercase bg-emerald-50 border border-emerald-200 text-emerald-700">
          Vault Cash
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-orbitron font-bold uppercase bg-slate-100 border border-slate-200 text-slate-600">
        {category}
      </span>
    );
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      log.description.toLowerCase().includes(q) ||
      log.performedBy.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === "all" || log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Export to JSON
  const handleExportJson = () => {
    soundFx.playClickSound();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `red_network_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const [copiedAll, setCopiedAll] = useState(false);

  const formatRelativeTime = (isoString: string) => {
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffMs = now.getTime() - past.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHour / 24);

      if (diffSec < 60) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  const handleCopyLogs = () => {
    soundFx.playClickSound();
    const textData = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.category.toUpperCase()}] ${l.action}: ${l.description} (by ${l.performedBy})`)
      .join("\n");
    navigator.clipboard.writeText(textData);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6 font-rajdhani">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl md:text-3xl font-orbitron font-extrabold text-slate-900">
              SYNDICATE AUDIT LEDGER
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-50 border border-red-200 text-red-700 shadow-sm">
              {logs.length} Recorded Events
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">
            Cryptographically signed activity records for dues verification, weekly resets, stash alterations, and member status changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopyLogs}
            variant="outline"
            className="bg-white border-slate-200 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 text-slate-700 hover:text-slate-900 shadow-sm"
          >
            {copiedAll ? "Copied! ✓" : "Copy Plaintext"}
          </Button>
          <Button
            onClick={handleExportJson}
            variant="outline"
            className="bg-white border-slate-200 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 text-slate-700 hover:text-slate-900 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export (JSON)
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="card-gang p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search description, operator, action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 text-sm font-rajdhani text-slate-900 focus:border-red-500"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Logs" },
              { id: "dues", label: "Weekly Dues" },
              { id: "reset", label: "Cycle Resets" },
              { id: "inventory", label: "Stash / Armory" },
              { id: "members", label: "Roster Changes" },
              { id: "vault", label: "Vault Cash" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? "bg-red-600 text-white shadow-sm border border-red-600"
                    : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Logs Table / List */}
      <Card className="card-gang overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-rajdhani">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-orbitron uppercase text-slate-500">
              <tr>
                <th className="py-3 px-4">Time / Age</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Event Action</th>
                <th className="py-3 px-4">Details & Description</th>
                <th className="py-3 px-4 text-right">Executor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-red-600 font-orbitron animate-pulse">
                    Decrypting syndicate audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No activity logs recorded matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-red-50/40 transition-colors duration-150 group"
                  >
                    <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                      <span className="text-slate-900 font-semibold block">{formatRelativeTime(log.timestamp)}</span>
                      <span className="text-[10px] text-slate-400">{formatDate(log.timestamp)}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getCategoryBadge(log.category)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs uppercase font-bold text-red-700 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-red-50 border border-red-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-bold text-slate-700 font-mono whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                        {log.performedBy || "System"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
