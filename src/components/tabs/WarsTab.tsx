import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
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
  Swords,
  Trophy,
  Skull,
  Video,
  Play,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Search,
  Filter,
  Calendar,
  MapPin,
  Flame,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Share2,
} from "lucide-react";
import { apiService, War, WarPov } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface WarsTabProps {
  userMode: "admin" | "gangmember" | "viewer2";
}

export function WarsTab({ userMode }: WarsTabProps) {
  const [wars, setWars] = useState<War[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOutcome, setFilterOutcome] = useState<"all" | "W" | "L">("all");

  // Selected War for Detailed POV Viewing
  const [activeWar, setActiveWar] = useState<War | null>(null);
  const [selectedPov, setSelectedPov] = useState<WarPov | null>(null);

  // Add War Modal (Leader Only)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newWar, setNewWar] = useState({
    rivalGang: "",
    outcome: "W" as "W" | "L",
    date: new Date().toISOString().split("T")[0],
    score: "RN 10 - 2 Rival",
    summary: "",
    clips: [
      { operativeName: "", title: "", url: "" },
    ],
  });

  // Add POV to existing War Modal
  const [isAddPovOpen, setIsAddPovOpen] = useState(false);
  const [newPov, setNewPov] = useState({
    operativeName: "",
    title: "",
    url: "",
  });

  const isLeader = userMode === "admin";
  const canAdd = userMode === "admin" || userMode === "gangmember";

  useEffect(() => {
    let isSubscribed = true;

    apiService.getWars()
      .then((data) => {
        if (isSubscribed) {
          setWars(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching wars:", err);
        if (isSubscribed) setLoading(false);
      });

    const unsubscribe = apiService.subscribeToWars((newWars) => {
      if (isSubscribed && Array.isArray(newWars)) {
        setWars(newWars);
        setLoading(false);
        if (activeWar) {
          const updated = newWars.find((w) => w.id === activeWar.id);
          if (updated) setActiveWar(updated);
        }
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [activeWar]);

  useEffect(() => {
    if (activeWar && activeWar.povs && activeWar.povs.length > 0) {
      setSelectedPov(activeWar.povs[0]);
    } else {
      setSelectedPov(null);
    }
  }, [activeWar]);

  const getEmbedVideoUrl = (url: string): string => {
    if (!url) return "";
    let clean = url.trim();

    if (clean.includes("youtube.com/watch?v=")) {
      const vid = clean.split("watch?v=")[1].split("&")[0];
      return `https://www.youtube.com/embed/${vid}?autoplay=1`;
    }
    if (clean.includes("youtu.be/")) {
      const vid = clean.split("youtu.be/")[1].split("?")[0];
      return `https://www.youtube.com/embed/${vid}?autoplay=1`;
    }
    if (clean.includes("twitch.tv/videos/")) {
      const vid = clean.split("twitch.tv/videos/")[1].split("?")[0];
      const host = window.location.hostname || "localhost";
      return `https://player.twitch.tv/?video=${vid}&parent=${host}&autoplay=true`;
    }
    if (clean.includes("streamable.com/")) {
      const vid = clean.split("streamable.com/")[1].split("?")[0];
      return `https://streamable.com/e/${vid}?autoplay=1`;
    }
    return clean;
  };

  const handleAddClipField = () => {
    setNewWar((prev) => ({
      ...prev,
      clips: [...prev.clips, { operativeName: "", title: "", url: "" }],
    }));
  };

  const handleRemoveClipField = (index: number) => {
    setNewWar((prev) => ({
      ...prev,
      clips: prev.clips.filter((_, i) => i !== index),
    }));
  };

  const handleClipFieldChange = (index: number, field: "operativeName" | "title" | "url", val: string) => {
    setNewWar((prev) => {
      const next = [...prev.clips];
      next[index] = { ...next[index], [field]: val };
      return { ...prev, clips: next };
    });
  };

  // Add War Handler
  const handleAddWar = async () => {
    if (!newWar.rivalGang.trim()) {
      alert("Rival gang name is required!");
      return;
    }

    try {
      const povs: WarPov[] = (newWar.clips || [])
        .filter((c) => c.url && c.url.trim().length > 0)
        .map((c, idx) => ({
          id: `pov_${Date.now()}_${idx}`,
          operativeName: c.operativeName.trim() || (isLeader ? "Red Leader" : "Red Operative"),
          title: c.title.trim() || `Combat Angle #${idx + 1}`,
          url: c.url.trim(),
          platform: c.url.includes("medal") ? "medal" : "youtube",
        }));

      await apiService.addWar({
        rivalGang: newWar.rivalGang.trim(),
        outcome: newWar.outcome,
        date: newWar.date || new Date().toISOString().split("T")[0],
        location: "",
        score: newWar.score.trim(),
        summary: newWar.summary.trim(),
        addedBy: isLeader ? "Red Leader" : "Operative",
        povs,
      });

      soundFx.playSuccessSound();
      setIsAddOpen(false);
      setNewWar({
        rivalGang: "",
        outcome: "W",
        date: new Date().toISOString().split("T")[0],
        score: "RN 10 - 2 Rival",
        summary: "",
        clips: [
          { operativeName: "", title: "", url: "" },
        ],
      });
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to log war record");
    }
  };

  // Add POV to existing war
  const handleAddPovToActiveWar = async () => {
    if (!activeWar || !newPov.url.trim()) {
      alert("Video URL is required!");
      return;
    }

    try {
      const updatedPovs = [
        ...(activeWar.povs || []),
        {
          id: `pov_${Date.now()}`,
          operativeName: newPov.operativeName.trim() || "Red Operative",
          title: newPov.title.trim() || "Operative POV",
          url: newPov.url.trim(),
          platform: newPov.url.includes("medal") ? "medal" : "youtube",
        },
      ];

      const res = await apiService.updateWar(activeWar.id, { povs: updatedPovs });
      soundFx.playSuccessSound();
      if (res) {
        setActiveWar(res);
        setSelectedPov(updatedPovs[updatedPovs.length - 1]);
      }
      setIsAddPovOpen(false);
      setNewPov({ operativeName: "", title: "", url: "" });
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to attach POV");
    }
  };

  // Delete War
  const handleDeleteWar = async (id: string, rival: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isLeader) return;
    if (!confirm(`Permanently delete war record vs ${rival}?`)) return;

    try {
      await apiService.deleteWar(id, "Red Leader");
      soundFx.playErrorSound();
      if (activeWar?.id === id) setActiveWar(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete war record");
    }
  };

  // Metrics
  const totalWars = wars.length;
  const wins = wars.filter((w) => w.outcome === "W").length;
  const losses = wars.filter((w) => w.outcome === "L").length;
  const winRate = totalWars > 0 ? Math.round((wins / totalWars) * 100) : 0;

  // Filtered Wars
  const filteredWars = wars.filter((w) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      w.rivalGang.toLowerCase().includes(q) ||
      w.location.toLowerCase().includes(q) ||
      (w.summary && w.summary.toLowerCase().includes(q));

    const matchesOutcome =
      filterOutcome === "all" || w.outcome === filterOutcome;

    return matchesSearch && matchesOutcome;
  });

  return (
    <div className="space-y-6 font-rajdhani">
      {/* Header & Warfare Record HUD */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl md:text-3xl font-orbitron font-extrabold text-gang-glow flex items-center gap-2">
              <Swords className="w-7 h-7 text-red-500" />
              SYNDICATE GANG WARS
            </h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-red-950/90 border border-red-500/50 text-red-300">
              {wins}W - {losses}L ({winRate}% Win Rate)
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Official Red Network war records, W/L turf battle ledger, and operative video POVs.
          </p>
        </div>

        {/* Action Button */}
        {isLeader && (
          <Button
            onClick={() => {
              soundFx.playClickSound();
              setIsAddOpen(true);
            }}
            className="btn-gang flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Log Gang War Record
          </Button>
        )}
      </div>

      {/* KPI Stats HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="card-gang p-4 border-l-4 border-l-red-600">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Total Wars
            </span>
            <Swords className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-foreground mt-2 font-mono">
            {totalWars}
          </p>
          <span className="text-xs text-muted-foreground">Engagements on record</span>
        </Card>

        <Card className="card-gang p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Victories (W)
            </span>
            <Trophy className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-emerald-400 mt-2 font-mono">
            {wins} <span className="text-xs text-emerald-300/80 font-normal">Wins</span>
          </p>
          <span className="text-xs text-emerald-300/80">Syndicate dominance confirmed</span>
        </Card>

        <Card className="card-gang p-4 border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Defeats (L)
            </span>
            <Skull className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-2xl font-orbitron font-bold text-rose-400 mt-2 font-mono">
            {losses} <span className="text-xs text-rose-300/80 font-normal">Losses</span>
          </p>
          <span className="text-xs text-rose-300/80">Retaliation targets marked</span>
        </Card>

        <Card className="card-gang p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Dominance Ratio
            </span>
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-orbitron font-bold text-amber-400 font-mono">
              {winRate}%
            </span>
            <span className="text-xs text-muted-foreground">Win Rate</span>
          </div>
          <div className="w-full h-1.5 bg-black/60 rounded-full mt-2 overflow-hidden border border-red-950">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 rounded-full"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="card-gang p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search rival gang, location, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-black/40 border-red-900/40 text-sm font-rajdhani"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              onClick={() => setFilterOutcome("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterOutcome === "all"
                  ? "bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                  : "bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white"
              }`}
            >
              All Wars ({wars.length})
            </button>
            <button
              onClick={() => setFilterOutcome("W")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterOutcome === "W"
                  ? "bg-emerald-700 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  : "bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              Victories ({wins})
            </button>
            <button
              onClick={() => setFilterOutcome("L")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterOutcome === "L"
                  ? "bg-rose-800 text-white shadow-[0_0_10px_rgba(225,29,72,0.5)]"
                  : "bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white"
              }`}
            >
              <Skull className="w-3.5 h-3.5 text-rose-400" />
              Defeats ({losses})
            </button>
          </div>
        </div>
      </Card>

      {/* Wars List / Cards */}
      {loading ? (
        <div className="py-16 text-center text-red-400 font-orbitron animate-pulse">
          Decrypting syndicate military engagements...
        </div>
      ) : filteredWars.length === 0 ? (
        <Card className="card-gang p-12 text-center text-muted-foreground">
          <Swords className="w-12 h-12 mx-auto text-red-500/40 mb-3" />
          <p className="text-lg">No gang war records matching current criteria.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWars.map((war) => {
            const isWin = war.outcome === "W";
            const povCount = (war.povs || []).length;

            return (
              <Card
                key={war.id}
                onClick={() => {
                  soundFx.playClickSound();
                  setActiveWar(war);
                }}
                className={`card-gang p-4 transition-all duration-200 hover:border-red-600/60 cursor-pointer flex flex-col justify-between group relative ${
                  isWin ? "hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]" : "hover:shadow-[0_0_25px_rgba(225,29,72,0.2)]"
                }`}
              >
                <div>
                  {/* Top Bar: Outcome Badge & Rival Gang */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-orbitron font-extrabold uppercase border flex items-center gap-1.5 shadow-sm ${
                          isWin
                            ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300"
                            : "bg-rose-950/80 border-rose-500/60 text-rose-300"
                        }`}
                      >
                        {isWin ? (
                          <>
                            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                            VICTORY [W]
                          </>
                        ) : (
                          <>
                            <Skull className="w-3.5 h-3.5 text-rose-400" />
                            DEFEAT [L]
                          </>
                        )}
                      </span>

                      {war.score && (
                        <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-black/60 border border-neutral-800">
                          {war.score}
                        </span>
                      )}
                    </div>

                    {isLeader && (
                      <button
                        onClick={(e) => handleDeleteWar(war.id, war.rivalGang, e)}
                        className="text-muted-foreground hover:text-red-400 transition-colors p-1 rounded hover:bg-red-950/60"
                        title="Delete War Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Rival Title */}
                  <div className="mt-3">
                    <h3 className="font-orbitron font-bold text-lg text-foreground group-hover:text-red-300 transition-colors flex items-center gap-2">
                      VS. {war.rivalGang}
                    </h3>
                  </div>

                  {/* Date */}
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{war.date}</span>
                    </div>
                  </div>

                  {/* Summary */}
                  {war.summary && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 italic">
                      "{war.summary}"
                    </p>
                  )}
                </div>

                {/* Bottom Bar: POV clips count & Click prompt */}
                <div className="mt-4 pt-3 border-t border-red-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-red-300 font-semibold font-mono">
                    <Video className="w-3.5 h-3.5 text-red-400" />
                    <span>{povCount} Operative POV{povCount === 1 ? "" : "s"}</span>
                  </div>

                  <span className="text-xs text-muted-foreground group-hover:text-white font-bold flex items-center gap-1 font-rajdhani">
                    View War POVs <Play className="w-3 h-3 fill-current text-red-500" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* WAR DETAIL & OPERATIVE POVs THEATER MODAL */}
      {activeWar && (
        <Dialog open={!!activeWar} onOpenChange={(open) => !open && setActiveWar(null)}>
          <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col bg-black/95 border-2 border-red-700/80 text-foreground backdrop-blur-2xl shadow-[0_0_50px_rgba(220,38,38,0.5)] p-0 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-red-950/80 via-black to-red-950/80 border-b border-red-900/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-orbitron font-bold uppercase border flex items-center gap-1.5 ${
                    activeWar.outcome === "W"
                      ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300"
                      : "bg-rose-950/80 border-rose-500/60 text-rose-300"
                  }`}
                >
                  {activeWar.outcome === "W" ? (
                    <>
                      <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                      VICTORY [W]
                    </>
                  ) : (
                    <>
                      <Skull className="w-3.5 h-3.5 text-rose-400" />
                      DEFEAT [L]
                    </>
                  )}
                </span>
                <div>
                  <h3 className="text-lg font-orbitron font-extrabold text-white flex items-center gap-2">
                    RED NETWORK vs {activeWar.rivalGang}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                    <span>📅 {activeWar.date}</span>
                    {activeWar.score && <span className="text-amber-400 font-bold font-mono">// {activeWar.score}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canAdd && (
                  <Button
                    size="sm"
                    onClick={() => setIsAddPovOpen(true)}
                    className="btn-gang text-xs h-8 px-3"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add POV
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveWar(null)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Modal Body: Active POV Player + POVs Switcher */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {/* Summary note if present */}
              {activeWar.summary && (
                <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-xs font-rajdhani text-red-200">
                  <span className="font-bold text-white block mb-0.5">War Briefing & Debrief:</span>
                  {activeWar.summary}
                </div>
              )}

              {/* Main Player Area */}
              {selectedPov ? (
                <div className="space-y-2">
                  <div className="relative aspect-video w-full max-h-[380px] mx-auto rounded-xl overflow-hidden bg-black border border-red-900/60 shadow-xl">
                    <iframe
                      src={getEmbedVideoUrl(selectedPov.url)}
                      title={selectedPov.title || "War POV"}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/60 border border-red-900/40 text-xs">
                    <div>
                      <span className="font-bold text-foreground block font-rajdhani text-sm">
                        {selectedPov.title || "Operative POV"}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        POV Recorded by: <span className="text-red-400 font-bold">{selectedPov.operativeName}</span>
                      </span>
                    </div>

                    <a
                      href={selectedPov.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-950/60 border border-red-500/40 text-red-200 hover:text-white text-xs font-bold font-rajdhani"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Watch on Original Host
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center rounded-xl bg-black/60 border border-red-900/40 text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto text-red-500/40 mb-3" />
                  <p className="text-base font-rajdhani">No video POVs linked to this battle yet.</p>
                  {canAdd && (
                    <Button
                      size="sm"
                      onClick={() => setIsAddPovOpen(true)}
                      className="btn-gang text-xs mt-3"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Submit Operative POV Clip
                    </Button>
                  )}
                </div>
              )}

              {/* Operative POVs Playlist / Switcher */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-orbitron font-bold text-muted-foreground">
                    All War POVs & Angles ({(activeWar.povs || []).length})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {(activeWar.povs || []).map((pov, idx) => {
                    const isCurrent = selectedPov?.id === pov.id || (!selectedPov && idx === 0);
                    return (
                      <div
                        key={pov.id || idx}
                        onClick={() => {
                          soundFx.playClickSound();
                          setSelectedPov(pov);
                        }}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          isCurrent
                            ? "bg-red-950/70 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                            : "bg-black/60 border-red-900/40 hover:border-red-600/60"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Play className={`w-4 h-4 shrink-0 ${isCurrent ? "text-white fill-current" : "text-red-400"}`} />
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold font-rajdhani text-foreground block truncate">
                              {pov.operativeName}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate block font-mono">
                              {pov.title || "POV Clip"}
                            </span>
                          </div>
                        </div>

                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold text-red-400 font-orbitron shrink-0 ml-1">
                            Playing
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add War Record Modal (Leader Only) */}
      {/* Add War Record Modal (Leader Only) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[88vh] flex flex-col bg-black/95 border border-red-900/80 text-foreground backdrop-blur-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-red-900/60 shrink-0">
            <DialogTitle className="text-xl font-orbitron text-gang-glow flex items-center gap-2">
              <Swords className="w-5 h-5 text-red-500" />
              LOG GANG WAR ENGAGEMENT
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-3.5 overflow-y-auto flex-1 font-rajdhani">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase">Rival Gang Name</Label>
                <Input
                  placeholder="e.g. Ballas, Vagos, Marabunta"
                  value={newWar.rivalGang}
                  onChange={(e) => setNewWar({ ...newWar, rivalGang: e.target.value })}
                  className="bg-black/50 border-red-900/50"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase">Outcome</Label>
                <select
                  value={newWar.outcome}
                  onChange={(e) => setNewWar({ ...newWar, outcome: e.target.value as "W" | "L" })}
                  className="w-full px-3 py-2 bg-black/60 border border-red-900/50 rounded-lg text-sm text-foreground focus:outline-none"
                >
                  <option value="W">VICTORY [W]</option>
                  <option value="L">DEFEAT [L]</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase">Score / Kills</Label>
                <Input
                  placeholder="e.g. RN 15 - 3 Ballas"
                  value={newWar.score}
                  onChange={(e) => setNewWar({ ...newWar, score: e.target.value })}
                  className="bg-black/50 border-red-900/50 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase">Date of Battle</Label>
                <Input
                  type="date"
                  value={newWar.date}
                  onChange={(e) => setNewWar({ ...newWar, date: e.target.value })}
                  className="bg-black/50 border-red-900/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">War Debrief & Notes</Label>
              <Input
                placeholder="Tactical summary, flanks executed, key operative kills..."
                value={newWar.summary}
                onChange={(e) => setNewWar({ ...newWar, summary: e.target.value })}
                className="bg-black/50 border-red-900/50"
              />
            </div>

            {/* Dynamic Multi-Clip POVs */}
            <div className="space-y-2 pt-2 border-t border-red-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-300 uppercase font-orbitron flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-red-400" />
                  Operative POV Clips ({newWar.clips.length})
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddClipField}
                  className="h-7 text-xs bg-black/60 border-red-800/60 text-red-300 hover:text-white hover:bg-red-950/60"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Another Clip
                </Button>
              </div>

              {newWar.clips.map((clip, index) => (
                <div key={index} className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground uppercase font-bold">
                      Clip #{index + 1}
                    </span>
                    {newWar.clips.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveClipField(index)}
                        className="text-muted-foreground hover:text-rose-400 p-1 rounded"
                        title="Remove Clip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Operative Name (e.g. Red Operative)"
                      value={clip.operativeName}
                      onChange={(e) => handleClipFieldChange(index, "operativeName", e.target.value)}
                      className="bg-black/50 border-red-900/50 text-xs"
                    />
                    <Input
                      placeholder="POV Title (e.g. Roof Sniper Angle)"
                      value={clip.title}
                      onChange={(e) => handleClipFieldChange(index, "title", e.target.value)}
                      className="bg-black/50 border-red-900/50 text-xs"
                    />
                  </div>
                  <Input
                    placeholder="Video URL (YouTube, Medal.tv, Twitch, Streamable)"
                    value={clip.url}
                    onChange={(e) => handleClipFieldChange(index, "url", e.target.value)}
                    className="bg-black/50 border-red-900/50 text-xs font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-red-900/60 shrink-0">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWar} className="btn-gang">
              Confirm & Save War Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add POV Clip to Active War Modal */}
      <Dialog open={isAddPovOpen} onOpenChange={setIsAddPovOpen}>
        <DialogContent className="sm:max-w-md bg-black/95 border border-red-900/80 text-foreground backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-orbitron text-gang-glow flex items-center gap-2">
              <Video className="w-5 h-5 text-red-400" />
              ADD OPERATIVE POV CLIP
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 font-rajdhani">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Operative Name</Label>
              <Input
                placeholder="e.g. Red Operative"
                value={newPov.operativeName}
                onChange={(e) => setNewPov({ ...newPov, operativeName: e.target.value })}
                className="bg-black/50 border-red-900/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Clip Title / Angle</Label>
              <Input
                placeholder="e.g. Leader Assault Push / Roof Sniper Angle"
                value={newPov.title}
                onChange={(e) => setNewPov({ ...newPov, title: e.target.value })}
                className="bg-black/50 border-red-900/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Video Link (YouTube, Medal.tv, Twitch, Streamable)</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={newPov.url}
                onChange={(e) => setNewPov({ ...newPov, url: e.target.value })}
                className="bg-black/50 border-red-900/50 font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddPovOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPovToActiveWar} className="btn-gang">
              Attach POV Clip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
