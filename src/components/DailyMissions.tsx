import React from "react";
import { DailyMission } from "../types";
import { CheckCircle2, Circle, Target, Clock, Zap, Star } from "lucide-react";
import { motion } from "motion/react";

interface DailyMissionsProps {
  missions?: DailyMission[];
  lastMissionsDate?: string;
  onMissionClick?: (missionType: string) => void;
}

export default function DailyMissions({ missions, lastMissionsDate, onMissionClick }: DailyMissionsProps) {
  if (!missions || missions.length === 0) return null;

  // Calculate percentage of missions completed
  const completedCount = missions.filter((m) => m.isCompleted).length;
  const progressPercent = Math.round((completedCount / missions.length) * 100);

  // Format date nicely (e.g., "July 17, 2026")
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Today";
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Today";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl w-full max-w-6xl mx-auto space-y-4" id="daily-missions-dashboard">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-850">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-1.5 rounded-xl text-indigo-400">
            <Target className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase block">DAILY MISSIONS</span>
            <span className="text-[10px] font-mono text-slate-500">RESYNC DATE: {formatDate(lastMissionsDate)}</span>
          </div>
        </div>

        {/* Live stats */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850/60 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">COMPLETED:</span>
            <span className="text-white font-extrabold text-indigo-400">{completedCount} / 3</span>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="w-24 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850/40">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-slate-400 text-[10px] font-bold">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Missions grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {missions.map((m) => {
          return (
            <div
              key={m.id}
              onClick={() => onMissionClick?.(m.type)}
              className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-3 cursor-pointer select-none hover:scale-[1.02] hover:shadow-lg ${
                m.isCompleted
                  ? "bg-emerald-950/10 border-emerald-500/20 text-slate-400 hover:border-emerald-500/40 hover:shadow-emerald-500/5"
                  : "bg-slate-950/40 border-slate-850/60 hover:bg-slate-900/80 hover:border-indigo-500/50 hover:shadow-indigo-500/5 text-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 shrink-0`}>
                    {m.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600 group-hover:text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold leading-relaxed ${m.isCompleted ? "line-through text-slate-500" : "text-slate-200"}`}>
                      {m.description}
                    </p>
                    <p className="text-[10px] text-indigo-400/90 font-mono font-bold mt-1.5 flex items-center gap-1">
                      <Star className="w-3 h-3 text-indigo-400 fill-current" />
                      +{m.xpReward} XP BONUS
                    </p>
                  </div>
                </div>

                {/* Direct Action Indicator Badge */}
                <div className="shrink-0 pt-0.5">
                  {m.isCompleted ? (
                    <span className="text-[9px] font-mono font-extrabold text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                      REVIEW ↺
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5 transition-all">
                      GO ➔
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Count */}
              <div className="flex items-center justify-between border-t border-slate-850/50 pt-2.5 mt-1 font-mono text-[10px]">
                <span className="text-slate-500">PROGRESS</span>
                <span className={`font-bold ${m.isCompleted ? "text-emerald-400" : "text-slate-300"}`}>
                  {m.currentCount} / {m.targetCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
