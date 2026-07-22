import React, { useState, useEffect, useRef } from "react";
import { Competitor, UserProfile } from "../types";
import { 
  X, Award, Shield, Cpu, Zap, Trophy, Play, Check, AlertTriangle, 
  Terminal, Sparkles, Hourglass, Swords, Flame, ArrowRight, User
} from "lucide-react";
import { playSound } from "../utils/audio";

interface ChallengeModalProps {
  competitor: Competitor;
  userProfile: UserProfile;
  onClose: () => void;
  onUpdateXP: (xpAmount: number, isDuel?: boolean) => void;
  initialState?: DuelState;
  incomingDuelType?: "quiz" | "race";
  duelId?: string;
  challengerScore?: number;
  onResolveDuel?: (duelId: string, xpChange: number) => void;
}

type DuelState = "intro" | "awaiting_acceptance" | "declined" | "select" | "playing_quiz" | "playing_race" | "awaiting_opponent_completion" | "result";

interface QuizQuestion {
  id: string;
  title: string;
  code: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    title: "Spot the Reentrancy Vulnerability",
    code: `function withdraw(uint amount) public {
  require(balances[msg.sender] >= amount);
  (bool success, ) = msg.sender.call{value: amount}("");
  require(success, "Transfer failed");
  balances[msg.sender] -= amount;
}`,
    options: [
      "No vulnerability detected",
      "Reentrancy: Balance is updated AFTER the external call",
      "Integer Overflow: amount is not checked against max uint",
      "Tx.origin authorization exploit"
    ],
    correctIndex: 1,
    explanation: "Because the balance is updated *after* the external contract call, an attacker can recursively call 'withdraw' before their balance decreases, draining the entire contract's funds."
  },
  {
    id: "q2",
    title: "Phishing via Tx.Origin",
    code: `function transfer(address to, uint amount) public {
  require(tx.origin == owner, "Not owner");
  payable(to).transfer(amount);
}`,
    options: [
      "Access Control issue: tx.origin can be spoofed by an intermediary contract",
      "Gas exhaustion exploit",
      "Reentrancy vulnerability",
      "Denial of Service: to address blocking the transfer"
    ],
    correctIndex: 0,
    explanation: "Using tx.origin for authorization allows a malicious contract to trick the owner into calling it, which then forwards the call to this contract. The tx.origin will still be the owner, bypassing the security check. Use msg.sender instead."
  },
  {
    id: "q3",
    title: "Unsafe Integer Math (Solidity <0.8)",
    code: `// Solidity v0.7.0
function transfer(address to, uint amount) public {
  require(balances[msg.sender] - amount >= 0);
  balances[msg.sender] -= amount;
  balances[to] += amount;
}`,
    options: [
      "No issue because balance check uses '>= 0'",
      "Reentrancy vulnerability",
      "Integer Underflow: subtracting past 0 wraps around to a massive number",
      "Denial of service on array loop"
    ],
    correctIndex: 2,
    explanation: "In Solidity version <0.8.0, arithmetic operations wrap around by default. If 'balances[msg.sender] - amount' is negative, it wraps around to a massive positive integer, making the '>= 0' check always pass!"
  },
  {
    id: "q4",
    title: "Rigid Balance Check Vulnerability",
    code: `function claimVictory() public {
  require(address(this).balance == targetFunds, "Game active");
  winner = msg.sender;
}`,
    options: [
      "Vulnerable to force-feeding ether via 'selfdestruct'",
      "Reentrancy exploit",
      "Transaction order dependence",
      "Improper visibility of variable"
    ],
    correctIndex: 0,
    explanation: "Contracts can be forcefully sent ether using the 'selfdestruct(target)' opcode from another contract. This bypasses any receive/fallback functions, meaning address(this).balance can exceed targetFunds, permanently locking the state."
  },
  {
    id: "q5",
    title: "Private State Variable Misconception",
    code: `contract SecretVault {
  uint256 private secretKey;
  address private admin;
}`,
    options: [
      "The private keyword encrypts the data",
      "Assuming private variables are hidden from off-chain inspection",
      "Anyone can modify secretKey because it's private",
      "Compiler error on private storage"
    ],
    correctIndex: 1,
    explanation: "All data stored on a public blockchain is completely visible to anyone off-chain, regardless of visibility modifiers like 'private'. Private only restricts read/write access from other smart contracts on-chain."
  }
];

