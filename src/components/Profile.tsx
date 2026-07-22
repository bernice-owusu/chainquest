import React, { useState, useEffect } from "react";
import { UserProfile, Badge } from "../types";
import { 
  Award, Shield, Zap, Hammer, Code, Coins, Trophy, Calendar, CheckSquare, Star, CheckCircle2, Lock, Gift, Palette,
  Settings, Volume2, VolumeX, HelpCircle, AlertTriangle, Check, Swords, Eye, Layers, Scale,
  Cloud, UserPlus, LogIn, LogOut, RefreshCw
} from "lucide-react";
import { playSound } from "../utils/audio";
import { motion } from "motion/react";

const AVATARS = ["🧙‍♂️", "🦊", "🤖", "🚀", "🦄", "👾", "👨‍💻", "👩‍💻"];

interface ProfileProps {
  userProfile: UserProfile;
  onClaimQuest: (questId: string, xpReward: number) => void;
  activeTheme: "elegant-cyan" | "cyber-green" | "neon-purple" | "amber-gold";
  onThemeChange: (theme: "elegant-cyan" | "cyber-green" | "neon-purple" | "amber-gold") => void;
  onUpdateProfile?: (newUsername: string, newAvatar: string, additional?: Partial<UserProfile>) => void;
  onResetProgress?: () => void;
  onRelaunchTour?: () => void;
}

export interface QuestBonus {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  requiredZone: string;
}

export const BONUS_QUESTS: QuestBonus[] = [
  {
    id: "ach_seed_phrase",
    title: "Seed Phrase Cryptographer",
    description: "Successfully master 12-word seeds and keypair generations in Wallet Village.",
    xpReward: 50,
    requiredZone: "wallet"
  },
  {
    id: "ach_gas_miner",
    title: "PoW Mountain King",
    description: "Successfully search nonces to mine valid block hashes on Mining Mountains.",
    xpReward: 50,
    requiredZone: "mining"
  },
  {
    id: "ach_vending_contract",
    title: "Decentralized Architect",
    description: "Compile and execute automated vending smart contracts on Smart Contract City.",
    xpReward: 50,
    requiredZone: "contract"
  },
  {
    id: "ach_pool_provider",
    title: "AMM Liquidity Baron",
    description: "Swap and calculate exact invariant prices in DeFi District pool.",
    xpReward: 50,
    requiredZone: "defi"
  }
];

export const getDistrictForBadge = (badgeId: string) => {
  switch (badgeId) {
    case "badge_wallet": return "Wallet Village";
    case "badge_transaction": return "Mempool Meadows";
    case "badge_mining": return "PoW Mountain";
    case "badge_contract": return "Solidity Springs";
    case "badge_defi": return "DeFi District";
    case "badge_oracle": return "Oracle Oasis";
    case "badge_l2": return "Layer-2 Lagoon";
    case "badge_dao": return "DAO Dome";
    default: return "Lessons";
  }
};

export const BADGES: Badge[] = [
  {
    id: "badge_wallet",
    title: "Wallet Master",
    description: "Successfully derived key pairs and secured seed phrases.",
    icon: "Shield",
    color: "bg-emerald-500/10 border-emerald-500/50 text-emerald-400",
  },
  {
    id: "badge_transaction",
    title: "Transaction Pioneer",
    description: "Constructed signed transactions and successfully negotiated mempools.",
    icon: "Zap",
    color: "bg-sky-500/10 border-sky-500/50 text-sky-400",
  },
  {
    id: "badge_mining",
    title: "Hash Smasher",
    description: "Mined block hashes under target difficulty using proof of work.",
    icon: "Hammer",
    color: "bg-amber-500/10 border-amber-500/50 text-amber-400",
  },
  {
    id: "badge_contract",
    title: "Solidity Apprentice",
    description: "Compiled and executed automated vending smart contracts.",
    icon: "Code",
    color: "bg-violet-500/10 border-violet-500/50 text-violet-400",
  },
  {
    id: "badge_defi",
    title: "DeFi Sultan",
    description: "Completed liquidity swaps using the constant product formula.",
    icon: "Coins",
    color: "bg-rose-500/10 border-rose-500/50 text-rose-400",
  },
  {
    id: "badge_oracle",
    title: "Oracle Seer",
    description: "Aggregated consensus-driven real-world price feeds on-chain.",
    icon: "Eye",
    color: "bg-cyan-500/10 border-cyan-500/50 text-cyan-400",
  },
  {
    id: "badge_l2",
    title: "Rollup Architect",
    description: "Bundled off-chain transactions to scale L2 rollup throughput.",
    icon: "Layers",
    color: "bg-indigo-500/10 border-indigo-500/50 text-indigo-400",
  },
  {
    id: "badge_dao",
    title: "DAO Senator",
    description: "Mobilized voting quorums and executed decentralized upgrades.",
    icon: "Scale",
    color: "bg-purple-500/10 border-purple-500/50 text-purple-400",
  },
];

