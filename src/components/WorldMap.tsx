import React from "react";
import { Lock, CheckCircle2, Star, Shield, ArrowRight, Zap, Coins, Hammer, Code, ArrowUpRight, Database, Layers, Users } from "lucide-react";
import { motion } from "motion/react";

interface Zone {
  id: string;
  name: string;
  level: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  glow: string;
  minXp: number;
  questTitle: string;
  x: number; // SVG center point percentages
  y: number;
}

interface WorldMapProps {
  userXP: number;
  completedLessons: string[];
  activeZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}

export const ZONES: Zone[] = [
  {
    id: "wallet",
    name: "Wallet Village",
    level: "Zone 1",
    icon: Shield,
    description: "Derive key pairs, generate 12-word recovery phrases, and manage digital identity securely.",
    color: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.3)",
    minXp: 0,
    questTitle: "Derive Key Pairs & Seed Phrases",
    x: 12,
    y: 35,
  },
  {
    id: "transaction",
    name: "Transaction Valley",
    level: "Zone 2",
    icon: Zap,
    description: "Construct cryptographically signed transactions, adjust gas fees, and master the Mempool queues.",
    color: "from-sky-500 to-indigo-600",
    glow: "rgba(14,165,233,0.3)",
    minXp: 100,
    questTitle: "Cryptographic Signing & Gas Fees",
    x: 24,
    y: 65,
  },
  {
    id: "mining",
    name: "Mining Mountains",
    level: "Zone 3",
    icon: Hammer,
    description: "Race to find nonces that hash blocks using SHA-256 and confirm distributed consensus.",
    color: "from-amber-500 to-orange-600",
    glow: "rgba(245,158,11,0.3)",
    minXp: 250,
    questTitle: "Proof of Work Nonce Racing",
    x: 38,
    y: 30,
  },
  {
    id: "contract",
    name: "Smart Contract City",
    level: "Zone 4",
    icon: Code,
    description: "Write immutable agreements, build a simulated digital vending machine, and emit custom NFT badges.",
    color: "from-violet-500 to-fuchsia-600",
    glow: "rgba(139,92,246,0.3)",
    minXp: 450,
    questTitle: "Deconstruct Solidity Statements",
    x: 52,
    y: 65,
  },
  {
    id: "defi",
    name: "DeFi District",
    level: "Zone 5",
    icon: Coins,
    description: "Explore liquidity pools, perform trades, and master the Constant Product Formula: x * y = k.",
    color: "from-rose-500 to-pink-600",
    glow: "rgba(244,63,94,0.3)",
    minXp: 700,
    questTitle: "Master constant-product AMM swaps",
    x: 65,
    y: 28,
  },
  {
    id: "oracle",
    name: "Oracle Citadel",
    level: "Zone 6",
    icon: Database,
    description: "Aggregate decentralized external price feeds and resolve off-chain consensus for smart contracts.",
    color: "from-cyan-500 to-blue-600",
    glow: "rgba(6,182,212,0.3)",
    minXp: 1000,
    questTitle: "Aggregate Decentralized Data Consensus",
    x: 78,
    y: 62,
  },
  {
    id: "l2",
    name: "Layer-2 Lagoon",
    level: "Zone 7",
    icon: Layers,
    description: "Bundle multiple transactions off-chain into an L2 Rollup to compress gas costs and scale throughput.",
    color: "from-indigo-500 to-purple-600",
    glow: "rgba(99,102,241,0.3)",
    minXp: 1400,
    questTitle: "Generate Rollup Batch Proofs",
    x: 88,
    y: 32,
  },
  {
    id: "dao",
    name: "DAO Dome",
    level: "Zone 8",
    icon: Users,
    description: "Propose key updates, vote democratically with governance tokens, and execute decentralized upgrades.",
    color: "from-emerald-500 to-indigo-600",
    glow: "rgba(16,185,129,0.3)",
    minXp: 1900,
    questTitle: "Create & Execute Governance Proposals",
    x: 94,
    y: 70,
  },
];

