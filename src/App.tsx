import React, { useState, useEffect } from "react";
import { 
  Compass, Cpu, Trophy, User, Sparkles, Flame, Coins, ShieldAlert, BookOpen, AlertCircle, RefreshCw, X, ChevronRight, HelpCircle, LogOut, Award, Settings, Cloud
} from "lucide-react";
import WorldMap, { ZONES } from "./components/WorldMap";
import Lessons from "./components/Lessons";
import Leaderboard from "./components/Leaderboard";
import Profile, { BADGES } from "./components/Profile";
import AIAdvisor from "./components/AIAdvisor";
import GuidedTour from "./components/GuidedTour";
import DailyMissions from "./components/DailyMissions";
import { generateDailyMissions } from "./utils/missionGenerator";
import { playSound } from "./utils/audio";
import { getLevelFromXp } from "./utils/cryptoSim";
import { UserProfile, Competitor, ActiveDuelItem } from "./types";
import { motion, AnimatePresence } from "motion/react";
import ChallengeModal from "./components/ChallengeModal";
import { useToast } from "./components/Toast";
import confetti from "canvas-confetti";

const LOCAL_STORAGE_KEY = "chainquest_user_profile_v1";

const AVATARS = ["🧙‍♂️", "🦊", "🤖", "🚀", "🦄", "👾", "👨‍💻", "👩‍💻"];

export function getCurrentWeekDates(): string[] {
  const dates = [];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    dates.push(day.toISOString().split("T")[0]);
  }
  return dates;
}

export function getWeeklyStreakStatus(streak: number, weeklyActivity?: string[]) {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date();
  const todayIdx = today.getDay(); // 0-6
  const status = Array(7).fill(false);
  
  const currentWeek = getCurrentWeekDates();
  
  for (let i = 0; i < 7; i++) {
    const dateStr = currentWeek[i];
    if (weeklyActivity && weeklyActivity.includes(dateStr)) {
      status[i] = true;
    } else {
      // Fallback
      const daysDiff = todayIdx - i;
      if (daysDiff >= 0 && daysDiff < streak) {
        status[i] = true;
      }
    }
  }
  
  const isPerfectStreak = status.every((v) => v === true);
  return { days, status, todayIdx, isPerfectStreak };
}

