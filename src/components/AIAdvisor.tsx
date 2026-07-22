import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, X, ChevronRight, BookOpen, AlertCircle, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAdvisorProps {
  currentZone: string;
  userXP: number;
  userLevel: number;
  onClose?: () => void;
  onProgressMission?: (type: "ai_ask") => void;
}

export default function AIAdvisor({ currentZone, userXP, userLevel, onClose, onProgressMission }: AIAdvisorProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Welcome to ChainQuest! I'm **Satoshi AI**, your blockchain navigator. Whether you're stuck on wallet cryptography, smart contract mechanics, or mining hashes, ask me anything! How can I help you on your Web3 journey today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Web Speech API states and refs
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
    try {
      return localStorage.getItem("satoshi_voice_enabled") === "true";
    } catch {
      return false;
    }
  });
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(
    typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null
  );
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/\*\*/g, "") // remove bold markers
      .replace(/`(.*?)`/g, "$1") // clean inline code blocks
      .replace(/- /g, "") // remove list dashes
      .replace(/👋/g, "Hello") // clean wave emoji
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '') // remove other emojis
      .trim();
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setSpeakingMessageId(null);
  };

  const speakText = (text: string, msgId: string) => {
    if (!synthRef.current) return;

    if (speakingMessageId === msgId) {
      stopSpeaking();
      return;
    }

    synthRef.current.cancel();

    const cleanedText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanedText);

    // Get English voices
    const voices = synthRef.current.getVoices();
    const preferredVoice = 
      voices.find((v) => v.lang.startsWith("en-") && v.name.toLowerCase().includes("natural")) ||
      voices.find((v) => v.lang.startsWith("en-") && v.name.toLowerCase().includes("google")) ||
      voices.find((v) => v.lang.startsWith("en-")) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.05; // Slightly warmer pitch

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    utteranceRef.current = utterance;
    setSpeakingMessageId(msgId);
    synthRef.current.speak(utterance);
  };

  // Stop speaking when unmounted and preload voices
  useEffect(() => {
    if (synthRef.current) {
      // Warm up / preload voices
      synthRef.current.getVoices();
      const handleVoicesChanged = () => {
        if (synthRef.current) {
          synthRef.current.getVoices();
        }
      };
      synthRef.current.addEventListener("voiceschanged", handleVoicesChanged);
      
      return () => {
        if (synthRef.current) {
          synthRef.current.removeEventListener("voiceschanged", handleVoicesChanged);
          synthRef.current.cancel();
        }
      };
    }
  }, []);

  const suggestionChips = [
    { label: "What is a public key?", zone: "wallet" },
    { label: "Why do we pay gas fees?", zone: "transaction" },
    { label: "Explain Proof of Work", zone: "mining" },
    { label: "How does Solidity work?", zone: "contract" },
    { label: "What is x * y = k?", zone: "defi" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const handleAskSatoshi = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.prompt) {
        handleSend(customEvent.detail.prompt);
      }
    };
    window.addEventListener("ask-satoshi-ai", handleAskSatoshi);
    return () => {
      window.removeEventListener("ask-satoshi-ai", handleAskSatoshi);
    };
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    setError(null);
    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    onProgressMission?.("ai_ask");

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/gemini/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          history,
          context: {
            currentZone,
            userXP,
            userLevel,
          },
        }),
      });

      if (!res.ok) {
        let serverErrorMsg = "";
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            serverErrorMsg = typeof errData.error === "string" ? errData.error : JSON.stringify(errData.error);
          }
        } catch (e) {}
        throw new Error(serverErrorMsg || "Failed to reach Satoshi AI. Make sure GEMINI_API_KEY is configured.");
      }

      const data = await res.json();
      
      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-narrate if global voice toggle is active
      if (isVoiceEnabled) {
        setTimeout(() => {
          speakText(data.response, assistantMsg.id);
        }, 150);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while communicating with Satoshi AI.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100" id="ai-advisor-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-500">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              Satoshi AI <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-mono">ONLINE</span>
            </h3>
            <p className="text-xs text-slate-400">Your Web3 Learning Guide</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const nextVal = !isVoiceEnabled;
              setIsVoiceEnabled(nextVal);
              try {
                localStorage.setItem("satoshi_voice_enabled", String(nextVal));
              } catch (e) {}
              if (!nextVal) {
                stopSpeaking();
              } else {
                // Narrate the last assistant message automatically
                const lastMsg = [...messages].reverse().find(m => m.role === "assistant");
                if (lastMsg) {
                  speakText(lastMsg.content, lastMsg.id);
                }
              }
            }}
            className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[11px] font-mono font-bold ${
              isVoiceEnabled
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
            }`}
            title={isVoiceEnabled ? "Mute Satoshi Voice" : "Enable Satoshi Voice"}
          >
            {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isVoiceEnabled ? "Voice On" : "Voice Off"}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-md relative group ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-slate-950/60 border border-slate-800 text-slate-200 rounded-bl-none"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-1.5 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">SATOSHI AI MENTOR</span>
                    {speakingMessageId === msg.id && (
                      <div className="flex gap-0.5 items-end h-2.5 w-3 shrink-0">
                        <span className="w-[1.5px] bg-amber-400 rounded-full animate-bounce" style={{ height: "100%", animationDuration: "0.6s" }}></span>
                        <span className="w-[1.5px] bg-amber-400 rounded-full animate-bounce" style={{ height: "60%", animationDuration: "0.4s", animationDelay: "0.15s" }}></span>
                        <span className="w-[1.5px] bg-amber-400 rounded-full animate-bounce" style={{ height: "80%", animationDuration: "0.5s", animationDelay: "0.3s" }}></span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(msg.content, msg.id)}
                    className={`p-1 rounded-md transition-all ${
                      speakingMessageId === msg.id 
                        ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" 
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                    }`}
                    title={speakingMessageId === msg.id ? "Stop Narration" : "Speak Response"}
                  >
                    {speakingMessageId === msg.id ? (
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
              <div className="markdown-body space-y-2">
                {msg.content.split("\n").map((line, idx) => {
                  // Basic markdown rendering support for bold, bullets, and inline code blocks
                  let rendered = line;
                  
                  // Bold markdown replacement: **text**
                  rendered = rendered.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                  
                  // Inline code replacement: `code`
                  rendered = rendered.replace(/`(.*?)`/g, "<code class='bg-slate-850 px-1 py-0.5 rounded text-yellow-400 font-mono text-xs'>$1</code>");
                  
                  // Simple list bullets replacement
                  if (rendered.startsWith("- ")) {
                    return (
                      <li
                        key={idx}
                        className="list-disc pl-1 ml-4"
                        dangerouslySetInnerHTML={{ __html: rendered.substring(2) }}
                      />
                    );
                  }
                  
                  return (
                    <p
                      key={idx}
                      dangerouslySetInnerHTML={{ __html: rendered }}
                    />
                  );
                })}
              </div>
              <span className="block text-[9px] text-right text-slate-500 mt-1.5 font-mono">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-950/60 border border-slate-800 text-slate-400 rounded-2xl rounded-bl-none p-3.5 text-sm flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </span>
              <span className="text-xs italic font-mono">Satoshi AI is compiling answer...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Connection Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 select-none shrink-0">
        <p className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">SUGGESTED TOPICS</p>
        <div className="flex overflow-x-auto whitespace-nowrap gap-1.5 pb-1 scrollbar-none snap-x">
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip.label)}
              className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-full px-3 py-1.5 transition-all flex items-center gap-1.5 shrink-0 snap-start"
            >
              <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask Satoshi AI about ${currentZone}...`}
          disabled={isLoading}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl transition-colors shrink-0 flex items-center justify-center shadow-lg hover:shadow-indigo-500/10"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
