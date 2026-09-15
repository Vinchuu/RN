import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldCheck,
  Users,
  UserPlus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Lock,
  Unlock,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { apiService } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface DiscordAccessEntry {
  discordId: string;
  label?: string;
  addedBy?: string;
  addedAt?: string;
}

interface DiscordAccessTabProps {
  currentUsername: string;
}

export function DiscordAccessTab({ currentUsername }: DiscordAccessTabProps) {
  const [adminList, setAdminList] = useState<DiscordAccessEntry[]>([]);
  const [memberList, setMemberList] = useState<DiscordAccessEntry[]>([]);
  const [openMemberAccess, setOpenMemberAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Admin Form State
  const [adminIdInput, setAdminIdInput] = useState("");
  const [adminLabelInput, setAdminLabelInput] = useState("");
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // New Member Form State
  const [memberIdInput, setMemberIdInput] = useState("");
  const [memberLabelInput, setMemberLabelInput] = useState("");
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  const fetchAccess = async () => {
    setLoading(true);
    try {
      const data = await apiService.getDiscordAccess();
      setAdminList(data.adminDiscordIds || []);
      setMemberList(data.memberDiscordIds || []);
      setOpenMemberAccess(Boolean(data.openMemberAccess));
    } catch (err) {
      console.error("Failed to load discord access rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccess();
  }, []);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    soundFx.playClickSound();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = adminIdInput.trim();
    if (!id) return;
    setIsSubmittingAdmin(true);
    try {
      const res = await apiService.addDiscordAccess("admin", id, adminLabelInput.trim(), currentUsername);
      if (res.success && res.access) {
        setAdminList(res.access.adminDiscordIds || []);
        setAdminIdInput("");
        setAdminLabelInput("");
        soundFx.playSuccessSound();
      }
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to grant leader access.");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = memberIdInput.trim();
    if (!id) return;
    setIsSubmittingMember(true);
    try {
      const res = await apiService.addDiscordAccess("member", id, memberLabelInput.trim(), currentUsername);
      if (res.success && res.access) {
        setMemberList(res.access.memberDiscordIds || []);
        setMemberIdInput("");
        setMemberLabelInput("");
        soundFx.playSuccessSound();
      }
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to grant member access.");
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleRemove = async (type: "admin" | "member", discordId: string, label?: string) => {
    const roleName = type === "admin" ? "Leader (Admin)" : "Gang Member";
    const confirmDelete = window.confirm(`Are you sure you want to revoke ${roleName} access from Discord ID ${discordId} (${label || "User"})?`);
    if (!confirmDelete) return;

    try {
      const res = await apiService.removeDiscordAccess(type, discordId, currentUsername);
      if (res.success && res.access) {
        if (type === "admin") {
          setAdminList(res.access.adminDiscordIds || []);
        } else {
          setMemberList(res.access.memberDiscordIds || []);
        }
        soundFx.playSuccessSound();
      }
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to revoke access.");
    }
  };

  const handleToggleOpenMember = async () => {
    const nextVal = !openMemberAccess;
    try {
      const res = await apiService.toggleOpenMemberAccess(nextVal, currentUsername);
      if (res.success && res.access) {
        setOpenMemberAccess(Boolean(res.access.openMemberAccess));
        soundFx.playSuccessSound();
      }
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to update member access policy.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#e2e8f0] via-[#cbd5e1] to-[#e2e8f0] p-5 sm:p-6 rounded-2xl border border-slate-300/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-orbitron text-slate-800 tracking-wide flex items-center gap-2">
              DISCORD ACCESS MANAGEMENT
            </h2>
          </div>
          <p className="text-sm font-rajdhani text-slate-600 font-semibold max-w-2xl">
            Grant or revoke in-game syndicate dashboard permissions via Discord User ID. Changes save immediately to database storage with zero server restarts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccess}
            disabled={loading}
            className="h-9 font-rajdhani font-bold border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Rules
          </Button>
        </div>
      </div>

      {/* Grid: Leader Authority & Gang Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leader Access (Admins) */}
        <Card className="border-red-300/80 bg-white/95 shadow-md shadow-red-500/5">
          <CardHeader className="border-b border-red-100 bg-gradient-to-r from-red-50/70 via-rose-50/40 to-transparent pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-red-600 text-white shadow-sm">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="font-orbitron text-base text-red-950 font-bold flex items-center gap-2">
                    Red Leaders (High Command)
                    <Badge className="bg-red-600 text-white text-[10px] font-mono px-2 py-0.5">
                      {adminList.length} Authorized
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs font-rajdhani text-slate-600">
                    Full authority: Vault withdrawals, directive broadcasts, inventory control & permission edits.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Add Leader Form */}
            <form onSubmit={handleAddAdmin} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-rajdhani font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-red-600" />
                Authorize New Leader
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Discord User ID (18-19 digits)"
                  value={adminIdInput}
                  onChange={(e) => setAdminIdInput(e.target.value)}
                  className="bg-white border-slate-300 text-xs font-mono"
                  required
                />
                <Input
                  placeholder="Leader Name / Call-sign (e.g. Vance)"
                  value={adminLabelInput}
                  onChange={(e) => setAdminLabelInput(e.target.value)}
                  className="bg-white border-slate-300 text-xs font-rajdhani font-semibold"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmittingAdmin || !adminIdInput.trim()}
                className="w-full h-8 text-xs font-rajdhani font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-sm"
              >
                {isSubmittingAdmin ? "Granting Access..." : "Grant Leader Authority"}
              </Button>
            </form>

            {/* Leader List */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {adminList.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs font-rajdhani text-slate-500">
                  No custom Leader Discord IDs saved in database.
                </div>
              ) : (
                adminList.map((entry) => (
                  <div
                    key={entry.discordId}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3 hover:border-red-300 transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-rajdhani text-slate-800 truncate">
                          {entry.label || "Red Leader"}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono border-red-200 text-red-700 bg-red-50">
                          LEADER
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-slate-600 font-semibold select-all">
                          {entry.discordId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(entry.discordId)}
                          className="text-slate-400 hover:text-slate-700 transition-colors"
                          title="Copy Discord ID"
                        >
                          {copiedId === entry.discordId ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove("admin", entry.discordId, entry.label)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                      title="Revoke Leader Access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Member Access */}
        <Card className="border-amber-300/80 bg-white/95 shadow-md shadow-amber-500/5">
          <CardHeader className="border-b border-amber-100 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-transparent pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-600 text-white shadow-sm">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="font-orbitron text-base text-amber-950 font-bold flex items-center gap-2">
                    Gang Members (Operatives)
                    <Badge className="bg-amber-600 text-white text-[10px] font-mono px-2 py-0.5">
                      {memberList.length} Whitelisted
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs font-rajdhani text-slate-600">
                    Operative access: View dues, place gear orders, view stash & stream status.
                  </CardDescription>
                </div>
              </div>

              {/* Open Access Toggle Button */}
              <button
                type="button"
                onClick={handleToggleOpenMember}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-rajdhani font-bold transition-all shadow-sm ${
                  openMemberAccess
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                    : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                }`}
                title="Toggle whether any Discord user can log in as Member"
              >
                {openMemberAccess ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mode: Open Access</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mode: Strict Whitelist</span>
                  </>
                )}
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Status Alert for Open vs Strict */}
            {openMemberAccess ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs font-rajdhani text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Open Gang Member Access Enabled</span>
                  Any member who authenticates with Discord can enter the Gang Member dashboard. Leader authority is still strictly restricted.
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs font-rajdhani text-amber-900">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Strict Member Whitelist Active</span>
                  Only users with Discord IDs listed below can enter Member mode. (Or use gang passcode).
                </div>
              </div>
            )}

            {/* Add Member Form */}
            <form onSubmit={handleAddMember} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-rajdhani font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                Whitelist Operative Discord ID
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Discord User ID (18-19 digits)"
                  value={memberIdInput}
                  onChange={(e) => setMemberIdInput(e.target.value)}
                  className="bg-white border-slate-300 text-xs font-mono"
                  required
                />
                <Input
                  placeholder="Operative Name / Alias (e.g. Ghost)"
                  value={memberLabelInput}
                  onChange={(e) => setMemberLabelInput(e.target.value)}
                  className="bg-white border-slate-300 text-xs font-rajdhani font-semibold"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmittingMember || !memberIdInput.trim()}
                className="w-full h-8 text-xs font-rajdhani font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-sm"
              >
                {isSubmittingMember ? "Whitelisting..." : "Whitelist Gang Member ID"}
              </Button>
            </form>

            {/* Member List */}
            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
              {memberList.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs font-rajdhani text-slate-500">
                  No individual member Discord IDs whitelisted.
                </div>
              ) : (
                memberList.map((entry) => (
                  <div
                    key={entry.discordId}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3 hover:border-amber-300 transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-rajdhani text-slate-800 truncate">
                          {entry.label || "Operative"}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono border-amber-200 text-amber-700 bg-amber-50">
                          MEMBER
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-slate-600 font-semibold select-all">
                          {entry.discordId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(entry.discordId)}
                          className="text-slate-400 hover:text-slate-700 transition-colors"
                          title="Copy Discord ID"
                        >
                          {copiedId === entry.discordId ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove("member", entry.discordId, entry.label)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                      title="Revoke Whitelist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guide Note on Finding Discord ID */}
      <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200/80 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold font-rajdhani uppercase text-slate-800">
            How to get someone's Discord User ID:
          </h4>
          <p className="text-xs font-rajdhani text-slate-600">
            In Discord: Go to <strong>User Settings</strong> &gt; <strong>Advanced</strong> &gt; Enable <strong>Developer Mode</strong>. Then right-click any user's profile picture and select <strong>"Copy User ID"</strong>. Paste that 18-19 digit number here.
          </p>
        </div>
      </div>
    </div>
  );
}
