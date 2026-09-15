import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  Users,
  Search,
  Filter,
  Crown,
  Award,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  Flame,
  AlertTriangle,
  Radio,
  Coins,
} from "lucide-react";
import { apiService, Member } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface MembersTabProps {
  userMode: "admin" | "gangmember" | "viewer2";
}

const RANKS = [
  { id: "leader", label: "Boss / Leader", color: "bg-red-100 border-red-500 text-red-700 font-bold" },
  { id: "underboss", label: "Underboss", color: "bg-rose-100 border-rose-400 text-rose-700 font-bold" },
  { id: "enforcer", label: "Enforcer", color: "bg-amber-100 border-amber-400 text-amber-800 font-bold" },
  { id: "hitman", label: "Hitman", color: "bg-purple-100 border-purple-400 text-purple-700 font-bold" },
  { id: "soldier", label: "Soldier", color: "bg-slate-100 border-slate-400 text-slate-700 font-bold" },
  { id: "recruit", label: "Recruit", color: "bg-slate-50 border-slate-300 text-slate-600 font-bold" },
];

export function MembersTab({ userMode }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const isLeader = userMode === "admin";

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Add Member State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    rank: "recruit",
    contribution: 50000,
    contributionSvc: 100,
  });

  // Edit Member State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setLoading(false);
    }, 1000);

    apiService.getMembers()
      .then((data) => {
        if (isSubscribed) {
          setMembers(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching members:", err);
        if (isSubscribed) setLoading(false);
      });

    const unsubscribe = apiService.subscribeToMembers((newMembers) => {
      if (isSubscribed && Array.isArray(newMembers)) {
        setMembers(newMembers);
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const handleAddMember = async () => {
    if (!newMember.name.trim()) {
      alert("Member name is required");
      return;
    }
    try {
      await apiService.addMember(newMember);
      soundFx.playSuccessSound();
      setIsAddOpen(false);
      setNewMember({
        name: "",
        rank: "recruit",
        contribution: 50000,
        contributionSvc: 100,
      });
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to add member");
    }
  };

  const handleEditSave = async () => {
    if (!editingMember) return;
    try {
      await apiService.updateMember(editingMember.id, {
        name: editingMember.name,
        rank: editingMember.rank,
        contribution: Number(editingMember.contribution),
        contributionSvc: Number(editingMember.contributionSvc ?? 100),
      });
      soundFx.playSuccessSound();
      setIsEditOpen(false);
      setEditingMember(null);
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to update member");
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from Red Network?`)) return;
    try {
      await apiService.deleteMember(id, "Red Leader");
      soundFx.playErrorSound();
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  // Quick dues toggle on member card for Leader
  const handleQuickToggleDues = async (member: Member) => {
    if (!isLeader) return;
    const nextState = !member.hasPaid;
    try {
      if (nextState) soundFx.playCashSound();
      else soundFx.playClickSound();

      await apiService.updateMember(member.id, { hasPaid: nextState });
      // Also record in weekly payment records
      await apiService.upsertWeeklyPaymentRecord({
        memberId: member.id,
        memberName: member.name,
        weekNumber: 1, // default current cycle
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        contribution: member.contribution || 50000,
        hasPaid: nextState,
        paymentDate: nextState ? new Date().toISOString().split("T")[0] : undefined,
        markedBy: "Red Leader",
      });
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to update member status");
    }
  };

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.rank && m.rank.toLowerCase().includes(q))
    );
  });

  const totalQuotaExpected = members.reduce((sum, m) => sum + (m.contribution || 0), 0);
  const paidCount = members.filter((m) => m.hasPaid).length;
  const complianceRate = members.length > 0 ? Math.round((paidCount / members.length) * 100) : 0;

  const getRankBadge = (rank?: string) => {
    const r = RANKS.find((x) => x.id === (rank || "recruit").toLowerCase());
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-orbitron font-bold uppercase border ${r?.color || "bg-slate-100 border-slate-300 text-slate-700"}`}>
        {rank === "leader" ? "👑 " : ""}{r?.label || rank}
      </span>
    );
  };

  return (
    <div className="space-y-6 font-rajdhani">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl md:text-3xl font-orbitron font-extrabold text-red-600">
              GANG MEMBERS
            </h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-red-50 border border-red-200 text-red-700 shadow-sm">
              {members.length} Members
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Red Network verified syndicate personnel hierarchy, quotas & live dues status.
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
              Add Member
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-gang p-4 border-l-4 border-l-red-600">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Total Quota Target
            </span>
            <Flame className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-slate-900 mt-2 font-mono">
            ${totalQuotaExpected.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500">
            Weekly commitment across all ranks
          </span>
        </Card>

        <Card className="card-gang p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Dues Paid Compliance
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-emerald-600 mt-2 font-mono">
            {paidCount} / {members.length} Paid
          </p>
          {/* Mini progress */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </Card>

        <Card className="card-gang p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Syndicate Strength
            </span>
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-amber-700 mt-2 font-mono">
            {complianceRate}% <span className="text-xs text-slate-500 font-normal">Fulfilled</span>
          </p>
          <span className="text-xs text-amber-700 font-medium">
            {members.length - paidCount} operatives pending payment
          </span>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="card-gang p-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search member by name or rank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-rajdhani focus:border-red-500"
          />
        </div>
      </Card>

      {/* Members Grid */}
      {loading ? (
        <div className="py-16 text-center text-red-600 font-orbitron animate-pulse font-bold">
          Querying Red Network encrypted database...
        </div>
      ) : filteredMembers.length === 0 ? (
        <Card className="card-gang p-12 text-center text-slate-500 font-rajdhani">
          <Users className="w-12 h-12 mx-auto text-red-500/40 mb-3" />
          <p className="text-lg">No operatives found matching current filters.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card
              key={member.id}
              className="card-gang p-4 transition-all duration-200 hover:border-red-400 relative group"
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 to-rose-500 border border-red-200 flex items-center justify-center font-orbitron font-extrabold text-white text-lg shadow-sm shrink-0">
                    {member.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-rajdhani font-bold text-base text-slate-900 group-hover:text-red-600 transition-colors">
                      {member.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {getRankBadge(member.rank)}
                    </div>
                  </div>
                </div>

                {/* Leader Actions Menu */}
                {isLeader && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingMember(member);
                        setIsEditOpen(true);
                      }}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                      title="Edit Member"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMember(member.id, member.name)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Remove Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats / Details Divider */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs font-rajdhani">
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold">Cash Quota</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${(member.contribution || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold flex items-center gap-0.5">
                    <Coins className="w-3 h-3 text-cyan-600" /> SVC Quota
                  </span>
                  <span className="font-mono font-bold text-cyan-600">
                    {(member.contributionSvc ?? 100).toLocaleString()} <span className="text-[9px] text-cyan-700 font-orbitron">SVC</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold">Cash Dues</span>
                  {member.hasPaid ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Member Modal (Leader Only) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-red-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-orbitron text-red-600">
              ADD GANG MEMBER
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 font-rajdhani">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600 font-bold uppercase">Member Name</Label>
              <Input
                placeholder="e.g. Tatya Vinchu"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                className="bg-white border-slate-300 text-slate-900 focus-visible:ring-red-500"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-600 font-bold uppercase">Rank</Label>
              <select
                value={newMember.rank}
                onChange={(e) => setNewMember({ ...newMember, rank: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-red-500"
              >
                {RANKS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600 font-bold uppercase">Weekly Cash Dues ($)</Label>
                <Input
                  type="number"
                  value={newMember.contribution}
                  onChange={(e) => setNewMember({ ...newMember, contribution: Number(e.target.value) })}
                  className="bg-white border-slate-300 text-slate-900 font-mono focus-visible:ring-red-500"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-cyan-700 font-bold uppercase flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Weekly SVC Dues
                </Label>
                <Input
                  type="number"
                  value={newMember.contributionSvc}
                  onChange={(e) => setNewMember({ ...newMember, contributionSvc: Number(e.target.value) })}
                  className="bg-white border-cyan-300 text-cyan-700 font-mono focus-visible:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="text-slate-600 hover:text-slate-900">
              Cancel
            </Button>
            <Button onClick={handleAddMember} className="btn-gang">
              Recruit Operative
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal (Leader Only) */}
      {editingMember && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-red-200 text-slate-900 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-orbitron text-red-600">
                UPDATE OPERATIVE DOSSIER
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 py-2 font-rajdhani">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600 font-bold uppercase">Member Name</Label>
                <Input
                  placeholder="e.g. Tatya Vinchu"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 focus-visible:ring-red-500"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600 font-bold uppercase">Rank</Label>
                <select
                  value={editingMember.rank || "recruit"}
                  onChange={(e) => setEditingMember({ ...editingMember, rank: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-red-500"
                >
                  {RANKS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600 font-bold uppercase">Weekly Cash Quota ($)</Label>
                  <Input
                    type="number"
                    value={editingMember.contribution}
                    onChange={(e) => setEditingMember({ ...editingMember, contribution: Number(e.target.value) })}
                    className="bg-white border-slate-300 text-slate-900 font-mono focus-visible:ring-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-cyan-700 font-bold uppercase flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Weekly SVC Quota
                  </Label>
                  <Input
                    type="number"
                    value={editingMember.contributionSvc ?? 100}
                    onChange={(e) => setEditingMember({ ...editingMember, contributionSvc: Number(e.target.value) })}
                    className="bg-white border-cyan-300 text-cyan-700 font-mono focus-visible:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-slate-600 hover:text-slate-900">
                Cancel
              </Button>
              <Button onClick={handleEditSave} className="btn-gang">
                Save Updates
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