export default function App() {
  const { showToast } = useToast();
  // Main app states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isNewUserModal, setIsNewUserModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [avatarInput, setAvatarInput] = useState(AVATARS[0]);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  const [activeTab, setActiveTab] = useState<"map" | "leaderboard" | "profile">("map");
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"workspace" | "tutor">("workspace");
  const [celebration, setCelebration] = useState<{ title: string; desc: string; xpBonus: number; badgeName?: string } | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Incoming duel states
  const [incomingChallenge, setIncomingChallenge] = useState<{
    id: string;
    competitor: Competitor;
    challengeType: "quiz" | "race";
    challengerScore: number;
  } | null>(null);

  const [activeDuel, setActiveDuel] = useState<{
    competitor: Competitor;
    initialState: "playing_quiz" | "playing_race";
    incomingDuelType: "quiz" | "race";
    duelId?: string;
    challengerScore?: number;
  } | null>(null);

  const [theme, setTheme] = useState<"elegant-cyan" | "cyber-green" | "neon-purple" | "amber-gold">(() => {
    try {
      return (localStorage.getItem("satoshi_active_theme") as any) || "elegant-cyan";
    } catch {
      return "elegant-cyan";
    }
  });

  const [challengesDisabled, setChallengesDisabled] = useState(() => {
    try {
      return localStorage.getItem("chainquest_challenges_disabled") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleChallengesChange = () => {
      try {
        setChallengesDisabled(localStorage.getItem("chainquest_challenges_disabled") === "true");
      } catch {}
    };
    window.addEventListener("chainquest_challenges_changed", handleChallengesChange);
    return () => {
      window.removeEventListener("chainquest_challenges_changed", handleChallengesChange);
    };
  }, []);

  // Real-time Firestore Duel Polling Effect
  useEffect(() => {
    if (!profile) return;
    const dbId = profile.isRealUser && profile.accountUsername
      ? profile.accountUsername.trim().toLowerCase()
      : `guest_${profile.userId}`;

    // Helper to fetch pending duels
    const checkPendingDuels = () => {
      fetch(`/api/duels/pending?targetId=${dbId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.duels && data.duels.length > 0) {
            // Pick the first pending duel to alert the user!
            const firstDuel = data.duels[0];
            
            // Check if we already have a popup open, or if we declined it or muted alerts
            if (!incomingChallenge && !activeDuel && !challengesDisabled) {
              const competitor: Competitor = {
                id: firstDuel.challengerId,
                username: firstDuel.challengerName,
                avatar: firstDuel.challengerAvatar || "👨‍💻",
                xp: 0,
                level: 1,
                title: "Blockchain Explorer"
              };
              
              setIncomingChallenge({
                id: firstDuel.id,
                competitor,
                challengeType: firstDuel.challengeType,
                challengerScore: firstDuel.challengerScore
              });
              
              playSound("level_up");
            }
          }
        })
        .catch(err => console.error("Error polling pending duels:", err));
    };

    // Helper to fetch completed duels (to show results)
    const checkCompletedDuels = () => {
      fetch(`/api/duels/results?userId=${dbId}`)
        .then(res => res.json())
        .then(data => {
          const list = data.completedDuels || data.duels;
          if (data.success && list && list.length > 0) {
            // Find completed duels that the user has not acknowledged yet
            const unacknowledged = list.filter((d: any) => {
              const acknowledgedBy = d.acknowledgedBy || [];
              return !acknowledgedBy.includes(dbId);
            });

            if (unacknowledged.length > 0) {
              const latest = unacknowledged[0];
              const isWinner = latest.winnerId === dbId;
              const isTie = latest.winnerId === null || latest.winnerId === "Tie";
              
              // Show notification toast & popup
              playSound(isWinner ? "level_up" : "click");
              
              const opponentName = latest.challengerId === dbId ? (latest.targetName || latest.targetId) : latest.challengerName;
              const typeLabel = latest.challengeType === "quiz" ? "Bug Hunt (Quiz)" : "Hash Race";
              const title = isWinner ? "🏆 DUEL VICTORY!" : isTie ? "🤝 DUEL TIE MATCH!" : "⚔️ DUEL DEFEAT";
              const desc = isWinner
                ? `Fantastic job! Your duel against ${opponentName} in ${typeLabel} has been resolved! You won and secured XP stakes!`
                : isTie
                ? `Well played! Your duel against ${opponentName} in ${typeLabel} ended in a tie!`
                : `You fought well! Your duel against ${opponentName} in ${typeLabel} is complete. They secured the victory.`;

              setCelebration({
                title,
                desc,
                xpBonus: isWinner ? 50 : isTie ? 15 : -15,
              });

              // Apply the XP change locally
              const change = isWinner ? 50 : isTie ? 15 : -15;
              handleUpdateXP(change);

              // Immediately mark as acknowledged on the backend so it doesn't poll again!
              fetch("/api/duels/acknowledge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  duelId: latest.id,
                  userId: dbId
                })
              }).catch(e => console.error("Error acknowledging duel:", e));
            }
          }
        })
        .catch(err => console.error("Error polling duel results:", err));
    };

    // Initial check
    checkPendingDuels();
    checkCompletedDuels();

    // Poll every 8 seconds
    const interval = setInterval(() => {
      checkPendingDuels();
      checkCompletedDuels();
    }, 8000);

    return () => clearInterval(interval);
  }, [profile, incomingChallenge, activeDuel, challengesDisabled]);

  // Network connection status listener for offline mode notifications
  useEffect(() => {
    const handleOffline = () => {
      showToast(
        "Working Offline 📡",
        "info",
        "Network connection lost. Your quest progress & XP are preserved locally.",
        5000
      );
    };

    const handleOnline = () => {
      showToast(
        "Back Online! ⚡",
        "success",
        "Network connection restored. Syncing local state with ChainQuest servers.",
        4000
      );
    };

    if (typeof window !== "undefined" && !navigator.onLine) {
      handleOffline();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [showToast]);

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-cyber-green", "theme-neon-purple", "theme-amber-gold");
    if (theme !== "elegant-cyan") {
      root.classList.add(`theme-${theme}`);
    }
    try {
      localStorage.setItem("satoshi_active_theme", theme);
    } catch {}
  }, [theme]);

  // Trigger audio and default mobile tab on tutor open
  useEffect(() => {
    if (isTutorOpen) {
      playSound("ai_open");
      setDrawerTab("tutor");
    } else {
      setDrawerTab("workspace");
    }
  }, [isTutorOpen]);

  // Play subtle feedback click sound on activeTab change
  useEffect(() => {
    playSound("click");
  }, [activeTab]);

  // Auto pop-up Satoshi AI when a quest workspace is opened
  useEffect(() => {
    if (activeZoneId) {
      setIsTutorOpen(true);
    }
  }, [activeZoneId]);

  // Confetti effect on level up/milestone celebration
  useEffect(() => {
    if (celebration) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [celebration]);

  // Load profile from localStorage on start
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserProfile;
        const currentDateStr = new Date().toISOString().split("T")[0];
        let changed = false;
        
        // Recalculate level based on completed lessons
        const calculatedLvl = Math.max(1, 1 + (parsed.completedLessons || []).length);
        if (parsed.level !== calculatedLvl) {
          parsed.level = calculatedLvl;
          changed = true;
        }

        // Maintain weeklyActivity dates
        const currentWeek = getCurrentWeekDates();
        const activity = parsed.weeklyActivity || [];
        if (!activity.includes(currentDateStr)) {
          const newActivity = Array.from(new Set([...activity, currentDateStr]))
            .filter((d) => d >= currentWeek[0]);
          parsed.weeklyActivity = newActivity;
          changed = true;
        } else {
          const filtered = activity.filter((d) => d >= currentWeek[0]);
          if (filtered.length !== activity.length) {
            parsed.weeklyActivity = filtered;
            changed = true;
          }
        }

        if (!parsed.dailyMissions || parsed.lastMissionsDate !== currentDateStr) {
          parsed.dailyMissions = generateDailyMissions(calculatedLvl);
          parsed.lastMissionsDate = currentDateStr;
          // Award a bonus lootbox for maintaining/starting a new day streak
          parsed.lootboxesCount = (parsed.lootboxesCount || 0) + 1;
          changed = true;
        }

        if (!parsed.unlockedTitles) {
          parsed.unlockedTitles = ["Blockchain Explorer"];
          changed = true;
        }
        if (!parsed.activeTitle) {
          parsed.activeTitle = "Blockchain Explorer";
          changed = true;
        }
        if (parsed.lootboxesCount === undefined) {
          parsed.lootboxesCount = 2;
          changed = true;
        }
        if (!parsed.userId) {
          parsed.userId = "user_" + Math.random().toString(36).substring(2, 11);
          changed = true;
        }

        if (changed) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
        }
        setProfile(parsed);

        // Background sync refresh on startup to automatically recognize and update real users
        if (parsed.isRealUser && parsed.accountUsername && parsed.accountPassword) {
          fetch("/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: parsed.accountUsername,
              password: parsed.accountPassword,
            }),
          })
            .then((res) => {
              if (res.ok) return res.json();
              throw new Error("Failed background auth refresh");
            })
            .then((data) => {
              if (data.success && data.profile) {
                // Merge remote profile but preserve active credentials
                const refreshedProfile = {
                  ...data.profile,
                  accountUsername: parsed.accountUsername,
                  accountPassword: parsed.accountPassword,
                  isRealUser: true,
                };
                setProfile(refreshedProfile);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(refreshedProfile));
                console.log("[ChainQuest] Auto-recognized user and synced remote progress on load.");
              }
            })
            .catch((err) => {
              console.warn("[ChainQuest] Startup profile sync skipped:", err);
            });
        }
      } catch (e) {
        console.error("Failed to parse stored profile", e);
        setIsNewUserModal(true);
      }
    } else {
      setIsNewUserModal(true);
    }
  }, []);

  // Save profile to localStorage whenever it changes
  const saveProfile = (newProfile: UserProfile) => {
    const currentDateStr = new Date().toISOString().split("T")[0];
    const currentWeek = getCurrentWeekDates();
    const activity = newProfile.weeklyActivity || [];
    let updatedActivity = activity;
    if (!activity.includes(currentDateStr)) {
      updatedActivity = Array.from(new Set([...activity, currentDateStr]))
        .filter((d) => d >= currentWeek[0]);
    } else {
      updatedActivity = activity.filter((d) => d >= currentWeek[0]);
    }
    
    const finalizedProfile = {
      ...newProfile,
      weeklyActivity: updatedActivity,
    };

    setProfile(finalizedProfile);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalizedProfile));

    // Auto-sync real user profiles to the server in the background
    if (finalizedProfile.isRealUser && finalizedProfile.accountUsername && finalizedProfile.accountPassword) {
      fetch("/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: finalizedProfile.accountUsername,
          password: finalizedProfile.accountPassword,
          profile: finalizedProfile,
        })
      }).catch((e) => console.error("Background auto-sync failed:", e));
    } else if (finalizedProfile.userId) {
      // Auto-sync guest profiles in the background to the server
      fetch("/api/users/sync-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: finalizedProfile.userId,
          username: finalizedProfile.username,
          profile: finalizedProfile,
        })
      }).catch((e) => console.error("Background guest-sync failed:", e));
    }
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || isCreatingProfile) return;

    setIsCreatingProfile(true);
    const currentDateStr = new Date().toISOString().split("T")[0];
    const newProfile: UserProfile = {
      userId: "user_" + Math.random().toString(36).substring(2, 11),
      username: usernameInput.trim(),
      avatar: avatarInput,
      xp: 0,
      level: 1,
      streak: 1,
      completedLessons: [],
      completedQuests: [],
      earnedBadges: [],
      joinedAt: new Date().toISOString(),
      dailyMissions: generateDailyMissions(1),
      lastMissionsDate: currentDateStr,
      unlockedTitles: ["Blockchain Explorer"],
      activeTitle: "Blockchain Explorer",
      lootboxesCount: 2,
      dailyDuelsCount: 0,
      lastDuelDate: currentDateStr,
      weeklyActivity: [currentDateStr],
    };

    saveProfile(newProfile);
    setIsNewUserModal(false);
    setIsTourActive(true);

    setTimeout(() => {
      setIsCreatingProfile(false);
    }, 1000);
  };

  const handleUpdateXP = (xpAmount: number, isDuel?: boolean) => {
    if (!profile) return;
    const newXp = profile.xp + xpAmount;
    // Calculate level based on completed lessons
    const newLvl = Math.max(1, 1 + (profile.completedLessons || []).length);
    const hasLeveledUp = newLvl > profile.level;
    
    const todayStr = new Date().toISOString().split("T")[0];
    let dailyCount = profile.lastDuelDate === todayStr ? (profile.dailyDuelsCount || 0) : 0;
    if (isDuel) {
      dailyCount += 1;
    }

    saveProfile({
      ...profile,
      xp: newXp,
      level: newLvl,
      lastDuelDate: todayStr,
      dailyDuelsCount: dailyCount,
    });

    showToast(`+${xpAmount} XP Gained! ⚡`, "xp", `Total: ${newXp} XP`);

    if (hasLeveledUp) {
      playSound("level_up");
      showToast("Level Up! 🎉", "achievement", `You reached Level ${newLvl}!`);
      setCelebration({
        title: `LEVEL UP TO LVL ${newLvl}! 🎉`,
        desc: `Fabulous work in the sandbox! You have climbed to level ${newLvl} as a smart crypto practitioner.`,
        xpBonus: xpAmount
      });
    }
  };

  const handleResolveDuel = (duelId: string, xpChange: number) => {
    if (!profile) return;
    
    // Remove the resolved duel from activeDuels
    const updatedDuels = (profile.activeDuels || []).filter(d => d.id !== duelId);
    
    const newXp = Math.max(0, profile.xp + xpChange);
    const newLvl = Math.max(1, 1 + (profile.completedLessons || []).length);
    const hasLeveledUp = newLvl > profile.level;
    
    const todayStr = new Date().toISOString().split("T")[0];
    let dailyCount = profile.lastDuelDate === todayStr ? (profile.dailyDuelsCount || 0) : 0;
    dailyCount += 1;

    saveProfile({
      ...profile,
      xp: newXp,
      level: newLvl,
      activeDuels: updatedDuels,
      lastDuelDate: todayStr,
      dailyDuelsCount: dailyCount,
    });
    
    if (xpChange > 0) {
      showToast(`+${xpChange} XP Gained! ⚡`, "xp", `Total: ${newXp} XP`);
    } else if (xpChange < 0) {
      showToast(`${xpChange} XP stakes adjusted! 🛡️`, "info", `Total: ${newXp} XP`);
    }
    
    if (hasLeveledUp) {
      playSound("level_up");
      showToast("Level Up! 🎉", "achievement", `You reached Level ${newLvl}!`);
      setCelebration({
        title: `LEVEL UP TO LVL ${newLvl}! 🎉`,
        desc: `Fabulous work in the sandbox! You have climbed to level ${newLvl} as a smart crypto practitioner.`,
        xpBonus: 100,
      });
    }
  };

  const handleProgressMission = (
    type: "sandbox_swap" | "sandbox_mine" | "sandbox_sign" | "sandbox_keypair" | "wallet_seed" | "contract_deploy" | "ai_ask" | "quest_complete",
    amount = 1
  ) => {
    if (!profile) return;
    
    const currentDateStr = new Date().toISOString().split("T")[0];
    let updatedMissions = profile.dailyMissions ? [...profile.dailyMissions] : [];
    let stateChanged = false;
    let xpBonusToAward = 0;
    let completedMissionTitle = "";

    if (!profile.dailyMissions || profile.lastMissionsDate !== currentDateStr) {
      updatedMissions = generateDailyMissions(profile.level);
      stateChanged = true;
    }

    updatedMissions = updatedMissions.map((m) => {
      if (m.type === type && !m.isCompleted) {
        const newCount = Math.min(m.targetCount, m.currentCount + amount);
        const becameCompleted = newCount >= m.targetCount;
        if (becameCompleted) {
          xpBonusToAward += m.xpReward;
          completedMissionTitle = m.description;
        }
        stateChanged = true;
        return {
          ...m,
          currentCount: newCount,
          isCompleted: becameCompleted,
        };
      }
      return m;
    });

    if (stateChanged) {
      const newXp = profile.xp + xpBonusToAward;
      const newLvl = Math.max(1, 1 + (profile.completedLessons || []).length);
      const hasLeveledUp = newLvl > profile.level;

      saveProfile({
        ...profile,
        dailyMissions: updatedMissions,
        lastMissionsDate: currentDateStr,
        xp: newXp,
        level: newLvl,
        streak: profile.streak,
        username: profile.username,
        avatar: profile.avatar,
        completedLessons: profile.completedLessons,
        completedQuests: profile.completedQuests || [],
        earnedBadges: profile.earnedBadges,
        joinedAt: profile.joinedAt,
      });

      if (xpBonusToAward > 0) {
        if (hasLeveledUp) {
          playSound("level_up");
          showToast("Level Up! 🎉", "achievement", `You reached Level ${newLvl}!`);
        } else {
          playSound("mission_complete");
        }
        showToast("Daily Mission Complete! 🎯", "success", `${completedMissionTitle} (+${xpBonusToAward} XP)`);
        setCelebration({
          title: hasLeveledUp ? `LEVEL UP & DAILY MISSION COMPLETE! 🎯` : "DAILY MISSION COMPLETE! 🎯",
          desc: hasLeveledUp
            ? `Fantastic double score! You completed "${completedMissionTitle}" daily mission, claiming +${xpBonusToAward} XP and reaching level ${newLvl}!`
            : `Sensational job! You cleared the daily task: "${completedMissionTitle}" and earned +${xpBonusToAward} XP! Keep up the daily streak!`,
          xpBonus: xpBonusToAward,
        });
      }
    }
  };

  const handleSelectMission = (missionType: string) => {
    playSound("click");
    switch (missionType) {
      case "wallet_seed":
      case "sandbox_keypair":
        setActiveZoneId("wallet");
        break;
      case "sandbox_sign":
        setActiveZoneId("transaction");
        break;
      case "sandbox_mine":
        setActiveZoneId("mining");
        break;
      case "contract_deploy":
        setActiveZoneId("contract");
        break;
      case "sandbox_swap":
        setActiveZoneId("defi");
        break;
      case "ai_ask":
        setIsTutorOpen(true);
        break;
      case "quest_complete":
        setActiveTab("map");
        break;
      default:
        setActiveTab("map");
        break;
    }
  };

  const handleLessonCompleted = (xpReward: number, badgeId: string) => {
    if (!profile || !activeZoneId) return;

    const completed = [...profile.completedLessons];
    if (!completed.includes(activeZoneId)) {
      completed.push(activeZoneId);
    }

    const badges = [...profile.earnedBadges];
    if (badgeId && !badges.includes(badgeId)) {
      badges.push(badgeId);
    }

    const newXp = profile.xp + xpReward;

    // Process daily mission completion for "quest_complete"
    const currentDateStr = new Date().toISOString().split("T")[0];
    let updatedMissions = profile.dailyMissions ? [...profile.dailyMissions] : [];
    let stateChanged = false;
    let missionBonusXp = 0;
    let completedMissionTitle = "";

    if (!profile.dailyMissions || profile.lastMissionsDate !== currentDateStr) {
      updatedMissions = generateDailyMissions(profile.level);
      stateChanged = true;
    }

    updatedMissions = updatedMissions.map((m) => {
      if (m.type === "quest_complete" && !m.isCompleted) {
        const newCount = Math.min(m.targetCount, m.currentCount + 1);
        const becameCompleted = newCount >= m.targetCount;
        if (becameCompleted) {
          missionBonusXp += m.xpReward;
          completedMissionTitle = m.description;
        }
        stateChanged = true;
        return {
          ...m,
          currentCount: newCount,
          isCompleted: becameCompleted,
        };
      }
      return m;
    });

    const finalXp = newXp + missionBonusXp;
    const finalLvl = Math.max(1, 1 + completed.length);
    const finalHasLeveledUp = finalLvl > profile.level;

    saveProfile({
      ...profile,
      completedLessons: completed,
      earnedBadges: badges,
      completedQuests: profile.completedQuests || [],
      xp: finalXp,
      level: finalLvl,
      lootboxesCount: (profile.lootboxesCount || 0) + 1,
      dailyMissions: updatedMissions,
      lastMissionsDate: currentDateStr,
    });

    // Close the lesson drawer on success
    setActiveZoneId(null);
    setIsTutorOpen(false);

    // Play high-quality sound effects
    if (finalHasLeveledUp) {
      playSound("level_up");
    } else {
      playSound("mission_complete");
    }

    // Dynamic celebration lookup
    const zoneName = ZONES.find(z => z.id === activeZoneId)?.name || activeZoneId;
    const badge = BADGES.find(b => b.id === badgeId);

    // Trigger feedback toasts
    showToast("Quest Completed! 🏆", "success", `Cleared: ${zoneName} (+${xpReward} XP)`);
    if (badge) {
      showToast("New Badge Unlocked! 🏅", "achievement", `Earned: ${badge.title}`);
    }
    if (missionBonusXp > 0) {
      showToast("Daily Mission Complete! 🎯", "success", `${completedMissionTitle} (+${missionBonusXp} XP)`);
    }
    if (finalHasLeveledUp) {
      showToast("Level Up! 🎉", "achievement", `You reached Level ${finalLvl}!`);
    }

    setCelebration({
      title: finalHasLeveledUp 
        ? `LEVEL UP TO LVL ${finalLvl}! 👑` 
        : (missionBonusXp > 0 ? "QUEST & DAILY MISSION CLEARED! 🏆" : "QUEST CLEARED! 🏆"),
      desc: finalHasLeveledUp 
        ? `Sensational! You completed the "${zoneName}" quest${missionBonusXp > 0 ? ` and your daily task` : ''} and advanced to level ${finalLvl}. Keep scaling the Island!`
        : `Congratulations! You successfully finished the challenges of the "${zoneName}" on Blockchain Island.${missionBonusXp > 0 ? ` You also completed your daily mission "${completedMissionTitle}" for an extra +${missionBonusXp} XP!` : ''}`,
      xpBonus: xpReward + missionBonusXp,
      badgeName: badge?.title
    });
  };

  const handleClaimQuest = (questId: string, xpReward: number) => {
    if (!profile) return;
    const quests = profile.completedQuests ? [...profile.completedQuests] : [];
    if (!quests.includes(questId)) {
      quests.push(questId);
    }
    const newXp = profile.xp + xpReward;

    // Process daily mission completion for "quest_complete"
    const currentDateStr = new Date().toISOString().split("T")[0];
    let updatedMissions = profile.dailyMissions ? [...profile.dailyMissions] : [];
    let stateChanged = false;
    let missionBonusXp = 0;
    let completedMissionTitle = "";

    if (!profile.dailyMissions || profile.lastMissionsDate !== currentDateStr) {
      updatedMissions = generateDailyMissions(profile.level);
      stateChanged = true;
    }

    updatedMissions = updatedMissions.map((m) => {
      if (m.type === "quest_complete" && !m.isCompleted) {
        const newCount = Math.min(m.targetCount, m.currentCount + 1);
        const becameCompleted = newCount >= m.targetCount;
        if (becameCompleted) {
          missionBonusXp += m.xpReward;
          completedMissionTitle = m.description;
        }
        stateChanged = true;
        return {
          ...m,
          currentCount: newCount,
          isCompleted: becameCompleted,
        };
      }
      return m;
    });

    const finalXp = newXp + missionBonusXp;
    const finalLvl = Math.max(1, 1 + (profile.completedLessons || []).length);
    const finalHasLeveledUp = finalLvl > profile.level;
    
    saveProfile({
      ...profile,
      completedQuests: quests,
      xp: finalXp,
      level: finalLvl,
      dailyMissions: updatedMissions,
      lastMissionsDate: currentDateStr,
    });

    // Play sound effects
    if (finalHasLeveledUp) {
      playSound("level_up");
    } else {
      playSound("mission_complete");
    }

    // Format display text nicely
    const formatName = questId.replace("ach_", "").split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    // Trigger toasts
    showToast("Milestone Unlocked! 🎁", "achievement", `Completed: ${formatName} (+${xpReward} XP)`);
    if (missionBonusXp > 0) {
      showToast("Daily Mission Complete! 🎯", "success", `${completedMissionTitle} (+${missionBonusXp} XP)`);
    }
    if (finalHasLeveledUp) {
      showToast("Level Up! 🎉", "achievement", `You reached Level ${finalLvl}!`);
    }

    setCelebration({
      title: finalHasLeveledUp 
        ? `LEVEL UP & MILESTONE CLEARED! 🚀` 
        : (missionBonusXp > 0 ? "MILESTONE & DAILY MISSION CLEARED! 🎯" : "MILESTONE CLAIMED! 🎁"),
      desc: finalHasLeveledUp
        ? `Double Reward! You claimed "${formatName}" milestone${missionBonusXp > 0 ? ` and your daily task` : ''} which pushed you to level ${finalLvl}!`
        : `Excellent work! You claimed the "${formatName}" bonus milestone reward successfully.${missionBonusXp > 0 ? ` You also completed your daily mission "${completedMissionTitle}" for an extra +${missionBonusXp} XP!` : ''}`,
      xpBonus: xpReward + missionBonusXp
    });
  };

  const handleUpdateProfile = (newUsername: string, newAvatar: string, additional?: Partial<UserProfile>) => {
    if (!profile) return;
    
    let finalXp = profile.xp;
    if (additional && additional.xp !== undefined) {
      finalXp = additional.xp;
    }

    let finalCompleted = profile.completedLessons || [];
    if (additional && additional.completedLessons !== undefined) {
      finalCompleted = additional.completedLessons;
    }
    
    let finalLvl = Math.max(1, 1 + finalCompleted.length);
    const hasLeveledUp = finalLvl > profile.level;
    
    saveProfile({
      ...profile,
      username: newUsername,
      avatar: newAvatar,
      ...additional,
      xp: finalXp,
      level: finalLvl,
    });
    
    if (hasLeveledUp) {
      playSound("level_up");
      showToast("Level Up! 🎉", "achievement", `You reached Level ${finalLvl}!`);
      setCelebration({
        title: "LEVEL UP! 🎓",
        desc: `Congratulations! You leveled up to Level ${finalLvl} from your cosmetic discoveries!`,
        xpBonus: 0,
      });
    } else if (!additional) {
      showToast("Profile Updated! 👤", "success", "Your identity was changed.");
    }
  };

  const handleResetProgress = () => {
    if (window.confirm("Are you sure you want to reset all your progress? This will delete your levels and badges permanently.")) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setProfile(null);
      setIsNewUserModal(true);
      setUsernameInput("");
      setAvatarInput(AVATARS[0]);
      setActiveZoneId(null);
      setActiveTab("map");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="chainquest-app-root">
      
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between sticky top-0 z-50">
        <div 
          onClick={() => {
            if (profile) {
              setActiveTab("map");
              setActiveZoneId(null);
              setIsTutorOpen(false);
            }
          }}
          className="flex items-center gap-3 cursor-pointer select-none hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/10">
            <Compass className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5 animate-pulse-slow">
              ChainQuest
            </h1>
            <p className="text-[10px] text-slate-500 tracking-wider uppercase font-mono">Gamified Blockchain Learning</p>
          </div>
        </div>

        {profile && (
          <div className="flex items-center gap-6">
            {/* Quick stats indicators */}
            <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
              {(() => {
                const { days, status, todayIdx, isPerfectStreak } = getWeeklyStreakStatus(profile.streak, profile.weeklyActivity);
                return (
                  <div 
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all duration-500 ${
                      isPerfectStreak 
                        ? "bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/10 text-amber-300" 
                        : "bg-slate-950/60 border-slate-800/80"
                    }`}
                    title={isPerfectStreak ? "👑 Perfect 7/7 Weekly Streak!" : `${profile.streak}-Day Learning Streak!`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${isPerfectStreak ? "text-amber-400 animate-bounce" : "text-orange-500 animate-pulse"}`} />
                    {isPerfectStreak && <span className="text-[10px] font-bold text-amber-400 select-none">👑</span>}
                    <div className="flex gap-0.5">
                      {days.map((day, idx) => {
                        const isActive = status[idx];
                        const isToday = idx === todayIdx;
                        return (
                          <span 
                            key={idx}
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-mono font-bold border transition-all ${
                              isActive 
                                ? isPerfectStreak
                                  ? "bg-gradient-to-tr from-amber-500 to-yellow-300 border-amber-400 text-slate-950 shadow-sm shadow-amber-500/10"
                                  : "bg-gradient-to-tr from-orange-500 to-amber-400 border-orange-500 text-slate-950 shadow-sm shadow-orange-500/10"
                                : isToday
                                  ? "bg-slate-900 border-indigo-500/50 text-indigo-400"
                                  : "bg-slate-900/60 border-slate-850 text-slate-500"
                            }`}
                          >
                            {day}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center gap-1.5 text-amber-400">
                <Coins className="w-4 h-4" />
                <span>{profile.xp} XP</span>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-lg px-2.5 py-1 text-[11px] font-bold">
                LVL {profile.level}
              </div>
              {profile.isRealUser ? (
                <div 
                  className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-xl text-emerald-400 text-[11px] font-bold select-none cursor-pointer hover:bg-emerald-500/15 transition-all"
                  title="All progress is safely backed up to the secure cloud!"
                  onClick={() => {
                    playSound("click");
                    setActiveTab("profile");
                  }}
                >
                  <Cloud className="w-3.5 h-3.5 fill-emerald-400/10 animate-pulse" />
                  <span className="hidden lg:inline">Cloud Synced</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    playSound("click");
                    setActiveTab("profile");
                    showToast("Secured Progress ☁️", "info", "Register an account in the Profile tab to enable cloud backup.");
                  }}
                  className="flex items-center gap-1.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-2.5 py-1 rounded-xl text-[11px] font-bold border border-indigo-400/20 shadow-md shadow-indigo-500/10 active:scale-95 transition-all cursor-pointer animate-pulse-slow"
                  title="Save your progress & levels to the cloud!"
                >
                  <Cloud className="w-3.5 h-3.5 text-indigo-200" />
                  <span className="hidden lg:inline">Backup Progress</span>
                </button>
              )}
            </div>
 
             {/* Profile Avatar Trigger */}
             <div className="flex items-center gap-3 pl-4 border-l border-slate-850">
               <span className="text-3xl">{profile.avatar}</span>
               <div className="text-left hidden md:block">
                 <p className="text-xs font-bold text-slate-200">{profile.username}</p>
                 <p className="text-[10px] font-mono text-indigo-400 font-semibold tracking-wider uppercase">
                   {profile.activeTitle || "Blockchain Explorer"}
                 </p>
               </div>
             </div>
           </div>
         )}
      </header>

      {/* Main Workspace Frame */}
      {profile ? (
        <div className="flex-1 flex flex-col lg:flex-row relative">
          {/* Main Content Pane */}
          <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Mobile-only Quick Stats Bar */}
            <div className="flex sm:hidden items-center justify-between bg-slate-900 border border-slate-850/80 p-3 rounded-2xl text-xs font-mono">
              {(() => {
                const { days, status, todayIdx, isPerfectStreak } = getWeeklyStreakStatus(profile.streak, profile.weeklyActivity);
                return (
                  <div 
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border transition-all duration-500 ${
                      isPerfectStreak 
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-300" 
                        : "bg-slate-950/60 border-slate-800/80"
                    }`}
                    title={isPerfectStreak ? "👑 Perfect 7/7 Weekly Streak!" : `${profile.streak}-Day Learning Streak!`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${isPerfectStreak ? "text-amber-400 animate-bounce" : "text-orange-500 animate-pulse"}`} />
                    {isPerfectStreak && <span className="text-[10px] font-bold text-amber-400 select-none">👑</span>}
                    <div className="flex gap-0.5">
                      {days.map((day, idx) => {
                        const isActive = status[idx];
                        const isToday = idx === todayIdx;
                        return (
                          <span 
                            key={idx}
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-mono font-bold border transition-all ${
                              isActive 
                                ? isPerfectStreak
                                  ? "bg-gradient-to-tr from-amber-500 to-yellow-300 border-amber-400 text-slate-950 shadow-sm"
                                  : "bg-gradient-to-tr from-orange-500 to-amber-400 border-orange-500 text-slate-950 shadow-sm"
                                : isToday
                                  ? "bg-slate-900 border-indigo-500/50 text-indigo-400"
                                  : "bg-slate-900/60 border-slate-850 text-slate-500"
                            }`}
                          >
                            {day}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center gap-1.5 text-amber-400">
                <Coins className="w-4 h-4" />
                <span className="font-bold">{profile.xp} XP</span>
              </div>
              <div className="text-indigo-300 font-bold bg-indigo-500/10 px-2.5 py-1 border border-indigo-500/30 rounded-lg text-[11px]">
                LVL {profile.level}
              </div>
              {profile.isRealUser ? (
                <div 
                  className="flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 p-1.5 rounded-lg text-emerald-400 text-[11px] font-bold cursor-pointer hover:bg-emerald-500/15 transition-all"
                  title="Cloud Synced!"
                  onClick={() => {
                    playSound("click");
                    setActiveTab("profile");
                  }}
                >
                  <Cloud className="w-3.5 h-3.5 fill-emerald-400/10" />
                </div>
              ) : (
                <button
                  onClick={() => {
                    playSound("click");
                    setActiveTab("profile");
                    showToast("Secured Progress ☁️", "info", "Register an account in the Profile tab to enable cloud backup.");
                  }}
                  className="flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white p-1.5 rounded-lg text-[11px] font-bold border border-indigo-400/20 active:scale-95 transition-all animate-pulse-slow"
                  title="Backup progress to cloud!"
                >
                  <Cloud className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tab navigation headers */}
            <div className="flex bg-slate-900 border border-slate-850 p-1 rounded-2xl w-full max-w-md mx-auto">
              <button
                onClick={() => { setActiveTab("map"); setActiveZoneId(null); }}
                className={`flex-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === "map"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/5"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/50"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden min-[360px]:inline">Island Map</span>
                <span className="inline min-[360px]:hidden">Map</span>
              </button>
              <button
                onClick={() => { setActiveTab("leaderboard"); setActiveZoneId(null); }}
                className={`flex-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === "leaderboard"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/5"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/50"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span className="hidden min-[360px]:inline">Leaderboard</span>
                <span className="inline min-[360px]:hidden">Leader</span>
              </button>
              <button
                onClick={() => { setActiveTab("profile"); setActiveZoneId(null); }}
                className={`flex-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === "profile"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/5"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/50"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden min-[360px]:inline">My Profile</span>
                <span className="inline min-[360px]:hidden">Profile</span>
              </button>
            </div>

            {/* Tab view rendering */}
            <div className="relative z-10 w-full max-w-6xl mx-auto space-y-6">
              {activeTab === "map" && (
                <DailyMissions 
                  missions={profile.dailyMissions} 
                  lastMissionsDate={profile.lastMissionsDate}
                  onMissionClick={handleSelectMission}
                />
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="w-full"
                >
                  {activeTab === "map" && (
                    <WorldMap
                      userXP={profile.xp}
                      completedLessons={profile.completedLessons}
                      activeZoneId={activeZoneId}
                      onSelectZone={(zoneId) => {
                        setActiveZoneId(zoneId);
                      }}
                    />
                  )}
                  {activeTab === "leaderboard" && (
                    <Leaderboard 
                      userProfile={profile} 
                      onUpdateXP={handleUpdateXP} 
                      onResolveDuel={handleResolveDuel} 
                    />
                  )}
                  {activeTab === "profile" && (
                    <Profile 
                      userProfile={profile} 
                      onClaimQuest={handleClaimQuest} 
                      activeTheme={theme}
                      onThemeChange={setTheme}
                      onUpdateProfile={handleUpdateProfile}
                      onResetProgress={handleResetProgress}
                      onRelaunchTour={() => setIsTourActive(true)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Floating Workspace Drawer overlay when learning a specific Zone */}
          <AnimatePresence>
            {activeZoneId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 animate-fade-in"
              >
                {/* Learning drawer dialog panel - Centered, beautifully rounded, and responsive */}
                <motion.div
                  initial={{ scale: 0.96, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.96, opacity: 0, y: 15 }}
                  transition={{ type: "spring", damping: 28, stiffness: 140 }}
                  className="w-full max-w-5xl h-[92vh] sm:h-[88vh] max-h-[850px] bg-slate-900 border border-slate-800/80 flex flex-col shadow-2xl relative rounded-2xl md:rounded-3xl overflow-hidden"
                >
                  {/* Close button top right */}
                  <button
                    onClick={() => {
                      setActiveZoneId(null);
                    }}
                    className="absolute top-4 right-4 z-50 p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-400" />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">QUEST WORKSPACE</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      <Lessons
                        zoneId={activeZoneId}
                        onLessonCompleted={handleLessonCompleted}
                        onOpenTutor={() => {
                          setIsTutorOpen(true);
                        }}
                        onProgressMission={handleProgressMission}
                        userProfile={profile}
                        onUpdateProfileKeys={(keys) => {
                          if (profile) {
                            saveProfile({ ...profile, keys });
                          }
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global Floating Satoshi AI Chat Widget */}
          <AnimatePresence>
            {isTutorOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 140 }}
                className="fixed bottom-22 sm:bottom-24 left-3 right-3 sm:left-auto sm:right-6 z-[110] w-auto sm:w-[400px] h-[520px] sm:h-[550px] max-h-[calc(100vh-120px)] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              >
                <AIAdvisor
                  currentZone={activeZoneId}
                  userXP={profile.xp}
                  userLevel={profile.level}
                  onClose={() => setIsTutorOpen(false)}
                  onProgressMission={handleProgressMission}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global Floating Satoshi AI "Rooming" Bubble Button */}
          <button
            onClick={() => setIsTutorOpen(!isTutorOpen)}
            className={`fixed bottom-6 right-6 z-[110] p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 group border-2 ${
              isTutorOpen
                ? "bg-rose-600 border-rose-500 text-white hover:bg-rose-500 shadow-rose-600/20"
                : "bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-500 border-amber-400 text-slate-950 hover:brightness-110 shadow-orange-500/25 hover:scale-105"
            }`}
            title="Ask Satoshi AI Mentor"
            id="global-satoshi-bubble"
          >
            {isTutorOpen ? (
              <X className="w-6 h-6 stroke-[2.5]" />
            ) : (
              <div className="relative flex items-center justify-center">
                <Sparkles className="w-6 h-6 stroke-[2.5] group-hover:rotate-12 transition-transform" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                </span>
                
                {/* Micro tooltip on hover */}
                <div className="absolute right-14 bg-slate-900 text-slate-100 border border-slate-800 text-[10px] font-mono font-bold tracking-wide uppercase px-2.5 py-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">
                  Ask Satoshi AI
                </div>
              </div>
            )}
          </button>
        </div>
      ) : null}

      {/* NEW USER ONBOARDING MODAL */}
      <AnimatePresence>
        {isNewUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6 text-center"
            >
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/10">
                  <Compass className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-white mt-4">Welcome to ChainQuest</h3>
                <p className="text-xs text-slate-400">
                  Embark on an immersive game journey to master cryptography, wallets, miners, smart contracts, and DeFi. Let's create your identity!
                </p>
              </div>

              <form onSubmit={handleCreateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1.5 text-left uppercase tracking-wider">CHOOSE USERNAME</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="SatoshiLearner"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-2 text-left uppercase tracking-wider">SELECT AVATAR CHARACTER</label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        type="button"
                        onClick={() => setAvatarInput(avatar)}
                        className={`text-3xl p-2 rounded-xl border transition-all ${
                          avatarInput === avatar
                            ? "bg-indigo-600/10 border-indigo-500 scale-105"
                            : "bg-slate-950/40 border-slate-850 hover:border-slate-800"
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!usernameInput.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-sm py-3 rounded-xl transition-all"
                >
                  Create Identity & Land on Island
                </button>
              </form>

              <div className="border-t border-slate-850/60 pt-4 text-center">
                <p className="text-xs text-slate-400">
                  Already have a registered cloud account?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewUserModal(false);
                    setActiveTab("profile");
                  }}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-bold underline mt-1 cursor-pointer transition-colors"
                >
                  Sign in to your Cloud Profile here
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GLORIOUS CELEBRATION MODAL OVERLAY */}
      <AnimatePresence>
        {celebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 150 }}
              className="bg-slate-900 border-2 border-indigo-500/30 rounded-3xl p-8 w-full max-w-md shadow-cyan-glow text-center relative overflow-hidden"
            >
              {/* Animated Background decor */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl animate-pulse" />

              <div className="space-y-6 relative z-10">
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20 animate-bounce">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                  {/* Outer sparkling circles */}
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-slate-900 shadow">
                    +{celebration.xpBonus} XP
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight text-white uppercase bg-gradient-to-r from-amber-200 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
                    {celebration.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed px-2">
                    {celebration.desc}
                  </p>
                </div>

                {celebration.badgeName && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 max-w-[280px] mx-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="text-left font-mono">
                      <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Badge Unlocked</p>
                      <p className="text-xs font-bold text-white">{celebration.badgeName}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setCelebration(null)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.02]"
                >
                  Continue Journey
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INCOMING CHALLENGE ALERT MODAL */}
      <AnimatePresence>
        {incomingChallenge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 120 }}
              className="bg-slate-900 border-2 border-red-500/50 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden text-center"
            >
              {/* Glowing hazard line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 animate-pulse" />
              
              {/* Alert Icon */}
              <div className="mx-auto bg-red-500/10 border border-red-500/30 p-3.5 rounded-full w-14 h-14 flex items-center justify-center animate-bounce mb-4">
                <ShieldAlert className="w-7 h-7 text-red-500" />
              </div>

              <h3 className="text-sm font-black tracking-wider text-slate-100 uppercase font-mono">
                🚨 INCOMING DUEL CHALLENGE 🚨
              </h3>
              
              {/* Competitor profile specs */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 my-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{incomingChallenge.competitor.avatar}</span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-red-400">{incomingChallenge.competitor.username}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Level {incomingChallenge.competitor.level} • {incomingChallenge.competitor.title}</p>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-right font-mono text-[10px] text-indigo-400">
                  {incomingChallenge.competitor.xp} XP
                </div>
              </div>

              {/* Challenge description */}
              <div className="space-y-1.5 mb-6 text-slate-300">
                <p className="text-xs font-semibold">
                  They've challenged you to a game of:
                </p>
                <span className="inline-block bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-xs font-black font-mono uppercase text-indigo-300 tracking-wider">
                  {incomingChallenge.challengeType === "quiz" 
                    ? "🛡️ Smart Contract Bug Hunt" 
                    : "⚡ Cryptographic Hash Race"}
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed font-mono mt-2">
                  Accepting lets you defend your rank and claim bonus XP stakes. Rejects are free, but do you want to back down?
                </p>
              </div>

              {/* Action Handles */}
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const dailyCount = profile?.lastDuelDate === todayStr ? (profile?.dailyDuelsCount || 0) : 0;
                const isLimitReached = dailyCount >= 3;

                return (
                  <div className="space-y-2.5">
                    {isLimitReached && (
                      <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-2xl text-[11px] font-mono text-red-300 leading-normal mb-3 text-center">
                        ⚠️ <strong>Daily Duel Limit Reached (3/3)</strong>
                        <p className="mt-1 text-slate-400">You've reached your maximum of 3 duels for today! Rest up and come back tomorrow to defend your rank.</p>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (isLimitReached) {
                          showToast("Daily limit reached! ⚔️", "error", "You have already completed 3 duels today. Come back tomorrow!");
                          return;
                        }
                        // Accept on backend
                        fetch("/api/duels/respond", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            duelId: incomingChallenge.id,
                            action: "accept"
                          })
                        }).catch(e => console.error("Error accepting:", e));

                        setActiveDuel({
                          competitor: incomingChallenge.competitor,
                          initialState: incomingChallenge.challengeType === "quiz" ? "playing_quiz" : "playing_race",
                          incomingDuelType: incomingChallenge.challengeType,
                          duelId: incomingChallenge.id,
                          challengerScore: incomingChallenge.challengerScore
                        });
                        setIncomingChallenge(null);
                        playSound("level_up");
                      }}
                      disabled={isLimitReached}
                      className={`w-full text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-lg active:scale-95 duration-100 cursor-pointer flex items-center justify-center gap-1.5 ${
                        isLimitReached 
                          ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-40 shadow-none" 
                          : "bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 shadow-indigo-500/10"
                      }`}
                    >
                      ⚔️ PLAY NOW
                    </button>
                    
                    <button
                      onClick={() => {
                        if (!profile) return;
                        if (isLimitReached) {
                          showToast("Daily limit reached! ⚔️", "error", "You have already completed 3 duels today. Come back tomorrow!");
                          return;
                        }
                        
                        // Accept on backend
                        fetch("/api/duels/respond", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            duelId: incomingChallenge.id,
                            action: "accept"
                          })
                        }).catch(e => console.error("Error accepting:", e));

                        const newDuel: ActiveDuelItem = {
                          id: incomingChallenge.id,
                          competitor: incomingChallenge.competitor,
                          challengeType: incomingChallenge.challengeType,
                          createdAt: new Date().toISOString(),
                          challengerScore: incomingChallenge.challengerScore
                        };
                        saveProfile({
                          ...profile,
                          activeDuels: [...(profile.activeDuels || []), newDuel],
                        });
                        setIncomingChallenge(null);
                        playSound("mission_complete");
                        showToast("Duel saved to Leaderboard! ⚔️", "success", "You can resolve this duel later from the Leaderboard.");
                      }}
                      disabled={isLimitReached}
                      className={`w-full font-extrabold text-xs py-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isLimitReached
                          ? "bg-slate-800 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-40"
                          : "bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-indigo-200 border-indigo-500/15"
                      }`}
                    >
                      📥 ACCEPT & PLAY LATER
                    </button>
                    
                    <button
                      onClick={() => {
                        if (incomingChallenge) {
                          // Decline on backend
                          fetch("/api/duels/respond", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              duelId: incomingChallenge.id,
                              action: "decline"
                            })
                          }).catch(e => console.error("Error declining:", e));
                        }
                        setIncomingChallenge(null);
                        playSound("click");
                        showToast("You quietly declined the challenge.", "info");
                      }}
                      className="w-full border border-slate-800/80 hover:bg-slate-800/40 text-slate-400 hover:text-slate-300 font-bold text-xs py-3 rounded-2xl transition-all cursor-pointer"
                    >
                      DECLINE
                    </button>

                    <button
                      onClick={() => {
                        setIncomingChallenge(null);
                        playSound("click");
                        try {
                          localStorage.setItem("chainquest_challenges_disabled", "true");
                        } catch {}
                        setChallengesDisabled(true);
                        showToast("Alerts muted! 🔕", "info", "You can re-enable random duels anytime in My Profile settings.");
                      }}
                      className="w-full text-[10px] text-slate-500 hover:text-indigo-400 font-mono tracking-wider transition-all pt-1.5 cursor-pointer hover:underline"
                    >
                      🔕 MUTE FUTURE DUEL ALERTS
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTIVE DUEL ARENA OVERLAY */}
      {activeDuel && (
        <ChallengeModal
          competitor={activeDuel.competitor}
          userProfile={profile}
          initialState={activeDuel.initialState}
          incomingDuelType={activeDuel.incomingDuelType}
          duelId={activeDuel.duelId}
          challengerScore={activeDuel.challengerScore}
          onClose={() => setActiveDuel(null)}
          onUpdateXP={handleUpdateXP}
          onResolveDuel={handleResolveDuel}
        />
      )}

      {/* GUIDED INTERACTIVE TOUR OVERLAY */}
      <AnimatePresence>
        {isTourActive && (
          <GuidedTour
            isActive={isTourActive}
            onClose={() => setIsTourActive(false)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-6 text-center text-[10px] font-mono text-slate-600">
        <p>© 2026 ChainQuest Blockchain Learning World.</p>
      </footer>
    </div>
  );
}
