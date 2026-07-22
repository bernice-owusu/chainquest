import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize GoogleGenAI client lazily to prevent crash if key is missing during container build
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Middleware
app.use(express.json());

// Lazy initialization of Firestore Admin SDK
let firestoreDb: Firestore | null = null;
let isFirestoreInitialized = false;

function getFirestoreDb(): Firestore {
  if (isFirestoreInitialized && firestoreDb) {
    return firestoreDb;
  }
  
  const credsFile = path.join(process.cwd(), "firebase-credentials.json");
  if (fs.existsSync(credsFile)) {
    try {
      const creds = JSON.parse(fs.readFileSync(credsFile, "utf-8"));
      if (getApps().length === 0) {
        initializeApp({
          credential: cert(creds),
        });
      }
      firestoreDb = getFirestore();
      console.log("[Firebase] Successfully initialized Firestore from credentials JSON file!");
      isFirestoreInitialized = true;
      return firestoreDb;
    } catch (err) {
      console.error("[Firebase] Failed to load from firebase-credentials.json file:", err);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firestore is not fully configured. Please configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY or provide firebase-credentials.json.");
  }

  try {
    // Handle escaped newlines in environment variables
    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
    
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
    }
    
    firestoreDb = getFirestore();
    console.log("[Firebase] Successfully connected to Cloud Firestore from env vars!");
  } catch (err) {
    console.error("[Firebase] Failed to initialize Firestore Admin SDK from env vars:", err);
    throw err;
  }
  
  isFirestoreInitialized = true;
  return firestoreDb;
}