export default function WorldMap({ userXP, completedLessons, activeZoneId, onSelectZone }: WorldMapProps) {
  const [mobileView, setMobileView] = React.useState<"map" | "list">("map");
  // Determine if a zone is unlocked
  const isZoneUnlocked = (zone: Zone) => userXP >= zone.minXp;

  return (
    <div className="w-full rounded-3xl border border-slate-800/80 bg-slate-950 shadow-2xl overflow-hidden">
      {/* Mobile Mode Switcher (Visible on small screens) */}
      <div className="flex sm:hidden items-center justify-between p-3 bg-slate-900/90 border-b border-slate-850">
        <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">View Mode:</span>
        <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs font-mono">
          <button
            onClick={() => setMobileView("map")}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              mobileView === "map" ? "bg-indigo-600 text-white" : "text-slate-400"
            }`}
          >
            🗺️ Map
          </button>
          <button
            onClick={() => setMobileView("list")}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              mobileView === "list" ? "bg-indigo-600 text-white" : "text-slate-400"
            }`}
          >
            📜 Zone Directory
          </button>
        </div>
      </div>

      {/* List View for Mobile Phone Users */}
      {mobileView === "list" ? (
        <div className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <div>
              <h3 className="text-base font-bold text-white">Campaign Districts</h3>
              <p className="text-xs text-slate-400">Select any unlocked zone to launch its quest</p>
            </div>
            <div className="text-right font-mono text-xs text-indigo-400 font-bold">
              {completedLessons.length}/{ZONES.length} Cleared
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {ZONES.map((zone, idx) => {
              const unlocked = isZoneUnlocked(zone);
              const completed = completedLessons.includes(zone.id);
              const active = activeZoneId === zone.id;
              const Icon = zone.icon;

              return (
                <div
                  key={zone.id}
                  onClick={() => unlocked && onSelectZone(zone.id)}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                    unlocked ? "cursor-pointer active:scale-[0.98]" : "opacity-60 cursor-not-allowed"
                  } ${
                    active
                      ? "bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10"
                      : completed
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : unlocked
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                      : "bg-slate-950/60 border-slate-850"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                        completed
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                          : unlocked
                          ? "bg-slate-850 border-slate-700 text-indigo-400"
                          : "bg-slate-950 border-slate-850 text-slate-600"
                      }`}
                    >
                      {unlocked ? <Icon className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">
                          {zone.level}
                        </span>
                        {completed && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> CLEARED
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white leading-tight">{zone.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{zone.questTitle}</p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {unlocked ? (
                      <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1">
                        ENTER <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-950 px-2 py-1 rounded-lg border border-slate-850">
                        {zone.minXp} XP
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Interactive SVG Map View */
        <div className="w-full">
          {/* Map Header Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-850 flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-slate-900/40">
            <div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full font-mono tracking-widest uppercase">
                Active Campaign Map
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1.5">Blockchain Island</h2>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Navigate the learning zones to acquire knowledge, solve dynamic mini-games, and unlock the next districts.
              </p>
            </div>
            
            {/* Progress indicator */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 sm:text-right font-mono text-xs shrink-0">
              <p className="text-slate-500 text-[10px] tracking-wider uppercase">MAP COMPLETION</p>
              <p className="text-white font-semibold mt-0.5">
                {completedLessons.length} / {ZONES.length} Lessons Cleared
              </p>
              <div className="w-28 bg-slate-850 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-indigo-500 h-full transition-all duration-500"
                  style={{ width: `${(completedLessons.length / ZONES.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Canvas Container */}
          <div className="overflow-x-auto scrollbar-none p-2 sm:p-4">
            <div className="relative w-[780px] sm:w-full sm:aspect-[16/9] min-h-[400px] rounded-2xl overflow-hidden border border-slate-850 bg-slate-950/80">
              {/* Visual background decor: grid overlay & soft radial gradients */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.12),rgba(255,255,255,0))]" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.65)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.65)_1px,transparent_1px)] bg-[size:32px_32px]" />

              {/* SVG Map Layer for nodes and interactive routes */}
              <div className="absolute inset-0 z-0 flex items-center justify-center p-6 sm:p-10">
                <svg className="w-full h-full" viewBox="0 0 1000 625" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Draw connecting routes between zones */}
                  {ZONES.map((zone, idx) => {
                    if (idx === ZONES.length - 1) return null;
                    const nextZone = ZONES[idx + 1];
                    const unlocked = isZoneUnlocked(nextZone);
                    
                    return (
                      <g key={zone.id}>
                        <line
                          x1={`${zone.x * 10}`}
                          y1={`${zone.y * 6.25}`}
                          x2={`${nextZone.x * 10}`}
                          y2={`${nextZone.y * 6.25}`}
                          stroke={unlocked ? "#06b2d2" : "#15181c"}
                          strokeWidth="3"
                          strokeDasharray="6 6"
                          className={unlocked ? "animate-[dash_20s_linear_infinite]" : ""}
                        />
                      </g>
                    );
                  })}

                  {/* Interactive Dotted Ring / Visual Islands */}
                  <circle cx="500" cy="312.5" r="280" stroke="rgba(6,182,212,0.04)" strokeWidth="1" />
                  <circle cx="500" cy="312.5" r="180" stroke="rgba(6,182,212,0.03)" strokeWidth="1" />
                </svg>
              </div>

              {/* Custom absolute placement of Zone Cards over the map coordinate system */}
              <div className="absolute inset-0 z-10 p-6 sm:p-10 overflow-visible">
                {ZONES.map((zone, idx) => {
                  const unlocked = isZoneUnlocked(zone);
                  const active = activeZoneId === zone.id;
                  const completed = completedLessons.includes(zone.id);
                  const Icon = zone.icon;

                  return (
                    <div
                      key={zone.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group"
                      style={{
                        left: `${zone.x}%`,
                        top: `${zone.y}%`,
                      }}
                      onClick={() => {
                        if (unlocked) onSelectZone(zone.id);
                      }}
                    >
                      <div className="relative">
                        {/* Node Button Circle */}
                        <motion.div
                          whileHover={{ scale: unlocked ? 1.05 : 1 }}
                          whileTap={{ scale: unlocked ? 0.95 : 1 }}
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center relative shadow-xl transition-all duration-300 ${
                            active
                              ? "bg-slate-900 border-indigo-400 scale-110"
                              : completed
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                              : unlocked
                              ? "bg-slate-900 border-slate-700 text-slate-300 group-hover:border-slate-500"
                              : "bg-slate-950 border-slate-850 text-slate-600 cursor-not-allowed"
                          }`}
                          style={{
                            boxShadow: active
                              ? `0 0 20px ${zone.glow}`
                              : unlocked
                              ? `0 0 10px rgba(0,0,0,0.5)`
                              : "none",
                          }}
                        >
                          {unlocked ? (
                            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${active ? "animate-pulse" : ""}`} />
                          ) : (
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                          )}

                          {/* Tiny Completed Badge */}
                          {completed && (
                            <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full border border-slate-950">
                              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current stroke-[3px]" />
                            </span>
                          )}
                          
                          {/* Micro index */}
                          <span className="absolute -bottom-1 bg-slate-900 border border-slate-800 text-[8px] font-mono font-bold text-slate-500 px-1.5 py-0.5 rounded-full scale-75">
                            0{idx + 1}
                          </span>
                        </motion.div>

                        {/* Hover/Persistent Info Card */}
                        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-48 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-2xl flex flex-col gap-1 text-center">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase">{zone.level}</span>
                            {completed ? (
                              <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> CLEARED
                              </span>
                            ) : unlocked ? (
                              <span className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current text-indigo-400" /> ACTIVE
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-rose-400 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> LOCKED
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-slate-100">{zone.name}</h4>
                          <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">{zone.description}</p>
                          
                          {!unlocked && (
                            <div className="text-[9px] font-mono text-slate-500 border-t border-slate-850 pt-1.5 mt-1">
                              Requires {zone.minXp} XP
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Map Legend & Hint */}
          <div className="p-4 border-t border-slate-850 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs text-slate-500 bg-slate-900/30">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-indigo-500/10 border border-indigo-500 flex items-center justify-center">
                  <Star className="w-2 h-2 text-indigo-400" />
                </span>
                <span>Current Mission Target</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-2 h-2 text-emerald-400" />
                </span>
                <span>Module Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center">
                  <Lock className="w-2 h-2 text-slate-600" />
                </span>
                <span>Locked Zone</span>
              </div>
            </div>
            
            <p className="italic font-mono text-[10px] text-slate-500 lg:text-right">
              Swipe horizontally to pan map. Tap unlocked nodes to open.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
