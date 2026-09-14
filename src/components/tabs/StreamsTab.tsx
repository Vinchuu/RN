import { useState, useEffect, useMemo, useRef } from "react";
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
  Users,
  Eye,
  Search,
  X,
  RefreshCw,
  Radio,
  Heart,
  Share2,
  Check,
  Tv,
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<StreamChannel | null>(null);

  // Filters & Sorting matching soulcity.live & user requirements
  // Strictly defaults to 'live' so only operatives who are currently broadcasting are shown
  const [showFilter, setShowFilter] = useState<"live" | "all">("live");
  const [platformFilter, setPlatformFilter] = useState<"all" | "kick" | "youtube">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Default sorting: Viewers (High to Low) as requested
  const [sortBy, setSortBy] = useState<
    "viewers-desc" | "viewers-asc" | "likes-desc" | "likes-asc" | "views-desc"
  >("viewers-desc");

  // Form State (Add)
  const [memberName, setMemberName] = useState("");
  const [platform, setPlatform] = useState<"kick" | "youtube">("kick");
  const [urlInput, setUrlInput] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Form State (Edit)
  const [editMemberName, setEditMemberName] = useState("");
  const [editPlatform, setEditPlatform] = useState<"kick" | "youtube">("kick");
  const [editUrlInput, setEditUrlInput] = useState("");
  const [editIsLive, setEditIsLive] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Permissions
  const canAdd = userMode === "admin" || userMode === "gangmember";
  const canEdit = userMode === "admin" || userMode === "gangmember";
  const canDelete = userMode === "admin";

  const fetchStreamFeeds = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await apiService.getStreams();
      setStreams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching stream feeds:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    // Load registered gang members for feed assignment
    apiService.getMembers().then((data) => {
      if (isSubscribed && Array.isArray(data)) {
        setMembers(data);
        if (data.length > 0 && !memberName) {
          setMemberName(data[0].name);
        }
      }
    });

    fetchStreamFeeds(true);

    // Realtime Socket subscription
    const unsubscribe = apiService.subscribeToStreams((newStreams) => {
      if (isSubscribed && Array.isArray(newStreams)) {
        setStreams(newStreams);
        setLoading(false);
      }
    });

    // Auto-refresh interval (every 30 seconds) to keep realtime viewership & likes fresh
    const pollInterval = setInterval(() => {
      fetchStreamFeeds(false);
    }, 30000);

    return () => {
      isSubscribed = false;
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  const handleManualRefresh = async () => {
    soundFx.playClickSound();
    setIsRefreshing(true);
    await fetchStreamFeeds(false);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Channel slug extractor from input URL or handle
  const extractChannelSlug = (input: string, plat: "kick" | "youtube"): string => {
    let clean = input.trim();
    if (plat === "kick") {
      clean = clean.replace(/^(https?:\/\/)?(www\.)?kick\.com\//i, "");
      clean = clean.split("/")[0].split("?")[0].replace(/^@/, "");
      return clean;
    }
    if (plat === "youtube") {
      clean = clean.replace(/^(https?:\/\/)?(www\.)?youtube\.com\//i, "");
      clean = clean.replace(/^@/, "");
      return clean;
    }
    return clean;
  };

  // Share stream link to clipboard
  const handleShareStream = (e: React.MouseEvent, stream: StreamChannel) => {
    e.stopPropagation();
    soundFx.playClickSound();
    const url = getChannelUrl(stream);
    navigator.clipboard.writeText(url);
    setCopiedId(stream.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Generate channel URL
  const getChannelUrl = (stream: StreamChannel): string => {
    if (stream.platform === "kick") {
      return `https://kick.com/${stream.channelSlug}`;
    }
    if (stream.platform === "youtube") {
      if (stream.videoId) {
        return `https://www.youtube.com/watch?v=${stream.videoId}`;
      }
      if (stream.channelSlug.startsWith("UC")) {
        return `https://www.youtube.com/channel/${stream.channelSlug}`;
      }
      return `https://www.youtube.com/@${stream.channelSlug}`;
    }
    return "#";
  };

  // Embed URL generator for Theater Modal
  const getEmbedUrl = (stream: StreamChannel): string => {
    if (stream.platform === "kick") {
      return `https://player.kick.com/${stream.channelSlug}?autoplay=true&muted=false`;
    }
    if (stream.platform === "youtube") {
      const vid = stream.videoId || (stream.channelSlug.length === 11 ? stream.channelSlug : null);
      if (vid) {
        return `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1`;
      }
      if (stream.channelSlug.startsWith("UC")) {
        return `https://www.youtube.com/embed/live_stream?channel=${stream.channelSlug}&autoplay=1`;
      }
      if (stream.channelSlug.toUpperCase() === "PRATEEKYT") {
        return `https://www.youtube.com/embed/live_stream?channel=UC_qwc3gxud_vmh9UFMWKywQ&autoplay=1`;
      }
    }
    return "";
  };

  // Format numbers to K / M string (e.g. 2,240 -> 2.2K)
  const formatNumber = (num?: number): string => {
    if (!num || num <= 0) return "0";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toLocaleString();
  };

  // Save new broadcast feed
  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    soundFx.playSuccessSound();
    setIsPublishing(true);

    try {
      const cleanSlug = extractChannelSlug(urlInput, platform);
      await apiService.addStream({
        memberName: memberName || "Red Operative",
        platform,
        channelSlug: cleanSlug,
        addedBy: userMode === "admin" ? "Red Leader" : "Red Operative",
      });

      setUrlInput("");
      setIsAddOpen(false);
      await fetchStreamFeeds(false);
    } catch (err) {
      console.error("Failed to add stream feed:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  // Edit stream feed
  const handleOpenEdit = (stream: StreamChannel) => {
    setEditingStream(stream);
    setEditMemberName(stream.memberName);
    setEditPlatform(stream.platform === "youtube" ? "youtube" : "kick");
    setEditUrlInput(stream.channelSlug);
    setEditIsLive(!!stream.isLive);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStream || !editUrlInput.trim()) return;

    soundFx.playSuccessSound();
    setIsSavingEdit(true);

    try {
      const cleanSlug = extractChannelSlug(editUrlInput, editPlatform);
      await apiService.updateStream(
        editingStream.id,
        {
          memberName: editMemberName || editingStream.memberName,
          platform: editPlatform,
          channelSlug: cleanSlug,
          isLive: editIsLive,
          viewers: editIsLive ? (editingStream.viewers || 220) : 0,
          likes: editIsLive ? (editingStream.likes || 40) : 0,
        },
        userMode === "admin" ? "Red Leader" : "Red Operative"
      );

      setEditingStream(null);
      await fetchStreamFeeds(false);
    } catch (err) {
      console.error("Failed to update stream feed:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Quick toggle stream live status
  const handleQuickToggleLive = async (e: React.MouseEvent, stream: StreamChannel) => {
    e.stopPropagation();
    soundFx.playClickSound();
    try {
      const nextLive = !stream.isLive;
      await apiService.updateStream(
        stream.id,
        {
          isLive: nextLive,
          viewers: nextLive ? (stream.viewers || 220) : 0,
          likes: nextLive ? (stream.likes || 40) : 0,
        },
        userMode === "admin" ? "Red Leader" : "Red Operative"
      );
      await fetchStreamFeeds(false);
    } catch (err) {
      console.error("Failed to toggle stream live status:", err);
    }
  };

  // Delete stream feed
  const handleDeleteStream = async (streamId: string) => {
    if (!confirm("Confirm deleting this registered broadcast feed?")) return;
    soundFx.playClickSound();
    try {
      await apiService.deleteStream(streamId, userMode === "admin" ? "Red Leader" : "Red Operative");
      if (selectedStream?.id === streamId) setSelectedStream(null);
      await fetchStreamFeeds(false);
    } catch (err) {
      console.error("Failed to delete stream:", err);
    }
  };

  // Count currently live streams
  const liveCount = streams.filter((s) => !!s.isLive).length;

  // Filtered & Sorted stream listings
  const filteredStreams = useMemo(() => {
    let result = streams.filter((s) => {
      // User requirement: only live streams by default
      if (showFilter === "live" && !s.isLive) return false;

      // Platform filter (case insensitive)
      if (platformFilter !== "all" && s.platform?.toLowerCase() !== platformFilter.toLowerCase()) return false;

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

    // Sorting (Default: Viewers High to Low so highest watching stays at the top)
    result.sort((a, b) => {
      if (sortBy === "viewers-desc") {
        return (b.viewers || 0) - (a.viewers || 0);
      }
      if (sortBy === "viewers-asc") {
        return (a.viewers || 0) - (b.viewers || 0);
      }
      if (sortBy === "likes-desc") {
        return (b.likes || 0) - (a.likes || 0);
      }
      if (sortBy === "likes-asc") {
        return (a.likes || 0) - (b.likes || 0);
      }
      if (sortBy === "views-desc") {
        return (b.views || 0) - (a.views || 0);
      }
      return 0;
    });

    return result;
  }, [streams, showFilter, platformFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6 font-rajdhani">
      {/* Top Filter Bar - Replicating soulcity.live in Red Network Theme */}
      <div className="bg-[#120609]/95 border border-red-900/50 rounded-xl px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_25px_rgba(220,38,38,0.12)] backdrop-blur-md">
        {/* Left Side: Show Dropdown & Platform Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Show Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium text-sm">Show:</span>
            <select
              value={showFilter}
              onChange={(e) => setShowFilter(e.target.value as any)}
              className="bg-[#1a080d] border border-red-900/60 hover:border-red-500 rounded-lg px-3 py-1.5 text-sm text-white font-medium focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
            >
              <option value="live">Live ({liveCount})</option>
              <option value="all">All Registered ({streams.length})</option>
            </select>
          </div>

          {/* Platform Toggle Buttons */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-red-900/30">
            {/* All toggle */}
            <button
              type="button"
              onClick={() => {
                soundFx.playClickSound();
                setPlatformFilter("all");
              }}
              className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all ${
                platformFilter === "all"
                  ? "bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.7)]"
                  : "bg-black/50 border border-red-900/40 text-zinc-400 hover:text-white"
              }`}
            >
              ALL
            </button>

            {/* YouTube toggle button with official SVG logo */}
            <button
              type="button"
              onClick={() => {
                soundFx.playClickSound();
                setPlatformFilter(platformFilter === "youtube" ? "all" : "youtube");
              }}
              title="Filter YouTube streams"
              className={`h-8 px-3 rounded-lg flex items-center gap-1.5 font-bold text-xs transition-all ${
                platformFilter === "youtube"
                  ? "bg-[#ff0000] text-white ring-2 ring-red-400 shadow-[0_0_14px_rgba(255,0,0,0.7)]"
                  : "bg-black/50 border border-red-900/40 text-zinc-400 hover:text-[#ff0000] hover:border-[#ff0000]/60"
              }`}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M23.498 6.163c-.272-1.018-1.074-1.82-2.092-2.092C19.557 3.5 12 3.5 12 3.5s-7.557 0-9.406.571C1.576 4.343.774 5.145.502 6.163 0 8.01 0 12 0 12s0 3.99.502 5.837c.272 1.018 1.074 1.82 2.092 2.092C4.443 20.5 12 20.5 12 20.5s7.557 0 9.406-.571c1.018-.272 1.82-1.074 2.092-2.092C24 15.99 24 12 24 12s0-3.99-.502-5.837zM9.5 15.5v-7l6 3.5-6 3.5z" />
              </svg>
              <span>YOUTUBE</span>
            </button>

            {/* Kick toggle button with green Kick SVG logo */}
            <button
              type="button"
              onClick={() => {
                soundFx.playClickSound();
                setPlatformFilter(platformFilter === "kick" ? "all" : "kick");
              }}
              title="Filter Kick streams"
              className={`h-8 px-3 rounded-lg flex items-center gap-1.5 font-black text-xs transition-all ${
                platformFilter === "kick"
                  ? "bg-[#53fc18] text-black ring-2 ring-white shadow-[0_0_14px_rgba(83,252,24,0.7)]"
                  : "bg-black/50 border border-green-900/40 text-zinc-400 hover:text-[#53fc18] hover:border-[#53fc18]/60"
              }`}
            >
              <svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor">
                <path d="M37 .036h164.448v113.621h54.71v-56.82h54.731V.036h164.448v170.777h-54.73v56.82h-54.711v56.8h54.71v56.82h54.73V512.03H310.89v-56.82h-54.73v-56.8h-54.711v113.62H37V.036z" />
              </svg>
              <span>KICK</span>
            </button>
          </div>
        </div>

        {/* Center: Search Box */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-red-500/70" />
          <Input
            placeholder="Search streams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 py-1.5 h-9 bg-[#1a080d] border-red-900/60 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:border-red-500 focus:ring-0"
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

        {/* Right Side: Sort By, Stats Counter & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium text-sm">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#1a080d] border border-red-900/60 hover:border-red-500 rounded-lg px-3 py-1.5 text-sm text-white font-medium focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
            >
              <option value="viewers-desc">Viewers (High to Low)</option>
              <option value="viewers-asc">Viewers (Low to High)</option>
              <option value="likes-desc">Likes (High to Low)</option>
              <option value="likes-asc">Likes (Low to High)</option>
              <option value="views-desc">Total Views (High to Low)</option>
            </select>
          </div>

          {/* Showing Count Pill (soulcity style) */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 border border-red-900/40 text-red-400 text-xs font-bold">
            <Eye className="w-3.5 h-3.5" />
            <span>Showing: {filteredStreams.length}</span>
          </div>

          {/* Manual Refresh Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 p-0 bg-red-950/40 border border-red-900/60 hover:border-red-500 text-red-400 hover:text-white"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-red-400" : ""}`} />
          </Button>

          {/* Register Feed (Admin/Member only) */}
          {canAdd && (
            <Button
              size="sm"
              onClick={() => {
                soundFx.playClickSound();
                setIsAddOpen(true);
              }}
              className="btn-gang h-9 text-xs px-3.5 gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Feed</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Stream Grid (4 Columns responsive matching .stream-grid) */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-3 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-400 font-mono text-sm tracking-widest uppercase">
            Synchronizing Red Network Broadcast Feeds...
          </p>
        </div>
      ) : filteredStreams.length === 0 ? (
        /* Empty State */
        <Card className="bg-[#120609]/80 border-red-900/40 p-12 text-center shadow-xl">
          <Radio className="w-12 h-12 text-red-500/50 mx-auto mb-3 animate-pulse" />
          <h3 className="text-lg font-orbitron font-bold text-white mb-2 tracking-wider uppercase">
            {showFilter === "live"
              ? platformFilter !== "all"
                ? `NO ${platformFilter.toUpperCase()} STREAMS CURRENTLY LIVE`
                : "ALL CHANNELS STANDBY // NO OPERATIVES CURRENTLY LIVE"
              : `NO ${platformFilter.toUpperCase()} FEEDS FOUND`}
          </h3>
          <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
            {platformFilter !== "all"
              ? `There are currently no active ${platformFilter.toUpperCase()} broadcast feeds matching your filter. Switch platforms or view all registered feeds.`
              : showFilter === "live"
              ? "None of the registered gang feeds are currently live broadcasting. Check back shortly or view all registered channels."
              : "Try clearing your search query or switching platform filters to view registered feeds."}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {platformFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  soundFx.playClickSound();
                  setPlatformFilter("all");
                }}
                className="border-red-900/60 hover:border-red-500 text-zinc-200 hover:text-white"
              >
                View All Platforms
              </Button>
            )}
            {showFilter === "live" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  soundFx.playClickSound();
                  setShowFilter("all");
                }}
                className="border-red-900/60 hover:border-red-500 text-zinc-200 hover:text-white"
              >
                View All Registered Feeds ({streams.length})
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleManualRefresh}
              className="btn-gang text-xs px-4"
            >
              Refresh Feeds
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredStreams.map((stream) => {
            const isStreamLive = !!stream.isLive;
            const channelUrl = getChannelUrl(stream);

            return (
              <div
                key={stream.id}
                onClick={() => {
                  soundFx.playClickSound();
                  setSelectedStream(stream);
                }}
                className={`group cursor-pointer rounded-xl overflow-hidden border transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col bg-[#140609] ${
                  isStreamLive
                    ? "border-red-900/50 hover:border-red-500 hover:shadow-[0_12px_35px_rgba(220,38,38,0.25)]"
                    : "border-zinc-800/60 opacity-75 hover:opacity-100 hover:border-zinc-700"
                }`}
              >
                {/* 16:9 Thumbnail Container */}
                <div className="relative aspect-video w-full bg-[#1e0a10] overflow-hidden">
                  {stream.thumbnailUrl ? (
                    <img
                      src={stream.thumbnailUrl}
                      alt={stream.title || stream.memberName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (stream.platform === "youtube") {
                          if (stream.videoId) {
                            target.src = `https://img.youtube.com/vi/${stream.videoId}/hqdefault.jpg`;
                          } else {
                            target.style.display = "none";
                          }
                        } else {
                          target.src = "https://images.kick.com/video_thumbnails/jLWUz3tNeo2f/PiIQm9wQkeCr/720.webp";
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1b060d] to-[#090204] p-4 text-center">
                      <Tv className="w-10 h-10 text-red-500/30 mb-2" />
                      <span className="text-xs font-mono text-zinc-500 tracking-wider">
                        {isStreamLive ? "LIVE BROADCAST" : "OFFLINE STANDBY"}
                      </span>
                    </div>
                  )}

                  {/* Top-Left: Platform Logo Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                    {stream.platform === "kick" ? (
                      <div
                        className="w-7 h-7 rounded-md bg-black/80 p-1 flex items-center justify-center border border-[#53fc18]/40 shadow-lg"
                        title="Kick Stream"
                      >
                        <svg viewBox="0 0 512 512" width="18" height="18" fill="#53fc18">
                          <path d="M37 .036h164.448v113.621h54.71v-56.82h54.731V.036h164.448v170.777h-54.73v56.82h-54.711v56.8h54.71v56.82h54.73V512.03H310.89v-56.82h-54.73v-56.8h-54.711v113.62H37V.036z" />
                        </svg>
                      </div>
                    ) : (
                      <div
                        className="w-7 h-7 rounded-md bg-black/80 p-1 flex items-center justify-center border border-red-500/40 shadow-lg"
                        title="YouTube Stream"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="#ff0000">
                          <path d="M23.498 6.163c-.272-1.018-1.074-1.82-2.092-2.092C19.557 3.5 12 3.5 12 3.5s-7.557 0-9.406.571C1.576 4.343.774 5.145.502 6.163 0 8.01 0 12 0 12s0 3.99.502 5.837c.272 1.018 1.074 1.82 2.092 2.092C4.443 20.5 12 20.5 12 20.5s7.557 0 9.406-.571c1.018-.272 1.82-1.074 2.092-2.092C24 15.99 24 12 24 12s0-3.99-.502-5.837zM9.5 15.5v-7l6 3.5-6 3.5z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Top-Right: Quick Share Button */}
                  <button
                    type="button"
                    onClick={(e) => handleShareStream(e, stream)}
                    title={copiedId === stream.id ? "Link Copied!" : "Share Stream Link"}
                    className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-80 hover:opacity-100 hover:scale-110 hover:bg-red-600 transition-all shadow-md"
                  >
                    {copiedId === stream.id ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Bottom-Right: LIVE Badge or Offline Badge */}
                  <div className="absolute bottom-2.5 right-2.5 z-10">
                    {isStreamLive ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-600/90 backdrop-blur-md text-white font-bold font-mono text-[11px] shadow-lg tracking-wider border border-red-400/40">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        LIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-zinc-400 font-mono text-[10px] border border-zinc-700/40">
                        OFFLINE
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Stream Title (2 lines clamp) */}
                    <h4
                      className="text-white text-sm font-bold line-clamp-2 leading-snug mb-1 group-hover:text-red-400 transition-colors"
                      title={stream.title || (isStreamLive ? `${stream.memberName} // Live Stream` : `${stream.memberName} // Offline Standby`)}
                    >
                      {stream.title || (isStreamLive ? `${stream.memberName} // Live Stream` : `${stream.memberName} // Offline Standby`)}
                    </h4>

                    {/* Streamer Username / Handle */}
                    <p className="text-xs text-red-400/80 font-mono truncate mb-3">
                      {stream.memberName}
                      <span className="text-zinc-500 ml-1">@{stream.channelSlug}</span>
                    </p>
                  </div>

                  {/* Bottom Stats Footer (soulcity style) */}
                  <div className="pt-2.5 border-t border-red-900/30 flex items-center justify-between gap-2 text-xs">
                    {/* Viewers (Live Watching) */}
                    <div
                      className="flex items-center gap-1.5 font-semibold text-zinc-300"
                      title="Current Live Viewers"
                    >
                      <Users className="w-3.5 h-3.5 text-red-500" />
                      <span>{formatNumber(stream.viewers)}</span>
                    </div>

                    {/* Likes */}
                    <div
                      className="flex items-center gap-1.5 text-zinc-400 font-medium"
                      title="Realtime Likes"
                    >
                      <Heart className="w-3.5 h-3.5 text-red-400/80 fill-red-500/20" />
                      <span>{formatNumber(stream.likes || Math.round((stream.viewers || 0) * 0.15))}</span>
                    </div>

                    {/* Total Views / Views */}
                    {stream.views ? (
                      <div
                        className="hidden sm:flex items-center gap-1.5 text-zinc-400 font-medium"
                        title="Total Views"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{formatNumber(stream.views)}</span>
                      </div>
                    ) : null}

                    {/* External Link & Edit Controls */}
                    <div className="flex items-center gap-1 ml-auto">
                      <a
                        href={channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-zinc-400 hover:text-white hover:bg-red-950/60 rounded transition-colors"
                        title="Open in Platform"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickToggleLive(e, stream)}
                          className={`p-1 rounded transition-colors ${
                            stream.isLive
                              ? "text-red-400 hover:text-zinc-400 hover:bg-red-950/40"
                              : "text-zinc-500 hover:text-green-400 hover:bg-green-950/40"
                          }`}
                          title={stream.isLive ? "Mark Standby (Offline)" : "Mark Live"}
                        >
                          <Radio className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(stream);
                          }}
                          className="p-1 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-950/40 rounded transition-colors"
                          title="Edit Feed"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStream(stream.id);
                          }}
                          className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                          title="Delete Feed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cinematic Theater Modal (Embedded Kick / YouTube Player) */}
      <Dialog open={!!selectedStream} onOpenChange={(open) => !open && setSelectedStream(null)}>
        <DialogContent className="max-w-5xl bg-[#0e0306] border-red-900/60 text-white p-0 overflow-hidden shadow-2xl">
          {selectedStream && (
            <div>
              {/* Theater Header */}
              <div className="px-5 py-3.5 border-b border-red-900/40 flex items-center justify-between bg-[#150509]">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <div>
                    <h3 className="font-orbitron font-bold text-sm text-white tracking-wide">
                      THEATER FEED: {selectedStream.memberName}
                    </h3>
                    <span className="text-xs text-red-400/80 font-mono">
                      /{selectedStream.channelSlug} &bull; {selectedStream.platform.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getChannelUrl(selectedStream)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-gang px-3 py-1 text-xs inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open On {selectedStream.platform.toUpperCase()}</span>
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedStream(null)}
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-red-950/60"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Embedded Player Frame */}
              <div className="relative aspect-video w-full bg-black">
                {getEmbedUrl(selectedStream) ? (
                  <iframe
                    src={getEmbedUrl(selectedStream)}
                    title={selectedStream.title || "Live Stream"}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#0e0306]">
                    <Radio className="w-12 h-12 text-red-500/40 mb-3 animate-pulse" />
                    <h4 className="text-base font-orbitron font-bold text-white mb-1">
                      BROADCAST CURRENTLY OFFLINE
                    </h4>
                    <p className="text-xs text-zinc-400 max-w-sm mb-4">
                      {selectedStream.memberName} is not currently live broadcasting. You can visit their channel directly.
                    </p>
                    <a
                      href={getChannelUrl(selectedStream)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-gang px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Visit Channel</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Theater Live Stats Footer */}
              <div className="px-5 py-3 border-t border-red-900/40 bg-[#120508] flex items-center justify-between text-xs text-zinc-300">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Users className="w-4 h-4 text-red-500" />
                    <span>{formatNumber(selectedStream.viewers)} Watching</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span>{formatNumber(selectedStream.likes || Math.round((selectedStream.viewers || 0) * 0.15))} Likes</span>
                  </div>
                </div>
                <div className="truncate max-w-md text-zinc-400 font-medium">
                  {selectedStream.title || `${selectedStream.memberName} // Live Stream`}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Register Broadcast Feed Modal (Add) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-[#120609] border-red-900/60 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-red-500 text-base tracking-wider flex items-center gap-2">
              <Tv className="w-4 h-4" />
              <span>LINK BROADCAST FEED</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateStream} className="space-y-4 text-sm mt-2">
            <div>
              <Label className="text-zinc-300 text-xs">Assigned Operative</Label>
              <select
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="w-full mt-1 bg-[#1a080d] border border-red-900/60 rounded-md px-3 py-2 text-white focus:outline-none focus:border-red-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.alias || m.rank})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-zinc-300 text-xs">Streaming Platform</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setPlatform("kick")}
                  className={`py-2 px-3 rounded border text-xs font-bold transition-all ${
                    platform === "kick"
                      ? "bg-[#53fc18] text-black border-[#53fc18]"
                      : "bg-black/40 border-red-900/40 text-zinc-400"
                  }`}
                >
                  KICK
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform("youtube")}
                  className={`py-2 px-3 rounded border text-xs font-bold transition-all ${
                    platform === "youtube"
                      ? "bg-red-600 text-white border-red-500"
                      : "bg-black/40 border-red-900/40 text-zinc-400"
                  }`}
                >
                  YOUTUBE
                </button>
              </div>
            </div>

            <div>
              <Label className="text-zinc-300 text-xs">
                {platform === "kick" ? "Kick Username / Channel URL" : "YouTube Channel Handle / URL"}
              </Label>
              <Input
                placeholder={platform === "kick" ? "e.g. flashnxtgaming" : "e.g. @PRATEEKYT or channel URL"}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                required
                className="mt-1 bg-[#1a080d] border-red-900/60 text-white"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPublishing} className="btn-gang">
                {isPublishing ? "Linking..." : "Register Feed"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Broadcast Feed Modal */}
      <Dialog open={!!editingStream} onOpenChange={(open) => !open && setEditingStream(null)}>
        <DialogContent className="bg-[#120609] border-red-900/60 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-red-500 text-base tracking-wider flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              <span>EDIT BROADCAST FEED</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 text-sm mt-2">
            <div>
              <Label className="text-zinc-300 text-xs">Assigned Operative</Label>
              <Input
                value={editMemberName}
                onChange={(e) => setEditMemberName(e.target.value)}
                required
                className="mt-1 bg-[#1a080d] border-red-900/60 text-white"
              />
            </div>

            <div>
              <Label className="text-zinc-300 text-xs">Streaming Platform</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setEditPlatform("kick")}
                  className={`py-2 px-3 rounded border text-xs font-bold transition-all ${
                    editPlatform === "kick"
                      ? "bg-[#53fc18] text-black border-[#53fc18]"
                      : "bg-black/40 border-red-900/40 text-zinc-400"
                  }`}
                >
                  KICK
                </button>
                <button
                  type="button"
                  onClick={() => setEditPlatform("youtube")}
                  className={`py-2 px-3 rounded border text-xs font-bold transition-all ${
                    editPlatform === "youtube"
                      ? "bg-red-600 text-white border-red-500"
                      : "bg-black/40 border-red-900/40 text-zinc-400"
                  }`}
                >
                  YOUTUBE
                </button>
              </div>
            </div>

            <div>
              <Label className="text-zinc-300 text-xs">Channel Username or URL</Label>
              <Input
                value={editUrlInput}
                onChange={(e) => setEditUrlInput(e.target.value)}
                required
                className="mt-1 bg-[#1a080d] border-red-900/60 text-white"
              />
            </div>

            <div>
              <Label className="text-zinc-300 text-xs">Broadcast Status</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setEditIsLive(true)}
                  className={`py-2 px-3 rounded border text-xs font-bold transition-all ${
                    editIsLive
                      ? "bg-red-600 text-white border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                      : "bg-black/40 border-red-900/40 text-zinc-400 hover:text-white"
                  }`}
                >
                  🔴 LIVE NOW
                </button>
                <button
                  type="button"
                  onClick={() => setEditIsLive(false)}
                  className={`py-2 px-3 rounded border text-xs font-bold transition-all ${
                    !editIsLive
                      ? "bg-zinc-800 text-zinc-200 border-zinc-600"
                      : "bg-black/40 border-red-900/40 text-zinc-400 hover:text-white"
                  }`}
                >
                  ⚪ STANDBY (OFFLINE)
                </button>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingStream(null)}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingEdit} className="btn-gang">
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
