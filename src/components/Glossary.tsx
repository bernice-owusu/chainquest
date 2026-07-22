import React, { useState } from "react";
import { HelpCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface GlossaryTerm {
  term: string;
  definition: string;
  example: string;
}

export const GLOSSARY_DB: Record<string, GlossaryTerm> = {
  "public key": {
    term: "Public Key",
    definition: "A cryptographic code that is paired with a private key. It acts like a secure email address or account number—anyone can see it and use it to send you assets.",
    example: "0x7aB9...f92D (Sharing this is 100% safe!)"
  },
  "private key": {
    term: "Private Key",
    definition: "An extremely secret, ultra-large random number that mathematically proves ownership of a public address. Anyone who obtains this has total, absolute power to drain all assets.",
    example: "Never share, back it up securely in a cold vault!"
  },
  "seed phrase": {
    term: "12-Word Seed Phrase",
    definition: "A sequence of 12 or 24 human-readable words that generates your master cryptographic keys. It is a user-friendly format of your absolute private key.",
    example: "clog zebra copper focus blanket pulse logic layout dynamic audit solid priority"
  },
  "mempool": {
    term: "Mempool (Memory Pool)",
    definition: "A network node's temporary waiting room for transactions. When you broadcast a transaction, it sits in the mempool until validators/miners choose to write it into a block.",
    example: "If gas fees are too low, a transaction might get stuck in the mempool."
  },
  "gas fee": {
    term: "Gas Fee",
    definition: "The transaction fee paid to network validators/miners to offset the computational energy required to process and validate your transaction.",
    example: "Paid in Gwei (nano-fractions of Ether). Higher gas = faster inclusion."
  },
  "nonce": {
    term: "Nonce ('Number Used Once')",
    definition: "A simple variable number that miners increment repeatedly in Proof of Work. They hash the block contents combined with the nonce until the resulting hash satisfies the difficulty target.",
    example: "Nonce starts at 0, goes to 1, 2, 3... until a winning hash starts with '00000...'"
  },
  "proof of work": {
    term: "Proof of Work (PoW)",
    definition: "A decentralized consensus mechanism requiring network miners to solve hard cryptographic puzzles to secure the database and link blocks, preventing double-spending.",
    example: "Bitcoin mining—energy-intensive security mechanism."
  },
  "smart contract": {
    term: "Smart Contract",
    definition: "A self-executing software script written permanently on-chain. It automatically performs operations (like escrow, payments, or minting) whenever its hardcoded conditions are met, eliminating middle-men.",
    example: "An automated vending machine: deposit 1 coin, get 1 NFT badge instantly."
  },
  "constant product": {
    term: "Constant Product Formula (x * y = k)",
    definition: "The core mathematical equation used by Automated Market Makers (AMMs) like Uniswap to price assets. It keeps the total combined pool liquidity invariant constant ('k') during swaps.",
    example: "If DAI pool increases, the ETH pool must decrease, increasing the ETH price!"
  },
  "slippage": {
    term: "Slippage",
    definition: "The difference between the expected price of a trade and the actual price at which the trade executes. Slippage is higher when liquidity pool sizes are small relative to transaction volume.",
    example: "Swapping 50% of a pool will result in heavy slippage, getting you fewer tokens."
  }
};

interface TermProps {
  word: string;
  children: React.ReactNode;
}

export function Term({ word, children }: TermProps) {
  const [isOpen, setIsOpen] = useState(false);
  const key = word.toLowerCase();
  const entry = GLOSSARY_DB[key];

  if (!entry) {
    return <span className="border-b border-dashed border-slate-600 text-slate-300">{children}</span>;
  }

  return (
    <span className="relative inline-block group">
      <span
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-help text-cyan-400 font-semibold border-b border-dashed border-cyan-500/50 hover:text-cyan-300 transition-colors inline-flex items-center gap-0.5"
      >
        {children}
        <Info className="w-3 h-3 text-cyan-500/70 inline-block" />
      </span>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-[#15181c] border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-md text-left"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-md bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <h5 className="text-xs font-bold font-mono text-white tracking-wide uppercase">
                {entry.term}
              </h5>
            </div>
            
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              {entry.definition}
            </p>

            <div className="mt-2.5 pt-2 border-t border-white/5 font-mono text-[9px] text-slate-500">
              <span className="text-cyan-400/80 font-bold uppercase tracking-wider block mb-0.5">Live Example:</span>
              <span className="text-slate-400 break-all">{entry.example}</span>
            </div>
            
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#15181c]" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
