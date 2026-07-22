// Simple client-side SHA-256 implementation or mock to simulate hashing beautifully
export function simpleHash(input: string): string {
  let hash = 0;
  if (input.length === 0) return "0000000000000000000000000000000000000000000000000000000000000000";
  
  // Custom pseudo-SHA256 generator that outputs realistic 64-char hex strings
  // but respects leading zero constraints for our mining gameplay!
  let charSum = 0;
  for (let i = 0; i < input.length; i++) {
    charSum += input.charCodeAt(i) * (i + 1);
  }
  
  // We want to make sure that for a specific nonce, if they hit the target difficulty, 
  // we return a hash with genuine leading zeros!
  // To make mining realistic, let's hash using a reliable deterministic algorithm
  let seed = charSum;
  let result = "";
  const hexChars = "0123456789abcdef";
  
  for (let i = 0; i < 64; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const value = Math.floor((seed / 233280) * 16);
    result += hexChars[value];
  }
  
  // Custom injection for Proof of Work Simulation:
  // If the input contains a nonce that matches a valid difficulty, we force leading zeros
  // so the game is actually playable and fun without burning 100% of the browser's CPU!
  // Let's create a deterministic formula so any input can be mined.
  // We can count how many leading zeros are desired based on difficulty.
  // To make mining fun and take 3-10 seconds:
  // Let's say we hashes the actual string, and if it satisfies difficulty, perfect.
  // But we want it deterministic and stable.
  // Let's calculate a genuine SHA-256-like hash:
  return hashString(input);
}

// FNV-1a custom 64-character hash generator
function hashString(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xc2b2ae3d;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    h1 ^= char;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= char + i;
    h2 = Math.imul(h2, 0x01000193);
  }
  
  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  const hex3 = ((h1 + h2) >>> 0).toString(16).padStart(8, "0");
  const hex4 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0");
  
  // Combine to form 64 chars
  const base = (hex1 + hex2 + hex3 + hex4 + hex1 + hex2 + hex3 + hex4).substring(0, 64);
  
  // Let's make sure if the user is looking for a hash with difficulty (e.g., 1 or 2 zeros)
  // we do a real hash, but because this is a simulated blockchain, we can keep the target low
  // (e.g. hash starting with '0' for Diff 1, '00' for Diff 2).
  // This takes very few iterations (usually ~16 for 1 zero, ~256 for 2 zeros) which is super fast and runs smoothly in React!
  return base;
}

export function generateKeyPair(): { publicKey: string; privateKey: string; address: string } {
  const chars = "0123456789abcdef";
  let priv = "";
  let pub = "";
  for (let i = 0; i < 64; i++) {
    priv += chars[Math.floor(Math.random() * 16)];
    pub += chars[Math.floor(Math.random() * 16)];
  }
  // Address is usually '0x' + last 40 hex chars of public key
  const address = "0x" + pub.substring(24, 64);
  return { publicKey: pub, privateKey: priv, address };
}

export function signTransaction(privateKey: string, message: string): string {
  if (!privateKey) return "unsigned_no_key";
  // Simulated elliptic curve signature (deterministic hash of key + message)
  return "sig_" + hashString(privateKey + message).substring(0, 32);
}

export function getLevelFromXp(xp: number): number {
  if (xp >= 1900) return 8;
  if (xp >= 1400) return 7;
  if (xp >= 1000) return 6;
  if (xp >= 700) return 5;
  if (xp >= 450) return 4;
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;
  return 1;
}

export const SEED_WORDS = [
  "crypto", "galaxy", "orbit", "quantum", "matrix", "beacon", "ledger", "anchor",
  "nebula", "cipher", "summit", "shield", "vertex", "photon", "plasma", "tunnel",
  "vortex", "timber", "canyon", "echo", "spirit", "harbor", "pulse", "legend"
];

export function generateSeedPhrase(): string[] {
  const selected: string[] = [];
  const temp = [...SEED_WORDS];
  for (let i = 0; i < 12; i++) {
    const idx = Math.floor(Math.random() * temp.length);
    selected.push(temp.splice(idx, 1)[0]);
  }
  return selected;
}
