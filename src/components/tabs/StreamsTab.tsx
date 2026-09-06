import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Radio,
  Tv,
  Plus,
  Trash2,
  ExternalLink,
  Play,
  Users,
  Video,
  Flame,
  Sparkles,
  CheckCircle2,
  Eye,
  Search,
  Filter,
  X,
} from "lucide-react";
import { apiService, StreamChannel } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface StreamsTabProps {
  userMode: "admin" | "gangmember" | "viewer2";
}

export function StreamsTab({ userMode }: StreamsTabProps) {
  const [streams, setStreams] = useState<StreamChannel[]>([]);
  const [selectedStream, setSelectedStream] = useState<StreamChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Add Stream
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
        title: title.trim() || `${memberName.trim()} | Red Network GTA RP Stream`,
        isLive: true,
        addedBy: isLeader ? "Red Leader" : memberName.trim(),
      });

      soundFx.playSuccessSound();
      setIsAddOpen(false);
      setMemberName("");
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
    if (!confirm(`Remove broadcast channel for "${name}"?`)) return;
    try {
      await apiService.deleteStream(id, "Red Leader");
      soundFx.playErrorSound();
      if (selectedStream?.id === id) setSelectedStream(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete stream");
    }
  };

  // Filter streams
  const filteredStreams = streams.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      s.memberName.toLowerCase().includes(q) ||
      s.channelSlug.toLowerCase().includes(q) ||
      (s.title && s.title.toLowerCase().includes(q));

    const matchesPlatform =
      platformFilter === "all" || s.platform === platformFilter;

    return matchesQuery && matchesPlatform;
  });

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

  const getPlatformBadge = (plat: string) => {
    if (plat === "kick") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-orbitron font-bold uppercase bg-[#53FC18]/10 border border-[#53FC18]/50 text-[#53FC18]">
          KICK
        </span>
      );
    }
    if (plat === "twitch") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-orbitron font-bold uppercase bg-[#9146FF]/10 border border-[#9146FF]/50 text-[#bf94ff]">
          TWITCH
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-orbitron font-bold uppercase bg-[#FF0000]/10 border border-[#FF0000]/50 text-[#ff6666]">
        YOUTUBE
      </span>
    );
  };

  // Platform card border class
  const getPlatformCardBorder = (plat: string) => {
    if (plat === "kick") return "hover:border-[#53FC18]/60 hover:shadow-[0_0_20px_rgba(83,252,24,0.25)]";
    if (plat === "twitch") return "hover:border-[#9146FF]/60 hover:shadow-[0_0_20px_rgba(145,70,255,0.25)]";
    return "hover:border-[#FF0000]/60 hover:shadow-[0_0_20px_rgba(255,0,0,0.25)]";
  };

  return (
    <div className="space-y-6 font-rajdhani">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl md:text-3xl font-orbitron font-extrabold text-gang-glow">
              SYNDICATE BROADCAST FEEDS
            </h2>
            <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-red-950/90 border border-red-500/50 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              {streams.length} Active Gang Streams
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Watch Red Network operatives live stream GTA RP operations on Kick, Twitch, and YouTube.
          </p>
        </div>

        {/* Action Button */}
        {canAdd && (
          <Button
            onClick={() => {
              soundFx.playClickSound();
              setIsAddOpen(true);
            }}
            className="btn-gang flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Link My Stream Feed
          </Button>
        )}
      </div>

      {/* Embedded Theater Player (if a stream is selected) */}
      {selectedStream && (
        <Card className="card-gang overflow-hidden border-2 border-red-600/70 shadow-[0_0_50px_rgba(220,38,38,0.45)] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3.5 bg-black/95 border-b border-red-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
              <h3 className="font-orbitron font-bold text-sm text-white flex items-center gap-2">
                THEATER: {selectedStream.memberName}
              </h3>
              {getPlatformBadge(selectedStream.platform)}
              <span className="hidden sm:inline text-xs text-muted-foreground font-mono">
                /{selectedStream.channelSlug}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={selectedStream.platform === "kick"
                  ? `https://kick.com/${selectedStream.channelSlug}`
                  : selectedStream.platform === "twitch"
                    ? `https://twitch.tv/${selectedStream.channelSlug}`
                    : `https://youtube.com/@${selectedStream.channelSlug}`
                }
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

      {/* Search & Filter */}
      <Card className="card-gang p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search streamer or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-black/50 border-red-900/40 text-sm font-rajdhani focus:border-red-500"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setPlatformFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${platformFilter === "all"
                  ? "bg-red-700 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] border border-red-500/50"
                  : "bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white"
                }`}
            >
              All Platforms ({streams.length})
            </button>
            <button
              onClick={() => setPlatformFilter("kick")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${platformFilter === "kick"
                  ? "bg-[#53FC18]/20 border border-[#53FC18] text-[#53FC18] shadow-[0_0_12px_rgba(83,252,24,0.3)]"
                  : "bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white"
                }`}
            >
              Kick ({streams.filter((s) => s.platform === "kick").length})
            </button>
            <button
              onClick={() => setPlatformFilter("twitch")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${platformFilter === "twitch"
                  ? "bg-[#9146FF]/20 border border-[#9146FF] text-[#bf94ff] shadow-[0_0_12px_rgba(145,70,255,0.3)]"
                  : "bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white"
                }`}
            >
              Twitch ({streams.filter((s) => s.platform === "twitch").length})
            </button>
            <button
              onClick={() => setPlatformFilter("youtube")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${platformFilter === "youtube"
                  ? "bg-[#FF0000]/20 border border-[#FF0000] text-[#ff6666] shadow-[0_0_12px_rgba(255,0,0,0.3)]"
                  : "bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white"
                }`}
            >
              YouTube ({streams.filter((s) => s.platform === "youtube").length})
            </button>
          </div>
        </div>
      </Card>

      {/* Streams Grid */}
      {loading ? (
        <div className="py-16 text-center text-red-400 font-orbitron animate-pulse">
          Connecting to satellite broadcast feeds...
        </div>
      ) : filteredStreams.length === 0 ? (
        <Card className="card-gang p-12 text-center text-muted-foreground">
          <Tv className="w-12 h-12 mx-auto text-red-500/40 mb-3" />
          <p className="text-lg">No active broadcast feeds found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStreams.map((stream) => (
            <Card
              key={stream.id}
              className={`card-gang p-4.5 transition-all duration-200 flex flex-col justify-between group ${getPlatformCardBorder(stream.platform)}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-950 via-black to-neutral-900 border border-red-800/50 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Radio className="w-5 h-5 text-red-400 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-rajdhani font-bold text-base text-foreground group-hover:text-red-300 transition-colors">
                        {stream.memberName}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {getPlatformBadge(stream.platform)}
                        <span className="text-xs text-muted-foreground font-mono">
                          /{stream.channelSlug}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isLeader && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteStream(stream.id, stream.memberName)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-950/60"
                      title="Remove Feed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                  {stream.title || `${stream.memberName} | Red Network GTA RP Operations`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-red-900/30 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    soundFx.playClickSound();
                    setSelectedStream(stream);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex-1 btn-gang text-xs flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Launch Theater
                </Button>
                <a
                  href={stream.platform === "kick"
                    ? `https://kick.com/${stream.channelSlug}`
                    : stream.platform === "twitch"
                      ? `https://twitch.tv/${stream.channelSlug}`
                      : `https://youtube.com/@${stream.channelSlug}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-black/60 border border-red-900/40 text-muted-foreground hover:text-white hover:border-red-500 transition-colors"
                  title="Open in External Tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Stream Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-black/90 border border-red-900/60 text-foreground backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-orbitron text-gang-glow">
              LINK BROADCAST CHANNEL
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 font-rajdhani">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Operative Name</Label>
              <Input
                placeholder="e.g. Marcus Vance"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="bg-black/50 border-red-900/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Platform</Label>
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
                    ? "kick.com/yourchannel"
                    : platform === "twitch"
                      ? "twitch.tv/yourchannel"
                      : "youtube.com/@channel or video ID"
                }
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="bg-black/50 border-red-900/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Stream Title / Job Focus</Label>
              <Input
                placeholder="e.g. Red Network // Bank Job & Southside Territory War"
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
              {isPublishing ? "Linking..." : "Publish Broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