export default function ChallengeModal({ 
  competitor, 
  userProfile, 
  onClose, 
  onUpdateXP,
  initialState,
  incomingDuelType,
  duelId,
  challengerScore,
  onResolveDuel
}: ChallengeModalProps) {
  const [gameState, setGameState] = useState<DuelState>(initialState || "intro");
  const [selectedChallenge, setSelectedChallenge] = useState<"quiz" | "race" | null>(incomingDuelType || null);
  const [acceptancePercentage, setAcceptancePercentage] = useState(0);
  const [declinedReason, setDeclinedReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [raceStartTime, setRaceStartTime] = useState<number>(0);
  
  // Quiz states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [quizTimer, setQuizTimer] = useState(15);
  const quizTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hash Race states
  const [playerProgress, setPlayerProgress] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [currentHash, setCurrentHash] = useState("0x0000000000000000000000000000000000000000");
  const [hashRate, setHashRate] = useState(0);
  const [raceActive, setRaceActive] = useState(false);
  const raceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // General results
  const [winnerName, setWinnerName] = useState<string>("");
  const [xpChange, setXpChange] = useState<number>(0);

  const getCurrentUserDbId = () => {
    return userProfile.isRealUser && userProfile.accountUsername
      ? userProfile.accountUsername.trim().toLowerCase()
      : `guest_${userProfile.userId}`;
  };

  // Trigger sound feedback when switching states
  const transitionTo = (state: DuelState) => {
    playSound("click");
    setGameState(state);
  };

  // Close with sound
  const handleClose = () => {
    playSound("click");
    onClose();
  };

  // Setup challenge game directly if launched from an accepted incoming invitation
  useEffect(() => {
    if (initialState === "playing_quiz") {
      startQuizGame();
    } else if (initialState === "playing_race") {
      startHashRace();
    }
  }, [initialState]);

  // Handle simulated matchmaking is completely disabled since duels are real-time!
  // This is kept as a fallback or unused
  useEffect(() => {
    if (gameState === "awaiting_acceptance") {
      setAcceptancePercentage(0);
      const progressTimer = setInterval(() => {
        setAcceptancePercentage(prev => {
          if (prev >= 100) {
            clearInterval(progressTimer);
            return 100;
          }
          return prev + 5;
        });
      }, 100);

      const responseTimer = setTimeout(() => {
        clearInterval(progressTimer);
        playSound("mission_complete");
        setGameState("select");
      }, 2200);

      return () => {
        clearInterval(progressTimer);
        clearTimeout(responseTimer);
      };
    }
  }, [gameState]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
      if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    };
  }, []);

  // Opponent difficulty speed based on level
  const getOpponentParameters = () => {
    const lvl = competitor.level;
    const accuracy = 0.4 + (lvl * 0.1); // range 0.5 to 0.9+
    const speedMs = Math.max(1500, 4000 - (lvl * 400)); // range 1500ms (fast) to 3600ms (slow)
    const hashSpeed = lvl * 4 + 5; // how much progress they gain per second
    return { accuracy, speedMs, hashSpeed };
  };

  // ----------------------------------------------------
  // QUIZ GAME LOGIC
  // ----------------------------------------------------
  const startQuizGame = () => {
    setSelectedChallenge("quiz");
    setGameState("playing_quiz");
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setOpponentScore(0);
    setIsAnswerRevealed(false);
    startQuizTimer();
  };

  const startQuizTimer = () => {
    setQuizTimer(15);
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    
    // Determine if opponent gets it right on this question
    let opponentDelay = 3000;
    let gotItRight = false;

    if (challengerScore !== undefined) {
      // In incoming flow, pre-render correct answer count to equal challengerScore
      gotItRight = currentQuestionIndex < challengerScore;
      opponentDelay = Math.random() * 2000 + 1500;
    } else {
      // Outgoing flow: simulate active competitor difficulty
      const { accuracy, speedMs } = getOpponentParameters();
      gotItRight = Math.random() < accuracy;
      opponentDelay = Math.random() * 3000 + (speedMs - 1000);
    }

    const oppTimer = setTimeout(() => {
      if (gotItRight) {
        setOpponentScore(prev => prev + 1);
      }
    }, opponentDelay);

    quizTimerRef.current = setInterval(() => {
      setQuizTimer((prev) => {
        if (prev <= 1) {
          clearInterval(quizTimerRef.current!);
          revealAnswer(-1); // time out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(oppTimer);
  };

  const selectOption = (optIdx: number) => {
    if (isAnswerRevealed) return;
    playSound("click");
    setSelectedAnswer(optIdx);
    revealAnswer(optIdx);
  };

  const revealAnswer = (playerAnswer: number) => {
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    setIsAnswerRevealed(true);
    
    const currentQ = QUIZ_QUESTIONS[currentQuestionIndex];
    if (playerAnswer === currentQ.correctIndex) {
      setQuizScore(prev => prev + 1);
      playSound("click");
    }
  };

  const nextQuestion = () => {
    playSound("click");
    setIsAnswerRevealed(false);
    setSelectedAnswer(null);
    
    if (currentQuestionIndex + 1 < 3) { // 3-question duel
      setCurrentQuestionIndex(prev => prev + 1);
      startQuizTimer();
    } else {
      endQuizGame();
    }
  };

  const endQuizGame = () => {
    setIsSubmitting(true);
    const myScore = quizScore;
    
    if (duelId) {
      // Resolve incoming duel on the backend!
      fetch("/api/duels/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duelId,
          targetScore: myScore
        })
      })
      .then(res => res.json())
      .then(data => {
        setIsSubmitting(false);
        if (data.success) {
          const isWinner = data.winnerId === getCurrentUserDbId();
          setWinnerName(data.winnerName);
          const change = isWinner ? 50 : data.winnerId === null ? 15 : -15;
          setXpChange(change);
          
          if (onResolveDuel) {
            onResolveDuel(duelId, change);
          } else {
            onUpdateXP(change, true);
          }
          setGameState("result");
        }
      })
      .catch(err => {
        console.error("Resolve duel error:", err);
        setIsSubmitting(false);
      });
    } else {
      // Create outgoing duel challenge in Firestore!
      fetch("/api/duels/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengerId: getCurrentUserDbId(),
          challengerName: userProfile.username,
          challengerAvatar: userProfile.avatar,
          targetId: competitor.id,
          challengeType: "quiz",
          challengerScore: myScore
        })
      })
      .then(res => res.json())
      .then(data => {
        setIsSubmitting(false);
        if (data.success) {
          setGameState("awaiting_opponent_completion");
        }
      })
      .catch(err => {
        console.error("Create duel error:", err);
        setIsSubmitting(false);
      });
    }
  };

  // ----------------------------------------------------
  // HASH RACE GAME LOGIC
  // ----------------------------------------------------
  const startHashRace = () => {
    setSelectedChallenge("race");
    setGameState("playing_race");
    setPlayerProgress(0);
    setOpponentProgress(0);
    setHashRate(0);
    setRaceActive(true);
    setRaceStartTime(Date.now());

    if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    
    // If incoming challenge: the opponent progress matches Challenger's speed linearly!
    const targetRaceDuration = challengerScore || (4000 - competitor.level * 400); 
    const tickMs = 100;
    const increment = (100 / (targetRaceDuration / tickMs));

    raceIntervalRef.current = setInterval(() => {
      // Opponent progress increment
      setOpponentProgress((prev) => {
        const nextOpp = prev + increment;
        if (nextOpp >= 100) {
          clearInterval(raceIntervalRef.current!);
          setRaceActive(false);
          finishHashRace(false);
          return 100;
        }
        return nextOpp;
      });

      // Decay player hash rate slightly
      setHashRate(prev => Math.max(0, prev - 1.5));
      
      // Randomize flashing hash
      setCurrentHash("0x" + Array.from({length: 40}, () => 
        "0123456789abcdef"[Math.floor(Math.random() * 16)]
      ).join(""));

    }, tickMs);
  };

  const clickMine = () => {
    if (!raceActive) return;
    playSound("click");
    
    // Increase hash rate and progress
    setHashRate(prev => Math.min(250, prev + 25));
    setPlayerProgress((prev) => {
      const nextPlayer = prev + 4.5 + (userProfile.level * 0.3); // higher level users have a small mining boost!
      if (nextPlayer >= 100) {
        clearInterval(raceIntervalRef.current!);
        setRaceActive(false);
        finishHashRace(true);
        return 100;
      }
      return nextPlayer;
    });
  };

  const finishHashRace = (playerWon: boolean) => {
    const elapsed = Date.now() - raceStartTime;
    setIsSubmitting(true);

    if (duelId) {
      // Resolve incoming duel on backend
      fetch("/api/duels/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duelId,
          targetScore: elapsed
        })
      })
      .then(res => res.json())
      .then(data => {
        setIsSubmitting(false);
        if (data.success) {
          const isWinner = data.winnerId === getCurrentUserDbId();
          setWinnerName(data.winnerName);
          const change = isWinner ? 50 : data.winnerId === null ? 15 : -15;
          setXpChange(change);
          
          if (onResolveDuel) {
            onResolveDuel(duelId, change);
          } else {
            onUpdateXP(change, true);
          }
          setGameState("result");
        }
      })
      .catch(err => {
        console.error("Resolve race error:", err);
        setIsSubmitting(false);
      });
    } else {
      // Create outgoing duel challenge in Firestore
      fetch("/api/duels/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengerId: getCurrentUserDbId(),
          challengerName: userProfile.username,
          challengerAvatar: userProfile.avatar,
          targetId: competitor.id,
          challengeType: "race",
          challengerScore: elapsed
        })
      })
      .then(res => res.json())
      .then(data => {
        setIsSubmitting(false);
        if (data.success) {
          setGameState("awaiting_opponent_completion");
        }
      })
      .catch(err => {
        console.error("Create duel error:", err);
        setIsSubmitting(false);
      });
    }
  };


  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]" id="duel-arena-modal">
        
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-indigo-500 to-emerald-500" />
        
        {/* Close Button */}
        <button 
          onClick={handleClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-all duration-200 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ========================================================
            1. INTRO ARENA SCREEN
           ======================================================== */}
        {gameState === "intro" && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="bg-indigo-600/10 border border-indigo-500/30 p-4 rounded-full animate-bounce">
              <Swords className="w-12 h-12 text-indigo-400" />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-wider text-slate-100 uppercase">
                Challenger Approaching!
              </h2>
              <p className="text-xs text-indigo-400 font-bold font-mono tracking-widest mt-1">
                LEADERBOARD DUEL ARENA
              </p>
            </div>

            {/* Duelists Cards */}
            <div className="grid grid-cols-5 items-center w-full max-w-md gap-4 py-4">
              {/* User */}
              <div className="col-span-2 bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-4xl mb-2">{userProfile.avatar || "👨‍💻"}</span>
                <span className="text-xs font-bold text-indigo-300 line-clamp-1">{userProfile.username}</span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">LVL {userProfile.level}</span>
                <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full mt-2">
                  {userProfile.xp} XP
                </span>
              </div>

              {/* VS */}
              <div className="col-span-1 flex flex-col items-center">
                <span className="text-lg font-black font-mono italic text-red-500 bg-red-500/10 border border-red-500/30 w-10 h-10 rounded-full flex items-center justify-center animate-pulse">
                  VS
                </span>
              </div>

              {/* Competitor */}
              <div className="col-span-2 bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-4xl mb-2">{competitor.avatar}</span>
                <span className="text-xs font-bold text-slate-200 line-clamp-1">{competitor.username}</span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">LVL {competitor.level}</span>
                <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full mt-2">
                  {competitor.xp} XP
                </span>
              </div>
            </div>

            <div className="space-y-3 max-w-sm w-full">
              <button 
                onClick={() => transitionTo("select")}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold py-3.5 px-6 rounded-2xl transition-all duration-300 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                Enter the Duel <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={handleClose}
                className="w-full border border-slate-800 hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 text-xs font-bold py-3 px-6 rounded-2xl transition-all"
              >
                Decline Match
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            Simulated Outgoing Acceptance: Awaiting Acceptance Screen
           ======================================================== */}
        {gameState === "awaiting_acceptance" && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
            <div className="relative flex items-center justify-center w-28 h-28">
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-indigo-400/40 animate-pulse" />
              
              {/* Rotating border container */}
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin duration-1000" />
              
              {/* Avatar */}
              <span className="text-5xl z-10">{competitor.avatar}</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wider flex items-center justify-center gap-2">
                <Hourglass className="w-4 h-4 text-indigo-400 animate-spin" />
                CONNECTING DUELISTS
              </h2>
              <p className="text-xs text-slate-400">
                Pinging <strong className="text-slate-200">{competitor.username}</strong> on the Island decentralized lobby...
              </p>
            </div>

            {/* Handshake logs terminal */}
            <div className="w-full max-w-sm bg-slate-950 border border-slate-850 rounded-2xl p-4 text-left font-mono text-[10px] text-slate-400 space-y-1.5 shadow-inner">
              <div className="flex items-center gap-2 text-indigo-400">
                <span>❯</span>
                <span className="animate-pulse">INITIATING CRYPTOGRAPHIC DUEL REQUEST...</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-indigo-400">❯</span>
                <span>MATCH Lobby Node: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-indigo-400">❯</span>
                <span>Broadcasting state packet: {acceptancePercentage}% complete</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-indigo-400">❯</span>
                <span className="text-slate-500">Awaiting block signature from competitor...</span>
              </div>
            </div>

            {/* Cancel Button */}
            <button 
              onClick={() => transitionTo("intro")}
              className="text-xs text-slate-500 hover:text-slate-300 underline"
            >
              Cancel Invitation
            </button>
          </div>
        )}

        {/* ========================================================
            Simulated Outgoing Acceptance: Declined Screen
           ======================================================== */}
        {gameState === "declined" && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-full">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-black text-red-500 uppercase tracking-wider">
                COMPETITOR UNAVAILABLE
              </h2>
              <p className="text-xs text-slate-300 max-w-md leading-relaxed font-mono">
                {declinedReason}
              </p>
            </div>

            <button 
              onClick={handleClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 px-6 rounded-xl transition-all"
            >
              Back to Leaderboard
            </button>
          </div>
        )}

        {/* ========================================================
            2. CHALLENGE SELECT SCREEN
           ======================================================== */}
        {gameState === "select" && (
          <div className="p-8 flex flex-col space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-black text-slate-100 uppercase tracking-wide">
                SELECT YOUR DUEL TYPE
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose the task you want to execute to defeat <strong className="text-slate-200">{competitor.username}</strong>!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Smart Contract Bug Hunt */}
              <div 
                onClick={startQuizGame}
                className="bg-slate-950/40 border border-slate-800 hover:border-indigo-500/60 p-5 rounded-2xl cursor-pointer group transition-all hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 group-hover:bg-indigo-500/20">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-100 uppercase group-hover:text-indigo-400 transition-all">
                      🛡️ SMART CONTRACT BUG HUNT
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Audit smart contract snippets. Detect reentrancy, access control bypass, and integer underflows. Best of 3!
                    </p>
                    <div className="flex items-center gap-2 mt-4 text-[10px] font-mono">
                      <span className="text-emerald-400 font-bold">REWARD: +{50 + competitor.level * 10} XP</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-red-400">RISK: -15 XP</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Cryptographic Hash Race */}
              <div 
                onClick={startHashRace}
                className="bg-slate-950/40 border border-slate-800 hover:border-red-500/60 p-5 rounded-2xl cursor-pointer group transition-all hover:shadow-lg hover:shadow-red-500/5 hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 group-hover:bg-red-500/20">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-100 uppercase group-hover:text-red-400 transition-all">
                      ⚡ CRYPTOGRAPHIC HASH RACE
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Click to trigger cryptographic hash calculations and mine blocks. Race against {competitor.username}'s automated hashpower!
                    </p>
                    <div className="flex items-center gap-2 mt-4 text-[10px] font-mono">
                      <span className="text-emerald-400 font-bold">REWARD: +{45 + competitor.level * 8} XP</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-red-400">RISK: -15 XP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => transitionTo("intro")}
              className="text-center text-xs text-slate-500 hover:text-slate-300 underline pt-2"
            >
              Back to Duelist Profile
            </button>
          </div>
        )}

        {/* ========================================================
            3. SMART CONTRACT BUG HUNT (QUIZ GAMEPLAY)
           ======================================================== */}
        {gameState === "playing_quiz" && (
          <div className="p-6 flex flex-col flex-1 overflow-y-auto space-y-5">
            {/* Duel Score Board */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{userProfile.avatar}</span>
                <div>
                  <p className="text-[10px] font-mono text-slate-400">YOU</p>
                  <p className="text-xs font-bold text-indigo-400">{quizScore} / 3 PTS</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-mono text-slate-400">
                <Hourglass className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>Q {currentQuestionIndex + 1}/3</span>
                <span className="text-indigo-400 font-bold ml-1">{quizTimer}s</span>
              </div>

              <div className="flex items-center gap-2 text-right">
                <div>
                  <p className="text-[10px] font-mono text-slate-400">{competitor.username.toUpperCase()}</p>
                  <p className="text-xs font-bold text-red-400">{opponentScore} / 3 PTS</p>
                </div>
                <span className="text-lg">{competitor.avatar}</span>
              </div>
            </div>

            {/* Question description */}
            <div className="space-y-3">
              <span className="text-[9px] font-mono font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                AUDIT DISCOVERY #{currentQuestionIndex + 1}
              </span>
              <h3 className="text-sm font-bold text-slate-100">
                {QUIZ_QUESTIONS[currentQuestionIndex].title}
              </h3>
            </div>

            {/* Code Snippet */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 overflow-x-auto relative">
              <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
                <Terminal className="w-3 h-3" /> solidity v0.8+
              </div>
              <pre className="text-[11px] font-mono text-slate-300 leading-relaxed">
                {QUIZ_QUESTIONS[currentQuestionIndex].code}
              </pre>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-2.5">
              {QUIZ_QUESTIONS[currentQuestionIndex].options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = QUIZ_QUESTIONS[currentQuestionIndex].correctIndex === idx;
                
                let optionStyle = "bg-slate-950/40 border-slate-850 hover:bg-slate-950 hover:border-slate-800 text-slate-200";
                
                if (isAnswerRevealed) {
                  if (isCorrect) {
                    optionStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-400";
                  } else if (isSelected) {
                    optionStyle = "bg-red-500/10 border-red-500 text-red-400";
                  } else {
                    optionStyle = "bg-slate-950/20 border-slate-900 text-slate-600";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswerRevealed}
                    onClick={() => selectOption(idx)}
                    className={`p-3.5 rounded-xl border text-left text-xs font-semibold transition-all duration-200 flex items-center justify-between gap-3 ${optionStyle}`}
                  >
                    <span>{opt}</span>
                    {isAnswerRevealed && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Answer Explanation */}
            {isAnswerRevealed && (
              <div className="bg-slate-950/50 border border-slate-850 rounded-2xl p-4 text-xs animate-fade-in space-y-2">
                <p className="font-bold text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" />
                  VULNERABILITY ANALYSIS:
                </p>
                <p className="text-slate-400 leading-relaxed font-mono text-[11px]">
                  {QUIZ_QUESTIONS[currentQuestionIndex].explanation}
                </p>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={nextQuestion}
                    className="bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-extrabold px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                  >
                    CONTINUE DUEL <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            4. CRYPTOGRAPHIC HASH RACE (GAMEPLAY)
           ======================================================== */}
        {gameState === "playing_race" && (
          <div className="p-6 flex flex-col items-center justify-center space-y-6 flex-1 overflow-y-auto">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-extrabold">
                BLOCK MINING DUEL
              </span>
              <h3 className="text-lg font-bold text-slate-100">
                Mempool Block Mining Speed Battle
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Spam click the Miner to increase your Hash Rate! Find the block nonce before <strong className="text-slate-200">{competitor.username}</strong> solves the block header hash!
              </p>
            </div>

            {/* Race Stats Dashboard */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {/* User stats */}
              <div className="bg-slate-950 border border-indigo-500/20 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-2xl mb-1">{userProfile.avatar}</span>
                <span className="text-xs font-bold text-indigo-300">YOU (Miner)</span>
                <span className="text-lg font-mono font-bold text-white mt-1">
                  {Math.round(playerProgress)}%
                </span>
                <p className="text-[10px] text-indigo-400 font-mono mt-1">
                  HASHRATE: <span className="font-bold">{hashRate.toFixed(1)} MH/s</span>
                </p>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-3 border border-slate-800">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-100" 
                    style={{ width: `${playerProgress}%` }}
                  />
                </div>
              </div>

              {/* Opponent stats */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-2xl mb-1">{competitor.avatar}</span>
                <span className="text-xs font-bold text-slate-300">{competitor.username}</span>
                <span className="text-lg font-mono font-bold text-white mt-1">
                  {Math.round(opponentProgress)}%
                </span>
                <p className="text-[10px] text-red-400 font-mono mt-1">
                  HASHRATE: <span className="font-bold">{(competitor.level * 20 + 20).toFixed(1)} MH/s</span>
                </p>

                {/* Progress bar */}
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-3 border border-slate-800">
                  <div 
                    className="bg-red-500 h-full rounded-full transition-all duration-100" 
                    style={{ width: `${opponentProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current Mining Hash Feed */}
            <div className="w-full max-w-md bg-slate-950 border border-slate-850 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg shrink-0">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="font-mono text-[10px] overflow-hidden truncate">
                <p className="text-slate-500 font-bold uppercase">SHA256 HASHER ENGINE</p>
                <p className="text-indigo-300 truncate mt-0.5">{currentHash}</p>
              </div>
            </div>

            {/* BIG GIANT MINING TRIGGER BUTTON */}
            <button
              onMouseDown={clickMine}
              className="w-40 h-40 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 border-4 border-slate-900 outline-none select-none text-white font-extrabold flex flex-col items-center justify-center gap-1.5 shadow-xl hover:shadow-indigo-500/10 active:scale-95 duration-100 transition-all cursor-pointer relative group"
            >
              <div className="absolute inset-0 rounded-full border-2 border-indigo-400/20 animate-ping group-hover:block hidden" />
              <Zap className="w-8 h-8 text-yellow-300 animate-pulse" />
              <span className="text-sm tracking-wider uppercase font-black">MINE</span>
              <span className="text-[9px] font-mono text-indigo-200">CLICK FAST!</span>
            </button>
          </div>
        )}

        {/* ========================================================
            5. FINAL RESULTS SCREEN
           ======================================================== */}
        {gameState === "result" && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
            {xpChange > 0 ? (
              <>
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-full animate-pulse">
                  <Trophy className="w-16 h-16 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-wider">
                    VICTORY IS YOURS!
                  </h2>
                  <p className="text-xs text-slate-400">
                    You completely outclassed <span className="font-bold text-slate-200">{competitor.username}</span> in the Arena!
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-full">
                  <Flame className="w-16 h-16 text-red-500 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-red-500 uppercase tracking-wider">
                    DEFEAT
                  </h2>
                  <p className="text-xs text-slate-400">
                    <span className="font-bold text-slate-200">{competitor.username}</span> claims the victory in this clash. Take it as an opportunity to sharpen your knowledge!
                  </p>
                </div>
              </>
            )}

            {/* XP Claim Board */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between font-mono text-xs text-slate-500 border-b border-slate-900 pb-2.5">
                <span>DUEL ARENA RESULTS</span>
                <span>ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Winner:</span>
                <span className="text-xs font-bold text-slate-200">{winnerName}</span>
              </div>

              <div className="flex justify-between items-center border-t border-slate-900 pt-2.5">
                <span className="text-xs text-slate-400">XP Change:</span>
                <span className={`text-sm font-black font-mono ${xpChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {xpChange > 0 ? `+${xpChange}` : xpChange} XP
                </span>
              </div>
            </div>

            <button 
              onClick={handleClose}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3.5 px-8 rounded-2xl transition-all duration-300 w-full max-w-xs shadow-lg shadow-indigo-500/25"
            >
              Return to Island Map
            </button>
          </div>
        )}

        {/* ========================================================
            6. AWAITING OPPONENT COMPLETION (REAL MULTIPLAYER SUBMITTED SCREEN)
           ======================================================== */}
        {gameState === "awaiting_opponent_completion" && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
            <div className="bg-indigo-500/10 border border-indigo-500/30 p-5 rounded-full animate-bounce">
              <Swords className="w-16 h-16 text-indigo-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-indigo-400 uppercase tracking-wider">
                CHALLENGE BROADCASTED! ⚔️
              </h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Your score has been sealed in Firestore! We've sent a real-time notification to <strong className="text-white">{competitor.username}</strong>.
              </p>
            </div>

            {/* Verification Receipt */}
            <div className="w-full max-w-sm bg-slate-950 border border-slate-850 rounded-2xl p-4 text-left font-mono text-[10px] text-slate-400 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between text-indigo-400">
                <span>[ STATUS: PENDING ]</span>
                <span className="animate-pulse">● BROADCASTING</span>
              </div>
              <div className="border-t border-slate-900 my-2" />
              <div className="flex justify-between">
                <span>Opponent:</span>
                <span className="text-slate-200">{competitor.username}</span>
              </div>
              <div className="flex justify-between">
                <span>Game Type:</span>
                <span className="text-indigo-300 uppercase">{selectedChallenge === "quiz" ? "Bug Hunt (Quiz)" : "Hash Race"}</span>
              </div>
              <div className="flex justify-between">
                <span>Your Secured Score:</span>
                <span className="text-emerald-400 font-bold">
                  {selectedChallenge === "quiz" ? `${quizScore}/3 correct` : `${(raceStartTime ? (Date.now() - raceStartTime) / 1000 : 0).toFixed(2)}s`}
                </span>
              </div>
            </div>

            <button 
              onClick={handleClose}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3.5 px-8 rounded-2xl transition-all duration-300 w-full max-w-xs shadow-lg shadow-indigo-500/25"
            >
              Back to Island Map
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
