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
      <div className="bg-gradient-to-r from-red-700 via-rose-600 to-red-700 text-white border-b border-red-800 px-4 py-2 flex items-center justify-between text-xs font-rajdhani shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/20 text-white font-bold uppercase shrink-0 border border-white/20 shadow-sm">
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <Megaphone className="w-3.5 h-3.5 text-white" />
            <span className="font-orbitron text-[10px] tracking-wider">ORDERS</span>
          </div>

          {isEditingAnnouncement && isLeader ? (
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              <Input
                value={announcementInput}
                onChange={(e) => setAnnouncementInput(e.target.value)}
                placeholder="Broadcast syndicate directive to all operatives..."
                className="h-7 text-xs bg-white text-slate-900 border-white/40 focus:border-white focus:ring-0"
              />
              <Button size="sm" onClick={handleSaveAnnouncement} className="h-7 px-3 bg-white hover:bg-slate-100 text-red-700 font-bold text-xs shadow-sm">
                <Save className="w-3 h-3 mr-1" /> Broadcast
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingAnnouncement(false)}
                className="h-7 px-2 text-white/80 hover:text-white hover:bg-black/20"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-white font-semibold truncate tracking-wide">
                {announcement?.text || "🔴 Welcome to Red Network. Report to Stash for operations."}
              </span>
              {announcement?.updatedBy && (
                <span className="hidden sm:inline-block text-[10px] text-white/80 shrink-0 font-mono border-l border-white/30 pl-2">
                  // {announcement.updatedBy}
                </span>
              )}
              {isLeader && (
                <button
                  onClick={() => setIsEditingAnnouncement(true)}
                  className="text-white/80 hover:text-white shrink-0 ml-1.5 transition-colors p-1 rounded hover:bg-black/20"
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
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-white/90 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
            <span>SYSTEM ENCRYPTED</span>
          </div>
          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/20 border border-white/20 text-white hover:bg-black/30 transition-all"
            title={isMuted ? "Audio Muted (Click to Enable)" : "Audio Active (Click to Mute)"}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-white/80" />
                <span className="text-[10px] uppercase font-bold text-white/90">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
                <span className="text-[10px] uppercase font-bold text-white">Audio ON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Header & Branding */}
      <header className="border-b border-slate-300/80 bg-[#f1f5f9]/95 backdrop-blur-xl shadow-sm sticky top-[37px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative group cursor-pointer" onClick={() => setActiveTab("members")}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 via-red-500 to-rose-700 flex items-center justify-center border border-red-400 shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform duration-200 overflow-hidden p-1">
                <img
                  src="/favicon.png"
                  alt="Red Network Logo"
                  className="w-8 h-8 object-contain drop-shadow group-hover:scale-110 transition-transform duration-200"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600 border-2 border-white"></span>
              </span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-orbitron font-black tracking-wider text-gang-glow flex items-center gap-2">
                RED NETWORK
              </h1>
              <span className="text-xs font-rajdhani text-slate-600 font-semibold block -mt-0.5">
                StorymodebyChoice
              </span>
            </div>
          </div>

          {/* Quick HUD Metrics & Role Auth Panel */}
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
            {/* Total Funds HUD */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#e2e8f0]/90 border border-slate-300 hover:border-emerald-500/60 transition-colors shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-left font-rajdhani">
                <span className="text-[10px] text-slate-600 uppercase block leading-none font-bold">Total Cash</span>
                <span className="text-sm font-mono font-extrabold text-emerald-700 leading-tight">
                  ${fundBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* SVC Crypto HUD */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#e2e8f0]/90 border border-slate-300 hover:border-cyan-500/60 transition-colors shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-cyan-100 border border-cyan-300 flex items-center justify-center">
                <Coins className="w-4 h-4 text-cyan-700" />
              </div>
              <div className="text-left font-rajdhani">
                <span className="text-[10px] text-slate-600 uppercase block leading-none font-bold">SVC Vault</span>
                <span className="text-sm font-mono font-extrabold text-cyan-700 leading-tight flex items-center gap-1">
                  {svcBalance.toLocaleString()} <span className="text-[10px] font-orbitron text-cyan-600">SVC</span>
                </span>
              </div>
            </div>

            {/* Week HUD */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#e2e8f0]/90 border border-slate-300 hover:border-amber-500/60 transition-colors shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-amber-700" />
              </div>
              <div className="text-left font-rajdhani">
                <span className="text-[10px] text-slate-600 uppercase block leading-none font-bold">Dues Cycle</span>
                <span className="text-sm font-mono font-extrabold text-amber-700 leading-tight">
                  Week #{cycle.currentWeekNumber}
                </span>
              </div>
            </div>

            {/* Current Role Badge & Switcher */}
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-xl bg-[#e2e8f0]/90 border flex items-center gap-2.5 shadow-sm ${
                isLeader 
                  ? "border-red-400 bg-red-50/80 text-red-700" 
                  : isMember 
                  ? "border-amber-400 bg-amber-50/80 text-amber-800" 
                  : "border-blue-300 bg-blue-50/80 text-blue-800"
              }`}>
                {isLeader ? (
                  <Shield className="w-4 h-4 text-red-600" />
                ) : isMember ? (
                  <Users className="w-4 h-4 text-amber-600" />
                ) : (
                  <Globe className="w-4 h-4 text-blue-600" />
                )}
                <div className="text-left font-rajdhani">
                  <span className="text-[9px] text-slate-600 uppercase block leading-none font-semibold">
                    {isLeader ? "Full Authority" : isMember ? "Gang Member" : "Public View"}
                  </span>
                  <span className={`text-xs font-bold font-orbitron leading-tight ${
                    isLeader ? "text-red-700" : isMember ? "text-amber-700" : "text-blue-700"
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
                  className="h-9 px-3 text-xs bg-[#f8fafc] border-slate-300 text-slate-700 hover:text-red-700 hover:bg-red-50 font-rajdhani hover:border-red-400 transition-colors shadow-sm"
                >
                  Exit Role
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="border-t border-slate-300 bg-[#e2e8f0]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto py-1.5">
            {[
              { id: "members", label: "Gang Members", icon: Users, badge: `${membersCount}` },
              { id: "weekly", label: "Weekly Dues", icon: RotateCcw, badge: `W#${cycle.currentWeekNumber}` },
              { id: "funds", label: "Total Funds", icon: Wallet, badge: `$${fundBalance >= 1000000 ? (fundBalance / 1000000).toFixed(1) + 'M' : (fundBalance / 1000).toFixed(0) + 'k'}`, badgeColor: "text-emerald-700 border-emerald-300 bg-emerald-50" },
              { id: "inventory", label: "Gang Inventory (inv)", icon: Package, badge: "Stash" },
              { id: "wars", label: "Gang Wars", icon: Swords, badge: "W/L", badgeColor: "text-amber-700 border-amber-300 bg-amber-50" },
              { id: "streams", label: "Live Streams", icon: Radio, badge: "● LIVE", badgeColor: "text-red-700 border-red-300 bg-red-50" },
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
                      ? "bg-gradient-to-r from-red-600 via-red-600 to-rose-600 text-white shadow-md shadow-red-500/25 border border-red-500"
                      : "text-slate-700 hover:text-red-700 hover:bg-[#f8fafc] border border-transparent hover:border-slate-300 shadow-none hover:shadow-sm"
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-red-600"}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-orbitron font-semibold border ${
                      isActive 
                        ? "bg-white/20 border-white/40 text-white" 
                        : tab.badgeColor || "bg-[#f8fafc] border-slate-300 text-slate-700"
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
      <footer className="border-t border-slate-300 bg-[#f1f5f9] py-4 px-4 text-xs font-rajdhani text-slate-600 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span className="font-orbitron font-bold text-slate-800 tracking-wider">RED NETWORK</span>
          </div>
          <div className="text-slate-500 font-mono text-xs">
            Developed by <span className="text-red-600 font-bold">Tatya Vinchu</span> <span className="text-slate-400">(om006)</span>
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
