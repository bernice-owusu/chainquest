import { DailyMission } from "../types";

export const MISSION_POOL: Omit<DailyMission, "currentCount" | "isCompleted">[] = [
  {
    id: "m_sandbox_swap",
    description: "Perform a token swap in DeFi District or Sandbox",
    type: "sandbox_swap",
    targetCount: 1,
    xpReward: 35,
  },
  {
    id: "m_sandbox_mine",
    description: "Mine a new block hash in the Sandbox or Mining Mountains",
    type: "sandbox_mine",
    targetCount: 1,
    xpReward: 40,
  },
  {
    id: "m_sandbox_sign",
    description: "Construct and cryptographically sign a transaction",
    type: "sandbox_sign",
    targetCount: 1,
    xpReward: 35,
  },
  {
    id: "m_sandbox_keypair",
    description: "Generate a fresh public/private keypair",
    type: "sandbox_keypair",
    targetCount: 1,
    xpReward: 30,
  },
  {
    id: "m_wallet_seed",
    description: "Unlock a master recovery seed sequence in Wallet Village",
    type: "wallet_seed",
    targetCount: 1,
    xpReward: 45,
  },
  {
    id: "m_contract_deploy",
    description: "Compile and deploy a vending machine contract",
    type: "contract_deploy",
    targetCount: 1,
    xpReward: 45,
  },
  {
    id: "m_ai_ask",
    description: "Ask Satoshi AI Mentor about cryptographic concepts",
    type: "ai_ask",
    targetCount: 1,
    xpReward: 25,
  },
  {
    id: "m_quest_complete",
    description: "Complete any level quest or claim a bonus milestone",
    type: "quest_complete",
    targetCount: 1,
    xpReward: 50,
  }
];

export function generateDailyMissions(userLevel: number = 1): DailyMission[] {
  // Filter missions based on the user's level
  const eligibleMissions = MISSION_POOL.filter((m) => {
    switch (m.type) {
      case "wallet_seed":
      case "sandbox_keypair":
      case "ai_ask":
      case "quest_complete":
        return userLevel >= 1;
      case "sandbox_sign":
        return userLevel >= 2;
      case "sandbox_mine":
        return userLevel >= 3;
      case "contract_deploy":
        return userLevel >= 4;
      case "sandbox_swap":
        return userLevel >= 5;
      default:
        return true;
    }
  });

  // Shuffle and select exactly 3 unique missions
  const shuffled = [...eligibleMissions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(3, shuffled.length)).map((m) => ({
    ...m,
    currentCount: 0,
    isCompleted: false,
  }));
}