export interface CosmeticTitle {
  title: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  description: string;
  color: string;
}

export const COSMETIC_TITLES: CosmeticTitle[] = [
  { 
    title: "Mempool Maverick", 
    rarity: "Common", 
    description: "Successfully master pending transaction queues.",
    color: "bg-slate-500/10 border-slate-500 text-slate-400"
  },
  { 
    title: "Gas Lord", 
    rarity: "Common", 
    description: "Slashes and optimizes gas fees with unmatched efficiency.",
    color: "bg-amber-500/10 border-amber-500 text-amber-400"
  },
  { 
    title: "ASIC Abominator", 
    rarity: "Rare", 
    description: "Mines block nonces faster than the hardware limit.",
    color: "bg-sky-500/10 border-sky-400 text-sky-400"
  },
  { 
    title: "Satoshi's Sentinel", 
    rarity: "Rare", 
    description: "Defender of the sacred 21,000,000 hard supply limit.",
    color: "bg-indigo-500/10 border-indigo-400 text-indigo-400"
  },
  { 
    title: "Smart Contract Samurai", 
    rarity: "Epic", 
    description: "Slices reentrancy bugs in Solidity before they reach mainnet.",
    color: "bg-violet-500/10 border-violet-400 text-violet-400"
  },
  { 
    title: "Zero-Knowledge Ninja", 
    rarity: "Epic", 
    description: "Proves mathematical statements without leaking any private details.",
    color: "bg-rose-500/10 border-rose-400 text-rose-400"
  },
  { 
    title: "Genesis Block Titan", 
    rarity: "Legendary", 
    description: "Casts high-consensus blocks that secure Blockchain Island.",
    color: "bg-yellow-500/10 border-yellow-400 text-yellow-300 font-bold"
  },
  { 
    title: "Web3 Overlord", 
    rarity: "Legendary", 
    description: "Exercises supreme power over liquidity and consensus layers.",
    color: "bg-fuchsia-500/10 border-fuchsia-400 text-fuchsia-300 font-bold"
  }
];

