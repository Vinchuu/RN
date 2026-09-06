import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ExternalLink,
  Play,
  Users,
  Eye,
  Search,
  X,
  Tv,
  Radio,
} from "lucide-react";
import { apiService, StreamChannel, GangMember } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface StreamsTabProps {
  userMode: "admin" | "gangmember" | "viewer2";
}

export function StreamsTab({ userMode }: StreamsTabProps) {
  const [streams, setStreams] = useState<StreamChannel[]>([]);
  const [members, setMembers] = useState<GangMember[]>([]);
  const [selectedStream, setSelectedStream] = useState<StreamChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Filters & Sorting matching the user's reference UI
  const [showFilter, setShowFilter] = useState<"live" | "all" | "offline">("live");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"viewers-desc" | "viewers-asc" | "recent" | "alpha">("viewers-desc");

  // Form State
  const [memberName, setMemberName] = useState("");
  const [platform, setPlatform] = useState<"kick" | "youtube" | "twitch">("kick");
  const [title, setTitle] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const canAdd = userMode === "admin" || userMode === "gangmember";
  const isLeader = userMode === "admin";

  useEffect(() => {
    let isSubscribed = true;

    // Fetch registered gang members for channel linking
    apiService.getMembers().then((data) => {
      if (isSubscribed && Array.isArray(data)) {
        setMembers(data);
        if (data.length > 0 && !memberName) {
          setMemberName(data[0].name);
        }
      }
    });

    apiService.getStreams()
      .then((data) => {
        if (isSubscribed) {
          setStreams(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching streams:", err);
        if (isSubscribed) setLoading(false);
      });

    const unsubscribe = apiService.subscribeToStreams((newStreams) => {
      if (isSubscribed && Array.isArray(newStreams)) {
        setStreams(newStreams);
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  // Parse Channel Slug
  const extractChannelSlug = (input: string, plat: "kick" | "youtube" | "twitch"): string => {
    let clean = input.trim().replace(/^@/, "");
    if (clean.includes("kick.com/")) {
      clean = clean.split("kick.com/")[1].split("/")[0].split("?")[0];
    } else if (clean.includes("twitch.tv/")) {
      clean = clean.split("twitch.tv/")[1].split("/")[0].split("?")[0];
    } else if (clean.includes("youtube.com/")) {
      if (clean.includes("/watch?v=")) {
        clean = clean.split("/watch?v=")[1].split("&")[0];
      } else if (clean.includes("/live/")) {
        clean = clean.split("/live/")[1].split("?")[0];
      } else if (clean.includes("/@")) {
        clean = clean.split("/@")[1].split("/")[0];
      }
    } else if (clean.includes("youtu.be/")) {
      clean = clean.split("youtu.be/")[1].split("?")[0];
    }
    return clean;
  };

  // Add Registered Stream
  const handleAddStream = async () => {
    if (!memberName.trim() || !urlInput.trim()) {
      alert("Operative Name and Stream URL/Handle are required!");
      return;
    }

    const channelSlug = extractChannelSlug(urlInput, platform);
    if (!channelSlug) {
      alert("Could not parse channel name from input");
      return;
    }

    setIsPublishing(true);
    try {
      await apiService.addStream({
        memberName: memberName.trim(),
        platform,
        channelSlug,
        title: title.trim() || `${memberName.trim()} | Red Network Operations`,
        isLive: true,
        addedBy: isLeader ? "Red Leader" : memberName.trim(),
      });

      soundFx.playSuccessSound();
      setIsAddOpen(false);
      setUrlInput("");
      setTitle("");
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to add stream");
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete Stream
  const handleDeleteStream = async (id: string, name: string) => {
    if (!isLeader) return;
    if (!confirm(`Remove registered broadcast feed for "${name}"?`)) return;
    try {
      await apiService.deleteStream(id, "Red Leader");
      soundFx.playErrorSound();
      if (selectedStream?.id === id) setSelectedStream(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete stream");
    }
  };

  // Format viewers count (e.g. 2480 -> 2.5K, 998 -> 998)
  const formatViewers = (val?: number) => {
    if (!val || val === 0) return "100";
    if (val >= 1000) {
      return (val / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return val.toString();
  };

  // Get external URL
  const getChannelUrl = (stream: StreamChannel) => {
    if (stream.platform === "kick") return `https://kick.com/${stream.channelSlug}`;
    if (stream.platform === "twitch") return `https://twitch.tv/${stream.channelSlug}`;
    if (stream.platform === "youtube") {
      if (stream.channelSlug.length === 11) {
        return `https://www.youtube.com/watch?v=${stream.channelSlug}`;
      }
      return `https://youtube.com/@${stream.channelSlug}`;
    }
    return "#";
  };

  // Embed Player URL Generator
  const getEmbedUrl = (stream: StreamChannel): string => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    if (stream.platform === "kick") {
      return `https://player.kick.com/${stream.channelSlug}?autoplay=true&muted=false`;
    }
    if (stream.platform === "twitch") {
      return `https://player.twitch.tv/?channel=${stream.channelSlug}&parent=${hostname}&autoplay=true&muted=false`;
    }
    if (stream.platform === "youtube") {
      if (stream.channelSlug.length === 11) {
        return `https://www.youtube-nocookie.com/embed/${stream.channelSlug}?autoplay=1`;
      }
      return `https://www.youtube-nocookie.com/embed/live_stream?channel=${stream.channelSlug}&autoplay=1`;
    }
    return "";
  };

  // Fallback thumbnail if image fails
  const getThumbnailSrc = (stream: StreamChannel) => {
    if (stream.thumbnailUrl) return stream.thumbnailUrl;
    if (stream.platform === "kick") {
      return "https://images.kick.com/video_thumbnails/oiGVy9clssnp/QkMignSDQHVZ/720.webp";
    }
    if (stream.platform === "twitch") {
      return "https://images.kick.com/video_thumbnails/a7kpdxzAUVGL/d9ydaexsyxdP/720.webp";
    }
    if (stream.platform === "youtube") {
      if (stream.channelSlug.length === 11) {
        return `https://img.youtube.com/vi/${stream.channelSlug}/hqdefault.jpg`;
      }
      return "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg";
    }
    return "https://images.kick.com/video_thumbnails/oiGVy9clssnp/QkMignSDQHVZ/720.webp";
  };

  // Filter & Sort Logic
  const filteredStreams = useMemo(() => {
    let result = streams.filter((s) => {
      // Show filter (live / all / offline)
      if (showFilter === "live" && s.isLive === false) return false;
      if (showFilter === "offline" && s.isLive !== false) return false;

      // Platform filter
      if (platformFilter !== "all" && s.platform !== platformFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          s.memberName.toLowerCase().includes(q) ||
          s.channelSlug.toLowerCase().includes(q) ||
          (s.title && s.title.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "viewers-desc") {
        return (b.viewers || 0) - (a.viewers || 0);
      }
      if (sortBy === "viewers-asc") {
        return (a.viewers || 0) - (b.viewers || 0);
      }
      if (sortBy === "alpha") {
        return (a.title || a.memberName).localeCompare(b.title || b.memberName);
      }
      if (sortBy === "recent") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      return 0;
    });

    return result;
  }, [streams, showFilter, platformFilter, searchQuery, sortBy]);

  const liveCount = streams.filter((s) => s.isLive !== false).length;

  return (
    <div className="space-y-5 font-rajdhani">
      {/* Top Control Bar Matching Reference UI */}
      <div className="bg-[#0e1722]/90 border border-slate-700/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md">
        {/* Left: Show Dropdown & Platform Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sky-400/90 text-sm font-semibold tracking-wide">
              Show:
            </span>
            <select
              value={showFilter}
              onChange={(e) => setShowFilter(e.target.value as any)}
              className="bg-[#091017] border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-1.5 text-sm text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
            >
              <option value="live">Live ({liveCount})</option>
              <option value="all">All Registered ({streams.length})</option>
              <option value="offline">Offline ({streams.length - liveCount})</option>
            </select>
          </div>

          {/* Platform Toggles */}
          <div className="flex items-center gap-1.5 border-l border-slate-700/60 pl-3">
            {/* YouTube button */}
            <button
              onClick={() => {
                soundFx.playClickSound();
                setPlatformFilter(platformFilter === "youtube" ? "all" : "youtube");
              }}
              title="Filter YouTube streams"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                platformFilter === "youtube"
                  ? "bg-[#e50914] text-white ring-2 ring-red-400 shadow-[0_0_12px_rgba(229,9,20,0.6)]"
                  : "bg-[#e50914]/80 hover:bg-[#e50914] text-white/90 hover:text-white"
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </button>

            {/* Kick button */}
            <button
              onClick={() => {
                soundFx.playClickSound();
                setPlatformFilter(platformFilter === "kick" ? "all" : "kick");
              }}
              title="Filter Kick streams"
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm tracking-tighter transition-all font-sans ${
                platformFilter === "kick"
                  ? "bg-[#53fc18] text-black ring-2 ring-white shadow-[0_0_14px_rgba(83,252,24,0.7)]"
                  : "bg-[#53fc18]/85 hover:bg-[#53fc18] text-black"
              }`}
            >
              K
            </button>

            {/* Twitch button */}
            <button
              onClick={() => {
                soundFx.playClickSound();
                setPlatformFilter(platformFilter === "twitch" ? "all" : "twitch");
              }}
              title="Filter Twitch streams"
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all font-sans ${
                platformFilter === "twitch"
                  ? "bg-[#9146ff] text-white ring-2 ring-purple-300 shadow-[0_0_12px_rgba(145,70,255,0.6)]"
                  : "bg-[#9146ff]/80 hover:bg-[#9146ff] text-white"
              }`}
            >
              TW
            </button>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="relative flex-1 min-w-[190px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search registered operatives or streams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 py-1.5 h-9 bg-[#091017] border-slate-700/80 rounded-lg text-sm text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Sort By, Showing Counter & Add Action */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sky-400/90 text-sm font-semibold tracking-wide">
              Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#091017] border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-1.5 text-sm text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
            >
              <option value="viewers-desc">Viewers (High to Low)</option>
              <option value="viewers-asc">Viewers (Low to High)</option>
              <option value="recent">Recent Streams</option>
              <option value="alpha">Alphabetical (A - Z)</option>
            </select>
          </div>

          {/* Showing badge */}
          <div className="border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.15)] whitespace-nowrap">
            <Eye className="w-3.5 h-3.5" />
            <span>Showing: {filteredStreams.length} Registered</span>
          </div>

          {/* Link Stream button */}
          {canAdd && (
            <Button
              size="sm"
              onClick={() => {
                soundFx.playClickSound();
                setIsAddOpen(true);
              }}
              className="btn-gang h-9 text-xs flex items-center gap-1.5 px-3 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Feed
            </Button>
          )}
        </div>
      </div>

      {/* Embedded Theater Player (when user clicks any stream) */}
      {selectedStream && (
        <Card className="card-gang overflow-hidden border-2 border-red-600/70 shadow-[0_0_50px_rgba(220,38,38,0.45)] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 bg-black/95 border-b border-red-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
              <h3 className="font-orbitron font-bold text-sm text-white flex items-center gap-2">
                THEATER: {selectedStream.memberName}
              </h3>
              <span className="text-xs text-sky-400 font-mono">
                /{selectedStream.channelSlug}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={getChannelUrl(selectedStream)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-black/60 border border-red-900/40"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">Open Channel</span>
              </a>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedStream(null)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-white hover:bg-red-950/60"
                title="Exit Theater Mode"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={getEmbedUrl(selectedStream)}
              title={selectedStream.title || "Live Stream"}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </Card>
      )}

      {/* Grid of Stream Cards - Registered Operatives Only */}
      {loading ? (
        <div className="py-20 text-center text-cyan-400 font-orbitron animate-pulse">
          Loading registered operative broadcast feeds...
        </div>
      ) : filteredStreams.length === 0 ? (
        <Card className="card-gang p-12 text-center text-muted-foreground">
          <Tv className="w-12 h-12 mx-auto text-red-500/40 mb-3" />
          <p className="text-lg">No registered syndicate feeds matching the current filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowFilter("all");
              setPlatformFilter("all");
              setSearchQuery("");
            }}
            className="mt-4 border-slate-700"
          >
            Reset All Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredStreams.map((stream) => (
            <div
              key={stream.id}
              className="bg-[#101923] border border-slate-800 hover:border-cyan-500/50 rounded-xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col group hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            >
              {/* Thumbnail Container (16:9) with real thumbnail */}
              <div
                className="aspect-video relative overflow-hidden bg-black/90 cursor-pointer"
                onClick={() => {
                  soundFx.playClickSound();
                  setSelectedStream(stream);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <img
                  src={getThumbnailSrc(stream)}
                  alt={stream.title || stream.memberName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes("oiGVy9clssnp")) {
                      target.src = "https://images.kick.com/video_thumbnails/oiGVy9clssnp/QkMignSDQHVZ/720.webp";
                    }
                  }}
                />

                {/* Top-Left Platform Badge */}
                {stream.platform === "kick" ? (
                  <div className="absolute top-2.5 left-2.5 bg-[#53FC18] text-black font-black text-sm w-7 h-7 rounded flex items-center justify-center shadow-md font-sans tracking-tighter select-none pointer-events-none">
                    K
                  </div>
                ) : stream.platform === "twitch" ? (
                  <div className="absolute top-2.5 left-2.5 bg-[#9146FF] text-white font-bold text-xs w-7 h-7 rounded flex items-center justify-center shadow-md font-sans select-none pointer-events-none">
                    TW
                  </div>
                ) : (
                  <div className="absolute top-2.5 left-2.5 bg-[#FF0000] text-white w-7 h-7 rounded flex items-center justify-center shadow-md select-none pointer-events-none">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                )}

                {/* Top-Right LIVE Badge */}
                {stream.isLive !== false && (
                  <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm border border-red-500/50 text-red-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 shadow-md select-none pointer-events-none">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                    </span>
                    LIVE
                  </div>
                )}

                {/* Hover Play Icon Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-red-600/90 text-white p-3 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Stream Meta Information */}
              <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5 bg-[#101923]">
                <div>
                  {/* Stream Title (Clamped to 2 Lines) */}
                  <h4
                    onClick={() => {
                      soundFx.playClickSound();
                      setSelectedStream(stream);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    title={stream.title || stream.memberName}
                    className="text-white font-semibold text-sm line-clamp-2 leading-snug min-h-[2.5rem] group-hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {stream.title || `${stream.memberName} | Red Network GTA RP Operations`}
                  </h4>

                  {/* Registered Operative & Channel Slug */}
                  <div
                    onClick={() => {
                      soundFx.playClickSound();
                      setSelectedStream(stream);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-sky-400 text-xs font-medium hover:underline cursor-pointer flex items-center gap-1.5 mt-1"
                  >
                    <span className="font-semibold text-slate-200">{stream.memberName}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-sky-400 font-mono">@{stream.channelSlug}</span>
                  </div>
                </div>

                {/* Bottom Row: Viewers Count & Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {/* Viewers */}
                  <div className="text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatViewers(stream.viewers)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <a
                      href={getChannelUrl(stream)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                      title="Open in External Platform"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {isLeader && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStream(stream.id, stream.memberName);
                        }}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-red-400 hover:bg-red-950/40"
                        title="Remove Registered Feed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Stream Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-[#0c141d] border border-red-900/60 text-foreground backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-orbitron text-gang-glow">
              REGISTER OPERATIVE BROADCAST FEED
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 font-rajdhani">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Registered Operative</Label>
              {members.length > 0 ? (
                <select
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-red-900/50 rounded-lg text-sm text-foreground focus:outline-none"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.rank.toUpperCase()})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="e.g. Lawrence Williams"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="bg-black/50 border-red-900/50"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Broadcast Platform</Label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/60 border border-red-900/50 rounded-lg text-sm text-foreground focus:outline-none"
              >
                <option value="kick">Kick.com</option>
                <option value="twitch">Twitch.tv</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Channel URL or Username</Label>
              <Input
                placeholder={
                  platform === "kick"
                    ? "kick.com/yourhandle"
                    : platform === "twitch"
                    ? "twitch.tv/yourhandle"
                    : "youtube.com/@channel or video ID"
                }
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="bg-black/50 border-red-900/50"
              />
              <p className="text-[11px] text-slate-400">
                The real live thumbnail and viewer count will automatically be fetched from the platform.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Stream Title / Job Focus (Optional)</Label>
              <Input
                placeholder="Leave blank to auto-fetch the streamer's live title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-black/50 border-red-900/50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStream}
              disabled={isPublishing}
              className="btn-gang"
            >
              {isPublishing ? "Registering..." : "Register Broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
