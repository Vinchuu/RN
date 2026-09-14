import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Shield, Users, Globe, Lock } from "lucide-react";
import { apiService } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

export type UserMode = "admin" | "gangmember" | "viewer2";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (mode: UserMode, username?: string) => void;
}

export const LoginModal = ({ isOpen, onClose, onLogin }: LoginModalProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedMode, setSelectedMode] = useState<UserMode>("gangmember");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDiscordLogin = () => {
    if (selectedMode === "viewer2") {
      onLogin("viewer2", "Public Viewer");
      onClose();
      return;
    }
    const url = apiService.getDiscordLoginUrl(selectedMode);
    if (url.startsWith("#")) {
      alert("Discord OAuth is optional. Use Leader or Member passcode directly, or set VITE_DISCORD_CLIENT_ID in your .env file.");
      return;
    }
    window.location.href = url;
  };

  const handleLocalLogin = async () => {
    setIsSubmitting(true);
    try {
      if (selectedMode === "viewer2") {
        onLogin("viewer2", "Public Viewer");
        soundFx.playSuccessSound();
        onClose();
        setIsSubmitting(false);
        return;
      }

      const res = await apiService.login(selectedMode, password);
      if (res.success) {
        soundFx.playSuccessSound();
        onLogin(selectedMode, res.username);
        onClose();
      } else {
        soundFx.playErrorSound();
        alert(res.message || "Invalid credentials! Access Denied.");
      }
    } catch (err: any) {
      soundFx.playErrorSound();
      alert(err.message || "Login failed. Check server connectivity.");
    } finally {
      setIsSubmitting(false);
      setPassword("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-black/90 border border-red-900/60 backdrop-blur-2xl text-foreground shadow-[0_0_50px_rgba(220,38,38,0.3)]">
        <DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-2 pt-2">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-900 via-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-950 border border-red-400/30 overflow-hidden p-1.5">
                <img
                  src="/favicon.png"
                  alt="Red Network Logo"
                  className="w-11 h-11 object-contain drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border border-black"></span>
              </span>
            </div>
            <DialogTitle className="text-2xl font-orbitron font-extrabold text-center tracking-wider text-gang-glow">
              RED NETWORK ACCESS
            </DialogTitle>
            <p className="text-xs text-red-300/80 font-rajdhani uppercase tracking-widest">
              Syndicate Authentication Portal // 3-Tier Security
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-3">
          {/* Mode Selection Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Viewer - Upper Layer */}
            <Card
              className={`p-3 cursor-pointer transition-all duration-300 border text-center relative ${
                selectedMode === "viewer2"
                  ? "bg-red-950/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "bg-black/40 border-red-900/30 hover:border-red-700/60"
              }`}
              onClick={() => {
                setSelectedMode("viewer2");
                soundFx.playClickSound();
              }}
            >
              <Globe className="w-6 h-6 mx-auto text-blue-400 mb-1" />
              <h3 className="font-rajdhani font-bold text-xs">Public Viewer</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Read-Only Layer</p>
            </Card>

            {/* Member */}
            <Card
              className={`p-3 cursor-pointer transition-all duration-300 border text-center relative ${
                selectedMode === "gangmember"
                  ? "bg-red-950/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "bg-black/40 border-red-900/30 hover:border-red-700/60"
              }`}
              onClick={() => {
                setSelectedMode("gangmember");
                soundFx.playClickSound();
              }}
            >
              <Users className="w-6 h-6 mx-auto text-amber-400 mb-1" />
              <h3 className="font-rajdhani font-bold text-xs">Gang Member</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Dues & Stash</p>
            </Card>

            {/* Leader */}
            <Card
              className={`p-3 cursor-pointer transition-all duration-300 border text-center relative ${
                selectedMode === "admin"
                  ? "bg-red-950/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "bg-black/40 border-red-900/30 hover:border-red-700/60"
              }`}
              onClick={() => {
                setSelectedMode("admin");
                soundFx.playClickSound();
              }}
            >
              <Shield className="w-6 h-6 mx-auto text-red-500 mb-1" />
              <h3 className="font-rajdhani font-bold text-xs">Red Leader</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Full Authority</p>
            </Card>
          </div>

          {/* Mode Description Banner */}
          <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/40 text-xs text-red-200/90 font-rajdhani">
            {selectedMode === "viewer2" && (
              <p className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                <span><strong>Viewer Layer:</strong> Access member roster, vault counter, live streams, and stash list. No editing allowed.</span>
              </p>
            )}
            {selectedMode === "gangmember" && (
              <p className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Member Access:</strong> View roster, check your weekly dues, browse arsenal, and submit live streams.</span>
              </p>
            )}
            {selectedMode === "admin" && (
              <p className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-red-400 shrink-0" />
                <span><strong>Leader Command:</strong> Full control to add/kick members, mark dues paid, reset weekly cycles, manage stash, and view all audit logs.</span>
              </p>
            )}
          </div>

          {/* Password Input (Hidden for Viewer) */}
          {selectedMode !== "viewer2" && (
            <div className="space-y-2">
              <Label className="text-xs font-rajdhani uppercase tracking-wider text-muted-foreground">
                {selectedMode === "admin" ? "Leader Passcode" : "Member Passcode"}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={selectedMode === "admin" ? "Enter leader passcode..." : "Enter member passcode..."}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLocalLogin();
                  }}
                  className="bg-black/60 border-red-900/50 pr-10 font-mono focus-visible:ring-red-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <Button
              onClick={handleLocalLogin}
              disabled={isSubmitting || (selectedMode !== "viewer2" && !password.trim())}
              className="w-full btn-gang"
            >
              {isSubmitting
                ? "Authenticating..."
                : selectedMode === "viewer2"
                ? "Enter as Guest Viewer"
                : `Authorize as ${selectedMode === "admin" ? "Leader" : "Member"}`}
            </Button>

            {selectedMode !== "viewer2" && (
              <Button
                variant="outline"
                onClick={handleDiscordLogin}
                className="w-full bg-[#5865F2]/10 border-[#5865F2]/40 text-[#8ea1e1] hover:bg-[#5865F2]/20 hover:text-white font-rajdhani font-semibold text-xs flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Sign in with Discord OAuth
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