export default function Profile({ 
  userProfile, 
  onClaimQuest, 
  activeTheme, 
  onThemeChange,
  onUpdateProfile,
  onResetProgress,
  onRelaunchTour
}: ProfileProps) {
  const [editUsername, setEditUsername] = useState(userProfile.username);
  const [editAvatar, setEditAvatar] = useState(userProfile.avatar);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem("chainquest_sound_muted") === "true";
    } catch {
      return false;
    }
  });
  const [challengesDisabled, setChallengesDisabled] = useState(() => {
    try {
      return localStorage.getItem("chainquest_challenges_disabled") === "true";
    } catch {
      return false;
    }
  });

  // Auth states
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword) {
      setAuthError("Username and password are required.");
      return;
    }
    setAuthError(null);
    setAuthSuccess(null);
    setIsAuthLoading(true);

    try {
      const endpoint = authMode === "register" ? "/api/users/register" : "/api/users/login";
      const payload = authMode === "register" ? {
        username: authUsername.trim(),
        password: authPassword,
        avatar: userProfile.avatar,
        guestUserId: userProfile.userId,
        profile: {
          ...userProfile,
          username: authUsername.trim(),
          isRealUser: true,
          accountUsername: authUsername.trim(),
          accountPassword: authPassword,
        },
      } : {
        username: authUsername.trim(),
        password: authPassword,
        guestUserId: userProfile.userId,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Authentication failed.`);
      }

      playSound("level_up");
      setAuthSuccess(authMode === "register" ? "Account created successfully! Cloud auto-sync is active." : "Logged in successfully! Progress synchronized.");
      
      if (onUpdateProfile) {
        onUpdateProfile(data.profile.username, data.profile.avatar, {
          ...data.profile,
          isRealUser: true,
          accountUsername: authUsername.trim(),
          accountPassword: authPassword,
        });
      }
      
      setAuthUsername("");
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!userProfile.isRealUser || !userProfile.accountUsername || !userProfile.accountPassword) return;
    setIsSyncing(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const res = await fetch("/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: userProfile.accountUsername,
          password: userProfile.accountPassword,
          profile: userProfile,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to synchronize profile with the cloud.");
      }

      playSound("mission_complete");
      setAuthSuccess("Profile synced successfully with the cloud server! ✓");
    } catch (err: any) {
      setAuthError(err.message || "Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogOut = () => {
    playSound("click");
    if (onUpdateProfile) {
      onUpdateProfile(userProfile.username, userProfile.avatar, {
        isRealUser: false,
        accountUsername: undefined,
        accountPassword: undefined,
      });
    }
    setAuthSuccess("Logged out of cloud account. Session converted back to Guest.");
  };

  // Keep state in sync with userProfile updates
  useEffect(() => {
    setEditUsername(userProfile.username);
    setEditAvatar(userProfile.avatar);
  }, [userProfile.username, userProfile.avatar]);

  const [isRolling, setIsRolling] = useState(false);
  const [rollIndex, setRollIndex] = useState(0);
  const [revealedTitle, setRevealedTitle] = useState<CosmeticTitle | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const handleOpenLootbox = () => {
    if (isRolling) return;
    const count = userProfile.lootboxesCount || 0;
    if (count <= 0) return;

    setIsRolling(true);
    setRevealedTitle(null);
    setIsDuplicate(false);
    setTimeout(() => {
      playSound("click");
    }, 10);

    // Rapid selection animation simulation
    let currentTick = 0;
    const totalTicks = 15;
    const interval = setInterval(() => {
      setRollIndex(Math.floor(Math.random() * COSMETIC_TITLES.length));
      currentTick++;
      if (currentTick >= totalTicks) {
        clearInterval(interval);
        
        // Pick rarity
        const rand = Math.random();
        let targetRarity: "Common" | "Rare" | "Epic" | "Legendary" = "Common";
        if (rand < 0.08) targetRarity = "Legendary";
        else if (rand < 0.25) targetRarity = "Epic";
        else if (rand < 0.60) targetRarity = "Rare";
        
        const matchingTitles = COSMETIC_TITLES.filter(t => t.rarity === targetRarity);
        const selected = matchingTitles[Math.floor(Math.random() * matchingTitles.length)] || COSMETIC_TITLES[0];
        
        const unlocked = userProfile.unlockedTitles || ["Blockchain Explorer"];
        const alreadyHas = unlocked.includes(selected.title);
        
        const newUnlocked = alreadyHas ? unlocked : [...unlocked, selected.title];
        const newLootboxCount = count - 1;
        const rewardXp = alreadyHas ? 50 : 0;

        if (onUpdateProfile) {
          onUpdateProfile(userProfile.username, userProfile.avatar, {
            unlockedTitles: newUnlocked,
            activeTitle: selected.title,
            lootboxesCount: newLootboxCount,
            xp: rewardXp > 0 ? userProfile.xp + rewardXp : userProfile.xp,
          });
        }

        setRevealedTitle(selected);
        setIsDuplicate(alreadyHas);
        setIsRolling(false);
        setTimeout(() => {
          playSound("level_up");
        }, 10);
      }
    }, 100);
  };

  const handleEquipTitle = (titleName: string) => {
    setTimeout(() => {
      playSound("click");
    }, 10);
    if (onUpdateProfile) {
      onUpdateProfile(userProfile.username, userProfile.avatar, {
        activeTitle: titleName
      });
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      localStorage.setItem("chainquest_sound_muted", nextMuted ? "true" : "false");
    } catch {}
    if (!nextMuted) {
      setTimeout(() => playSound("click"), 50);
    }
  };

  const handleChallengesToggle = () => {
    const nextDisabled = !challengesDisabled;
    setChallengesDisabled(nextDisabled);
    try {
      localStorage.setItem("chainquest_challenges_disabled", nextDisabled ? "true" : "false");
    } catch {}
    // Dispatch custom event to let App.tsx know immediately without reload
    window.dispatchEvent(new Event("chainquest_challenges_changed"));
    setTimeout(() => playSound("click"), 10);
  };

  const handleIdentitySave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim()) return;
    if (onUpdateProfile) {
      onUpdateProfile(editUsername.trim(), editAvatar);
    }
  };

  // Get icon component dynamically based on badge icon name
  const getBadgeIcon = (name: string) => {
    switch (name) {
      case "Shield":
        return Shield;
      case "Zap":
        return Zap;
      case "Hammer":
        return Hammer;
      case "Code":
        return Code;
      case "Coins":
        return Coins;
      case "Eye":
        return Eye;
      case "Layers":
        return Layers;
      case "Scale":
        return Scale;
      default:
        return Award;
    }
  };

  // Determine current Title based on Level
  const getLevelTitle = (lvl: number) => {
    if (lvl < 2) return "Blockchain Explorer";
    if (lvl < 4) return "Smart Contract Builder";
    if (lvl < 6) return "Blockchain Architect";
    if (lvl < 8) return "DApp Overlord";
    return "Satoshi Successor";
  };

  // Calculate dynamic XP thresholds matching getLevelFromXp in cryptoSim.ts
  const getXpProgress = () => {
    const xp = userProfile.xp;
    const lvl = userProfile.level;
    
    let minXp = 0;
    let maxXp = 100;
    let isMaxLevel = false;

    if (lvl === 1) {
      minXp = 0;
      maxXp = 100;
    } else if (lvl === 2) {
      minXp = 100;
      maxXp = 250;
    } else if (lvl === 3) {
      minXp = 250;
      maxXp = 450;
    } else if (lvl === 4) {
      minXp = 450;
      maxXp = 700;
    } else if (lvl === 5) {
      minXp = 700;
      maxXp = 1000;
    } else if (lvl === 6) {
      minXp = 1000;
      maxXp = 1400;
    } else if (lvl === 7) {
      minXp = 1400;
      maxXp = 1900;
    } else {
      isMaxLevel = true;
      minXp = 1900;
      maxXp = 2500; // soft ceiling for level 8
    }

    const currentLevelProgressXp = xp - minXp;
    const totalXpNeededForLevel = maxXp - minXp;
    const percentage = isMaxLevel ? 100 : Math.min(100, Math.max(0, (currentLevelProgressXp / totalXpNeededForLevel) * 100));
    const remainingXp = isMaxLevel ? 0 : Math.max(0, maxXp - xp);

    return {
      percentage,
      remainingXp,
      maxXp,
      isMaxLevel
    };
  };

  const xpProgress = getXpProgress();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-100" id="user-profile-panel">
      {/* Col 1: Stats & Settings Panel */}
      <div className="space-y-6">
        {/* User stats card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col items-center text-center space-y-4 h-fit">
          {/* Avatar block */}
          <div className="relative">
            <motion.div
              animate={{
                y: [0, -6, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-5xl select-none inline-block pb-1"
            >
              {userProfile.avatar}
            </motion.div>
            <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-slate-900 shadow">
              LVL {userProfile.level}
            </span>
          </div>

          <div>
            <h3 className="font-bold text-lg tracking-tight text-white">{userProfile.username}</h3>
            <p className="text-xs text-indigo-400 font-mono mt-0.5">{userProfile.activeTitle || getLevelTitle(userProfile.level)}</p>
          </div>

          {/* XP & Level tracker */}
          <div className="w-full space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between text-slate-400">
              <span>LEVEL PROGRESS</span>
              <span className="text-white font-bold">{userProfile.completedLessons.length} / 8 Lessons</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${(userProfile.completedLessons.length / 8) * 100}%` }}
              />
            </div>
            {userProfile.completedLessons.length === 8 ? (
              <p className="text-right text-emerald-400 text-[9px] font-bold">★ ISLAND FULLY CONQUERED ★</p>
            ) : (
              <p className="text-right text-slate-500 text-[9px]">{8 - userProfile.completedLessons.length} lessons left to max level</p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 w-full border-t border-slate-850 pt-4">
            <div className="col-span-2 bg-slate-950/40 border border-slate-850 rounded-2xl p-3 flex flex-col items-center justify-center space-y-1.5">
              <span className="text-orange-500 font-extrabold text-xs flex items-center gap-1 uppercase tracking-wider">
                🔥 {userProfile.streak} Day Learning Streak
              </span>
              <div className="flex gap-1.5">
                {(() => {
                  const days = ["S", "M", "T", "W", "T", "F", "S"];
                  const todayIdx = new Date().getDay();
                  const status = Array(7).fill(false);
                  for (let i = 0; i < Math.min(userProfile.streak, 7); i++) {
                    const idx = (todayIdx - i + 7) % 7;
                    status[idx] = true;
                  }
                  return days.map((day, idx) => {
                    const isActive = status[idx];
                    const isToday = idx === todayIdx;
                    return (
                      <span 
                        key={idx}
                        className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-mono font-bold border transition-all ${
                          isActive 
                            ? "bg-gradient-to-tr from-orange-500 to-amber-400 border-orange-500 text-slate-950 shadow-sm shadow-orange-500/25"
                            : isToday
                              ? "bg-slate-900 border-indigo-500/50 text-indigo-400"
                              : "bg-slate-900/60 border-slate-850 text-slate-500"
                        }`}
                      >
                        {day}
                      </span>
                    );
                  });
                })()}
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Weekly Momentum</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-3 flex flex-col items-center justify-center space-y-1">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Total XP</span>
              <span className="text-white font-extrabold text-xs flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                ⭐ {userProfile.xp}
              </span>
            </div>
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-3 flex flex-col items-center justify-center space-y-1">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Lessons Cleared</span>
              <span className="text-white font-extrabold text-xs flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                ✅ {userProfile.completedLessons.length} / 8
              </span>
            </div>
          </div>

          {/* Join date info */}
          <p className="text-[10px] font-mono text-slate-600 flex items-center gap-1.5 pt-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Joined ChainQuest on {new Date(userProfile.joinedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Embedded Settings & Theme Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4 text-left">
          <h3 className="font-bold text-sm tracking-wider uppercase text-slate-400 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-400 animate-spin-slow" />
            My Settings
          </h3>

          <form onSubmit={handleIdentitySave} className="space-y-4">
            <div>
              <label className="block text-[9px] font-mono text-slate-500 mb-1.5 uppercase">Rename Username</label>
              <input
                type="text"
                required
                maxLength={15}
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono text-slate-500 mb-1.5 uppercase">Choose Character</label>
              <div className="grid grid-cols-4 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setEditAvatar(av)}
                    className={`text-2xl p-1.5 rounded-xl border transition-all ${
                      editAvatar === av
                        ? "bg-indigo-600/20 border-indigo-500 scale-105"
                        : "bg-slate-950/50 border-slate-850 hover:border-slate-800"
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={editUsername.trim() === userProfile.username && editAvatar === userProfile.avatar}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-mono font-bold text-xs py-2 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Identity
            </button>
          </form>

          {/* Theme customizer */}
          <div className="border-t border-slate-850 pt-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span>Theme Customizer</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "elegant-cyan", name: "Elegant Cyan", color: "bg-cyan-500" },
                { id: "cyber-green", name: "Cyber Green", color: "bg-green-500" },
                { id: "neon-purple", name: "Neon Purple", color: "bg-fuchsia-500" },
                { id: "amber-gold", name: "Amber Gold", color: "bg-amber-500" }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id as any)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                    activeTheme === t.id
                      ? "bg-indigo-600/10 border-indigo-500 text-white shadow-sm"
                      : "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.color}`} />
                  <span className="text-[10px] font-mono font-medium truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sounds and tour */}
          <div className="border-t border-slate-850 pt-4 grid grid-cols-2 gap-2">
            <button
              onClick={handleMuteToggle}
              className="flex items-center justify-center gap-1.5 p-2 bg-slate-950/40 border border-slate-850 rounded-xl hover:bg-slate-950 text-xs font-mono font-medium text-slate-400 hover:text-slate-200"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Muted</span>
                </>
              )}
            </button>
            <button
              onClick={onRelaunchTour}
              className="flex items-center justify-center gap-1.5 p-2 bg-slate-950/40 border border-slate-850 rounded-xl hover:bg-slate-950 text-xs font-mono font-medium text-slate-400 hover:text-slate-200"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Replay Tour</span>
            </button>
          </div>

          {/* Learning Experience Mode Selector */}
          <div className="border-t border-slate-850 pt-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Learning Experience Mode</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  if (onUpdateProfile) {
                    onUpdateProfile(userProfile.username, userProfile.avatar, { learningMode: "beginner" });
                  }
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  (userProfile.learningMode || "beginner") === "beginner"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-sm"
                    : "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono font-bold text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Beginner Mode</span>
                </div>
                <span className="text-[9px] text-slate-500 leading-normal">
                  Analogies, interactive flowcharts, progressive hints & glossary tools
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  if (onUpdateProfile) {
                    onUpdateProfile(userProfile.username, userProfile.avatar, { learningMode: "expert" });
                  }
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  userProfile.learningMode === "expert"
                    ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 shadow-sm"
                    : "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono font-bold text-[11px]">
                  <Code className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Expert Mode</span>
                </div>
                <span className="text-[9px] text-slate-500 leading-normal">
                  Clean interface, direct simulation, full-size workspace, zero hand-holding
                </span>
              </button>
            </div>
          </div>

          {/* Toggle Incoming Challenges */}
          <div className="border-t border-slate-850 pt-4">
            <button
              onClick={handleChallengesToggle}
              className={`w-full flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                challengesDisabled 
                  ? "bg-slate-950/20 border-slate-850 text-slate-500 hover:text-slate-400 hover:border-slate-800" 
                  : "bg-indigo-600/10 border-indigo-500/30 hover:border-indigo-500/50 text-indigo-400 hover:text-indigo-300"
              }`}
            >
              <Swords className={`w-3.5 h-3.5 ${challengesDisabled ? "text-slate-600" : "text-indigo-400"}`} />
              <span>{challengesDisabled ? "Random Duel Alerts: Muted" : "Random Duel Alerts: On"}</span>
            </button>
          </div>

          {/* Cloud Saving & Real Accounts */}
          <div className="border-t border-slate-850 pt-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              <Cloud className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real User Persistence</span>
            </div>

            {userProfile.isRealUser ? (
              <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono font-bold text-indigo-300">CLOUD ACCOUNT ACTIVE</p>
                      <p className="text-xs font-bold text-slate-200">@{userProfile.accountUsername}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                    SECURED
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 leading-normal">
                  Your XP, level, daily streak, completed quests, and badge achievements are auto-synced to the server in the background.
                </p>

                {authSuccess && (
                  <p className="text-[10px] text-emerald-400 font-mono bg-emerald-500/5 p-1.5 rounded border border-emerald-500/10">
                    {authSuccess}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-mono font-bold transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                  </button>
                  <button
                    onClick={handleLogOut}
                    className="flex items-center justify-center gap-1.5 p-2 bg-slate-950/40 border border-slate-800 hover:bg-slate-950 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-mono font-bold transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-3">
                <div className="flex gap-1 p-1 bg-slate-950 border border-slate-850 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`flex-1 py-1 px-2 rounded-lg font-mono font-bold transition-all ${
                      authMode === "register" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`flex-1 py-1 px-2 rounded-lg font-mono font-bold transition-all ${
                      authMode === "login" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Log In
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-2.5">
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {authMode === "register" 
                      ? "Create an account to backup your progress. Your current Guest stats will automatically merge!"
                      : "Sign in to synchronize your previously saved Cloud progress back to this browser."
                    }
                  </p>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Enter Username"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans placeholder:text-slate-600"
                    />
                    <input
                      type="password"
                      placeholder="Enter Password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans placeholder:text-slate-600"
                    />
                  </div>

                  {authError && (
                    <p className="text-[10px] text-rose-400 font-mono bg-rose-500/5 p-1.5 rounded border border-rose-500/10">
                      ⚠️ {authError}
                    </p>
                  )}
                  {authSuccess && (
                    <p className="text-[10px] text-emerald-400 font-mono bg-emerald-500/5 p-1.5 rounded border border-emerald-500/10">
                      {authSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-md"
                  >
                    {authMode === "register" ? (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isAuthLoading ? "Creating..." : "Create Cloud Profile"}</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{isAuthLoading ? "Signing In..." : "Sign In to Profile"}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Reset progress */}
          <div className="border-t border-slate-850 pt-4">
            <button
              onClick={onResetProgress}
              className="w-full flex items-center justify-center gap-1.5 p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 text-xs font-mono font-bold text-rose-400 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Reset All Progress</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Panels (Badge Cabinet & Achievements) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Badge Cabinet */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850/60 pb-3 flex-wrap gap-2">
            <h3 className="font-bold text-sm tracking-wider uppercase text-slate-400 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              BADGE CABINET
            </h3>
            <span className="text-[10px] font-mono text-amber-400 border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 rounded-full shrink-0 font-bold">
              🏅 {BADGES.filter((b) => userProfile.earnedBadges.includes(b.id)).length} / {BADGES.length} UNLOCKED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
            {BADGES.map((badge) => {
              const hasBadge = userProfile.earnedBadges.includes(badge.id);
              const BadgeIcon = getBadgeIcon(badge.icon);
              const districtName = getDistrictForBadge(badge.id);

              return (
                <div
                  key={badge.id}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all duration-300 ease-out transform relative overflow-hidden ${
                    hasBadge
                      ? badge.color + " shadow-md hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-950/40 cursor-pointer"
                      : "bg-slate-950/25 border-slate-850/40 opacity-45 grayscale hover:-translate-y-0.5"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 relative ${
                    hasBadge ? "border-current bg-white/5" : "border-slate-850 text-slate-600 bg-slate-950/40"
                  }`}>
                    <BadgeIcon className="w-6 h-6 stroke-[1.5]" />
                    {!hasBadge && (
                      <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-800 p-0.5 rounded-full text-slate-500">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs text-slate-200 truncate">{badge.title}</h4>
                      <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-md ${
                        hasBadge 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                          : "bg-slate-950/40 text-slate-500 border border-slate-850/60"
                      }`}>
                        {hasBadge ? "Earned" : "Locked"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5 line-clamp-2">
                      {badge.description}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                      <span>📍</span> <span className="truncate">{districtName}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STREAK LOOTBOX & TITLE COSMETICS PANEL */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-6">
          <div className="flex justify-between items-center border-b border-slate-850 pb-4">
            <div>
              <h3 className="font-bold text-sm tracking-wider uppercase text-slate-400 flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-400" />
                STREAK LOOTBOXES & COSMETIC TITLES
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Maintain consecutive learning streaks or clear daily missions to earn lootboxes. Open them to unlock rare cosmetic title banners!
              </p>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 text-center font-mono shrink-0">
              <span className="text-indigo-400 font-extrabold text-xs">{(userProfile.unlockedTitles || ["Blockchain Explorer"]).length}</span>
              <span className="text-[9px] text-slate-500 ml-1">/ {COSMETIC_TITLES.length + 1} TITLES</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left: Lootbox interactive roller (2 cols) */}
            <div className="md:col-span-2 flex flex-col justify-between bg-slate-950/40 border border-slate-850 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient(circle, rgba(99,102,241,0.05)_0%, transparent_100%) pointer-events-none" />
              
              <div className="text-center space-y-3 z-10 py-2">
                <span className="text-[9px] font-mono tracking-wider font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase">
                  Streak Reward Station
                </span>
                
                {/* Visual Chest Box with different states */}
                <div className="h-32 flex items-center justify-center relative select-none">
                  {isRolling ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.15, 1],
                        rotate: [0, -10, 10, -10, 10, 0],
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="text-7xl cursor-wait"
                    >
                      🎁
                    </motion.div>
                  ) : revealedTitle ? (
                    <motion.div
                      initial={{ scale: 0.5, y: 10, opacity: 0 }}
                      animate={{ scale: 1.1, y: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 120 }}
                      className="flex flex-col items-center space-y-2 cursor-pointer"
                      onClick={() => setRevealedTitle(null)}
                    >
                      <span className="text-7xl drop-shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-bounce">👑</span>
                      <div className="text-[10px] font-mono font-extrabold uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                        {isDuplicate ? "Duplicate Reward" : "New Unlocked!"}
                      </div>
                    </motion.div>
                  ) : (userProfile.lootboxesCount || 0) > 0 ? (
                    <motion.div
                      animate={{
                        y: [0, -4, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="text-7xl cursor-pointer hover:scale-105 transition-transform"
                      onClick={handleOpenLootbox}
                    >
                      🎁
                    </motion.div>
                  ) : (
                    <div className="text-7xl opacity-30 grayscale filter">
                      📦
                    </div>
                  )}

                  {/* Gold sparkles / particle rings if rolling or revealed */}
                  {(isRolling || revealedTitle) && (
                    <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-xl animate-pulse" />
                  )}
                </div>

                {/* Display message based on status */}
                <div className="space-y-1 min-h-[48px] flex flex-col justify-center">
                  {isRolling ? (
                    <div>
                      <p className="text-[10px] font-mono text-indigo-400 font-extrabold uppercase animate-pulse">ROLLING TITLE...</p>
                      <p className="text-xs font-bold text-white tracking-wide">{COSMETIC_TITLES[rollIndex].title}</p>
                    </div>
                  ) : revealedTitle ? (
                    <div>
                      <p className={`text-[10px] font-mono font-extrabold uppercase ${
                        revealedTitle.rarity === "Legendary" ? "text-yellow-400" :
                        revealedTitle.rarity === "Epic" ? "text-fuchsia-400" :
                        revealedTitle.rarity === "Rare" ? "text-sky-400" : "text-slate-400"
                      }`}>
                        {revealedTitle.rarity} TITLE BANNER
                      </p>
                      <h4 className="text-sm font-bold text-white tracking-wide">{revealedTitle.title}</h4>
                      {isDuplicate ? (
                        <p className="text-[9px] font-mono text-amber-400 mt-1">Already unlocked! Converted to <strong className="text-white">+50 XP</strong> bonus! ⚡</p>
                      ) : (
                        <p className="text-[9px] font-mono text-emerald-400 mt-1">Successfully equipped as your active Title!</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-300 font-medium">
                        {(userProfile.lootboxesCount || 0) > 0 
                          ? `You have ${(userProfile.lootboxesCount || 0)} streak lootboxes ready!`
                          : "No lootboxes available right now."
                        }
                      </p>
                      <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                        {(userProfile.lootboxesCount || 0) > 0 
                          ? "Tap the package above or click below to open!"
                          : "Complete more daily missions to unlock additional boxes!"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-850/60 mt-auto">
                <button
                  disabled={isRolling || !(userProfile.lootboxesCount || 0)}
                  onClick={handleOpenLootbox}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-mono font-bold text-xs py-2 rounded-xl transition-all shadow-md shadow-indigo-600/10 disabled:opacity-30 disabled:cursor-not-allowed uppercase flex items-center justify-center gap-1.5"
                >
                  <Gift className="w-4 h-4" />
                  {isRolling ? "Opening Chest..." : `Open Lootbox (${userProfile.lootboxesCount || 0})`}
                </button>
              </div>
            </div>

            {/* Right: Titles selection list (3 cols) */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                My Unlocked Titles Catalog
              </h4>
              
              <div className="grid grid-cols-1 gap-2 max-h-[224px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-900">
                {/* Default Title */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                  (userProfile.activeTitle || "Blockchain Explorer") === "Blockchain Explorer"
                    ? "bg-indigo-600/10 border-indigo-500 text-white shadow-sm"
                    : "bg-slate-950/20 border-slate-850 text-slate-400"
                }`}>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] font-mono font-extrabold uppercase text-slate-500 tracking-wider">Default Common</span>
                    <span className="text-xs font-bold text-slate-200">Blockchain Explorer</span>
                    <span className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">A novice student of Blockchain Island.</span>
                  </div>
                  <div className="shrink-0">
                    {(userProfile.activeTitle || "Blockchain Explorer") === "Blockchain Explorer" ? (
                      <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-2 py-1 rounded-lg">ACTIVE</span>
                    ) : (
                      <button
                        onClick={() => handleEquipTitle("Blockchain Explorer")}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-mono font-bold text-slate-300 px-2 py-1 rounded-lg transition-all"
                      >
                        EQUIP
                      </button>
                    )}
                  </div>
                </div>

                {COSMETIC_TITLES.map((t) => {
                  const unlocked = (userProfile.unlockedTitles || []).includes(t.title);
                  const active = userProfile.activeTitle === t.title;

                  return (
                    <div
                      key={t.title}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        active
                          ? "bg-indigo-600/15 border-indigo-500 text-white shadow-sm"
                          : unlocked
                          ? "bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-800"
                          : "bg-slate-950/10 border-slate-850/40 text-slate-500 opacity-50 select-none"
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span className={`text-[8px] font-mono font-extrabold uppercase tracking-wider ${
                          t.rarity === "Legendary" ? "text-yellow-400" :
                          t.rarity === "Epic" ? "text-fuchsia-400" :
                          t.rarity === "Rare" ? "text-sky-400" : "text-slate-400"
                        }`}>{t.rarity} Title</span>
                        <span className="text-xs font-bold text-slate-200">{t.title}</span>
                        <span className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">{t.description}</span>
                      </div>

                      <div className="shrink-0 ml-3">
                        {unlocked ? (
                          active ? (
                            <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-2 py-1 rounded-lg flex items-center gap-0.5">
                              <Check className="w-3 h-3 text-indigo-400" /> ACTIVE
                            </span>
                          ) : (
                            <button
                              onClick={() => handleEquipTitle(t.title)}
                              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-mono font-bold text-slate-300 px-2 py-1 rounded-lg transition-all"
                            >
                              EQUIP
                            </button>
                          )
                        ) : (
                          <span className="text-[9px] font-mono text-slate-600 flex items-center gap-0.5 bg-slate-950/60 border border-slate-850 px-2 py-1 rounded-lg">
                            <Lock className="w-2.5 h-2.5" /> LOCKED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Quest Achievements Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm tracking-wider uppercase text-slate-400 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-400" />
              BONUS MILESTONES & ACHIEVEMENTS
            </h3>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-850">
              {userProfile.completedQuests?.length || 0} / {BONUS_QUESTS.length} CLAIMED
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-900 pr-1">
            {BONUS_QUESTS.map((quest) => {
              const isEligible = userProfile.completedLessons.includes(quest.requiredZone);
              const isClaimed = userProfile.completedQuests?.includes(quest.id) || false;

              return (
                <div
                  key={quest.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
                    isClaimed
                      ? "bg-slate-950/60 border-emerald-500/20 text-slate-400 opacity-70"
                      : isEligible
                      ? "bg-indigo-600/5 border-indigo-500/30 text-white shadow-md shadow-indigo-500/5"
                      : "bg-slate-950/20 border-slate-850 text-slate-500"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                      isClaimed
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                        : isEligible
                        ? "bg-indigo-500/20 border-indigo-400 text-indigo-400 animate-pulse"
                        : "bg-slate-950 border-slate-850 text-slate-600"
                    }`}>
                      {isClaimed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isEligible ? (
                        <Gift className="w-5 h-5" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                        {quest.title}
                        <span className="text-[10px] bg-slate-950/80 border border-slate-850 px-2 py-0.5 rounded font-mono font-bold text-indigo-400">
                          +{quest.xpReward} XP
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">{quest.description}</p>
                    </div>
                  </div>

                  {/* Claim Button action trigger */}
                  <div className="shrink-0 self-end sm:self-auto">
                    {isClaimed ? (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                        CLAIMED
                      </span>
                    ) : isEligible ? (
                      <button
                        onClick={() => onClaimQuest(quest.id, quest.xpReward)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-[10px] tracking-wider px-4 py-1.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1 hover:scale-105"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        CLAIM BONUS
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <Lock className="w-3 h-3" /> LOCKED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
