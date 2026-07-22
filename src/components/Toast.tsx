import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, Trophy, Zap, X } from "lucide-react";
import { playSound } from "../utils/audio";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "error" | "xp" | "achievement";
  description?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: Toast["type"],
    description?: string,
    duration?: number
  ) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: Toast["type"] = "info",
      description?: string,
      duration = 3500
    ) => {
      const id = `${Date.now()}-${Math.random()}`;
      
      // Play complementary subtle audio feedback based on toast type
      if (type === "success" || type === "achievement") {
        playSound("click"); // clean subtle click feedback
      } else if (type === "error") {
        try {
          // Play a slightly alert-like sound if available or just feedback
          playSound("click");
        } catch {}
      }

      setToasts((prev) => [
        ...prev,
        { id, message, type, description, duration },
      ]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      
      {/* Toast Stack Portal Rendering */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-[9999] flex flex-col gap-2 w-auto max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const styles = getToastStyles(toast.type);
            const Icon = styles.icon;

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={`pointer-events-auto flex items-start gap-3 w-full p-3.5 rounded-2xl border ${styles.bg} ${styles.border} ${styles.shadow} backdrop-blur-md`}
              >
                {/* Accent line on left */}
                <div className={`absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-md ${styles.accent}`} />
                
                <div className={`p-1.5 rounded-xl ${styles.iconBg} shrink-0 mt-0.5`}>
                  <Icon className={`w-4 h-4 ${styles.text}`} />
                </div>

                <div className="flex-1 min-w-0 pr-1 pl-1">
                  <h4 className="text-xs font-mono font-bold text-slate-100 leading-tight">
                    {toast.message}
                  </h4>
                  {toast.description && (
                    <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">
                      {toast.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-slate-900/60 rounded-lg text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// Style configurations helper
const getToastStyles = (type: Toast["type"]) => {
  switch (type) {
    case "success":
      return {
        bg: "bg-emerald-950/80",
        border: "border-emerald-500/20",
        shadow: "shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
        text: "text-emerald-400",
        iconBg: "bg-emerald-500/10",
        accent: "bg-emerald-500",
        icon: CheckCircle2,
      };
    case "error":
      return {
        bg: "bg-red-950/80",
        border: "border-red-500/20",
        shadow: "shadow-[0_4px_20px_rgba(239,68,68,0.15)]",
        text: "text-red-400",
        iconBg: "bg-red-500/10",
        accent: "bg-red-500",
        icon: AlertCircle,
      };
    case "xp":
      return {
        bg: "bg-amber-950/80",
        border: "border-amber-500/20",
        shadow: "shadow-[0_4px_20px_rgba(245,158,11,0.15)]",
        text: "text-amber-400",
        iconBg: "bg-amber-500/10",
        accent: "bg-amber-500",
        icon: Zap,
      };
    case "achievement":
      return {
        bg: "bg-purple-950/80",
        border: "border-purple-500/20",
        shadow: "shadow-[0_4px_20px_rgba(168,85,247,0.15)]",
        text: "text-purple-400",
        iconBg: "bg-purple-500/10",
        accent: "bg-purple-500",
        icon: Trophy,
      };
    case "info":
    default:
      return {
        bg: "bg-slate-950/90",
        border: "border-slate-800",
        shadow: "shadow-[0_4px_20px_rgba(15,23,42,0.5)]",
        text: "text-indigo-400",
        iconBg: "bg-indigo-500/10",
        accent: "bg-indigo-500",
        icon: Info,
      };
  }
};
