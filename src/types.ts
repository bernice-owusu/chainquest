export interface UserProfile {
  userId?: string;
  username: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  completedLessons: string[]; // lesson ids completed
  completedQuests: string[]; // quest ids completed
  earnedBadges: string[]; // badge ids earned
  joinedAt: string;
  dailyMissions?: DailyMission[];
  lastMissionsDate?: string; // YYYY-MM-DD
  keys?: { publicKey: string; privateKey: string; address: string } | null;
  unlockedTitles?: string[];
  activeTitle?: string;
  lootboxesCount?: number;
  activeDuels?: ActiveDuelItem[];
  dailyDuelsCount?: number;
  lastDuelDate?: string; // YYYY-MM-DD
  learningMode?: "beginner" | "expert";
  weeklyActivity?: string[]; // YYYY-MM-DD strings for current week
  accountUsername?: string;
  accountPassword?: string;
  isRealUser?: boolean;
}

export interface ActiveDuelItem {
  id: string;
  competitor: Competitor;
  challengeType: "quiz" | "race";
  createdAt: string;
  challengerScore?: number;
}

export interface DailyMission {
  id: string;
  description: string;
  type: "sandbox_swap" | "sandbox_mine" | "sandbox_sign" | "sandbox_keypair" | "wallet_seed" | "contract_deploy" | "ai_ask" | "quest_complete";
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  xpReward: number;
}

export interface Competitor {
  id: string;
  username: string;
  avatar: string;
  xp: number;
  level: number;
  title: string;
  isUser?: boolean;
}

export interface Lesson {
  id: string;
  zone: string; // e.g. 'wallet', 'transaction', 'mining', 'contract', 'defi'
  title: string;
  description: string;
  xpReward: number;
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  };
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name or emoji
  color: string; // Tailwind color class
}

export interface Transaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  fee: number;
  signature: string;
  status: "pending" | "signed" | "mined" | "invalid";
  timestamp: number;
}

export interface Block {
  index: number;
  timestamp: number;
  transactions: Transaction[];
  nonce: number;
  previousHash: string;
  hash: string;
  difficulty: number;
  isMined: boolean;
}

export interface Mempool {
  transactions: Transaction[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  badgeId: string;
  steps: {
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
  }[];
}
