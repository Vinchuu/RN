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
  Edit2,
  ExternalLink,
  Play,
  Users,
  Eye,
  Search,
  X,
  Tv,
  RefreshCw,
  Radio,
} from "lucide-react";
import { apiService, StreamChannel, Member } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface StreamsTabProps {
  userMode: "admin" | "gangmember" | "viewer2";
}

export function StreamsTab({ userMode }: StreamsTabProps) {
  const [streams, setStreams] = useState<StreamChannel[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedStream, setSelectedStream] = useState<StreamChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<StreamChannel | null>(null);

  // Filters & Sorting matching Red Network Theme & User Form Request
  // Default strictly to 'live' so only operatives who are currently broadcasting are shown
  const [showFilter, setShowFilter] = useState<"live" | "all">("live");
  const [platformFilter, setPlatformFilter] = useState<"all" | "kick" | "youtube" | "twitch">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"viewers-desc" | "viewers-asc" | "recent" | "alpha">("viewers-desc");

  // Form State (Add)
  const [memberName, setMemberName] = useState("");
  const [platform, setPlatform] = useState<"kick" | "youtube" | "twitch">("kick");
  const [urlInput, setUrlInput] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Form State (Edit)
  const [editMemberName, setEditMemberName] = useState("");
  const [editPlatform, setEditPlatform] = useState<"kick" | "youtube" | "twitch">("kick");
  const [editUrlInput, setEditUrlInput] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Permissions
  const canAdd = userMode === "admin" || userMode === "gangmember";
  const canEdit = userMode === "admin" || userMode === "gangmember";
  const canDelete = userMode === "admin";
  const isLeader = userMode === "admin";

  const fetchStreamFeeds = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await apiService.getStreams();
      setStreams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching streams:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

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

    fetchStreamFeeds(true);

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

  const handleManualRefresh = async () => {
    soundFx.playClickSound();
    setIsRefreshing(true);
    await fetchStreamFeeds(false);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Parse Channel Slug from URL or text
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
        isLive: true,
        addedBy: isLeader ? "Red Leader" : memberName.trim(),
      });

      soundFx.playSuccessSound();
      setIsAddOpen(false);
      setUrlInput("");
      await fetchStreamFeeds(false);
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to add stream");
    } finally {
      setIsPublishing(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (stream: StreamChannel) => {
    soundFx.playClickSound();
    setEditingStream(stream);
    setEditMemberName(stream.memberName);
    setEditPlatform(stream.platform);
    setEditUrlInput(
      stream.platform === "kick"
        ? `https://kick.com/${stream.channelSlug}`
        : stream.platform === "twitch"
        ? `https://twitch.tv/${stream.channelSlug}`
        : stream.channelSlug.length === 11
        ? `https://youtube.com/watch?v=${stream.channelSlug}`
        : `https://youtube.com/@${stream.channelSlug}`
    );
  };

  // Save Edit Stream
  const handleSaveEdit = async () => {
    if (!editingStream) return;
    if (!editMemberName.trim() || !editUrlInput.trim()) {
      alert("Operative Name and Stream URL/Handle are required!");
      return;
    }

    const channelSlug = extractChannelSlug(editUrlInput, editPlatform);
    if (!channelSlug) {
      alert("Could not parse channel name from input");
      return;
    }

    setIsSavingEdit(true);
    try {
      await apiService.updateStream(editingStream.id, {
        memberName: editMemberName.trim(),
        platform: editPlatform,
        channelSlug,
        isLive: true,
      });

      soundFx.playSuccessSound();
      setEditingStream(null);
      await fetchStreamFeeds(false);
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Failed to update stream");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Stream (Leader Only)
  const handleDeleteStream = async (id: string, name: string) => {
    if (!canDelete) return;
    if (!confirm(`Are you sure you want to remove the registered broadcast feed for "${name}"?`)) return;
    try {
      await apiService.deleteStream(id, "Red Leader");
      soundFx.playErrorSound();
      if (selectedStream?.id === id) setSelectedStream(null);
      await fetchStreamFeeds(false);
    } catch (err: any) {
      alert(err.message || "Failed to delete stream");
    }
  };

  // Format viewers count (e.g. 2553 -> 2.5K, 537 -> 537)
  const formatViewers = (val?: number) => {
    if (!val || val === 0) return "0";
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

  // Live Thumbnail Generator
  const getThumbnailSrc = (stream: StreamChannel) => {
    if (stream.thumbnailUrl) return stream.thumbnailUrl;
    if (stream.platform === "youtube" && stream.channelSlug.length === 11) {
      return `https://img.youtube.com/vi/${stream.channelSlug}/hqdefault.jpg`;
    }
    return "";
  };

  // Only live persons shown strictly by default
  const liveCount = streams.filter((s) => !!s.isLive).length;

  const filteredStreams = useMemo(() => {
    let result = streams.filter((s) => {
      // User requirement: "and only the person is live should be shown there"
      if (showFilter === "live" && !s.isLive) return false;

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

    // Sorting matching screenshot choices
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

  return (
    <div className="space-y-5 font-rajdhani">
      {/* Top Filter Bar - In requested form with Red Network Theme */}
      <div className="bg-[#0b0406]/95 border border-red-900/50 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_25px_rgba(220,38,38,0.12)] backdrop-blur-md">
        {/* Left: Show Dropdown & Platform Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium text-sm">
              Show:
            </span>
            <select
              value={showFilter}
              onChange={(e) => setShowFilter(e.target.value as any)}
              className="bg-[#140609] border border-red-900/60 hover:border-red-500 rounded-lg px-3 py-1.5 text-sm text-white font-medium focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
            >
              <option value="live">Live ({liveCount})</option>
              {canAdd && <option value="all">All Registered ({streams.length})</option>}
            </select>
          </div>

          {/* Platform Toggles */}
          <div className="flex items-center gap-2 pl-1">
            {/* YouTube button */}
            <button
              onClick={() => {
                soundFx.playClickSound();
                setPlatformFilter(platformFilter === "youtube" ? "all" : "youtube");
              }}
              title={platformFilter === "youtube" ? "Show all platforms" : "Filter YouTube streams only"}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                platformFilter === "youtube"
                  ? "bg-[#e50914] text-white ring-2 ring-red-400 shadow-[0_0_12px_rgba(229,9,20,0.7)]"
                  : "bg-[#e50914] hover:bg-[#ff0000] text-white"
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
              title={platformFilter === "kick" ? "Show all platforms" : "Filter Kick streams only"}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm tracking-tighter transition-all font-sans ${
                platformFilter === "kick"
                  ? "bg-[#53fc18] text-black ring-2 ring-white shadow-[0_0_14px_rgba(83,252,24,0.7)]"
                  : "bg-[#53fc18] hover:brightness-110 text-black"
              }`}
            >
              K
            </button>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-red-500/70" />
          <Input
            placeholder="Search streams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 py-1.5 h-9 bg-[#140609] border-red-900/60 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:border-red-500 focus:ring-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Sort By, Showing Counter & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium text-sm">
              Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#140609] border border-red-900/60 hover:border-red-500 rounded-lg px-3 py-1.5 text-sm text-white font-medium focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
            >
              <option value="viewers-desc">Viewers (High to Low)</option>
              <option value="viewers-asc">Viewers (Low to High)</option>
              <option value="recent">Recent Streams</option>
              <option value="alpha">Alphabetical (A - Z)</option>
            </select>
          </div>

          {/* Showing badge (Red Theme) */}
          <div className="border border-red-800/60 bg-red-950/60 text-red-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_10px_rgba(220,38,38,0.2)] whitespace-nowrap">
            <Eye className="w-3.5 h-3.5 text-red-400" />
            <span>Showing: {filteredStreams.length}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            title="Refresh Live Stream Feeds"
            className="p-2 text-zinc-400 hover:text-white hover:bg-red-950/40 rounded-lg border border-red-900/40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-red-400" : ""}`} />
          </button>

          {/* Register Feed button */}
          {canAdd && (
            <Button
              size="sm"
              onClick={() => {
                soundFx.playClickSound();
                setIsAddOpen(true);
              }}
              className="bg-red-600 hover:bg-red-500 text-white h-9 text-xs font-semibold flex items-center gap-1.5 px-3 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)] whitespace-nowrap transition-all"
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
              <span className="text-xs text-red-400 font-mono">
                /{selectedStream.channelSlug}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={getChannelUrl(selectedStream)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-black/60 border border-red-900/40"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">Open Channel</span>
              </a>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedStream(null)}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-red-950/60"
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

      {/* Grid of Stream Cards - In requested 4-column form with Red Theme */}
      {loading ? (
        <div className="py-20 text-center text-red-400 font-orbitron animate-pulse">
          Connecting to satellite broadcast feeds & scanning live operatives...
        </div>
      ) : filteredStreams.length === 0 ? (
        <Card className="card-gang p-12 text-center text-muted-foreground border border-red-900/40 bg-[#0d0407]">
          <Radio className="w-12 h-12 mx-auto text-red-500/50 mb-3 animate-pulse" />
          <h3 className="text-lg font-orbitron text-white font-bold mb-1">
            NO SYNDICATE OPERATIVES CURRENTLY LIVE
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-4">
            Only operatives currently broadcasting live are displayed here. All registered broadcast channels are on standby.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="border-red-900/60 hover:bg-red-950/40 text-red-300 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh Scanner
            </Button>
            {canAdd && (
              <Button
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="btn-gang gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Register Feed
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredStreams.map((stream) => (
            <div
              key={stream.id}
              className="bg-[#0e0508] border border-red-950/80 hover:border-red-600/70 rounded-xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col group hover:shadow-[0_0_30px_rgba(220,38,38,0.25)]"
            >
              {/* Thumbnail Container (16:9 aspect ratio) */}
              <div
                className="aspect-video relative overflow-hidden bg-black cursor-pointer"
                onClick={() => {
                  soundFx.playClickSound();
                  setSelectedStream(stream);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {getThumbnailSrc(stream) ? (
                  <img
                    src={getThumbnailSrc(stream)}
                    alt={stream.title || stream.memberName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-950/40 via-black to-[#140508] p-4 text-center border-b border-red-900/40">
                    <Tv className="w-8 h-8 text-red-500/60 mb-1.5" />
                    <span className="text-[11px] font-mono uppercase tracking-widest text-red-400 font-bold">
                      LIVE BROADCAST FEED
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {stream.memberName} • @{stream.channelSlug}
                    </span>
                  </div>
                )}

                {/* Top-Left Platform Badge - EXACTLY as shown in user's screenshot */}
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

                {/* Hover Play Icon Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-red-600 text-white p-3 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Stream Meta Information (Red Theme) */}
              <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5 bg-[#0e0508]">
                <div>
                  {/* Stream Title (Bold White, 2 Lines clamp - matching screenshot) */}
                  <h4
                    onClick={() => {
                      soundFx.playClickSound();
                      setSelectedStream(stream);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    title={stream.title || `${stream.memberName} Live Operation`}
                    className="text-white font-bold text-sm line-clamp-2 leading-snug min-h-[2.5rem] group-hover:text-red-300 transition-colors cursor-pointer"
                  >
                    {stream.title || `${stream.memberName} Live Operation`}
                  </h4>

                  {/* Registered Operative / Channel Handle (Matching screenshot) */}
                  <div
                    onClick={() => {
                      soundFx.playClickSound();
                      setSelectedStream(stream);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-red-400 font-medium text-xs hover:text-red-300 transition-colors cursor-pointer flex items-center gap-1 mt-1"
                  >
                    <span>{stream.channelSlug}</span>
                  </div>
                </div>

                {/* Bottom Row: Viewers Count & Subtle Actions */}
                <div className="pt-2 border-t border-red-900/30 flex items-center justify-between gap-2">
                  {/* Viewers with Person Icon (Matching screenshot) */}
                  <div className="text-zinc-300 text-xs flex items-center gap-1.5 font-semibold">
                    <Users className="w-3.5 h-3.5 text-red-500/80" />
                    <span>{formatViewers(stream.viewers)}</span>
                  </div>

                  {/* Actions (Subtle on card bottom) */}
                  <div className="flex items-center gap-0.5">
                    {/* External Link */}
                    <a
                      href={getChannelUrl(stream)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-red-950/40 rounded transition-colors"
                      title="Open in External Platform"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {/* Edit Button */}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(stream);
                        }}
                        className="h-7 w-7 p-0 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-950/40"
                        title="Edit Registered Feed"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {/* Delete Button */}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStream(stream.id, stream.memberName);
                        }}
                        className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-950/60"
                        title="Remove Registered Feed (Leader Only)"
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
        <DialogContent className="sm:max-w-md bg-[#0e0507] border border-red-900/80 text-foreground backdrop-blur-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-orbitron text-gang-glow">
              REGISTER OPERATIVE BROADCAST FEED
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 font-rajdhani">
            <div className="space-y-1">
              <Label className="text-xs text-red-300 uppercase font-semibold">Registered Operative</Label>
              {members.length > 0 ? (
                <select
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/70 border border-red-900/60 rounded-lg text-sm text-foreground focus:outline-none focus:border-red-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.rank ? `(${m.rank.toUpperCase()})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="e.g. Lawrence Williams"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="bg-black/70 border-red-900/60 focus:border-red-500"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-red-300 uppercase font-semibold">Broadcast Platform</Label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/70 border border-red-900/60 rounded-lg text-sm text-foreground focus:outline-none focus:border-red-500"
              >
                <option value="kick">Kick.com</option>
                <option value="youtube">YouTube</option>
                <option value="twitch">Twitch.tv</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-red-300 uppercase font-semibold">Channel URL or Handle</Label>
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
                className="bg-black/70 border-red-900/60 focus:border-red-500"
              />
              <p className="text-[11px] text-zinc-400">
                The stream title, real-time live thumbnail snapshot, and viewer count will automatically be fetched directly from the broadcast.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="hover:bg-red-950/40">
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

      {/* Edit Stream Modal */}
      <Dialog open={!!editingStream} onOpenChange={(open) => !open && setEditingStream(null)}>
        <DialogContent className="sm:max-w-md bg-[#0e0507] border border-red-900/80 text-foreground backdrop-blur-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-orbitron text-gang-glow">
              EDIT REGISTERED BROADCAST FEED
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 font-rajdhani">
            <div className="space-y-1">
              <Label className="text-xs text-red-300 uppercase font-semibold">Registered Operative</Label>
              {members.length > 0 ? (
                <select
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/70 border border-red-900/60 rounded-lg text-sm text-foreground focus:outline-none focus:border-red-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.rank ? `(${m.rank.toUpperCase()})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  className="bg-black/70 border-red-900/60 focus:border-red-500"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-red-300 uppercase font-semibold">Broadcast Platform</Label>
              <select
                value={editPlatform}
                onChange={(e) => setEditPlatform(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/70 border border-red-900/60 rounded-lg text-sm text-foreground focus:outline-none focus:border-red-500"
              >
                <option value="kick">Kick.com</option>
                <option value="youtube">YouTube</option>
                <option value="twitch">Twitch.tv</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-red-300 uppercase font-semibold">Channel URL or Handle</Label>
              <Input
                placeholder="e.g. kick.com/channel or youtube.com/@channel"
                value={editUrlInput}
                onChange={(e) => setEditUrlInput(e.target.value)}
                className="bg-black/70 border-red-900/60 focus:border-red-500"
              />
              <p className="text-[11px] text-zinc-400">
                Updating channel will automatically re-fetch the live stream title, thumbnail, and viewer count directly from the stream.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingStream(null)} className="hover:bg-red-950/40">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="btn-gang"
            >
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
