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
import { Label } from "@/components/ui/label";
import {
  Package,
  Plus,
  Minus,
  Edit,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Sparkles,
  Shield,
  Crosshair,
  Pill,
  Wrench,
  Flame,
  Layers,
  DollarSign,
  TrendingUp,
  Box,
  CheckCircle2,
  Lock,
  Coins,
} from "lucide-react";
import { apiService, Item } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface InventoryTabProps {
  userMode: "admin" | "gangmember" | "viewer2";
}

const CATEGORIES = [
  { id: "weapons", label: "Firearms & Weapons", icon: Crosshair, color: "text-red-600" },
  { id: "ammo", label: "Ammunition", icon: Layers, color: "text-amber-600" },
  { id: "armor", label: "Tactical Armor", icon: Shield, color: "text-blue-600" },
  { id: "meds", label: "Medical Supplies", icon: Pill, color: "text-emerald-600" },
  { id: "tools", label: "Heist & Tools", icon: Wrench, color: "text-purple-600" },
  { id: "contraband", label: "Contraband & Goods", icon: Flame, color: "text-rose-600" },
];

export function InventoryTab({ userMode }: InventoryTabProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Add Item Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "weapons",
    quantity: 10,
    maxCapacity: 50,
    price: 3500,
    priceSvc: 35,
    description: "",
  });

  // Edit Item Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Quick Withdraw / Stash Request Modal (for Members or Leaders)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<Item | null>(null);
  const [actionQuantity, setActionQuantity] = useState<number>(1);
  const [actionType, setActionType] = useState<"withdraw" | "deposit">("withdraw");
  const [operativeName, setOperativeName] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "svc" | "none">("cash");

  const isLeader = userMode === "admin";
  const canInteract = userMode === "admin" || userMode === "gangmember";

  useEffect(() => {
    let isSubscribed = true;

    apiService.getItems()
      .then((data) => {
        if (isSubscribed) {
          setItems(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching inventory items:", err);
        if (isSubscribed) setLoading(false);
      });

    const unsubscribe = apiService.subscribeToItems((newItems) => {
      if (isSubscribed && Array.isArray(newItems)) {
        setItems(newItems);
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  // Quick Quantity Step for Leader (+1 / -1)
  const handleQuickQuantityStep = async (item: Item, delta: number) => {
    if (!isLeader) return;
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    try {
      if (delta > 0) soundFx.playCashSound();
      else soundFx.playClickSound();

      await apiService.updateItem(item.id, {
        quantity: newQty,
        updatedBy: "Red Leader",
      });
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to update stock");
    }
  };

  // Add Item
  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      alert("Item name is required");
      return;
    }
    try {
      await apiService.addItem({
        ...newItem,
        updatedBy: "Red Leader",
      });
      soundFx.playSuccessSound();
      setIsAddOpen(false);
      setNewItem({
        name: "",
        category: "weapons",
        quantity: 10,
        maxCapacity: 50,
        price: 3500,
        priceSvc: 35,
        description: "",
      });
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to add inventory item");
    }
  };

  // Save Edit Item
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      await apiService.updateItem(editingItem.id, {
        name: editingItem.name,
        category: editingItem.category,
        quantity: Number(editingItem.quantity),
        maxCapacity: Number(editingItem.maxCapacity),
        price: Number(editingItem.price),
        priceSvc: Number(editingItem.priceSvc ?? Math.round((editingItem.price || 0) / 100)),
        description: editingItem.description,
        updatedBy: "Red Leader",
      });
      soundFx.playSuccessSound();
      setIsEditOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to update item");
    }
  };

  // Delete Item
  const handleDeleteItem = async (item: Item) => {
    if (!isLeader) return;
    if (!confirm(`Are you sure you want to remove "${item.name}" from the Gang Stash?`)) return;
    try {
      await apiService.deleteItem(item.id, "Red Leader");
      soundFx.playErrorSound();
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  // Handle Withdraw / Deposit
  const handleExecuteStashAction = async () => {
    if (!selectedItemForAction) return;
    const qty = Number(actionQuantity);
    if (qty <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }

    if (actionType === "withdraw" && qty > (selectedItemForAction.quantity || 0)) {
      alert("Cannot withdraw more than current stash stock!");
      return;
    }

    const newQty =
      actionType === "withdraw"
        ? Math.max(0, (selectedItemForAction.quantity || 0) - qty)
        : (selectedItemForAction.quantity || 0) + qty;

    const opName = operativeName.trim() || (isLeader ? "Red Leader" : "Red Operative");
    const unitPriceCash = selectedItemForAction.price || 0;
    const unitPriceSvc = selectedItemForAction.priceSvc ?? Math.round(unitPriceCash / 100);

    try {
      await apiService.updateItem(selectedItemForAction.id, {
        quantity: newQty,
        updatedBy: opName,
      });

      // Handle Treasury Transaction if Cash or SVC selected
      let paymentSummary = "No Treasury Settlement";
      if (paymentMode === "cash") {
        const totalCash = qty * unitPriceCash;
        paymentSummary = `$${totalCash.toLocaleString()} Cash`;
        if (totalCash > 0) {
          await apiService.addTransaction({
            description: `${opName} ${actionType === "withdraw" ? "bought" : "supplied"} ${qty}x ${selectedItemForAction.name}`,
            amount: totalCash,
            currency: "cash",
            type: actionType === "withdraw" ? "income" : "expense",
            category: actionType === "withdraw" ? "Stash Purchase" : "Stash Supply",
            addedBy: opName,
            date: new Date().toISOString().split("T")[0],
          });
        }
      } else if (paymentMode === "svc") {
        const totalSvc = qty * unitPriceSvc;
        paymentSummary = `${totalSvc.toLocaleString()} SVC`;
        if (totalSvc > 0) {
          await apiService.addTransaction({
            description: `${opName} ${actionType === "withdraw" ? "bought" : "supplied"} ${qty}x ${selectedItemForAction.name} via Crypto`,
            amount: totalSvc,
            currency: "svc",
            type: actionType === "withdraw" ? "income" : "expense",
            category: actionType === "withdraw" ? "Stash Purchase (SVC)" : "Stash Supply (SVC)",
            addedBy: opName,
            date: new Date().toISOString().split("T")[0],
          });
        }
      }

      // Also create an audit log entry for this action
      await apiService.addAuditLog({
        action: actionType === "withdraw" ? "stash_withdraw" : "stash_deposit",
        category: "inventory",
        description: `${opName} ${actionType === "withdraw" ? "withdrew" : "deposited"} ${qty}x ${selectedItemForAction.name} [${paymentSummary}] (Stock now: ${newQty})`,
        performedBy: opName,
      });

      if (paymentMode === "svc") {
        soundFx.playCryptoSound();
      } else {
        soundFx.playCashSound();
      }

      setIsWithdrawOpen(false);
      setSelectedItemForAction(null);
      setActionQuantity(1);
      setPaymentMode("cash");
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Action failed");
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q));

    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });



  // Calculate inventory valuation
  const totalStockCount = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalStashValue = items.reduce(
    (sum, i) => sum + (i.quantity || 0) * (i.price || 0),
    0
  );

  return (
    <div className="space-y-6 font-rajdhani">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl md:text-3xl font-orbitron font-extrabold text-red-600">
              GANG STASH & ARSENAL
            </h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-red-50 border border-red-200 text-red-700 shadow-sm">
              {items.length} Asset Types
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Realtime weapons, ammunition, armor, medkits, and contraband stash reserves.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {isLeader && (
            <Button
              onClick={() => {
                soundFx.playClickSound();
                setIsAddOpen(true);
              }}
              className="btn-gang flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Stash Asset
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-gang p-4 border-l-4 border-l-red-600">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Total Units In Stash
            </span>
            <Box className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-slate-900 mt-2">
            {totalStockCount.toLocaleString()} <span className="text-xs text-slate-500 font-normal">Units</span>
          </p>
          <span className="text-xs text-slate-500">
            Distributed across {items.length} tactical asset classes
          </span>
        </Card>

        <Card className="card-gang p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Estimated Stash Value
            </span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-emerald-600 mt-2">
            ${totalStashValue.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500">
            Black market syndicate valuation
          </span>
        </Card>

        <Card className="card-gang p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Low Stock Alerts
            </span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-amber-700 mt-2">
            {items.filter((i) => (i.quantity || 0) <= 5).length} Items
          </p>
          <span className="text-xs text-slate-500">
            Reserves below critical threshold (&le; 5 units)
          </span>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="card-gang p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search weapons, ammo, contraband..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-rajdhani focus:border-red-500"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                categoryFilter === "all"
                  ? "bg-red-600 text-white shadow-sm border border-red-600"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              All Assets ({items.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = items.filter((i) => i.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    categoryFilter === cat.id
                      ? "bg-red-600 text-white shadow-sm border border-red-600"
                      : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <cat.icon className={`w-3.5 h-3.5 ${categoryFilter === cat.id ? "text-white" : cat.color}`} />
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Items Grid */}
      {loading ? (
        <div className="py-16 text-center text-red-600 font-orbitron animate-pulse font-bold">
          Accessing Red Network tactical armory...
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="card-gang p-12 text-center text-slate-500">
          <Package className="w-12 h-12 mx-auto text-red-500/40 mb-3" />
          <p className="text-lg">No stash items found matching criteria.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isLowStock = (item.quantity || 0) <= 5;
            const categoryMeta = CATEGORIES.find((c) => c.id === item.category);
            const Icon = categoryMeta?.icon || Package;
            const stockPct = Math.min(100, Math.round(((item.quantity || 0) / (item.maxCapacity || 100)) * 100));

            return (
              <Card
                key={item.id}
                className="card-gang p-4 transition-all duration-200 hover:border-red-400 relative flex flex-col justify-between group hover:shadow-md"
              >
                <div>
                  {/* Top Item Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <Icon className={`w-5 h-5 ${categoryMeta?.color || "text-red-600"}`} />
                      </div>
                      <div>
                        <h3 className="font-rajdhani font-bold text-base text-slate-900 group-hover:text-red-600 transition-colors">
                          {item.name}
                        </h3>
                        <span className="text-[11px] font-orbitron text-slate-500 uppercase font-medium">
                          {categoryMeta?.label || item.category}
                        </span>
                      </div>
                    </div>

                    {/* Stock Alert Badge */}
                    {isLowStock && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 border border-rose-300 text-rose-700 shadow-sm">
                        LOW STOCK
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Stock Progress & Value */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span>Current Stash</span>
                        <span className="font-mono text-xs text-slate-500">{stockPct}%</span>
                      </div>
                      <span className="font-mono font-bold text-lg text-slate-900 block mt-0.5">
                        {item.quantity || 0}{" "}
                        <span className="text-xs text-slate-500 font-normal">
                          / {item.maxCapacity || 100}
                        </span>
                      </span>
                      {/* Visual Capacity Meter Bar */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isLowStock 
                              ? "bg-rose-500" 
                              : stockPct < 50 
                              ? "bg-amber-500" 
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${stockPct}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px] font-semibold">Unit Price</span>
                      <span className="font-mono font-bold text-lg text-slate-900 block mt-0.5">
                        ${(item.price || 0).toLocaleString()}
                      </span>
                      <span className="font-mono font-bold text-xs text-cyan-700 flex items-center gap-0.5 mt-0.5">
                        <Coins className="w-3 h-3" />{(item.priceSvc ?? Math.round((item.price || 0) / 100)).toLocaleString()} SVC
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Valuation: ${((item.quantity || 0) * (item.price || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Quick Quantity Modifier for Leader */}
                  {isLeader ? (
                    <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg p-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuickQuantityStep(item, -1)}
                        className="h-7 w-7 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50"
                        title="Reduce stock -1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="font-mono font-bold text-xs px-1 min-w-[24px] text-center text-slate-900">
                        {item.quantity || 0}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuickQuantityStep(item, 1)}
                        className="h-7 w-7 p-0 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                        title="Increase stock +1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                      <Package className="w-3.5 h-3.5 text-red-600" /> In Stash
                    </div>
                  )}

                  {/* Actions for Leader & Members */}
                  <div className="flex items-center gap-1.5">
                    {canInteract && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedItemForAction(item);
                          setActionType("withdraw");
                          setIsWithdrawOpen(true);
                        }}
                        className="btn-gang text-xs px-2.5 h-8 font-semibold"
                      >
                        Take / Deposit
                      </Button>
                    )}

                    {isLeader && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingItem(item);
                            setIsEditOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteItem(item)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Item Modal (Leader Only) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-red-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-orbitron text-red-600">
              ADD STASH ARSENAL ASSET
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 font-rajdhani">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600 font-bold uppercase">Asset Name</Label>
              <Input
                placeholder="e.g. Combat MG, 9mm Box, Armor..."
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="bg-white border-slate-300 text-slate-900 focus-visible:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600 font-bold uppercase">Category</Label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-red-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600 font-bold uppercase">Unit Value ($)</Label>
                <Input
                  type="number"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                  className="bg-white border-slate-300 text-slate-900 font-mono focus-visible:ring-red-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-cyan-700 font-bold uppercase flex items-center gap-1">
                <Coins className="w-3 h-3" /> SVC Price <span className="text-[9px] font-orbitron bg-cyan-100 border border-cyan-300 px-1 rounded text-cyan-800">CRYPTO</span>
              </Label>
              <Input
                type="number"
                value={newItem.priceSvc}
                onChange={(e) => setNewItem({ ...newItem, priceSvc: Number(e.target.value) })}
                className="bg-white border-cyan-300 font-mono text-cyan-700 focus-visible:ring-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600 font-bold uppercase">Starting Quantity</Label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                  className="bg-white border-slate-300 text-slate-900 font-mono focus-visible:ring-red-500"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600 font-bold uppercase">Max Capacity</Label>
                <Input
                  type="number"
                  value={newItem.maxCapacity}
                  onChange={(e) => setNewItem({ ...newItem, maxCapacity: Number(e.target.value) })}
                  className="bg-white border-slate-300 text-slate-900 font-mono focus-visible:ring-red-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-600 font-bold uppercase">Description / Notes</Label>
              <Input
                placeholder="Tactical use or caliber specs..."
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="bg-white border-slate-300 text-slate-900 focus-visible:ring-red-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="text-slate-600 hover:text-slate-900">
              Cancel
            </Button>
            <Button onClick={handleAddItem} className="btn-gang">
              Confirm Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal (Leader Only) */}
      {editingItem && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-red-200 text-slate-900 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-orbitron text-red-600">
                MODIFY STASH RECORD
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 py-2 font-rajdhani">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600 font-bold uppercase">Asset Name</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 focus-visible:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600 font-bold uppercase">Category</Label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-red-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-600 font-bold uppercase">Unit Value ($)</Label>
                  <Input
                    type="number"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    className="bg-white border-slate-300 text-slate-900 font-mono focus-visible:ring-red-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-cyan-700 font-bold uppercase flex items-center gap-1">
                  <Coins className="w-3 h-3" /> SVC Price <span className="text-[9px] font-orbitron bg-cyan-100 border border-cyan-300 px-1 rounded text-cyan-800">CRYPTO</span>
                </Label>
                <Input
                  type="number"
                  value={editingItem.priceSvc ?? Math.round((editingItem.price || 0) / 100)}
                  onChange={(e) => setEditingItem({ ...editingItem, priceSvc: Number(e.target.value) })}
                  className="bg-white border-cyan-300 font-mono text-cyan-700 focus-visible:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600 font-bold uppercase">Stock Quantity</Label>
                  <Input
                    type="number"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: Number(e.target.value) })}
                    className="bg-white border-slate-300 text-slate-900 font-mono focus-visible:ring-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-600 font-bold uppercase">Capacity</Label>
                  <Input
                    type="number"
                    value={editingItem.maxCapacity || 100}
                    onChange={(e) => setEditingItem({ ...editingItem, maxCapacity: Number(e.target.value) })}
                    className="bg-white border-slate-300 text-slate-900 font-mono focus-visible:ring-red-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600 font-bold uppercase">Description</Label>
                <Input
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 focus-visible:ring-red-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-slate-600 hover:text-slate-900">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="btn-gang">
                Save Asset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Take / Deposit Modal */}
      {selectedItemForAction && (
        <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-red-200 text-slate-900 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-orbitron text-red-600">
                STASH OPERATION // {selectedItemForAction.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 font-rajdhani">
              {/* Toggle Withdraw vs Deposit */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActionType("withdraw")}
                  className={`py-2 rounded-lg text-xs font-bold font-orbitron uppercase border transition-all ${
                    actionType === "withdraw"
                      ? "bg-red-600 text-white border-red-600 shadow-sm"
                      : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Withdraw from Stash
                </button>
                <button
                  type="button"
                  onClick={() => setActionType("deposit")}
                  className={`py-2 rounded-lg text-xs font-bold font-orbitron uppercase border transition-all ${
                    actionType === "deposit"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Deposit into Stash
                </button>
              </div>

              {/* Payment / Currency Option */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600 font-bold uppercase flex items-center justify-between">
                  <span>Settlement Currency Option</span>
                  <span className="text-[10px] text-red-600 font-mono">Vault Auto-Linked</span>
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("cash")}
                    className={`py-2 px-1.5 rounded-lg text-xs font-bold font-orbitron flex flex-col items-center justify-center gap-1 border transition-all ${
                      paymentMode === "cash"
                        ? "bg-amber-50 text-amber-800 border-amber-400 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span>Cash ($)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode("svc")}
                    className={`py-2 px-1.5 rounded-lg text-xs font-bold font-orbitron flex flex-col items-center justify-center gap-1 border transition-all ${
                      paymentMode === "svc"
                        ? "bg-cyan-50 text-cyan-800 border-cyan-400 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Coins className="w-4 h-4 text-cyan-600" />
                    <span>SVC (Crypto)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode("none")}
                    className={`py-2 px-1.5 rounded-lg text-xs font-bold font-orbitron flex flex-col items-center justify-center gap-1 border transition-all ${
                      paymentMode === "none"
                        ? "bg-slate-200 text-slate-900 border-slate-400 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Package className="w-4 h-4 text-slate-500" />
                    <span>No Vault Cost</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">Current Stock in Stash:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedItemForAction.quantity} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">Unit Price:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${(selectedItemForAction.price || 0).toLocaleString()}{" "}
                    <span className="text-cyan-700 ml-1">/ {(selectedItemForAction.priceSvc ?? Math.round((selectedItemForAction.price || 0) / 100)).toLocaleString()} SVC</span>
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-red-200 font-bold items-center">
                  <span className="text-slate-600 font-semibold">
                    {actionType === "withdraw" ? "You Pay / Vault Receives:" : "You Receive / Vault Pays:"}
                  </span>
                  {paymentMode === "cash" && (
                    <span className="font-mono text-slate-900 text-sm">
                      ${(Number(actionQuantity) * (selectedItemForAction.price || 0)).toLocaleString()} Cash
                    </span>
                  )}
                  {paymentMode === "svc" && (
                    <span className="font-mono text-cyan-700 text-sm flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      {(Number(actionQuantity) * (selectedItemForAction.priceSvc ?? Math.round((selectedItemForAction.price || 0) / 100))).toLocaleString()} SVC
                    </span>
                  )}
                  {paymentMode === "none" && (
                    <span className="font-mono text-slate-500 text-xs">
                      $0 (Free Handover)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600 font-bold uppercase">Operative Name / Call-Sign</Label>
                <Input
                  placeholder="e.g. Marcus Vance / Trigger"
                  value={operativeName}
                  onChange={(e) => setOperativeName(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 focus-visible:ring-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-600 font-bold uppercase">Quantity to {actionType === "withdraw" ? "Withdraw" : "Deposit"}</Label>
                  {actionType === "withdraw" && (
                    <span className="text-[11px] text-slate-500 font-mono">Max: {selectedItemForAction.quantity}</span>
                  )}
                </div>
                <Input
                  type="number"
                  min="1"
                  max={actionType === "withdraw" ? selectedItemForAction.quantity : 999}
                  value={actionQuantity}
                  onChange={(e) => setActionQuantity(Number(e.target.value))}
                  className="bg-white border-slate-300 text-slate-900 font-mono text-base focus-visible:ring-red-500"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 5, 10].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setActionQuantity(preset)}
                      className="px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-xs font-mono font-bold hover:border-red-500 hover:text-red-600 transition-colors text-slate-700"
                    >
                      +{preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setActionQuantity(actionType === "withdraw" ? (selectedItemForAction.quantity || 1) : 50)}
                    className="px-2.5 py-1 rounded bg-red-50 border border-red-300 text-xs font-orbitron font-bold text-red-700 hover:bg-red-100 transition-colors ml-auto"
                  >
                    MAX
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsWithdrawOpen(false)} className="text-slate-600 hover:text-slate-900">
                Cancel
              </Button>
              <Button
                onClick={handleExecuteStashAction}
                className={actionType === "withdraw" ? "btn-gang" : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"}
              >
                Confirm {actionType === "withdraw" ? "Withdrawal" : "Deposit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
