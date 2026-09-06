import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet,
  Receipt,
  PlusCircle,
  MinusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  Trash2,
  DollarSign,
  TrendingUp,
  Search,
  Lock,
} from "lucide-react";
import { apiService, Transaction, GangFund } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface TotalFundsTabProps {
  userMode: "admin" | "gangmember" | "viewer2";
}

export function TotalFundsTab({ userMode }: TotalFundsTabProps) {
  const [gangFund, setGangFund] = useState<GangFund | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [txFilter, setTxFilter] = useState<"all" | "income" | "expense">("all");

  // Edit Total Funds Base Modal
  const [isEditFundOpen, setIsEditFundOpen] = useState(false);
  const [newBaseFundInput, setNewBaseFundInput] = useState<string>("");

  // Record Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txCategory, setTxCategory] = useState<string>("Bank Heist");
  const [txDescription, setTxDescription] = useState<string>("");

  const isLeader = userMode === "admin";

  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      try {
        const [fund, txs] = await Promise.all([
          apiService.getGangFund().catch(() => null),
          apiService.getTransactions().catch(() => []),
        ]);

        if (isSubscribed) {
          if (fund) {
            setGangFund(fund);
            setNewBaseFundInput(String(fund.baseAmount ?? 350000));
          }
          setTransactions(Array.isArray(txs) ? txs : []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading total funds:", err);
        if (isSubscribed) setLoading(false);
      }
    };

    loadData();

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
      unsubFund();
      unsubTx();
    };
  }, []);

  // Update base vault funds
  const handleUpdateFund = async () => {
    if (!isLeader) return;
    const amt = Number(newBaseFundInput);
    if (isNaN(amt) || amt < 0) {
      alert("Please enter a valid fund amount ($0 or higher).");
      return;
    }
    try {
      const updated = await apiService.updateGangFund(amt, "Red Leader");
      if (updated) setGangFund(updated);
      soundFx.playCashSound();
      setIsEditFundOpen(false);
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to update total funds");
    }
  };

  const handleOpenTxModal = (type: "income" | "expense") => {
    setTxType(type);
    setTxAmount("");
    setTxCategory(type === "income" ? "Bank Heist" : "Weapon Supply");
    setTxDescription("");
    setIsTxModalOpen(true);
  };

  const handleAddTransaction = async () => {
    if (!isLeader) return;
    const amt = Number(txAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid amount greater than $0.");
      return;
    }
    if (!txDescription.trim()) {
      alert("Please enter a description or note for the transaction.");
      return;
    }
    try {
      await apiService.addTransaction({
        type: txType,
        amount: amt,
        category: txCategory,
        description: txDescription.trim(),
        addedBy: "Red Leader",
        date: new Date().toISOString(),
      });
      if (txType === "income") {
        soundFx.playCashSound();
      } else {
        soundFx.playClickSound();
      }
      setIsTxModalOpen(false);
      setTxAmount("");
      setTxDescription("");
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to record transaction");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!isLeader) return;
    if (!confirm("Are you sure you want to remove this ledger transaction?")) return;
    try {
      await apiService.deleteTransaction(id);
      soundFx.playClickSound();
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to remove transaction");
    }
  };

  const vaultTotal = gangFund?.totalAmount ?? gangFund?.baseAmount ?? 350000;
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const filteredTransactions = transactions.filter((t) => {
    const matchesType = txFilter === "all" || t.type === txFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.description.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.addedBy && t.addedBy.toLowerCase().includes(q));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 font-rajdhani">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl md:text-3xl font-orbitron font-extrabold text-gang-glow">
              TOTAL FUNDS & LEDGER
            </h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-red-950 border border-red-500/50 text-red-300">
              Live Treasury
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage gang vault funds, adjust total treasury balance, and record live income & expense transactions.
          </p>
        </div>

        {/* Action Buttons (Leader Only) */}
        <div className="flex items-center gap-2 flex-wrap">
          {isLeader && (
            <>
              <Button
                onClick={() => {
                  soundFx.playClickSound();
                  setIsEditFundOpen(true);
                }}
                variant="outline"
                className="bg-black/70 border-amber-500/50 text-amber-300 hover:bg-amber-950/60 font-rajdhani font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Total Funds
              </Button>
              <Button
                onClick={() => {
                  soundFx.playClickSound();
                  handleOpenTxModal("income");
                }}
                className="bg-emerald-800 hover:bg-emerald-700 text-white font-rajdhani font-bold px-3 py-1.5 rounded-lg text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                + Income
              </Button>
              <Button
                onClick={() => {
                  soundFx.playClickSound();
                  handleOpenTxModal("expense");
                }}
                className="bg-rose-900 hover:bg-rose-800 text-rose-100 font-rajdhani font-bold px-3 py-1.5 rounded-lg text-xs shadow-[0_0_15px_rgba(244,63,94,0.3)] flex items-center gap-1.5"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                - Expense
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Funds Balance */}
        <Card className="card-gang p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Total Funds Balance
            </span>
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-orbitron font-extrabold text-emerald-400 mt-2 font-mono">
            ${vaultTotal.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono">
              Base Reserve: ${(gangFund?.baseAmount ?? 350000).toLocaleString()}
            </span>
            {isLeader && (
              <button
                onClick={() => setIsEditFundOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-bold underline"
              >
                Adjust
              </button>
            )}
          </div>
        </Card>

        {/* Total Income */}
        <Card className="card-gang p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Total Recorded Income
            </span>
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-emerald-400 mt-2 font-mono">
            +${totalIncome.toLocaleString()}
          </p>
          <span className="text-xs text-muted-foreground">
            {transactions.filter((t) => t.type === "income").length} income deposits
          </span>
        </Card>

        {/* Total Expenses */}
        <Card className="card-gang p-4 border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Total Recorded Expenses
            </span>
            <ArrowDownRight className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-rose-400 mt-2 font-mono">
            -${totalExpense.toLocaleString()}
          </p>
          <span className="text-xs text-muted-foreground">
            {transactions.filter((t) => t.type === "expense").length} expense deductions
          </span>
        </Card>

        {/* Net Flow */}
        <Card className="card-gang p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Net Cashflow
            </span>
            <Receipt className="w-5 h-5 text-amber-400" />
          </div>
          <p className={`text-2xl font-orbitron font-bold mt-2 font-mono ${
            totalIncome >= totalExpense ? "text-emerald-400" : "text-rose-400"
          }`}>
            {totalIncome >= totalExpense ? "+" : "-"}${Math.abs(totalIncome - totalExpense).toLocaleString()}
          </p>
          <span className="text-xs text-muted-foreground">
            {transactions.length} total ledger records
          </span>
        </Card>
      </div>

      {/* Transactions Search & Filter Card */}
      <Card className="card-gang p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search description, category, operative..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-black/40 border-red-900/40 text-sm font-rajdhani"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              onClick={() => setTxFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                txFilter === "all"
                  ? "bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                  : "bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white"
              }`}
            >
              All Records ({transactions.length})
            </button>
            <button
              onClick={() => setTxFilter("income")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                txFilter === "income"
                  ? "bg-emerald-700 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  : "bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              + Income ({transactions.filter((t) => t.type === "income").length})
            </button>
            <button
              onClick={() => setTxFilter("expense")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                txFilter === "expense"
                  ? "bg-rose-800 text-white shadow-[0_0_10px_rgba(225,29,72,0.5)]"
                  : "bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white"
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              - Expense ({transactions.filter((t) => t.type === "expense").length})
            </button>
          </div>
        </div>
      </Card>

      {/* Total Funds Ledger Table */}
      <Card className="card-gang overflow-hidden">
        <div className="p-4 border-b border-red-900/40 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-orbitron font-extrabold text-white tracking-wide">
              TOTAL FUNDS LEDGER // INCOME & EXPENSE
            </h3>
          </div>

          {isLeader && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleOpenTxModal("income")}
                className="bg-emerald-800 hover:bg-emerald-700 text-white h-7 px-2.5 text-xs font-bold"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> + Income
              </Button>
              <Button
                size="sm"
                onClick={() => handleOpenTxModal("expense")}
                className="bg-rose-900 hover:bg-rose-800 text-white h-7 px-2.5 text-xs font-bold"
              >
                <MinusCircle className="w-3.5 h-3.5 mr-1" /> - Expense
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-rajdhani">
            <thead className="bg-black/90 border-b border-red-900/50 text-xs font-orbitron uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description / Purpose</th>
                <th className="py-3 px-4">Authorized Operative</th>
                <th className="py-3 px-4 text-right">Amount</th>
                {isLeader && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-red-900/20">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isLeader ? 7 : 6} className="py-12 text-center text-muted-foreground font-rajdhani">
                    No transactions recorded in the funds ledger yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isInc = tx.type === "income";
                  return (
                    <tr key={tx.id} className="hover:bg-red-950/20 transition-colors group">
                      <td className="py-3 px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {tx.date
                          ? new Date(tx.date).toLocaleDateString() +
                            " " +
                            new Date(tx.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "Recently"}
                      </td>
                      <td className="py-3 px-4">
                        {isInc ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            + INCOME
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/80 border border-rose-500/60 text-rose-300">
                            <ArrowDownRight className="w-3 h-3 text-rose-400" />
                            - EXPENSE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-black/60 border border-neutral-800 text-[10px] font-bold uppercase text-amber-300">
                          {tx.category || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-foreground group-hover:text-red-200 transition-colors">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                        {tx.addedBy || "Red Leader"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-extrabold text-base whitespace-nowrap ${
                          isInc ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isInc ? `+$${(tx.amount || 0).toLocaleString()}` : `-$${(tx.amount || 0).toLocaleString()}`}
                      </td>
                      {isLeader && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 text-muted-foreground hover:text-rose-400 rounded hover:bg-rose-950/50 transition-colors"
                            title="Remove transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Total Funds Base Dialog (Leader Only) */}
      <Dialog open={isEditFundOpen} onOpenChange={setIsEditFundOpen}>
        <DialogContent className="sm:max-w-md bg-black/95 border border-red-700 text-foreground backdrop-blur-2xl shadow-[0_0_40px_rgba(220,38,38,0.5)]">
          <DialogHeader>
            <div className="flex items-center gap-3 text-amber-400">
              <Wallet className="w-6 h-6" />
              <DialogTitle className="text-xl font-orbitron font-extrabold text-gang-glow">
                ADJUST TOTAL FUNDS
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 font-rajdhani text-sm">
            <p className="text-xs text-muted-foreground">
              Specify the baseline vault reserve allocation. Total calculated balance will equal this base amount plus all recorded incomes minus expenses.
            </p>

            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground block mb-1">
                Base Reserve Amount ($)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="350000"
                  value={newBaseFundInput}
                  onChange={(e) => setNewBaseFundInput(e.target.value)}
                  className="pl-9 bg-black/80 border-red-800 text-lg font-mono font-bold text-emerald-400 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditFundOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFund}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
            >
              Update Total Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Income / Expense Transaction Dialog (Leader Only) */}
      <Dialog open={isTxModalOpen} onOpenChange={setIsTxModalOpen}>
        <DialogContent className="sm:max-w-md bg-black/95 border border-red-700 text-foreground backdrop-blur-2xl shadow-[0_0_40px_rgba(220,38,38,0.5)]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {txType === "income" ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-500 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-rose-400" />
                </div>
              )}
              <DialogTitle className="text-xl font-orbitron font-extrabold text-gang-glow">
                {txType === "income" ? "RECORD GANG INCOME (+)" : "RECORD GANG EXPENSE (-)"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 font-rajdhani text-sm">
            {/* Type Toggle */}
            <div className="flex items-center gap-2 p-1 bg-black/70 rounded-lg border border-red-900/50">
              <button
                type="button"
                onClick={() => {
                  setTxType("income");
                  setTxCategory("Bank Heist");
                }}
                className={`flex-1 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                  txType === "income"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> + Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType("expense");
                  setTxCategory("Weapon Supply");
                }}
                className={`flex-1 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                  txType === "expense"
                    ? "bg-rose-900 text-white shadow-sm"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" /> - Expense
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground block mb-1">
                Amount ($)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  step="100"
                  placeholder="e.g. 50000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className={`pl-9 bg-black/80 border-red-800 text-base font-mono font-bold ${
                    txType === "income" ? "text-emerald-400" : "text-rose-400"
                  }`}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground block mb-1">
                Category
              </label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full px-3 py-2 bg-black/80 border border-red-800 rounded-md text-sm text-foreground focus:outline-none focus:border-red-500 font-rajdhani font-semibold"
              >
                {txType === "income" ? (
                  <>
                    <option value="Bank Heist">Bank Heist / Robbery</option>
                    <option value="Store Robbery">Store / Cargo Robbery</option>
                    <option value="Narcotics Deal">Narcotics Distribution</option>
                    <option value="Weapons Deal">Weapons Trade</option>
                    <option value="Contraband">Black Market Contraband</option>
                    <option value="Weekly Dues Deposit">Weekly Dues Deposit</option>
                    <option value="War Bounty">War Spoils / Rival Gang Bounty</option>
                    <option value="Other">Other Income</option>
                  </>
                ) : (
                  <>
                    <option value="Weapon Supply">Weapon & Gun Supply</option>
                    <option value="Ammo & Armor">Ammo & Tactical Armor</option>
                    <option value="Vehicle Tuning">Vehicle Purchases & Tuning</option>
                    <option value="Medical Supply">Medical Kits & Bandages</option>
                    <option value="Safehouse Rent">Safehouse & Garage Rent</option>
                    <option value="Bail & Bribes">Operative Bail & Bribes</option>
                    <option value="Radio Gear">Radio & Surveillance Gear</option>
                    <option value="War Losses">War Reparations / Losses</option>
                    <option value="Other">Other Operational Expense</option>
                  </>
                )}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground block mb-1">
                Description / Purpose
              </label>
              <Input
                placeholder={
                  txType === "income" ? "e.g. Pacific Standard Heist split" : "e.g. Purchased 10 Heavy Pistols & Armor"
                }
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                className="bg-black/80 border-red-800 text-sm font-rajdhani"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTxModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTransaction}
              className={
                txType === "income"
                  ? "bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
                  : "bg-rose-900 hover:bg-rose-800 text-white font-bold"
              }
            >
              {txType === "income" ? "Record Income" : "Record Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
