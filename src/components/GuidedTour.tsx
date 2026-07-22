import React, { useState, useEffect } from "react";
import { Compass, Cpu, Sparkles, HelpCircle, ArrowRight, ArrowLeft, X, Play, Radio, Star, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GuidedTourProps {
  isActive: boolean;
  onClose: () => void;
  activeTab: "map" | "leaderboard" | "profile";
  setActiveTab: (tab: "map" | "leaderboard" | "profile") => void;
}

interface TourStep {
  title: string;
  description: string;
  targetTab?: "map" | "leaderboard" | "profile";
  highlightSelector?: string;
  icon: React.ElementType;
  iconColor: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "✨ Welcome to ChainQuest",
    description: "ChainQuest is an immersive, interactive RPG crafted to help you master real-world cryptography, Web3 engineering, smart contracts, and decentralized finance through hands-on, sandbox-driven simulation!",
    targetTab: "map",
    icon: Sparkles,
    iconColor: "text-amber-400"
  },
  {
    title: "🏝️ Explore Blockchain Island",
    description: "Launch your quest by clicking active zones on the map! Each zone is an interactive lesson where you'll run live sandboxes—generating cryptographic seed phrases, solving Proof-of-Work hashes, calculating constant product swap curves, and coding smart contracts.",
    targetTab: "map",
    icon: Compass,
    iconColor: "text-cyan-400"
  },
  {
    title: "🤖 Ask Satoshi AI Mentor",
    description: "Got stuck or want deeper blockchain insights? Inside any lesson, click the 'Ask Satoshi AI' mentor button. Satoshi reads your active progress and is trained to help you understand complex Web3 concepts or review formulas in real time!",
    targetTab: "map",
    icon: Cpu,
    iconColor: "text-purple-400"
  },
  {
    title: "🏆 Leaderboard & Cloud Save",
    description: "Track your rank on the live global Leaderboard! CRITICAL: To lock in your score, secure your daily streak, and display your name on the Leaderboard, you must head to the Profile tab and Register an account. This saves your progress permanently to the cloud!",
    targetTab: "profile",
    icon: Award,
    iconColor: "text-yellow-400"
  }
];

export default function GuidedTour({ isActive, onClose, activeTab, setActiveTab }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Sync tab with current tour step target
  useEffect(() => {
    if (isActive && TOUR_STEPS[currentStep]?.targetTab) {
      setActiveTab(TOUR_STEPS[currentStep].targetTab!);
    }
  }, [currentStep, isActive]);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dark backdrop with beautiful blur */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      {/* Guided Tour Modal Card */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className="relative bg-slate-900 border-2 border-cyan-500/30 rounded-3xl p-6 w-full max-w-lg shadow-cyan-glow overflow-hidden"
        id="guided-tour-modal"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl animate-pulse" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-400 hover:text-slate-200 transition-all hover:scale-105 z-20"
          title="Skip Tour"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="space-y-6 relative z-10">
          {/* Header Indicators */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1 animate-pulse">
                <Play className="w-3 h-3 fill-current" /> INTRODUCTORY WALKTHROUGH
              </div>
            </div>
            <span className="text-xs font-mono text-slate-500 font-bold">
              STEP {currentStep + 1} OF {TOUR_STEPS.length}
            </span>
          </div>

          {/* Interactive illustration & Title */}
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl bg-slate-950 border border-slate-800 shrink-0 ${step.iconColor}`}>
              <StepIcon className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg font-black tracking-tight text-white uppercase">
                {step.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {step.description}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pt-2">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStep === idx ? "w-6 bg-cyan-500 shadow-[0_0_8px_cyan]" : "w-1.5 bg-slate-800 hover:bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              onClick={onClose}
              className="text-xs font-mono text-slate-500 hover:text-slate-300 font-bold"
            >
              Skip Tour
            </button>

            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="p-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-400 disabled:opacity-20 disabled:pointer-events-none rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-600/10 flex items-center gap-1 hover:scale-105"
              >
                {currentStep === TOUR_STEPS.length - 1 ? "Start Questing" : "Next Step"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