// API routes for real user persistence
app.post("/api/users/register", async (req, res) => {
  try {
    const { username, password, avatar, profile, guestUserId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    const cleanUsername = username.trim().toLowerCase();
    const defaultProfile = profile || {
      username: username.trim(),
      avatar: avatar || "🧙‍♂️",
      xp: 0,
      level: 1,
      streak: 1,
      completedLessons: [],
      completedQuests: [],
      earnedBadges: [],
      joinedAt: new Date().toISOString(),
      unlockedTitles: ["Blockchain Explorer"],
      activeTitle: "Blockchain Explorer",
      lootboxesCount: 2,
      dailyDuelsCount: 0,
      weeklyActivity: [new Date().toISOString().split("T")[0]],
    };

    const fsDb = getFirestoreDb();
    const userRef = fsDb.collection("users").doc(cleanUsername);
    const doc = await userRef.get();
    if (doc.exists) {
      return res.status(400).json({ error: "Username already exists." });
    }
    const userData = {
      username: username.trim(),
      password,
      profile: {
        ...defaultProfile,
        isRealUser: true,
        accountUsername: username.trim(),
      },
    };
    await userRef.set(userData);

    // Clean up old guest document if user converted from guest to registered
    const gId = guestUserId || profile?.userId;
    if (gId) {
      try {
        await fsDb.collection("users").doc(`guest_${gId}`).delete();
      } catch (err) {
        console.warn("Could not delete legacy guest doc on register:", err);
      }
    }

    return res.json({ success: true, profile: userData.profile });
  } catch (error: any) {
    console.error("Register Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.post("/api/users/login", async (req, res) => {
  try {
    const { username, password, guestUserId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    const cleanUsername = username.trim().toLowerCase();

    const fsDb = getFirestoreDb();
    const userRef = fsDb.collection("users").doc(cleanUsername);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.status(400).json({ error: "Invalid username or password." });
    }
    const userData = doc.data();
    if (!userData || userData.password !== password) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    // Clean up old guest document if logging in from a guest session
    if (guestUserId) {
      try {
        await fsDb.collection("users").doc(`guest_${guestUserId}`).delete();
      } catch (err) {
        console.warn("Could not delete legacy guest doc on login:", err);
      }
    }

    return res.json({ success: true, profile: userData.profile });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.post("/api/users/sync", async (req, res) => {
  try {
    const { username, password, profile } = req.body;
    if (!username || !password || !profile) {
      return res.status(400).json({ error: "Username, password, and profile are required." });
    }
    const cleanUsername = username.trim().toLowerCase();

    const fsDb = getFirestoreDb();
    const userRef = fsDb.collection("users").doc(cleanUsername);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.status(401).json({ error: "Authentication failed." });
    }
    const userData = doc.data();
    if (!userData || userData.password !== password) {
      return res.status(401).json({ error: "Authentication failed." });
    }
    await userRef.update({ profile });

    // Ensure any leftover guest doc is removed
    if (profile.userId) {
      try {
        await fsDb.collection("users").doc(`guest_${profile.userId}`).delete();
      } catch (e) {}
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Sync Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.post("/api/users/sync-guest", async (req, res) => {
  try {
    const { userId, username, profile } = req.body;
    if (!userId || !username || !profile) {
      return res.status(400).json({ error: "userId, username, and profile are required." });
    }

    // Don't sync as guest if profile is already a registered user
    if (profile.isRealUser) {
      return res.json({ success: true, skipped: "isRealUser" });
    }

    const fsDb = getFirestoreDb();
    const cleanUsername = username.trim().toLowerCase();

    // If doc for registered user already exists, skip creating guest doc
    const registeredDoc = await fsDb.collection("users").doc(cleanUsername).get();
    if (registeredDoc.exists) {
      return res.json({ success: true, skipped: "registeredUserExists" });
    }

    const guestKey = `guest_${userId}`;
    const userRef = fsDb.collection("users").doc(guestKey);
    const userData = {
      username: username.trim(),
      isGuest: true,
      profile: {
        ...profile,
        userId,
      }
    };
    await userRef.set(userData);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Guest Sync Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.get("/api/users/leaderboard", async (req, res) => {
  try {
    const fsDb = getFirestoreDb();
    const snapshot = await fsDb.collection("users").get();
    
    // Server-side deduplication map keyed by normalized user key
    const userMap = new Map<string, any>();
    const docsToDelete: string[] = [];

    snapshot.forEach((doc: any) => {
      const u = doc.data();
      if (!u) return;

      const p = u.profile || {};
      const docId = doc.id;
      const isGuest = docId.startsWith("guest_") || u.isGuest || !p.isRealUser;
      
      const username = (p.username || u.username || "").trim();
      const accountUsername = (p.accountUsername || "").trim();
      const userId = p.userId;

      // Primary key for grouping: normalized username or userId
      const normUsername = (accountUsername || username).toLowerCase();
      const primaryKey = normUsername || (userId ? `uid_${userId}` : docId);

      const item = {
        id: docId,
        username: p.username || u.username,
        avatar: p.avatar || "🧙‍♂️",
        xp: p.xp || 0,
        level: p.level || 1,
        title: p.activeTitle || "Blockchain Explorer",
        isGuest,
        userId: p.userId,
        docId,
      };

      if (!userMap.has(primaryKey)) {
        userMap.set(primaryKey, item);
      } else {
        const existing = userMap.get(primaryKey);
        // If current item is registered and existing is guest -> replace guest
        if (!item.isGuest && existing.isGuest) {
          if (existing.docId.startsWith("guest_")) {
            docsToDelete.push(existing.docId);
          }
          userMap.set(primaryKey, item);
        } else if (item.isGuest && !existing.isGuest) {
          // Keep registered user, flag duplicate guest for deletion
          if (item.docId.startsWith("guest_")) {
            docsToDelete.push(item.docId);
          }
        } else {
          // Both are same type -> keep the one with higher XP
          if (item.xp > existing.xp) {
            if (existing.isGuest && existing.docId.startsWith("guest_")) {
              docsToDelete.push(existing.docId);
            }
            userMap.set(primaryKey, item);
          } else {
            if (item.isGuest && item.docId.startsWith("guest_")) {
              docsToDelete.push(item.docId);
            }
          }
        }
      }
    });

    // Clean up duplicate guest documents in background
    if (docsToDelete.length > 0) {
      Promise.all(docsToDelete.map(id => fsDb.collection("users").doc(id).delete()))
        .catch(err => console.error("Error cleaning up stale guest docs:", err));
    }

    const leaderboard = Array.from(userMap.values()).map(({ isGuest, userId, docId, ...rest }) => rest);

    return res.json({ success: true, leaderboard });
  } catch (error: any) {
    console.error("Leaderboard Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// --- DUEL APIS ---

// Create a duel request (after challenger has played and recorded score)
app.post("/api/duels/create", async (req, res) => {
  try {
    const { challengerId, challengerName, challengerAvatar, targetId, challengeType, challengerScore } = req.body;
    if (!challengerId || !targetId || !challengeType || challengerScore === undefined) {
      return res.status(400).json({ error: "Missing required duel fields." });
    }
    
    const fsDb = getFirestoreDb();
    
    // Check if target user actually exists
    const targetRef = fsDb.collection("users").doc(targetId);
    let targetDoc = await targetRef.get();
    let targetName = targetId;
    let targetAvatar = "🧙‍♂️";

    if (targetDoc.exists) {
      const targetData = targetDoc.data();
      targetName = targetData?.profile?.username || targetData?.username || targetId;
      targetAvatar = targetData?.profile?.avatar || "🧙‍♂️";
    } else {
      // Auto-create user doc for target if missing so duels can always be created and delivered
      const defaultName = targetId.replace(/^guest_/, "");
      await targetRef.set({
        username: defaultName,
        isGuest: true,
        profile: {
          username: defaultName,
          avatar: "🧙‍♂️",
          xp: 100,
          level: 1,
          title: "Blockchain Explorer"
        }
      });
      targetName = defaultName;
    }

    const duelRef = fsDb.collection("duels").doc();
    const duelData = {
      id: duelRef.id,
      challengerId,
      challengerName,
      challengerAvatar,
      targetId,
      targetName,
      targetAvatar,
      challengeType,
      challengerScore,
      targetScore: null,
      status: "pending",
      acknowledgedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await duelRef.set(duelData);
    return res.json({ success: true, duelId: duelRef.id });
  } catch (error: any) {
    console.error("Create Duel Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Get pending duels for current user
app.get("/api/duels/pending", async (req, res) => {
  try {
    const { targetId } = req.query;
    if (!targetId) {
      return res.status(400).json({ error: "targetId is required." });
    }
    
    const fsDb = getFirestoreDb();
    const snapshot = await fsDb.collection("duels")
      .where("targetId", "==", String(targetId).trim())
      .where("status", "==", "pending")
      .get();
      
    const duels: any[] = [];
    snapshot.forEach((doc: any) => {
      duels.push(doc.data());
    });
    
    return res.json({ success: true, duels });
  } catch (error: any) {
    console.error("Get Pending Duels Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Accept or decline a duel
app.post("/api/duels/respond", async (req, res) => {
  try {
    const { duelId, action } = req.body;
    if (!duelId || !action || (action !== "accept" && action !== "decline")) {
      return res.status(400).json({ error: "duelId and action ('accept' or 'decline') are required." });
    }
    
    const fsDb = getFirestoreDb();
    const duelRef = fsDb.collection("duels").doc(duelId);
    const duelDoc = await duelRef.get();
    if (!duelDoc.exists) {
      return res.status(404).json({ error: "Duel not found." });
    }
    
    const newStatus = action === "accept" ? "accepted" : "declined";
    await duelRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    
    return res.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error("Respond Duel Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Resolve a completed duel (when target plays & finishes)
app.post("/api/duels/resolve", async (req, res) => {
  try {
    const { duelId, targetScore } = req.body;
    if (!duelId || targetScore === undefined) {
      return res.status(400).json({ error: "duelId and targetScore are required." });
    }
    
    const fsDb = getFirestoreDb();
    const duelRef = fsDb.collection("duels").doc(duelId);
    const duelDoc = await duelRef.get();
    if (!duelDoc.exists) {
      return res.status(404).json({ error: "Duel not found." });
    }
    
    const duelData = duelDoc.data();
    if (!duelData || duelData.status === "completed") {
      return res.status(400).json({ error: "Duel is already completed or invalid." });
    }
    
    const challengerScore = duelData.challengerScore;
    const challengeType = duelData.challengeType;
    
    // Determine winner
    let winnerId: string | null = null;
    let winnerName: string = "Tie";
    let isChallengerWinner = false;
    let isTargetWinner = false;
    let isTie = false;
    
    if (challengeType === "quiz") {
      // High score wins quiz
      if (challengerScore > targetScore) {
        winnerId = duelData.challengerId;
        winnerName = duelData.challengerName;
        isChallengerWinner = true;
      } else if (targetScore > challengerScore) {
        winnerId = duelData.targetId;
        winnerName = duelData.targetName;
        isTargetWinner = true;
      } else {
        isTie = true;
      }
    } else {
      // In hash race, score is elapsed time in seconds/milliseconds
      // Lower elapsed time (faster speed) wins!
      if (challengerScore < targetScore) {
        winnerId = duelData.challengerId;
        winnerName = duelData.challengerName;
        isChallengerWinner = true;
      } else if (targetScore < challengerScore) {
        winnerId = duelData.targetId;
        winnerName = duelData.targetName;
        isTargetWinner = true;
      } else {
        isTie = true;
      }
    }
    
    // Stakes details:
    // Winner gets +50 XP
    // Loser gets -15 XP (minimum 0)
    // Tie gets +15 XP each
    let xpChangeChallenger = 0;
    let xpChangeTarget = 0;
    
    if (isTie) {
      xpChangeChallenger = 15;
      xpChangeTarget = 15;
    } else if (isChallengerWinner) {
      xpChangeChallenger = 50;
      xpChangeTarget = -15;
    } else if (isTargetWinner) {
      xpChangeChallenger = -15;
      xpChangeTarget = 50;
    }
    
    // Update duel doc
    await duelRef.update({
      targetScore,
      status: "completed",
      winnerId,
      winnerName,
      xpChangeChallenger,
      xpChangeTarget,
      updatedAt: new Date().toISOString()
    });
    
    // Update Challenger profile in DB
    const challengerUserRef = fsDb.collection("users").doc(duelData.challengerId);
    const challengerDoc = await challengerUserRef.get();
    if (challengerDoc.exists) {
      const uData = challengerDoc.data();
      if (uData && uData.profile) {
        const p = uData.profile;
        p.xp = Math.max(0, (p.xp || 0) + xpChangeChallenger);
        p.level = Math.max(1, 1 + (p.completedLessons || []).length);
        p.dailyDuelsCount = (p.dailyDuelsCount || 0) + 1;
        p.lastDuelDate = new Date().toISOString().split("T")[0];
        
        await challengerUserRef.update({ profile: p });
      }
    }
    
    // Update Target profile in DB
    const targetUserRef = fsDb.collection("users").doc(duelData.targetId);
    const targetDoc = await targetUserRef.get();
    if (targetDoc.exists) {
      const uData = targetDoc.data();
      if (uData && uData.profile) {
        const p = uData.profile;
        p.xp = Math.max(0, (p.xp || 0) + xpChangeTarget);
        p.level = Math.max(1, 1 + (p.completedLessons || []).length);
        p.dailyDuelsCount = (p.dailyDuelsCount || 0) + 1;
        p.lastDuelDate = new Date().toISOString().split("T")[0];
        
        await targetUserRef.update({ profile: p });
      }
    }
    
    return res.json({
      success: true,
      winnerId,
      winnerName,
      xpChangeChallenger,
      xpChangeTarget
    });
  } catch (error: any) {
    console.error("Resolve Duel Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Get completed duel results for user (to show popups of who won/lost)
app.get("/api/duels/results", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required." });
    }
    
    const fsDb = getFirestoreDb();
    
    // Query completed duels where user is challenger
    const snapshotChallenger = await fsDb.collection("duels")
      .where("challengerId", "==", String(userId).trim())
      .where("status", "==", "completed")
      .get();
      
    // Query completed duels where user is target
    const snapshotTarget = await fsDb.collection("duels")
      .where("targetId", "==", String(userId).trim())
      .where("status", "==", "completed")
      .get();
      
    const completedDuels: any[] = [];
    snapshotChallenger.forEach((doc: any) => completedDuels.push(doc.data()));
    snapshotTarget.forEach((doc: any) => completedDuels.push(doc.data()));
    
    // Sort by updatedAt desc
    completedDuels.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return res.json({ success: true, completedDuels });
  } catch (error: any) {
    console.error("Get Duel Results Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Acknowledge a completed duel so we don't show the result popup again
app.post("/api/duels/acknowledge", async (req, res) => {
  try {
    const { duelId, userId } = req.body;
    if (!duelId || !userId) {
      return res.status(400).json({ error: "duelId and userId are required." });
    }
    const fsDb = getFirestoreDb();
    const duelRef = fsDb.collection("duels").doc(duelId);
    const duelDoc = await duelRef.get();
    if (!duelDoc.exists) {
      return res.status(404).json({ error: "Duel not found." });
    }
    const duelData = duelDoc.data();
    if (!duelData) return res.json({ success: true });
    
    const acknowledgedBy = duelData.acknowledgedBy || [];
    if (!acknowledgedBy.includes(userId)) {
      acknowledgedBy.push(userId);
      await duelRef.update({ acknowledgedBy });
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Acknowledge Duel Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});



app.get("/api/db-status", (req, res) => {
  try {
    getFirestoreDb();
    res.json({
      mode: "firestore",
      projectId: process.env.FIREBASE_PROJECT_ID || null,
    });
  } catch (err: any) {
    res.status(500).json({
      mode: "error",
      error: err.message || "Firestore is not configured.",
    });
  }
});

// API route for AI Mentor
app.post("/api/gemini/mentor", async (req, res) => {
  try {
    const { prompt, history, context } = req.body;

    const systemInstruction = `You are "Satoshi AI", the friendly, super-smart blockchain tutor and gaming guide for the ChainQuest platform.
Your purpose is to explain complex Web3 concepts (such as wallets, cryptography, blocks, Proof-of-Work mining, smart contracts, and decentralized finance/DeFi) in simple, intuitive, and fun terms for beginners, students, and curious developers.

Tone: Enthusiastic, clear, visual, engaging, and encouraging. Avoid overly dry developer jargon, or if you use it, immediately explain it with a fun real-world analogy.
Format: Keep replies concise (usually 1-3 paragraphs) so they fit nicely in a mobile-friendly chat overlay. Use bullet points for steps or rules.

Current gameplay context of the user:
${JSON.stringify(context || {})}

Help them with the level they are currently on, answer any technical blockchain questions, or help them understand how their vending machine contract or liquidity pool formula works.
Remember, ChainQuest has:
- Level 1: Wallet Village (Public/Private keys, seed phrases, addresses)
- Level 2: Transaction Valley (Gas fees, mempools, cryptographically signing transactions)
- Level 3: Mining Mountains (Proof of Work, hashing blocks, nonce search, SHA-256)
- Level 4: Smart Contract City (Solidity-like vending machine state rules: 'IF token THEN item')
- Level 5: DeFi District (Liquidity pools, Constant Product Formula: x * y = k, swappers)

If the user is asking about the game, guide them to complete their current level or quest!`;

    const ai = getAiClient();

    // Reconstruct conversation contents array
    const contents: any[] = [];
    
    // Add history if present
    if (history && Array.isArray(history)) {
      history.forEach((msg: { role: string; content: string }) => {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      });
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    // Try primary and fallback models to handle transient 503 high demand errors
    const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
    let response: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        console.warn(`[Satoshi AI] Model ${model} call failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      const errStr = lastError?.message || JSON.stringify(lastError || "");
      if (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("high demand")) {
        return res.status(503).json({
          error: "Satoshi AI is currently experiencing high demand from Google Gemini. Spikes in demand are temporary — please try again in a few seconds!"
        });
      }
      if (errStr.includes("GEMINI_API_KEY") || errStr.includes("API_KEY_INVALID")) {
        return res.status(401).json({
          error: "GEMINI_API_KEY is missing or invalid. Please check your environment variables."
        });
      }
      return res.status(500).json({
        error: lastError?.message || "Satoshi AI service is temporarily unavailable. Please try again shortly."
      });
    }

    const text = response.text || "I'm a bit tangled in the block hashes right now. Could you please repeat that?";
    res.json({ response: text });
  } catch (error: any) {
    console.error("AI Mentor Error:", error);
    const msg = error.message || "Internal server error";
    if (msg.includes("GEMINI_API_KEY")) {
      return res.status(401).json({ error: "GEMINI_API_KEY is not defined in server environment variables." });
    }
    res.status(500).json({ error: msg });
  }
});

// Start server and mount Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ChainQuest Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
