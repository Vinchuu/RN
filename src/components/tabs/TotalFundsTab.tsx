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
  Coins,
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
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "cash" | "svc">("all");

  // Edit Total Funds Base Modal
  const [isEditFundOpen, setIsEditFundOpen] = useState(false);
  const [newBaseFundInput, setNewBaseFundInput] = useState<string>("");
  const [newBaseSvcInput, setNewBaseSvcInput] = useState<string>("");

  // Record Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txCurrency, setTxCurrency] = useState<"cash" | "svc">("cash");
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
            setNewBaseSvcInput(String(fund.baseSvcAmount ?? 15000));
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
        setNewBaseSvcInput(String(fund.baseSvcAmount ?? 15000));
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

  // Update base vault funds (Cash & SVC)
  const handleUpdateFund = async () => {
    if (!isLeader) return;
    const amtCash = Number(newBaseFundInput);
    const amtSvc = Number(newBaseSvcInput);
    if (isNaN(amtCash) || amtCash < 0 || isNaN(amtSvc) || amtSvc < 0) {
      alert("Please enter valid positive amounts for both Cash ($) and SVC.");
      return;
    }
    try {
      const updated = await apiService.updateGangFund(amtCash, amtSvc, "Red Leader");
      if (updated) setGangFund(updated);
      soundFx.playCryptoSound();
      setIsEditFundOpen(false);
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to update total funds");
    }
  };

  const handleOpenTxModal = (type: "income" | "expense", currency: "cash" | "svc" = "cash") => {
    setTxType(type);
    setTxCurrency(currency);
    setTxAmount("");
    if (currency === "svc") {
      setTxCategory(type === "income" ? "Crypto Laundering" : "Encrypted Comms");
    } else {
      setTxCategory(type === "income" ? "Bank Heist" : "Weapon Supply");
    }
    setTxDescription("");
    setIsTxModalOpen(true);
  };

  const handleAddTransaction = async () => {
    if (!isLeader) return;
    const amt = Number(txAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(`Please enter a valid amount greater than 0 ${txCurrency === "svc" ? "SVC" : "$"}.`);
      return;
    }
    if (!txDescription.trim()) {
      alert("Please enter a description or note for the transaction.");
      return;
    }
    try {
      await apiService.addTransaction({
        type: txType,
        currency: txCurrency,
        amount: amt,
        category: txCategory,
        description: txDescription.trim(),
        addedBy: "Red Leader",
        date: new Date().toISOString(),
      });
      if (txCurrency === "svc") {
        soundFx.playCryptoSound();
      } else if (txType === "income") {
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

  // Cash calculations
  const vaultCashTotal = gangFund?.totalAmount ?? gangFund?.baseAmount ?? 350000;
  const cashIncome = transactions
    .filter((t) => (!t.currency || t.currency === "cash") && t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const cashExpense = transactions
    .filter((t) => (!t.currency || t.currency === "cash") && t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // SVC calculations
  const vaultSvcTotal = gangFund?.totalSvcAmount ?? gangFund?.baseSvcAmount ?? 15000;
  const svcIncome = transactions
    .filter((t) => t.currency === "svc" && t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const svcExpense = transactions
    .filter((t) => t.currency === "svc" && t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const filteredTransactions = transactions.filter((t) => {
    const matchesType = txFilter === "all" || t.type === txFilter;
    const txCurr = t.currency || "cash";
    const matchesCurrency = currencyFilter === "all" || txCurr === currencyFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.description.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.addedBy && t.addedBy.toLowerCase().includes(q));
    return matchesType && matchesCurrency && matchesSearch;
  });

  return (
    <div className="space-y-6 font-rajdhani">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl md:text-3xl font-orbitron font-extrabold text-red-600">
              TOTAL FUNDS & VAULT
            </h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-red-50 border border-red-200 text-red-700 shadow-sm">
              Live Balance & Ledger
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Syndicate treasury headquarters — track all heists, weapons, dues, drug operations & war expenses.
          </p>
        </div>

        {/* Action Controls (Leader Only) */}
        <div className="flex items-center gap-2 flex-wrap">
          {isLeader && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  soundFx.playClickSound();
                  setIsEditFundOpen(true);
                }}
                className="border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-rajdhani font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Vault Reserves
              </Button>
              <Button
                onClick={() => {
                  soundFx.playClickSound();
                  handleOpenTxModal("income", "cash");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-rajdhani font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                + Income
              </Button>
              <Button
                onClick={() => {
                  soundFx.playClickSound();
                  handleOpenTxModal("expense", "cash");
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-rajdhani font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm flex items-center gap-1.5"
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
        {/* Total Cash Funds Balance */}
        <Card className="card-gang p-4 border-l-4 border-l-emerald-500 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Total Cash Vault
            </span>
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-orbitron font-extrabold text-emerald-600 mt-2 font-mono">
            ${vaultCashTotal.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">
              Base: ${(gangFund?.baseAmount ?? 350000).toLocaleString()}
            </span>
            {isLeader && (
              <button
                onClick={() => setIsEditFundOpen(true)}
                className="text-amber-600 hover:text-amber-700 font-bold underline"
              >
                Adjust
              </button>
            )}
          </div>
        </Card>

        {/* Total SVC Crypto Balance */}
        <Card className="card-gang p-4 border-l-4 border-l-cyan-500 relative overflow-hidden group bg-cyan-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-cyan-800 uppercase font-bold tracking-wider">
                Total SVC Treasury
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-orbitron bg-cyan-100 border border-cyan-300 text-cyan-800 font-bold">
                CRYPTO
              </span>
            </div>
            <Coins className="w-5 h-5 text-cyan-600" />
          </div>
          <p className="text-2xl font-orbitron font-extrabold text-cyan-700 mt-2 font-mono flex items-center gap-1.5">
            {vaultSvcTotal.toLocaleString()}{" "}
            <span className="text-sm font-semibold text-cyan-800">SVC</span>
          </p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">
              Base: {(gangFund?.baseSvcAmount ?? 15000).toLocaleString()} SVC
            </span>
            {isLeader && (
              <button
                onClick={() => setIsEditFundOpen(true)}
                className="text-cyan-700 hover:text-cyan-800 font-bold underline"
              >
                Adjust
              </button>
            )}
          </div>
        </Card>

        {/* Total Incomes */}
        <Card className="card-gang p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Total Incomes
            </span>
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-2 space-y-0.5">
            <p className="text-lg font-orbitron font-bold text-emerald-600 font-mono">
              +${cashIncome.toLocaleString()}{" "}
              <span className="text-xs text-slate-500 font-normal">Cash</span>
            </p>
            <p className="text-sm font-orbitron font-bold text-cyan-700 font-mono">
              +{svcIncome.toLocaleString()} <span className="text-xs text-cyan-800 font-normal">SVC</span>
            </p>
          </div>
          <span className="text-xs text-slate-500 block mt-1">
            {transactions.filter((t) => t.type === "income").length} total deposits
          </span>
        </Card>

        {/* Total Expenses */}
        <Card className="card-gang p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Total Expenses
            </span>
            <ArrowDownRight className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-2 space-y-0.5">
            <p className="text-lg font-orbitron font-bold text-rose-600 font-mono">
              -${cashExpense.toLocaleString()}{" "}
              <span className="text-xs text-slate-500 font-normal">Cash</span>
            </p>
            <p className="text-sm font-orbitron font-bold text-rose-600 font-mono">
              -{svcExpense.toLocaleString()} <span className="text-xs text-rose-700 font-normal">SVC</span>
            </p>
          </div>
          <span className="text-xs text-slate-500 block mt-1">
            {transactions.filter((t) => t.type === "expense").length} expense records
          </span>
        </Card>
      </div>

      {/* Transactions Search & Filter Card */}
      <Card className="card-gang p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search description, category, operative..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-rajdhani focus:border-red-500"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setTxFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                txFilter === "all"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setTxFilter("income")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                txFilter === "income"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-200" />
              + Income
            </button>
            <button
              onClick={() => setTxFilter("expense")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                txFilter === "expense"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-200" />
              - Expense
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1"></div>
            <button
              onClick={() => setCurrencyFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currencyFilter === "all"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              All Currency
            </button>
            <button
              onClick={() => setCurrencyFilter("cash")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currencyFilter === "cash"
                  ? "bg-emerald-50 border border-emerald-300 text-emerald-700"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" /> Cash Only
            </button>
            <button
              onClick={() => setCurrencyFilter("svc")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currencyFilter === "svc"
                  ? "bg-cyan-50 border border-cyan-300 text-cyan-700"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> SVC Only
            </button>
          </div>
        </div>
      </Card>

      {/* Total Funds Ledger Table */}
      <Card className="card-gang overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-orbitron font-extrabold text-slate-900 tracking-wide">
              TOTAL FUNDS LEDGER // INCOME & EXPENSE
            </h3>
          </div>

          {isLeader && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleOpenTxModal("income")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 text-xs font-bold shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> + Income
              </Button>
              <Button
                size="sm"
                onClick={() => handleOpenTxModal("expense")}
                className="bg-rose-600 hover:bg-rose-700 text-white h-7 px-2.5 text-xs font-bold shadow-sm"
              >
                <MinusCircle className="w-3.5 h-3.5 mr-1" /> - Expense
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-rajdhani">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-orbitron uppercase text-slate-600">
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
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isLeader ? 7 : 6} className="py-12 text-center text-slate-500 font-rajdhani">
                    No transactions recorded in the funds ledger yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isInc = tx.type === "income";
                  const isSvc = tx.currency === "svc";
                  return (
                    <tr key={tx.id} className="hover:bg-red-50/40 transition-colors group">
                      <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {tx.date
                          ? new Date(tx.date).toLocaleDateString() +
                            " " +
                            new Date(tx.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "Recently"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          {isInc ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              + INCOME
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700">
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                              - EXPENSE
                            </span>
                          )}
                          {isSvc ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-orbitron font-bold bg-cyan-50 border border-cyan-200 text-cyan-700 w-fit">
                              <Coins className="w-2.5 h-2.5" /> SVC
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-orbitron font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 w-fit">
                              <DollarSign className="w-2.5 h-2.5" /> Cash
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase text-slate-700">
                          {tx.category || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-slate-900 group-hover:text-red-600 transition-colors">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {tx.addedBy || "Red Leader"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-extrabold text-base whitespace-nowrap ${
                          isInc ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                          {tx.currency === "svc"
                          ? `${isInc ? "+" : "-"}${(tx.amount || 0).toLocaleString()} SVC`
                          : isInc
                          ? `+$${(tx.amount || 0).toLocaleString()}`
                          : `-$${(tx.amount || 0).toLocaleString()}`}
                      </td>
                      {isLeader && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
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
        <DialogContent className="sm:max-w-md bg-white border border-red-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600">
              <Wallet className="w-6 h-6" />
              <DialogTitle className="text-xl font-orbitron font-extrabold text-red-600">
                ADJUST TOTAL FUNDS
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 font-rajdhani text-sm">
            <p className="text-xs text-slate-600 font-medium">
              Specify the baseline vault reserve allocation. Total calculated balance equals base amount ± recorded transactions.
            </p>

            <div>
              <label className="text-xs uppercase font-bold text-slate-700 block mb-1">
                Base Cash Reserve ($)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="350000"
                  value={newBaseFundInput}
                  onChange={(e) => setNewBaseFundInput(e.target.value)}
                  className="pl-9 bg-white border-slate-300 text-lg font-mono font-bold text-slate-900 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase font-bold text-cyan-700 block mb-1">
                Base SVC Reserve <span className="font-orbitron text-[10px] bg-cyan-100 border border-cyan-300 px-1.5 py-0.5 rounded text-cyan-800 ml-1">CRYPTO</span>
              </label>
              <div className="relative">
                <Coins className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="15000"
                  value={newBaseSvcInput}
                  onChange={(e) => setNewBaseSvcInput(e.target.value)}
                  className="pl-9 bg-white border-slate-300 text-lg font-mono font-bold text-cyan-700 focus-visible:ring-cyan-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">SVC is separate crypto — not equivalent to Cash ($)</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditFundOpen(false)} className="text-slate-600 hover:text-slate-900">
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFund}
              className="btn-gang font-bold"
            >
              Update Total Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Income / Expense Transaction Dialog (Leader Only) */}
      <Dialog open={isTxModalOpen} onOpenChange={setIsTxModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-red-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {txType === "income" ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-300 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-rose-600" />
                </div>
              )}
              <DialogTitle className="text-xl font-orbitron font-extrabold text-slate-900">
                {txType === "income" ? "RECORD GANG INCOME (+)" : "RECORD GANG EXPENSE (-)"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 font-rajdhani text-sm">
            {/* Type Toggle */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setTxType("income");
                  setTxCategory(txCurrency === "svc" ? "Crypto Laundering" : "Bank Heist");
                }}
                className={`flex-1 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                  txType === "income"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> + Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType("expense");
                  setTxCategory(txCurrency === "svc" ? "Encrypted Comms" : "Weapon Supply");
                }}
                className={`flex-1 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                  txType === "expense"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" /> - Expense
              </button>
            </div>

            {/* Currency Toggle */}
            <div>
              <label className="text-xs uppercase font-bold text-slate-600 block mb-1.5">Currency</label>
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setTxCurrency("cash");
                    setTxCategory(txType === "income" ? "Bank Heist" : "Weapon Supply");
                  }}
                  className={`flex-1 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    txCurrency === "cash"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" /> Cash ($)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxCurrency("svc");
                    setTxCategory(txType === "income" ? "Crypto Laundering" : "Encrypted Comms");
                  }}
                  className={`flex-1 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    txCurrency === "svc"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" /> SVC Crypto
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs uppercase font-bold text-slate-600 block mb-1">
                Amount {txCurrency === "svc" ? "(SVC)" : "($)"}
              </label>
              <div className="relative">
                {txCurrency === "svc" ? (
                  <Coins className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                ) : (
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                )}
                <Input
                  type="number"
                  min="1"
                  step={txCurrency === "svc" ? "10" : "100"}
                  placeholder={txCurrency === "svc" ? "e.g. 500" : "e.g. 50000"}
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className={`pl-9 bg-white border-slate-300 text-base font-mono font-bold ${
                    txCurrency === "svc" ? "text-cyan-700" : txType === "income" ? "text-emerald-600" : "text-rose-600"
                  }`}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs uppercase font-bold text-slate-600 block mb-1">
                Category
              </label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-red-500 font-rajdhani font-semibold"
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
              <label className="text-xs uppercase font-bold text-slate-600 block mb-1">
                Description / Purpose
              </label>
              <Input
                placeholder={
                  txType === "income" ? "e.g. Pacific Standard Heist split" : "e.g. Purchased 10 Heavy Pistols & Armor"
                }
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 text-sm font-rajdhani focus-visible:ring-red-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTxModalOpen(false)} className="text-slate-600 hover:text-slate-900">
              Cancel
            </Button>
            <Button
              onClick={handleAddTransaction}
              className={
                txType === "income"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  : "bg-rose-600 hover:bg-rose-700 text-white font-bold"
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
