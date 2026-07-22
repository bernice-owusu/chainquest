import React, { useState, useEffect } from "react";
import { UserProfile, Competitor, ActiveDuelItem } from "../types";
import { Trophy, Medal, Star, Flame, Award, Shield, Cpu, RefreshCw, Swords, Clock, Hourglass } from "lucide-react";
import { getLevelFromXp } from "../utils/cryptoSim";
import ChallengeModal from "./ChallengeModal";
import { playSound } from "../utils/audio";
import { useToast } from "./Toast";

interface LeaderboardProps {
  userProfile: UserProfile;
  onUpdateXP: (xpAmount: number) => void;
  onResolveDuel?: (duelId: string, xpChange: number) => void;
}

export default function Leaderboard({ userProfile, onUpdateXP, onResolveDuel }: LeaderboardProps) {
  const { showToast } = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [realUsers, setRealUsers] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [resolvingDuel, setResolvingDuel] = useState<ActiveDuelItem | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ mode: "firestore" | "local"; projectId: string | null }>({
    mode: "local",
    projectId: null,
  });

  const fetchDbStatus = () => {
    fetch("/api/db-status")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setDbStatus({
            mode: data.mode,
            projectId: data.projectId,
          });
        }
      })
      .catch((err) => console.error("Error fetching DB status:", err));
  };

  const fetchLeaderboard = () => {
    setIsRefreshing(true);
    fetch(`/api/users/leaderboard?_t=${Date.now()}`, {
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.leaderboard) {
          // Precise filter: filter out our own user (both guest and registered profiles) using unique IDs & usernames
          const filtered = data.leaderboard.filter((u: any) => {
            if (u.id === "user") return false;
            if (userProfile.userId && (u.id === userProfile.userId || u.id === `guest_${userProfile.userId}`)) {
              return false;
            }
            if (userProfile.isRealUser && userProfile.accountUsername && u.id.toLowerCase() === userProfile.accountUsername.toLowerCase()) {
              return false;
            }
            const uName = (u.username || "").toLowerCase();
            const myName = (userProfile.username || "").toLowerCase();
            const myAccountName = (userProfile.accountUsername || "").toLowerCase();
            if (uName === myName || (myAccountName && uName === myAccountName)) {
              return false;
            }
            return true;
          });

          // Deduplicate competitors by username
          const seen = new Set<string>();
          const deduped: Competitor[] = [];
          for (const item of filtered) {
            const key = item.username.trim().toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(item);
            }
          }

          setRealUsers(deduped);
        }
      })
      .catch((err) => console.error("Error fetching real leaderboard accounts:", err))
      .finally(() => {
        setTimeout(() => setIsRefreshing(false), 600);
      });
  };

  useEffect(() => {
    fetchDbStatus();
    fetchLeaderboard();
    
    // Automatically poll every 10 seconds so new registrations and score changes are visible in real-time
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [userProfile.username, userProfile.accountUsername, userProfile.xp, userProfile.completedLessons]);

  useEffect(() => {
    // Generate competitors and add user to the list
    const userCompetitor: Competitor = {
      id: "user",
      username: userProfile.username + " (You)",
      avatar: userProfile.avatar,
      xp: userProfile.xp,
      level: userProfile.level,
      title: userProfile.level < 2 ? "Blockchain Explorer" : userProfile.level < 4 ? "Smart Contract Builder" : "Blockchain Architect",
      isUser: true,
    };

    setCompetitors([...realUsers, userCompetitor].sort((a, b) => b.xp - a.xp));
  }, [userProfile, realUsers]);

  // No client-side simulated opponent XP updates to keep the leaderboard strictly real-time and synchronized with actual user progress!

  const getRankBadge = (idx: number) => {
    switch (idx) {
      case 0:
        return <Medal className="w-5 h-5 text-yellow-400 fill-yellow-400/10" />;
      case 1:
        return <Medal className="w-5 h-5 text-slate-300 fill-slate-300/10" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-600 fill-amber-600/10" />;
      default:
        return <span className="font-mono text-xs text-slate-500 font-bold pl-1.5">{idx + 1}</span>;
    }
  };

  const handleChallenge = (comp: Competitor) => {
    playSound("click");
    const todayStr = new Date().toISOString().split("T")[0];
    const dailyCount = userProfile.lastDuelDate === todayStr ? (userProfile.dailyDuelsCount || 0) : 0;
    if (dailyCount >= 3) {
      showToast("Daily limit reached! ⚔️", "error", "You have already completed 3 duels today. Come back tomorrow!");
      return;
    }
    setSelectedCompetitor(comp);
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const dailyCount = userProfile.lastDuelDate === todayStr ? (userProfile.dailyDuelsCount || 0) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4" id="leaderboard-panel">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-sm tracking-wider uppercase text-slate-400 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          GLOBAL COMPETITION LEADERBOARD
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={fetchLeaderboard}
            disabled={isRefreshing}
            className="text-[9px] font-mono text-slate-300 hover:text-white hover:border-slate-500 border border-slate-800 bg-slate-950 px-2 py-1 rounded-lg flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
            {isRefreshing ? "SYNCING..." : "REFRESH"}
          </button>
          {dbStatus.mode === "firestore" ? (
            <span className="text-[9px] font-mono text-purple-400 border border-purple-500/20 bg-purple-500/10 px-2 py-1 rounded-lg flex items-center gap-1" title={`Connected to Google Cloud Firestore (Project: ${dbStatus.projectId})`}>
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" /> CLOUD FIRESTORE
            </span>
          ) : (
            <span className="text-[9px] font-mono text-red-400 border border-red-500/20 bg-red-500/10 px-2 py-1 rounded-lg flex items-center gap-1" title="Firestore configuration/connection error. Please check environment credentials.">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" /> FIRESTORE ERROR
            </span>
          )}
          <span className="text-[9px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> LIVE
          </span>
          <span className={`text-[9px] font-mono px-2 py-1 rounded-lg border flex items-center gap-1 ${
            dailyCount >= 3 
              ? "text-red-400 border-red-500/20 bg-red-500/10" 
              : "text-indigo-400 border-indigo-500/20 bg-indigo-500/10"
          }`}>
            ⚔️ DUELS: {dailyCount}/3
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Compete in real-time against other global builders on the island! Earn XP in quests and sandbox mining to rise to the top.
      </p>

      {/* Pending / Saved Duels to Resolve */}
      {userProfile.activeDuels && userProfile.activeDuels.length > 0 && (
        <div className="bg-slate-950 border border-indigo-500/20 rounded-2xl p-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black tracking-wider uppercase text-indigo-400 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-indigo-400" />
              ACCEPTED DUELS TO RESOLVE ({userProfile.activeDuels.length})
            </h4>
            <span className="text-[9px] font-mono text-slate-500">RESOLVE FOR XP STAKES</span>
          </div>
          
          <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-thin pr-1">
            {userProfile.activeDuels.map((duel) => (
              <div 
                key={duel.id}
                className="bg-indigo-950/10 border border-indigo-500/10 hover:border-indigo-500/30 p-3 rounded-xl flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{duel.competitor.avatar}</span>
                  <div className="text-left">
                    <h5 className="text-xs font-bold text-slate-200 leading-none">
                      {duel.competitor.username}
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                      <span className="text-indigo-400 font-bold">
                        {duel.challengeType === "quiz" ? "🛡️ Bug Hunt" : "⚡ Hash Race"}
                      </span>
                      • Lvl {duel.competitor.level}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const dailyCount = userProfile.lastDuelDate === todayStr ? (userProfile.dailyDuelsCount || 0) : 0;
                    if (dailyCount >= 3) {
                      playSound("click");
                      showToast("Daily limit reached! ⚔️", "error", "You have already completed 3 duels today. Come back tomorrow!");
                      return;
                    }
                    playSound("click");
                    setResolvingDuel(duel);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white text-[10px] font-black rounded-lg font-mono tracking-wider transition-all active:scale-95 cursor-pointer"
                >
                  RESOLVE DUEL
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranks list */}
      <div className="space-y-1.5 max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-900 pr-1">
        {competitors.map((comp, idx) => (
          <div
            key={comp.id}
            className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
              comp.isUser
                ? "bg-indigo-600/10 border-indigo-500/40 shadow-indigo-500/5 shadow-md"
                : "bg-slate-950/20 border-slate-850 hover:border-slate-800"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Rank column */}
              <div className="w-6 flex items-center justify-center shrink-0">
                {getRankBadge(idx)}
              </div>

              {/* Avatar */}
              <span className="text-2xl shrink-0">{comp.avatar}</span>

              {/* Details */}
              <div>
                <h4 className={`text-xs font-bold leading-none ${comp.isUser ? "text-indigo-300 font-extrabold" : "text-slate-200"}`}>
                  {comp.username}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">{comp.title} (Lvl {comp.level})</p>
              </div>
            </div>

            {/* Score & Action Buttons */}
            <div className="flex items-center gap-3">
              <div className="text-right font-mono text-xs">
                <span className="text-slate-100 font-bold">{comp.xp}</span>
                <span className="text-[10px] text-slate-500 ml-1">XP</span>
              </div>

              {!comp.isUser && (
                <button
                  onClick={() => handleChallenge(comp)}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-red-600/90 to-indigo-600/90 hover:from-red-500 hover:to-indigo-500 text-white text-[10px] font-extrabold rounded-lg font-mono tracking-wider flex items-center gap-1 transition-all shadow-md active:scale-95 cursor-pointer"
                  title={`Challenge ${comp.username} to a Cryptographic Duel`}
                >
                  <Swords className="w-3 h-3" /> DUEL
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Challenge Modal Overlay */}
      {selectedCompetitor && (
        <ChallengeModal
          competitor={selectedCompetitor}
          userProfile={userProfile}
          onClose={() => setSelectedCompetitor(null)}
          onUpdateXP={onUpdateXP}
        />
      )}

      {resolvingDuel && (
        <ChallengeModal
          competitor={resolvingDuel.competitor}
          userProfile={userProfile}
          initialState={resolvingDuel.challengeType === "quiz" ? "playing_quiz" : "playing_race"}
          incomingDuelType={resolvingDuel.challengeType}
          duelId={resolvingDuel.id}
          challengerScore={resolvingDuel.challengerScore}
          onResolveDuel={(duelId, xpChange) => {
            if (onResolveDuel) {
              onResolveDuel(duelId, xpChange);
            } else {
              onUpdateXP(xpChange);
            }
          }}
          onClose={() => setResolvingDuel(null)}
          onUpdateXP={onUpdateXP}
        />
      )}
    </div>
  );
}
