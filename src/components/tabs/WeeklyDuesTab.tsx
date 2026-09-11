import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  History,
  Calendar,
  Sparkles,
  Users,
  Award,
  Lock,
  PlusCircle,
  MinusCircle,
  Edit3,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Coins,
} from "lucide-react";
import { apiService, Member, WeeklyPaymentRecord, Cycle, Transaction, GangFund } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface WeeklyDuesTabProps {
  userMode: "admin" | "gangmember" | "viewer2";
}

export function WeeklyDuesTab({ userMode }: WeeklyDuesTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklyPaymentRecord[]>([]);
  const [cycle, setCycle] = useState<Cycle>({
    currentWeekNumber: 1,
    cycleStartDate: new Date().toISOString(),
    lastResetAt: new Date().toISOString(),
    lastResetBy: "RED COMMAND",
  });
  const [gangFund, setGangFund] = useState<GangFund | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isLeader = userMode === "admin";

  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      try {
        const [m, recs, c, fund, txs] = await Promise.all([
          apiService.getMembers().catch(() => []),
          apiService.getWeeklyPaymentRecords().catch(() => []),
          apiService.getCycle().catch(() => ({
            currentWeekNumber: 1,
            cycleStartDate: new Date().toISOString(),
            lastResetAt: new Date().toISOString(),
            lastResetBy: "RED COMMAND",
          })),
          apiService.getGangFund().catch(() => null),
          apiService.getTransactions().catch(() => []),
        ]);

        if (isSubscribed) {
          setMembers(Array.isArray(m) ? m : []);
          setWeeklyRecords(Array.isArray(recs) ? recs : []);
          setCycle(c);
          setSelectedWeek(c.currentWeekNumber || 1);
          if (fund) {
            setGangFund(fund);
            setNewBaseFundInput(String(fund.baseAmount ?? 350000));
          }
          setTransactions(Array.isArray(txs) ? txs : []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading weekly dues data:", err);
        if (isSubscribed) setLoading(false);
      }
    };

    loadData();

    const unsubMembers = apiService.subscribeToMembers((newMembers) => {
      if (isSubscribed && Array.isArray(newMembers)) setMembers(newMembers);
    });

    const unsubRecords = apiService.subscribeToWeeklyPaymentRecords((newRecords) => {
      if (isSubscribed && Array.isArray(newRecords)) setWeeklyRecords(newRecords);
    });

    const unsubCycle = apiService.subscribeToCycle((newCycle) => {
      if (isSubscribed && newCycle) {
        setCycle(newCycle);
        setSelectedWeek((prev) => (prev > newCycle.currentWeekNumber ? newCycle.currentWeekNumber : prev));
      }
    });

    const unsubFund = apiService.subscribeToGangFund((fund) => {
      if (isSubscribed && fund) {
        setGangFund(fund);
        setNewBaseFundInput(String(fund.baseAmount ?? 350000));
      }
    });

    const unsubTx = apiService.subscribeToTransactions((txs) => {
      if (isSubscribed && Array.isArray(txs)) {
        setTransactions(txs);
      }
    });

    return () => {
      isSubscribed = false;
      unsubMembers();
      unsubRecords();
      unsubCycle();
      unsubFund();
      unsubTx();
    };
  }, []);

  const isCurrentWeekSelected = selectedWeek === cycle.currentWeekNumber;

  // Helper to get hasPaidSvc from record notes
  const getHasPaidSvc = (memberId: string): boolean => {
    const rec = weeklyRecords.find((r) => r.memberId === memberId && r.weekNumber === selectedWeek);
    if (!rec?.notes) return false;
    try {
      const parsed = JSON.parse(rec.notes);
      return !!parsed.hasPaidSvc;
    } catch {
      return false;
    }
  };

  // Toggle Cash payment status
  const handleToggleCashPayment = async (member: Member) => {
    if (!isLeader) return;
    setTogglingId(member.id + "_cash");

    try {
      const recordForWeek = weeklyRecords.find(
        (r) => r.memberId === member.id && r.weekNumber === selectedWeek
      );

      const currentlyPaid = isCurrentWeekSelected ? !!member.hasPaid : !!recordForWeek?.hasPaid;
      const nextPaidState = !currentlyPaid;

      await apiService.upsertWeeklyPaymentRecord({
        memberId: member.id,
        memberName: member.name,
        weekNumber: selectedWeek,
        weekStart: cycle.cycleStartDate,
        weekEnd: new Date().toISOString(),
        contribution: member.contribution || 50000,
        contributionSvc: member.contributionSvc ?? 100,
        hasPaid: nextPaidState,
        paymentDate: nextPaidState ? new Date().toISOString().split("T")[0] : undefined,
        markedBy: "Red Leader",
        notes: (() => {
          const rec = weeklyRecords.find((r) => r.memberId === member.id && r.weekNumber === selectedWeek);
          try { const existing = rec?.notes ? JSON.parse(rec.notes) : {}; return JSON.stringify(existing); } catch { return "{}"; }
        })(),
      });

      if (nextPaidState) {
        soundFx.playCashSound();
      } else {
        soundFx.playClickSound();
      }

      if (isCurrentWeekSelected) {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, hasPaid: nextPaidState } : m))
        );
      }
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to update cash payment status");
    } finally {
      setTogglingId(null);
    }
  };

  // Toggle SVC payment status (stored in record notes as JSON)
  const handleToggleSvcPayment = async (member: Member) => {
    if (!isLeader) return;
    setTogglingId(member.id + "_svc");

    try {
      const recordForWeek = weeklyRecords.find(
        (r) => r.memberId === member.id && r.weekNumber === selectedWeek
      );

      const currentHasPaidSvc = getHasPaidSvc(member.id);
      const nextSvcState = !currentHasPaidSvc;
      const existingNotes = (() => {
        try { return recordForWeek?.notes ? JSON.parse(recordForWeek.notes) : {}; } catch { return {}; }
      })();

      await apiService.upsertWeeklyPaymentRecord({
        memberId: member.id,
        memberName: member.name,
        weekNumber: selectedWeek,
        weekStart: cycle.cycleStartDate,
        weekEnd: new Date().toISOString(),
        contribution: member.contribution || 50000,
        contributionSvc: member.contributionSvc ?? 100,
        hasPaid: isCurrentWeekSelected ? !!member.hasPaid : !!recordForWeek?.hasPaid,
        markedBy: "Red Leader",
        notes: JSON.stringify({ ...existingNotes, hasPaidSvc: nextSvcState }),
      });

      if (nextSvcState) {
        soundFx.playCryptoSound();
      } else {
        soundFx.playClickSound();
      }

      // Update local records immediately
      setWeeklyRecords((prev) => {
        const idx = prev.findIndex((r) => r.memberId === member.id && r.weekNumber === selectedWeek);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            notes: JSON.stringify({ ...existingNotes, hasPaidSvc: nextSvcState }),
          };
          return updated;
        }
        return prev;
      });
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to update SVC payment status");
    } finally {
      setTogglingId(null);
    }
  };

  // Keep old handleTogglePayment for backward compatibility (same as Cash toggle)
  const handleTogglePayment = handleToggleCashPayment;

  // Execute weekly cycle reset
  const handleWeeklyReset = async () => {
    if (!isLeader) return;
    setIsResetting(true);
    try {
      const res = await apiService.resetWeeklyCycle("Red Leader");
      soundFx.playSirenSound();
      setIsResetDialogOpen(false);
      if (res && res.currentWeekNumber) {
        setSelectedWeek(res.currentWeekNumber);
      }
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to execute weekly reset");
    } finally {
      setIsResetting(false);
    }
  };

  // Compile member records for selected week
  const weekMemberRows = members.map((m) => {
    const rec = weeklyRecords.find(
      (r) => r.memberId === m.id && r.weekNumber === selectedWeek
    );

    const isPaidCash = isCurrentWeekSelected ? !!m.hasPaid : !!rec?.hasPaid;
    const isPaidSvc = getHasPaidSvc(m.id);
    const paymentDate = isCurrentWeekSelected
      ? m.hasPaid
        ? rec?.paymentDate || "Verified"
        : undefined
      : rec?.paymentDate;

    return {
      member: m,
      isPaidCash,
      isPaidSvc,
      paymentDate,
      markedBy: rec?.markedBy || (isPaidCash ? "Leader" : undefined),
    };
  });

  const totalCashExpected = weekMemberRows.reduce((sum, r) => sum + (r.member.contribution || 0), 0);
  const totalCashCollected = weekMemberRows
    .filter((r) => r.isPaidCash)
    .reduce((sum, r) => sum + (r.member.contribution || 0), 0);
  const totalSvcExpected = weekMemberRows.reduce((sum, r) => sum + (r.member.contributionSvc ?? 100), 0);
  const totalSvcCollected = weekMemberRows
    .filter((r) => r.isPaidSvc)
    .reduce((sum, r) => sum + (r.member.contributionSvc ?? 100), 0);

  const collectionRate = totalCashExpected > 0 ? Math.round((totalCashCollected / totalCashExpected) * 100) : 0;
  const paidCount = weekMemberRows.filter((r) => r.isPaidCash).length;

  // Filtered rows
  const filteredRows = weekMemberRows.filter((row) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      row.member.name.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && row.isPaidCash) ||
      (statusFilter === "pending" && !row.isPaidCash);

    return matchesSearch && matchesStatus;
  });

  // Available weeks list (from 1 up to cycle.currentWeekNumber)
  const availableWeeks = Array.from(
    { length: Math.max(cycle.currentWeekNumber || 1, 1) },
    (_, i) => cycle.currentWeekNumber - i
  );

  return (
    <div className="space-y-6 font-rajdhani">
      {/* Top Banner & Reset Action */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl md:text-3xl font-orbitron font-extrabold text-gang-glow">
              WEEKLY DUES & CONTRIBUTIONS
            </h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-red-950 border border-red-500/50 text-red-300">
              Week #{selectedWeek} {isCurrentWeekSelected ? "(Current Active)" : "(Archived)"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track syndicate quotas, verify weekly gang dues, and initiate weekly reset cycles.
          </p>
        </div>

        {/* Action Buttons (Leader Only) */}
        <div className="flex items-center gap-2">
          {isLeader && (
            <Button
              onClick={() => {
                soundFx.playClickSound();
                setIsResetDialogOpen(true);
              }}
              className="bg-gradient-to-r from-red-700 via-rose-600 to-red-800 hover:from-red-600 hover:to-rose-500 text-white font-rajdhani font-bold px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Weekly Cycle
            </Button>
          )}
        </div>
      </div>

      {/* Progress & Quota Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash Quota Expected */}
        <Card className="card-gang p-4 border-l-4 border-l-red-600">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Cash Quota Expected
            </span>
            <DollarSign className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-xl font-orbitron font-bold text-foreground mt-2 font-mono">
            ${totalCashExpected.toLocaleString()}
          </p>
          <span className="text-xs text-muted-foreground">
            {members.length} registered syndicate operatives
          </span>
        </Card>

        {/* Cash Collected */}
        <Card className="card-gang p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Cash Collected
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xl font-orbitron font-bold text-emerald-400 mt-2 font-mono">
            ${totalCashCollected.toLocaleString()}
          </p>
          <span className="text-xs text-muted-foreground">
            {paidCount} of {members.length} Paid ({collectionRate}%)
          </span>
        </Card>

        {/* SVC Quota Expected */}
        <Card className="card-gang p-4 border-l-4 border-l-cyan-500 bg-gradient-to-br from-black via-cyan-950/20 to-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-cyan-300 uppercase font-bold tracking-wider">
                SVC Expected
              </span>
              <span className="px-1.5 rounded text-[9px] font-orbitron bg-cyan-950 border border-cyan-500/60 text-cyan-300 font-bold">CRYPTO</span>
            </div>
            <Coins className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-xl font-orbitron font-bold text-cyan-400 mt-2 font-mono flex items-center gap-1">
            {totalSvcExpected.toLocaleString()} <span className="text-sm text-cyan-300">SVC</span>
          </p>
          <span className="text-xs text-muted-foreground">
            Weekly crypto quota for {members.length} operatives
          </span>
        </Card>

        {/* SVC Collected */}
        <Card className="card-gang p-4 border-l-4 border-l-cyan-400 bg-gradient-to-br from-black via-cyan-950/15 to-black">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyan-300 uppercase font-bold tracking-wider">
              SVC Collected
            </span>
            <Award className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-xl font-orbitron font-bold text-cyan-400 mt-2 font-mono flex items-center gap-1">
            {totalSvcCollected.toLocaleString()} <span className="text-sm text-cyan-300">SVC</span>
          </p>
          <span className="text-xs text-muted-foreground">
            {weekMemberRows.filter((r) => r.isPaidSvc).length} of {members.length} SVC Settled
          </span>
        </Card>
      </div>

      {/* Compliance Bar */}
      <Card className="card-gang p-4 border-l-4 border-l-amber-500">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Cycle Compliance Rate (Cash)</span>
          <span className="text-lg font-orbitron font-bold text-amber-400 font-mono">{collectionRate}% Settled</span>
        </div>
        <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden border border-red-950">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            style={{ width: `${Math.min(collectionRate, 100)}%` }}
          />
        </div>
      </Card>


      {/* Week Selector & Filters Bar */}
      <Card className="card-gang p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          {/* Select Week Dropdown */}
          <div>
            <label className="text-[11px] uppercase font-bold text-muted-foreground block mb-1">
              Select Cycle Week
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(Number(e.target.value));
                soundFx.playClickSound();
              }}
              className="w-full px-3 py-2 bg-black/70 border border-red-900/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-red-500 font-rajdhani font-bold"
            >
              {availableWeeks.map((wk) => (
                <option key={wk} value={wk}>
                  Week #{wk} {wk === cycle.currentWeekNumber ? "(Current Week)" : "(Past Cycle)"}
                </option>
              ))}
            </select>
          </div>

          {/* Search Member */}
          <div className="sm:col-span-2">
            <label className="text-[11px] uppercase font-bold text-muted-foreground block mb-1">
              Search Member
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search operative by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-black/50 border-red-900/40 text-sm font-rajdhani focus:border-red-500"
              />
            </div>
          </div>

          {/* Status Filter Segmented Controls */}
          <div>
            <label className="text-[11px] uppercase font-bold text-muted-foreground block mb-1">
              Filter (Cash Status)
            </label>
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-red-900/40">
              <button
                onClick={() => setStatusFilter("all")}
                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                  statusFilter === "all"
                    ? "bg-red-700 text-white shadow-sm"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                All ({members.length})
              </button>
              <button
                onClick={() => setStatusFilter("paid")}
                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                  statusFilter === "paid"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                Paid ({paidCount})
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                  statusFilter === "pending"
                    ? "bg-amber-700 text-white shadow-sm"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Member Payment Table */}
      <Card className="card-gang overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-rajdhani">
            <thead className="bg-black/90 border-b border-red-900/50 text-xs font-orbitron uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Operative</th>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Cash Quota</th>
                <th className="py-3 px-4">
                  <span className="flex items-center gap-1 text-cyan-400/80">
                    <Coins className="w-3.5 h-3.5" /> SVC Quota
                  </span>
                </th>
                <th className="py-3 px-4">Cash Status</th>
                <th className="py-3 px-4">
                  <span className="flex items-center gap-1 text-cyan-400/80">SVC Status</span>
                </th>
                <th className="py-3 px-4 text-right">
                  {isLeader ? "Actions" : "Verification"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-900/20">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground font-rajdhani">
                    No operatives found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ member, isPaidCash, isPaidSvc, paymentDate, markedBy }) => (
                  <tr
                    key={member.id}
                    className="hover:bg-red-950/20 transition-colors duration-150 group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-900/60 to-black border border-red-600/30 flex items-center justify-center font-orbitron font-bold text-xs text-red-300">
                          {member.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-bold text-foreground group-hover:text-red-300 transition-colors">
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs uppercase text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-black/60 border border-neutral-800 text-[10px] font-bold font-orbitron">
                        {member.rank || "recruit"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                      ${(member.contribution || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400 text-sm">
                      {(member.contributionSvc ?? 100).toLocaleString()} <span className="text-[10px] font-orbitron text-cyan-300">SVC</span>
                    </td>
                    <td className="py-3 px-4">
                      {isPaidCash ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/80 border border-amber-500/50 text-amber-300 animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isPaidSvc ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
                          <Coins className="w-3.5 h-3.5 text-cyan-400" />
                          PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-900 border border-neutral-700 text-neutral-400">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isLeader ? (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            size="sm"
                            onClick={() => handleToggleCashPayment(member)}
                            disabled={togglingId === member.id + "_cash"}
                            className={
                              isPaidCash
                                ? "bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/70 text-xs font-bold"
                                : "bg-red-950/70 border border-red-500/60 text-red-200 hover:bg-red-900/70 text-xs font-bold shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                            }
                          >
                            {togglingId === member.id + "_cash" ? (
                              "..."
                            ) : isPaidCash ? (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" /> Unpay $
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-emerald-400" /> Mark Paid $
                              </span>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleToggleSvcPayment(member)}
                            disabled={togglingId === member.id + "_svc"}
                            className={
                              isPaidSvc
                                ? "bg-cyan-950/60 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-900/70 text-xs font-bold"
                                : "bg-black/70 border border-cyan-800/60 text-cyan-300/80 hover:bg-cyan-950/60 text-xs font-bold"
                            }
                          >
                            {togglingId === member.id + "_svc" ? (
                              "..."
                            ) : isPaidSvc ? (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-neutral-400" /> Unpay SVC
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Coins className="w-3 h-3 text-cyan-400" /> Mark Paid SVC
                              </span>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Lock className="w-3 h-3" /> Leader Only
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Weekly Reset Confirmation Modal (Leader Only) */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-black/95 border border-red-700 text-foreground backdrop-blur-2xl shadow-[0_0_40px_rgba(220,38,38,0.5)]">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-7 h-7 animate-bounce" />
              <DialogTitle className="text-xl font-orbitron font-extrabold text-gang-glow">
                RESET WEEKLY DUES CYCLE
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 font-rajdhani text-sm">
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-red-200">
              <p className="font-bold text-white mb-1">
                You are about to close Week #{cycle.currentWeekNumber} and start Week #{cycle.currentWeekNumber + 1}.
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-300/90 mt-2">
                <li>Snapshots all {members.length} members' current week payment status into permanent audit logs.</li>
                <li>Resets all operatives' dues status to <strong className="text-amber-300">Pending</strong> for the new week.</li>
                <li>Increments active cycle to <strong className="text-red-300">Week #{cycle.currentWeekNumber + 1}</strong>.</li>
                <li>Logs timestamp and authorizing Leader ID to Syndicate records.</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to proceed with the weekly dues cycle reset?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsResetDialogOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWeeklyReset}
              disabled={isResetting}
              className="bg-red-700 hover:bg-red-600 text-white font-bold"
            >
              {isResetting ? "Archiving & Resetting..." : "Confirm Weekly Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
