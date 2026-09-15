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

  // Helper to get hasPaidSvc from record notes or direct field
  const getHasPaidSvc = (memberId: string): boolean => {
    const rec = weeklyRecords.find((r) => r.memberId === memberId && r.weekNumber === selectedWeek);
    if (rec?.hasPaidSvc !== undefined) return !!rec.hasPaidSvc;
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
      const currentSvcState = getHasPaidSvc(member.id);

      await apiService.upsertWeeklyPaymentRecord({
        memberId: member.id,
        memberName: member.name,
        weekNumber: selectedWeek,
        weekStart: cycle.cycleStartDate,
        weekEnd: new Date().toISOString(),
        contribution: member.contribution || 50000,
        contributionSvc: member.contributionSvc ?? 100,
        hasPaid: nextPaidState,
        hasPaidSvc: currentSvcState,
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
        hasPaidSvc: nextSvcState,
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
            hasPaidSvc: nextSvcState,
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
            <h2 className="text-2xl md:text-3xl font-orbitron font-extrabold text-red-600">
              WEEKLY DUES & CONTRIBUTIONS
            </h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-red-50 border border-red-200 text-red-700 shadow-sm">
              Week #{selectedWeek} {isCurrentWeekSelected ? "(Current Active)" : "(Archived)"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
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
              className="btn-gang flex items-center gap-2"
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
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Cash Quota Expected
            </span>
            <DollarSign className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-xl font-orbitron font-bold text-slate-900 mt-2 font-mono">
            ${totalCashExpected.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500">
            {members.length} registered syndicate operatives
          </span>
        </Card>

        {/* Cash Collected */}
        <Card className="card-gang p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Cash Collected
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xl font-orbitron font-bold text-emerald-600 mt-2 font-mono">
            ${totalCashCollected.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500">
            {paidCount} of {members.length} Paid ({collectionRate}%)
          </span>
        </Card>

        {/* SVC Quota Expected */}
        <Card className="card-gang p-4 border-l-4 border-l-cyan-500 bg-cyan-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-cyan-800 uppercase font-bold tracking-wider">
                SVC Expected
              </span>
              <span className="px-1.5 rounded text-[9px] font-orbitron bg-cyan-100 border border-cyan-300 text-cyan-800 font-bold">CRYPTO</span>
            </div>
            <Coins className="w-5 h-5 text-cyan-600" />
          </div>
          <p className="text-xl font-orbitron font-bold text-cyan-700 mt-2 font-mono flex items-center gap-1">
            {totalSvcExpected.toLocaleString()} <span className="text-sm text-cyan-800">SVC</span>
          </p>
          <span className="text-xs text-slate-500">
            Weekly crypto quota for {members.length} operatives
          </span>
        </Card>

        {/* SVC Collected */}
        <Card className="card-gang p-4 border-l-4 border-l-cyan-600 bg-cyan-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyan-800 uppercase font-bold tracking-wider">
              SVC Collected
            </span>
            <Award className="w-5 h-5 text-cyan-600" />
          </div>
          <p className="text-xl font-orbitron font-bold text-cyan-700 mt-2 font-mono flex items-center gap-1">
            {totalSvcCollected.toLocaleString()} <span className="text-sm text-cyan-800">SVC</span>
          </p>
          <span className="text-xs text-slate-500">
            {weekMemberRows.filter((r) => r.isPaidSvc).length} of {members.length} SVC Settled
          </span>
        </Card>
      </div>

      {/* Compliance Bar */}
      <Card className="card-gang p-4 border-l-4 border-l-amber-500">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Cycle Compliance Rate (Cash)</span>
          <span className="text-lg font-orbitron font-bold text-amber-700 font-mono">{collectionRate}% Settled</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(collectionRate, 100)}%` }}
          />
        </div>
      </Card>

      {/* Week Selector & Filters Bar */}
      <Card className="card-gang p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          {/* Select Week Dropdown */}
          <div>
            <label className="text-[11px] uppercase font-bold text-slate-600 block mb-1">
              Select Cycle Week
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(Number(e.target.value));
                soundFx.playClickSound();
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-red-500 font-rajdhani font-bold"
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
            <label className="text-[11px] uppercase font-bold text-slate-600 block mb-1">
              Search Member
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search operative by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-rajdhani focus:border-red-500"
              />
            </div>
          </div>

          {/* Status Filter Segmented Controls */}
          <div>
            <label className="text-[11px] uppercase font-bold text-slate-600 block mb-1">
              Filter (Cash Status)
            </label>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setStatusFilter("all")}
                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                  statusFilter === "all"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({members.length})
              </button>
              <button
                onClick={() => setStatusFilter("paid")}
                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                  statusFilter === "paid"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Paid ({paidCount})
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                  statusFilter === "pending"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
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
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-orbitron uppercase text-slate-600">
              <tr>
                <th className="py-3 px-4">Operative</th>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Cash Quota</th>
                <th className="py-3 px-4">
                  <span className="flex items-center gap-1 text-cyan-700">
                    <Coins className="w-3.5 h-3.5" /> SVC Quota
                  </span>
                </th>
                <th className="py-3 px-4">Cash Status</th>
                <th className="py-3 px-4">
                  <span className="flex items-center gap-1 text-cyan-700">SVC Status</span>
                </th>
                <th className="py-3 px-4 text-right">
                  {isLeader ? "Actions" : "Verification"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-rajdhani">
                    No operatives found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ member, isPaidCash, isPaidSvc, paymentDate, markedBy }) => (
                  <tr
                    key={member.id}
                    className="hover:bg-red-50/40 transition-colors duration-150 group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-500 border border-red-200 flex items-center justify-center font-orbitron font-bold text-xs text-white">
                          {member.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs uppercase text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-bold font-orbitron text-slate-700">
                        {member.rank || "recruit"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                      ${(member.contribution || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-700 text-sm">
                      {(member.contributionSvc ?? 100).toLocaleString()} <span className="text-[10px] font-orbitron text-cyan-600">SVC</span>
                    </td>
                    <td className="py-3 px-4">
                      {isPaidCash ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isPaidSvc ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-50 border border-cyan-200 text-cyan-700 shadow-sm">
                          <Coins className="w-3.5 h-3.5 text-cyan-600" />
                          PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 border border-slate-200 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                                ? "bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-bold"
                                : "btn-gang text-xs font-bold shadow-sm"
                            }
                          >
                            {togglingId === member.id + "_cash" ? (
                              "..."
                            ) : isPaidCash ? (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" /> Unpay $
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-white" /> Mark Paid $
                              </span>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleToggleSvcPayment(member)}
                            disabled={togglingId === member.id + "_svc"}
                            className={
                              isPaidSvc
                                ? "bg-cyan-50 border border-cyan-300 text-cyan-700 hover:bg-cyan-100 text-xs font-bold"
                                : "bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold"
                            }
                          >
                            {togglingId === member.id + "_svc" ? (
                              "..."
                            ) : isPaidSvc ? (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" /> Unpay SVC
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Coins className="w-3 h-3 text-white" /> Mark Paid SVC
                              </span>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 flex items-center justify-end gap-1">
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
        <DialogContent className="sm:max-w-md bg-white border border-red-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-7 h-7" />
              <DialogTitle className="text-xl font-orbitron font-extrabold text-red-600">
                RESET WEEKLY DUES CYCLE
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 font-rajdhani text-sm">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900">
              <p className="font-bold text-red-950 mb-1">
                You are about to close Week #{cycle.currentWeekNumber} and start Week #{cycle.currentWeekNumber + 1}.
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-800 mt-2">
                <li>Snapshots all {members.length} members' current week payment status into permanent audit logs.</li>
                <li>Resets all operatives' dues status to <strong className="text-amber-700">Pending</strong> for the new week.</li>
                <li>Increments active cycle to <strong className="text-red-700">Week #{cycle.currentWeekNumber + 1}</strong>.</li>
                <li>Logs timestamp and authorizing Leader ID to Syndicate records.</li>
              </ul>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to proceed with the weekly dues cycle reset?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsResetDialogOpen(false)}
              disabled={isResetting}
              className="text-slate-600 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWeeklyReset}
              disabled={isResetting}
              className="btn-gang font-bold"
            >
              {isResetting ? "Archiving & Resetting..." : "Confirm Weekly Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
