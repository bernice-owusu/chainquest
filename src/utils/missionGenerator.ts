import { DailyMission } from "../types";

export const MISSION_POOL: (Omit<
  DailyMission,
  "currentCount" | "isCompleted"
> & { levelRequired: number; levelCategory: string })[] = [
  {
    id: "m_wallet_seed",
    description: "Unlock a master recovery seed sequence in Wallet Village",
    type: "wallet_seed",
    targetCount: 1,
    xpReward: 35,
    levelRequired: 1,
    levelCategory: "LVL 1 • STARTER",
  },
  {
    id: "m_sandbox_keypair",
    description: "Generate a fresh public/private keypair in the sandbox",
    type: "sandbox_keypair",
    targetCount: 1,
    xpReward: 30,
    levelRequired: 1,
    levelCategory: "LVL 1 • STARTER",
  },
  {
    id: "m_ai_ask",
    description: "Ask Satoshi AI Mentor about cryptographic concepts",
    type: "ai_ask",
    targetCount: 1,
    xpReward: 25,
    levelRequired: 1,
    levelCategory: "LVL 1 • TUTORIAL",
  },
  {
    id: "m_sandbox_sign",
    description: "Construct and cryptographically sign a transaction",
    type: "sandbox_sign",
    targetCount: 1,
    xpReward: 40,
    levelRequired: 2,
    levelCategory: "LVL 2 • CRYPTO SIGNING",
  },
  {
    id: "m_sandbox_mine",
    description: "Mine a new block hash in Mining Mountains or Sandbox",
    type: "sandbox_mine",
    targetCount: 1,
    xpReward: 45,
    levelRequired: 3,
    levelCategory: "LVL 3 • PROOF OF WORK",
  },
  {
    id: "m_contract_deploy",
    description: "Compile and deploy a vending machine smart contract",
    type: "contract_deploy",
    targetCount: 1,
    xpReward: 50,
    levelRequired: 4,
    levelCategory: "LVL 4 • SMART CONTRACTS",
  },
  {
    id: "m_sandbox_swap",
    description: "Perform a token swap in DeFi District or Sandbox",
    type: "sandbox_swap",
    targetCount: 1,
    xpReward: 55,
    levelRequired: 5,
    levelCategory: "LVL 5 • DEFI SWAP",
  },
  {
    id: "m_quest_complete",
    description: "Complete any level quest or claim a bonus milestone",
    type: "quest_complete",
    targetCount: 1,
    xpReward: 50,
    levelRequired: 1,
    levelCategory: "ALL LEVELS • QUEST",
  },
];

export function generateDailyMissions(userLevel: number = 1): DailyMission[] {
  // Cap effective level tier to available levels (1-5+)
  const currentTier = Math.min(Math.max(1, userLevel), 5);

  // Filter pool for missions the user qualifies for based on their current level
  const eligibleMissions = MISSION_POOL.filter(
    (m) => m.levelRequired <= currentTier,
  );

  // Pick 1 primary level-focused mission matching current user level or highest unlocked level
  const tierSpecific = eligibleMissions.filter(
    (m) => m.levelRequired === currentTier && m.type !== "quest_complete",
  );
  const fallbackPrimary = eligibleMissions.filter(
    (m) => m.type !== "quest_complete",
  );

  const primaryPool = tierSpecific.length > 0 ? tierSpecific : fallbackPrimary;
  const primaryMission =
    primaryPool[Math.floor(Math.random() * primaryPool.length)];

  // Pick 1 secondary mission from eligible pool excluding primary
  const secondaryPool = eligibleMissions.filter(
    (m) => m.id !== primaryMission?.id && m.type !== "quest_complete",
  );
  const secondaryMission =
    secondaryPool.length > 0
      ? secondaryPool[Math.floor(Math.random() * secondaryPool.length)]
      : eligibleMissions.find((m) => m.id !== primaryMission?.id) ||
        MISSION_POOL[0];

  // Pick 1 progression mission (Quest completion)
  const questMission =
    MISSION_POOL.find((m) => m.type === "quest_complete") ||
    MISSION_POOL[MISSION_POOL.length - 1];

  const selected = [primaryMission, secondaryMission, questMission].filter(
    Boolean,
  );

  return selected.map((m) => ({
    ...m,
    currentCount: 0,
    isCompleted: false,
  }));
}
