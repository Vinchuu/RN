import { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  Package,
  Radio,
  FileText,
  Shield,
  Lock,
  Volume2,
  VolumeX,
  Megaphone,
  Edit,
  Save,
  X,
  Flame,
  Globe,
  RotateCcw,
  Sparkles,
  Award,
  Swords,
  Wallet,
  Coins,
} from "lucide-react";
import { LoginModal, UserMode } from "./components/auth/LoginModal";
import { MembersTab } from "./components/tabs/MembersTab";
import { WeeklyDuesTab } from "./components/tabs/WeeklyDuesTab";
import { TotalFundsTab } from "./components/tabs/TotalFundsTab";
import { InventoryTab } from "./components/tabs/InventoryTab";
import { StreamsTab } from "./components/tabs/StreamsTab";
import { WarsTab } from "./components/tabs/WarsTab";
import { AuditLogsTab } from "./components/tabs/AuditLogsTab";
import { Toaster } from "./components/ui/toaster";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { apiService, Announcement, GangFund, Cycle } from "./lib/apiService";
import { soundFx } from "./lib/soundEffects";
import "./styles/globals.css";

export function App() {
  const [userMode, setUserMode] = useState<UserMode>("viewer2");
  const [currentUsername, setCurrentUsername] = useState<string>("Guest Viewer");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("members");
  const [isMuted, setIsMuted] = useState(soundFx.isMuted());

  // Syndicate Metrics
  const [fundBalance, setFundBalance] = useState<number>(350000);
  const [svcBalance, setSvcBalance] = useState<number>(15000);
  const [membersCount, setMembersCount] = useState<number>(6);
  const [cycle, setCycle] = useState<Cycle>({
    currentWeekNumber: 1,
    cycleStartDate: new Date().toISOString(),
    lastResetAt: new Date().toISOString(),
    lastResetBy: "RED COMMAND",
  });

  // Announcement State
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementInput, setAnnouncementInput] = useState("");

  const isLeader = userMode === "admin";
  const isMember = userMode === "gangmember";
  const isViewer = userMode === "viewer2";

  // Check saved session & Discord OAuth Callback on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check stored session
      const savedRole = localStorage.getItem("rn_role") as UserMode | null;
      const savedUser = localStorage.getItem("rn_user");
      if (savedRole) {
        setUserMode(savedRole);
        if (savedUser) setCurrentUsername(savedUser);
      }

      // 1. Check Discord URL Hash (#access_token=...&state=...)
      if (window.location.hash.includes("access_token")) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const targetMode = (hashParams.get("state") || "gangmember") as UserMode;

        if (accessToken) {
          fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
            .then((res) => res.json())
            .then(async (userData) => {
              const username = userData.global_name || userData.username || "DiscordUser";
              const discordId = userData.id;

              const verifyRes = await apiService.verifyDiscordUser(discordId, username, targetMode);
              if (verifyRes.success) {
                const mode = verifyRes.mode as UserMode;
                setUserMode(mode);
                setCurrentUsername(verifyRes.username || username);
                localStorage.setItem("rn_role", mode);
                localStorage.setItem("rn_user", verifyRes.username || username);
                soundFx.playSuccessSound();
              } else {
                soundFx.playErrorSound();
                alert(verifyRes.message || "Access Denied.");
              }
              window.history.replaceState({}, document.title, window.location.pathname);
            })
            .catch((err) => {
              console.error("Discord Auth fetch failed:", err);
              window.history.replaceState({}, document.title, window.location.pathname);
            });
        }
      }
    }

    // Initial data fetch
    apiService.getGangFund().then((fund) => {
      if (fund) {
        setFundBalance(fund.totalAmount ?? fund.baseAmount ?? 350000);
        setSvcBalance(fund.totalSvcAmount ?? fund.baseSvcAmount ?? 15000);
      }
    }).catch(console.error);

    apiService.getMembers().then((m) => {
      if (Array.isArray(m)) setMembersCount(m.length);
    }).catch(console.error);

    apiService.getCycle().then((c) => {
      if (c) setCycle(c);
    }).catch(console.error);

    apiService.getAnnouncement().then((data) => {
      setAnnouncement(data);
      if (data) setAnnouncementInput(data.text);
    }).catch(console.error);

    // Socket realtime subscriptions
    const unsubFund = apiService.subscribeToGangFund((fund) => {
      if (fund) {
        setFundBalance(fund.totalAmount ?? fund.baseAmount ?? 350000);
        setSvcBalance(fund.totalSvcAmount ?? fund.baseSvcAmount ?? 15000);
      }
    });

    const unsubMembers = apiService.subscribeToMembers((m) => {
      if (Array.isArray(m)) setMembersCount(m.length);
    });

    const unsubCycle = apiService.subscribeToCycle((c) => {
      if (c) setCycle(c);
    });

    const unsubAnnouncement = apiService.subscribeToAnnouncement((newAnnouncement) => {
      setAnnouncement(newAnnouncement);
      if (newAnnouncement) setAnnouncementInput(newAnnouncement.text);
    });

    return () => {
      unsubFund();
      unsubMembers();
      unsubCycle();
      unsubAnnouncement();
    };
  }, []);

  const handleLogin = (mode: UserMode, username?: string) => {
    setUserMode(mode);
    const uname = username || (mode === "admin" ? "Red Leader" : mode === "gangmember" ? "Red Operative" : "Guest Viewer");
    setCurrentUsername(uname);
    localStorage.setItem("rn_role", mode);
    localStorage.setItem("rn_user", uname);
  };

  const handleLogout = () => {
    soundFx.playClickSound();
    setUserMode("viewer2");
    setCurrentUsername("Guest Viewer");
    localStorage.removeItem("rn_role");
    localStorage.removeItem("rn_user");
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementInput.trim()) return;
    try {
      await apiService.updateAnnouncement(announcementInput.trim(), currentUsername || "Red Leader");
      soundFx.playSuccessSound();
      setIsEditingAnnouncement(false);
    } catch (err: any) {
      alert(err.message || "Failed to broadcast announcement");
    }
  };

  const toggleSound = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
    if (!muted) soundFx.playClickSound();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Ticker / Announcement Bar */}
      <div className="bg-gradient-to-r from-red-950/90 via-black/90 to-red-950/90 border-b border-red-900/50 px-4 py-2 flex items-center justify-between text-xs font-rajdhani backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-900/50 text-red-200 font-bold uppercase shrink-0 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.4)]">
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <Megaphone className="w-3.5 h-3.5 text-red-300" />
            <span className="font-orbitron text-[10px] tracking-wider">ORDERS</span>
          </div>

          {isEditingAnnouncement && isLeader ? (
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              <Input
                value={announcementInput}
                onChange={(e) => setAnnouncementInput(e.target.value)}
                placeholder="Broadcast syndicate directive to all operatives..."
                className="h-7 text-xs bg-black/80 border-red-700/60 focus:border-red-500 text-foreground"
              />
              <Button size="sm" onClick={handleSaveAnnouncement} className="h-7 px-3 btn-gang text-xs">
                <Save className="w-3 h-3 mr-1" /> Broadcast
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingAnnouncement(false)}
                className="h-7 px-2 text-muted-foreground hover:text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-red-100 font-medium truncate tracking-wide">
                {announcement?.text || "🔴 Welcome to Red Network. Report to Stash for operations."}
              </span>
              {announcement?.updatedBy && (
                <span className="hidden sm:inline-block text-[10px] text-red-400/70 shrink-0 font-mono border-l border-red-900/50 pl-2">
                  // {announcement.updatedBy}
                </span>
              )}
              {isLeader && (
                <button
                  onClick={() => setIsEditingAnnouncement(true)}
                  className="text-red-400/60 hover:text-white shrink-0 ml-1.5 transition-colors p-1 rounded hover:bg-red-950/60"
                  title="Broadcast New Directive"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Audio Mute & Connection Status */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-red-400/80 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>SYSTEM ENCRYPTED</span>
          </div>
          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-red-900/40 text-muted-foreground hover:text-white transition-all hover:border-red-600/50"
            title={isMuted ? "Audio Muted (Click to Enable)" : "Audio Active (Click to Mute)"}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[10px] uppercase font-bold text-red-400">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-[10px] uppercase font-bold text-emerald-400">Audio ON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Header & Branding */}
      <header className="border-b border-red-900/40 bg-black/80 backdrop-blur-2xl sticky top-[41px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative group cursor-pointer" onClick={() => setActiveTab("members")}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-800 via-red-600 to-rose-950 flex items-center justify-center border border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.55)] group-hover:scale-105 transition-transform duration-200">
                <Flame className="w-7 h-7 text-white animate-pulse" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600 border border-black"></span>
              </span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-orbitron font-extrabold tracking-wider text-gang-glow flex items-center gap-2">
                RED NETWORK
              </h1>
              <span className="text-xs font-rajdhani text-muted-foreground block -mt-0.5">
                StorymodebyChoice
              </span>
            </div>
          </div>

          {/* Quick HUD Metrics & Role Auth Panel */}
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
            {/* Total Funds HUD */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-black/60 border border-red-900/50 hover:border-emerald-500/40 transition-colors shadow-inner">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left font-rajdhani">
                <span className="text-[10px] text-muted-foreground uppercase block leading-none font-bold">Total Cash</span>
                <span className="text-sm font-mono font-extrabold text-emerald-400 leading-tight">
                  ${fundBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* SVC Crypto HUD */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-black/60 border border-red-900/50 hover:border-cyan-500/40 transition-colors shadow-inner">
              <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.25)]">
                <Coins className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-left font-rajdhani">
                <span className="text-[10px] text-muted-foreground uppercase block leading-none font-bold">SVC Vault</span>
                <span className="text-sm font-mono font-extrabold text-cyan-400 leading-tight flex items-center gap-1">
                  {svcBalance.toLocaleString()} <span className="text-[10px] font-orbitron text-cyan-300">SVC</span>
                </span>
              </div>
            </div>

            {/* Week HUD */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-black/60 border border-red-900/50 hover:border-amber-500/40 transition-colors shadow-inner">
              <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-500/30 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-left font-rajdhani">
                <span className="text-[10px] text-muted-foreground uppercase block leading-none font-bold">Dues Cycle</span>
                <span className="text-sm font-mono font-extrabold text-amber-300 leading-tight">
                  Week #{cycle.currentWeekNumber}
                </span>
              </div>
            </div>

            {/* Current Role Badge & Switcher */}
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-xl bg-black/70 border flex items-center gap-2.5 ${
                isLeader 
                  ? "border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                  : isMember 
                  ? "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                  : "border-blue-500/40"
              }`}>
                {isLeader ? (
                  <Shield className="w-4 h-4 text-red-500 animate-pulse" />
                ) : isMember ? (
                  <Users className="w-4 h-4 text-amber-400" />
                ) : (
                  <Globe className="w-4 h-4 text-blue-400" />
                )}
                <div className="text-left font-rajdhani">
                  <span className="text-[9px] text-muted-foreground uppercase block leading-none">
                    {isLeader ? "Full Authority" : isMember ? "Gang Member" : "Public View"}
                  </span>
                  <span className={`text-xs font-bold font-orbitron leading-tight ${
                    isLeader ? "text-red-400" : isMember ? "text-amber-300" : "text-blue-300"
                  }`}>
                    {isLeader ? "LEADER" : isMember ? "MEMBER" : "VIEWER"}
                  </span>
                </div>
              </div>

              {isViewer ? (
                <Button
                  onClick={() => {
                    soundFx.playClickSound();
                    setShowLoginModal(true);
                  }}
                  className="btn-gang text-xs h-9 px-3.5"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  Operative Login
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="h-9 px-3 text-xs bg-black/60 border-red-900/60 text-muted-foreground hover:text-white hover:bg-red-950/60 font-rajdhani hover:border-red-500/50 transition-colors"
                >
                  Exit Role
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="border-t border-red-950/80 bg-black/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto py-1.5">
            {[
              { id: "members", label: "Gang Members", icon: Users, badge: `${membersCount}` },
              { id: "weekly", label: "Weekly Dues", icon: RotateCcw, badge: `W#${cycle.currentWeekNumber}` },
              { id: "funds", label: "Total Funds", icon: Wallet, badge: `$${fundBalance >= 1000000 ? (fundBalance / 1000000).toFixed(1) + 'M' : (fundBalance / 1000).toFixed(0) + 'k'}`, badgeColor: "text-emerald-400 border-emerald-500/60 bg-emerald-950/80" },
              { id: "inventory", label: "Gang Inventory (inv)", icon: Package, badge: "Stash" },
              { id: "wars", label: "Gang Wars", icon: Swords, badge: "W/L", badgeColor: "text-amber-400 border-amber-500/60 bg-amber-950/80" },
              { id: "streams", label: "Live Streams", icon: Radio, badge: "● LIVE", badgeColor: "text-red-400 border-red-500/60 bg-red-950/80" },
              { id: "logs", label: "Audit Logs", icon: FileText, badge: "Ledger" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundFx.playClickSound();
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-rajdhani font-bold transition-all duration-200 whitespace-nowrap group ${
                    isActive
                      ? "bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.55)] border border-red-400/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-red-950/40 border border-transparent hover:border-red-900/30"
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-red-400"}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-orbitron font-semibold border ${
                      isActive 
                        ? "bg-black/40 border-white/30 text-white" 
                        : tab.badgeColor || "bg-black/60 border-red-900/40 text-red-300"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "members" && <MembersTab userMode={userMode} />}
        {activeTab === "weekly" && <WeeklyDuesTab userMode={userMode} />}
        {activeTab === "funds" && <TotalFundsTab userMode={userMode} />}
        {activeTab === "inventory" && <InventoryTab userMode={userMode} />}
        {activeTab === "wars" && <WarsTab userMode={userMode} />}
        {activeTab === "streams" && <StreamsTab userMode={userMode} />}
        {activeTab === "logs" && <AuditLogsTab userMode={userMode} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-red-950 bg-black/90 py-4 px-4 text-xs font-rajdhani text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span className="font-orbitron font-bold text-foreground tracking-wider">RED NETWORK</span>
          </div>
          <div className="text-muted-foreground font-mono text-xs">
            Developed by <span className="text-red-400 font-bold">Tatya Vinchu</span> <span className="text-zinc-400">(om006)</span>
          </div>
        </div>
      </footer>

      {/* Login / Role Selection Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />

      <Toaster />
    </div>
  );
}

export default App;
