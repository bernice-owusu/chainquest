import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  ArrowRight, CheckCircle2, ShieldAlert, Sparkles, Key, Send, Flame, Cpu, Code2, RefreshCw, Layers, Award, Info, ArrowUpDown, ChevronRight, HelpCircle,
  Database, Users, Plus, Trash, Check, Lightbulb, Search, BookOpen
} from "lucide-react";
import { generateSeedPhrase, generateKeyPair, signTransaction, simpleHash } from "../utils/cryptoSim";
import { playSound } from "../utils/audio";
import { Term, GLOSSARY_DB } from "./Glossary";
import { useToast } from "./Toast";
import { UserProfile } from "../types";

interface LessonsProps {
  zoneId: string;
  onLessonCompleted: (xpEarned: number, badgeId: string) => void;
  onOpenTutor: () => void;
  onProgressMission?: (type: "sandbox_swap" | "sandbox_mine" | "sandbox_sign" | "sandbox_keypair" | "wallet_seed" | "contract_deploy" | "ai_ask" | "quest_complete") => void;
  userProfile?: UserProfile;
  onUpdateProfileKeys?: (keys: { publicKey: string; privateKey: string; address: string } | null) => void;
}

export default function Lessons({ 
  zoneId, 
  onLessonCompleted, 
  onOpenTutor, 
  onProgressMission,
  userProfile,
  onUpdateProfileKeys
}: LessonsProps) {
  const isBeginner = (userProfile?.learningMode || "beginner") === "beginner";
  const { showToast } = useToast();
  const [step, setStep] = useState<"learn" | "challenge" | "quiz" | "boss">("learn");
  
  // Boss Battle states
  const [bossHp, setBossHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [bossQuestionIndex, setBossQuestionIndex] = useState(0);
  const [bossSelectedAns, setBossSelectedAns] = useState<number | null>(null);
  const [bossQuizSubmitted, setBossQuizSubmitted] = useState(false);
  const [bossBattleLog, setBossBattleLog] = useState<string[]>([]);
  const [battleStatus, setBattleStatus] = useState<"idle" | "intro" | "fighting" | "victory" | "defeat">("idle");

  // Quiz states
  const [selectedQuizAns, setSelectedQuizAns] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState(false);

  // Lesson completions
  const [challengePassed, setChallengePassed] = useState(false);

  // 1. Wallet Village Challenge State
  const [walletStage, setWalletStage] = useState<"generate" | "test">("generate");
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [shuffledSeed, setShuffledSeed] = useState<string[]>([]);
  const [reconstructedSeed, setReconstructedSeed] = useState<string[]>([]);
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string; address: string } | null>(null);

  // 2. Transaction Valley Challenge State
  const [txDetails, setTxDetails] = useState({
    recipient: "0xSatoshiBakerNodeAddress",
    amount: 15,
    fee: 2.5,
  });
  const [activeSigningKey, setActiveSigningKey] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [txBroadcasted, setTxBroadcasted] = useState(false);

  // 3. Mining Mountains Challenge State
  const [miningDifficulty, setMiningDifficulty] = useState(1);
  const [miningNonce, setMiningNonce] = useState(1);
  const [miningHash, setMiningHash] = useState("");
  const [miningSpeed, setMiningSpeed] = useState<number | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [minedBlock, setMinedBlock] = useState(false);

  // 4. Smart Contract City State
  const [contractCode, setContractCode] = useState({
    inputDeposit: 1,
    releaseItem: false,
    itemPrice: 1,
    nftTier: "Gold Apprentice",
  });
  const [compileSuccess, setCompileSuccess] = useState(false);
  const [vendingMachineOutput, setVendingMachineOutput] = useState<string | null>(null);
  const [mintedNFT, setMintedNFT] = useState<string | null>(null);

  // 5. DeFi District State
  const [poolA, setPoolA] = useState(100); // Token A (DAI)
  const [poolB, setPoolB] = useState(10);  // Token B (ETH)
  const [swapAmount, setSwapAmount] = useState(10); // DAI to swap
  const [expectedEth, setExpectedEth] = useState(0);

  // 6. Oracle Citadel State
  const [oraclePrices, setOraclePrices] = useState<number[]>([3000, 2985, 3015]); // Prices from 3 feeds
  const [oracleMedian, setOracleMedian] = useState<number>(0);
  const [oracleBroadcasted, setOracleBroadcasted] = useState<boolean>(false);

  // 7. Layer-2 Lagoon State
  const [l2TxList, setL2TxList] = useState<string[]>([]);
  const [isL2Rolling, setIsL2Rolling] = useState<boolean>(false);
  const [l2RollupProof, setL2RollupProof] = useState<string>("");

  // 8. DAO Dome State
  const [daoVotes, setDaoVotes] = useState<{ yes: number; no: number }>({ yes: 112, no: 43 });
  const [daoVoted, setDaoVoted] = useState<boolean>(false);
  const [daoExecuted, setDaoExecuted] = useState<boolean>(false);

  // Beginner-friendly state variables (Visual Tab, Hint System, Pocket Glossary)
  const [learnSubTab, setLearnSubTab] = useState<"text" | "visual">("text");
  const [activeHintIndex, setActiveHintIndex] = useState<number>(-1);
  const [isPocketGlossaryOpen, setIsPocketGlossaryOpen] = useState<boolean>(false);
  const [pocketGlossarySearch, setPocketGlossarySearch] = useState<string>("");
  const [selectedFlowchartStep, setSelectedFlowchartStep] = useState<number>(0);

  // Generate Wallet Seed or load from profile initially
  useEffect(() => {
    // Reset beginner features on zone change
    setLearnSubTab("text");
    setActiveHintIndex(-1);
    setSelectedFlowchartStep(0);

    if (zoneId === "wallet") {
      if (userProfile?.keys) {
        setKeys(userProfile.keys);
        setChallengePassed(true);
      }
      const phrase = generateSeedPhrase();
      setSeedPhrase(phrase);
      setShuffledSeed([...phrase].sort(() => Math.random() - 0.5));
      setReconstructedSeed([]);
      if (!userProfile?.keys) {
        setKeys(generateKeyPair()); // Precalculate the keys
      }
      setWalletStage("generate");
    } else if (zoneId === "transaction") {
      if (userProfile?.keys) {
        setKeys(userProfile.keys);
      }
    }
  }, [zoneId, userProfile?.keys]);

  // Sync the active signing key with the derived private key from Level 1 if available
  useEffect(() => {
    if (keys && keys.privateKey) {
      setActiveSigningKey(keys.privateKey);
    } else if (zoneId === "transaction") {
      if (userProfile?.keys) {
        setActiveSigningKey(userProfile.keys.privateKey);
      } else {
        setActiveSigningKey(generateKeyPair().privateKey);
      }
    }
  }, [keys, zoneId, userProfile?.keys]);

  // Calculate DeFi swap estimate using constant product formula
  useEffect(() => {
    if (zoneId === "defi") {
      const k = poolA * poolB;
      const newPoolA = poolA + swapAmount;
      const newPoolB = k / newPoolA;
      const ethOut = poolB - newPoolB;
      setExpectedEth(Number(ethOut.toFixed(4)));
    }
  }, [poolA, poolB, swapAmount, zoneId]);

  const resetChallengeStates = () => {
    setChallengePassed(false);
    setStep("learn");
    setSelectedQuizAns(null);
    setQuizSubmitted(false);
    setQuizIsCorrect(false);

    // Reset specific states
    if (zoneId === "wallet") {
      const phrase = generateSeedPhrase();
      setSeedPhrase(phrase);
      setShuffledSeed([...phrase].sort(() => Math.random() - 0.5));
      setReconstructedSeed([]);
      setKeys(generateKeyPair()); // Precalculate the keys
      setWalletStage("generate");
    } else if (zoneId === "transaction") {
      setTxSignature("");
      setTxBroadcasted(false);
    } else if (zoneId === "mining") {
      setMiningNonce(1);
      setMiningHash(simpleHash("block_3_transactions_" + 1));
      setMinedBlock(false);
      setIsMining(false);
    } else if (zoneId === "contract") {
      setCompileSuccess(false);
      setVendingMachineOutput(null);
      setMintedNFT(null);
    } else if (zoneId === "defi") {
      setPoolA(100);
      setPoolB(10);
      setSwapAmount(10);
    } else if (zoneId === "oracle") {
      setOraclePrices([3000, 2985, 3015]);
      setOracleMedian(0);
      setOracleBroadcasted(false);
    } else if (zoneId === "l2") {
      setL2TxList([]);
      setIsL2Rolling(false);
      setL2RollupProof("");
    } else if (zoneId === "dao") {
      setDaoVotes({ yes: 112, no: 43 });
      setDaoVoted(false);
      setDaoExecuted(false);
    }
  };

  useEffect(() => {
    resetChallengeStates();
  }, [zoneId]);

  // Lesson Module Data
  const getLessonData = () => {
    switch (zoneId) {
      case "wallet":
        return {
          title: "🔑 Wallet Village: Cryptographic Identity",
          concept: (
            <span>
              A blockchain wallet doesn't actually store digital coins! Instead, it stores cryptographic keys. Your <Term word="Public Key">Public Key</Term> acts like a secure email address or account number—anyone can use it to send you funds. Your <Term word="Private Key">Private Key</Term> is like your absolute secret password—whoever has it controls the funds! A <Term word="Seed Phrase">12-Word Seed Phrase</Term> is an easily readable representation of your master private key.
            </span>
          ),
          challengeDesc: "Assemble your 12-word seed phrase in the correct sequential order to derive your secure public/private keys and establish your unique blockchain address.",
          quizQ: "If someone asks you for your 12-word seed phrase to verify an account, what should you do?",
          options: [
            "Give it to them; it's necessary for verification.",
            "Never share it. Sharing it gives them total control over your wallet.",
            "Only give them the first 6 words.",
            "Write it in public comments."
          ],
          answerIndex: 1,
          explanation: "Your seed phrase is your private key. Giving it away grants absolute access to steal all your assets. No legitimate entity will ever ask for your seed phrase.",
          xp: 100,
          badgeId: "badge_wallet",
          bossName: "The Seed Phrase Hydra",
          bossAvatar: "🐉",
          bossFlavor: "The multi-headed guardian of key cryptography attacks with corrupted seed inputs. Defeat it to secure your master vault!",
          bossQuestions: [
            {
              q: "Which of these is safe to share with public web-apps?",
              options: ["Public Receive Address", "Private Signing Key", "12-word recovery backup phrase", "Master Password PIN"],
              answer: 0,
              explanation: "Only your public address is safe to share with others. Sharing private keys or seed phrases will result in immediate asset loss."
            },
            {
              q: "If your local device burns but you have your 12-word seed phrase, are your coins lost?",
              options: ["Yes, coins are saved physically inside the laptop chip.", "No, you can safely restore your wallet on any other device.", "Yes, unless you have the manufacturer repair key."],
              answer: 1,
              explanation: "Coins live on the public blockchain ledger, not inside your device. Your seed phrase is all you need to reclaim access from any other device."
            },
            {
              q: "Who holds custody of your keys in a non-custodial software wallet?",
              options: ["Only You", "The wallet software developer", "The local server provider", "The central bank operator"],
              answer: 0,
              explanation: "In non-custodial wallets, only you hold the keys. This means total ownership, but also total responsibility for backups."
            }
          ]
        };
      case "transaction":
        return {
          title: "⚡ Transaction Valley: Signing & Gas Fees",
          concept: (
            <span>
              When you send a transaction, you use your <Term word="Private Key">Private Key</Term> to digitally sign it. This cryptographic signature proves that you authorized the transaction without revealing your actual private key! Transactions go into the <Term word="Mempool">Mempool</Term> (temporary storage) where network validators pick them. To motivate validators to choose yours first, you pay a <Term word="Gas Fee">Gas Fee</Term>.
            </span>
          ),
          challengeDesc: "Enter the transaction details, sign the transaction cryptographically using your simulated private key, adjust the gas fee, and broadcast it to the network mempool.",
          quizQ: "What is the primary purpose of a transaction gas fee?",
          options: [
            "To buy virtual fuel for the node computer.",
            "To verify the authenticity of private keys.",
            "To incentivize validators to process your transaction quickly.",
            "To tax user earnings on the network."
          ],
          answerIndex: 2,
          explanation: "Gas fees serve as an incentive to node operators and validators to include your transaction in the next block. Higher gas fees prioritize transactions in the mempool.",
          xp: 150,
          badgeId: "badge_transaction",
          bossName: "The Mempool Kraken",
          bossAvatar: "🦑",
          bossFlavor: "The giant aquatic terror of Transaction Valley attempts to front-run and sandwich your transactions. Out-bid it with optimal gas mechanics!",
          bossQuestions: [
            {
              q: "If you submit a transaction with extremely low gas fees, what happens?",
              options: ["It remains stuck as pending in the mempool.", "It is automatically speeded up for free.", "It is processed first as a special discount promotion."],
              answer: 0,
              explanation: "Validators prioritize transactions with higher fees. Low gas fee transactions may remain pending indefinitely during congested periods."
            },
            {
              q: "What does a digital transaction signature prove?",
              options: ["It was approved by a local bank cashier.", "It was created by the owner of the private key and was not altered.", "It was broadcast on a high-speed fiber network."],
              answer: 1,
              explanation: "The cryptographic signature proves two things: authenticity (created by the private key holder) and integrity (the data was not modified in transit)."
            },
            {
              q: "Can you edit or cancel a transaction once it is successfully mined into a block?",
              options: ["No, blocks are immutable once written to the chain.", "Yes, by paying a cancellation penalty fee.", "Yes, by contacting the node developer network support."],
              answer: 0,
              explanation: "Once written to a mined block, the transaction is part of the permanent ledger. Blockchain ledgers are immutable and cannot be undone."
            }
          ]
        };
      case "mining":
        return {
          title: "⚒️ Mining Mountains: Proof of Work",
          concept: (
            <span>
              Blockchains use cryptography to link blocks of transactions securely. Each block has a unique fingerprint called a Hash and a link to the Previous Hash. <Term word="Proof of Work">Proof of Work (PoW)</Term> is a puzzle where miners change a variable called a <Term word="Nonce">Nonce</Term> (number used once) until they find a hash that starts with specific leading zeros (meeting network difficulty targets). Mined blocks Turn Green!
            </span>
          ),
          challengeDesc: "Experiment with nonces to satisfy the hashing target. Cycle nonces manually, or use 'Auto-Mine' to see how computing power finds the target hash with leading zeros.",
          quizQ: "Why is it practically impossible to tamper with older blocks on a blockchain?",
          options: [
            "Because older blocks are deleted.",
            "Changing one block breaks its hash, which breaks the hashes of all subsequent blocks.",
            "Older blocks are locked by government regulation.",
            "Nonces are automatically frozen."
          ],
          answerIndex: 1,
          explanation: "Each block contains the hash of the previous block. If you alter old block data, its hash changes, breaking the link to every block that follows. Re-mining all subsequent blocks would require more than 51% of global computing power.",
          xp: 200,
          badgeId: "badge_mining",
          bossName: "The ASIC Colossus",
          bossAvatar: "🤖",
          bossFlavor: "The colossal steam-powered hashing automaton attempts to launch a 51% double-spend attack. Mine blocks with absolute cryptographic integrity to shut it down!",
          bossQuestions: [
            {
              q: "What is a 'nonce' in Proof of Work blockchain mining?",
              options: ["A constant value that can never change.", "A number changed by miners to solve the hashing difficulty puzzle.", "The maximum transaction fee limit in a block."],
              answer: 1,
              explanation: "A nonce ('number used once') is the input miners increment continuously to alter the block's content and generate a valid target hash."
            },
            {
              q: "If network hashing power increases, how does the blockchain maintain consistent block times?",
              options: ["By automatically adjusting the difficulty target upwards.", "By hiring additional node operators.", "By printing more reward tokens to speed up servers."],
              answer: 0,
              explanation: "Blockchains dynamically adjust difficulty targets. More network power triggers a higher difficulty, requiring more leading zeros in solved hashes."
            },
            {
              q: "What is a 51% attack on a Proof of Work ledger?",
              options: ["A transaction fee rate exceeding 51%.", "A single entity controlling over half the hashing power to manipulate block order.", "An asset devaluation of more than 51%."],
              answer: 1,
              explanation: "If a miner controls over 50% of the hashing power, they can reorganize blocks, block transactions, and execute double-spend attacks."
            }
          ]
        };
      case "contract":
        return {
          title: "📜 Smart Contract City: Solidity Basics",
          concept: (
            <span>
              <Term word="Smart Contract">Smart Contracts</Term> are self-executing agreements with terms written directly into code lines. They live permanently on the blockchain and execute automatically when predetermined conditions are met. No middleman needed! Think of them as an automated, trustless digital vending machine.
            </span>
          ),
          challengeDesc: "Assemble a smart vending machine's conditions. Define the item price condition, execute a compile-and-deploy cycle, and deposit the token to mint an NFT badge!",
          quizQ: "Once a smart contract is deployed on the blockchain, can its code be modified?",
          options: [
            "Yes, by anyone at any time.",
            "No, smart contract code is immutable by default once deployed.",
            "Only by paying double gas fees.",
            "Yes, but only on weekends."
          ],
          answerIndex: 1,
          explanation: "Immutable execution is a cornerstone of blockchain technology. Once deployed, smart contract code cannot be altered, ensuring absolute predictability and trustless operation.",
          xp: 250,
          badgeId: "badge_contract",
          bossName: "The Solidity Gorgon",
          bossAvatar: "🐍",
          bossFlavor: "The slithering compiler creature fires recursive reentrancy attacks that drain decentralized vaults. Guard your state variables to petrify it!",
          bossQuestions: [
            {
              q: "What is a 'Reentrancy Attack' in smart contract programming?",
              options: ["An attack where a contract recursively withdraws funds before updating balances.", "An attack where the developer loses their login password.", "An input validation leak in standard console displays."],
              answer: 0,
              explanation: "Reentrancy occurs when an external contract calls back into your withdraw function before your balance state is updated, draining funds recursively."
            },
            {
              q: "What does 'immutability' mean for compiled smart contracts?",
              options: ["The code requires no gas fees to execute.", "The contract can be edited by the creator anytime.", "The code cannot be altered once written to the blockchain."],
              answer: 2,
              explanation: "Immutability guarantees that the deployed code remains exactly as written, preventing creators or attackers from manipulating terms afterwards."
            },
            {
              q: "Which programming language is most commonly used to write smart contracts on Ethereum?",
              options: ["Solidity", "Rust", "Python", "TypeScript"],
              answer: 0,
              explanation: "Solidity is the primary object-oriented language compiled to EVM bytecode for smart contract development."
            }
          ]
        };
      case "defi":
        return {
          title: "💰 DeFi District: Constant Product Formula",
          concept: (
            <span>
              Decentralized Finance (DeFi) allows trading assets without centralized orderbooks! Automated Market Makers (AMMs) use liquidity pools and the <Term word="Constant Product">Constant Product Formula: x * y = k</Term> (where x and y are quantities of two tokens, and k is a constant invariant). When you swap, you add to one side and subtract from the other, changing the price according to this curved formula, which can cause <Term word="Slippage">Slippage</Term> for larger orders.
            </span>
          ),
          challengeDesc: "Execute a swap of DAI for ETH in a simulated AMM liquidity pool. Observe how token balances balance, and how slippage alters swap returns.",
          quizQ: "In the Constant Product Formula (x * y = k), what does 'k' represent?",
          options: [
            "The quantity of DAI tokens swapped.",
            "The invariant constant which must remain unchanged during swaps.",
            "The gas price multiplied by volume.",
            "The profit margin of the trading pool."
          ],
          answerIndex: 1,
          explanation: "The constant 'k' remains unchanged during a swap. Adding token 'x' to the pool reduces the remaining quantity of token 'y' to maintain 'k = x * y', determining the price.",
          xp: 300,
          badgeId: "badge_defi",
          bossName: "The Slippage Leviathan",
          bossAvatar: "🐳",
          bossFlavor: "The massive whale of DeFi District generates immense price slippage and flash loan dumps. Compute exact invariants to preserve capital and tame it!",
          bossQuestions: [
            {
              q: "What is 'Price Slippage' in an Automated Market Maker?",
              options: ["The difference between expected and executed price due to transaction size relative to pool depth.", "A network discount applied to high-volume traders.", "A transaction fee distributed back to validators."],
              answer: 0,
              explanation: "Slippage is the price shift that occurs as a trade changes the ratio of assets in the pool. Larger trades cause higher slippage."
            },
            {
              q: "What is 'Impermanent Loss' in DeFi liquidity provisioning?",
              options: ["The loss of tokens due to hardware hard drive failure.", "The difference in portfolio value between holding tokens versus providing liquidity.", "The transaction fee deduction when cancelling a pending swap."],
              answer: 1,
              explanation: "Impermanent loss occurs when the price ratio of pooled tokens changes compared to when you deposited them. It becomes permanent if you withdraw."
            },
            {
              q: "How do Arbitrageurs help decentralized Automated Market Makers?",
              options: ["By aligning pool prices with external global market rates through profit-driven trading.", "By mining consensus hashes for pools.", "By paying off gas fees for other traders."],
              answer: 0,
              explanation: "Arbitrageurs buy cheap in one market and sell expensive in another. This aligns prices across all decentralized exchanges."
            }
          ]
        };
      case "oracle":
        return {
          title: "🔮 Oracle Citadel: Decentralized Consensus",
          concept: (
            <span>
              Blockchains are isolated networks that cannot natively fetch external web APIs! <Term word="Oracles">Oracles</Term> bridge this gap by bringing off-chain real-world data (like crypto prices, weather, or IoT data) on-chain. To prevent fraud, decentralized oracles aggregate data from multiple independent nodes, calculating a <Term word="Consensus Median">Consensus Median</Term> to filter out outliers or malicious liars before triggering smart contracts.
            </span>
          ),
          challengeDesc: "Simulate a decentralized oracle consensus aggregator. Collect price feeds from three external cryptocurrency exchanges, calculate the consensus median, and broadcast the validated price feed on-chain.",
          quizQ: "Why must decentralized oracles use multiple data sources rather than a single trusted API?",
          options: [
            "To prevent a single point of failure or malicious data manipulation.",
            "To decrease the computational gas cost of running smart contracts.",
            "To ensure that transaction fees are paid directly to miners."
          ],
          answerIndex: 0,
          explanation: "Relying on a single API re-introduces a centralized point of failure. If the feed is manipulated or goes offline, any smart contract relying on it will execute with corrupted data.",
          xp: 300,
          badgeId: "badge_oracle",
          bossName: "The Price Manipulator Node",
          bossAvatar: "👁️",
          bossFlavor: "A malicious rogue node is broadcasting fake price data to trigger false liquidations! Cross-reference multiple API feeds to seal consensus and banish the manipulator.",
          bossQuestions: [
            {
              q: "What is the 'Oracle Problem' in blockchain development?",
              options: [
                "Blockchains are fully isolated, deterministic sandboxes that cannot fetch outside APIs without breaking consensus.",
                "Oracles consume too much processing memory on local computer chips.",
                "Private keys are too short to sign heavy API response files."
              ],
              answer: 0,
              explanation: "If nodes fetched external APIs individually during execution, they might get different results (e.g. price fluctuations), breaking deterministic network consensus. Oracles must feed the data on-chain."
            },
            {
              q: "Which aggregation formula is preferred by oracle networks to eliminate extreme outlier data?",
              options: [
                "The median of all reported price feeds",
                "The sum of all reported values divided by zero",
                "Only the very first value received, regardless of error"
              ],
              answer: 0,
              explanation: "The median is highly resilient to extreme outlier errors. Even if a few nodes try to report absurdly high or low numbers, the median remains centered on the true consensus."
            }
          ]
        };
      case "l2":
        return {
          title: "🚀 Layer-2 Lagoon: Scaling via Rollups",
          concept: (
            <span>
              Mainnet blockspace is scarce and expensive! <Term word="Layer 2 scaling">Layer-2 Scaling</Term> solutions move execution off the main chain (L1) to secondary chains (L2). <Term word="Rollups">Rollups</Term> work by bundling (rolling up) hundreds of transactions into a single batch, executing them off-chain, and posting a compressed validation proof back to L1, slashing gas fees by up to 95%.
            </span>
          ),
          challengeDesc: "Collect pending transactions from the Layer-2 pool, bundle them into a highly compressed off-chain batch, and generate a succinct Rollup proof to submit to mainnet Layer 1.",
          quizQ: "How do Layer-2 Rollups reduce user transaction fees so drastically?",
          options: [
            "By skipping cryptographic security and state validation completely.",
            "By batching hundreds of transactions off-chain and splitting the L1 mainnet posting cost among them.",
            "By forcing miners to validate transactions for free."
          ],
          answerIndex: 1,
          explanation: "Instead of each user paying full L1 mainnet gas fees, Rollups process transactions off-chain and share the cost of a single bundled L1 transaction among all participants in the batch.",
          xp: 400,
          badgeId: "badge_l2",
          bossName: "The Congestion Troll",
          bossAvatar: "👹",
          bossFlavor: "A massive transaction spike has caused Layer 1 gas prices to skyrocket in Gwei! Compress and roll up transactions off-chain to bypass the mainnet roadblock.",
          bossQuestions: [
            {
              q: "What is the key difference between Optimistic Rollups and Zero-Knowledge (ZK) Rollups?",
              options: [
                "Optimistic Rollups assume transactions are valid unless proven false (fraud proofs); ZK-Rollups use mathematical validity proofs (ZKP) for instant validation.",
                "ZK-Rollups only support NFT files, whereas Optimistic Rollups support ERC-20 tokens.",
                "Optimistic Rollups do not use gas fees, while ZK-Rollups use traditional credit cards."
              ],
              answer: 0,
              explanation: "Optimistic rollups require a dispute period (fraud proof window) to allow validators to check transactions. ZK rollups use validity proofs (like zk-SNARKs) to prove correctness instantly."
            },
            {
              q: "What is 'Data Availability' in the context of Layer-2 scaling?",
              options: [
                "Ensuring transaction data is published on-chain so that anyone can reconstruct the state and verify correctness.",
                "Having access to high-speed fiber internet and cell tower signals.",
                "Downloading the complete blockchain database onto a flash drive."
              ],
              answer: 0,
              explanation: "If an L2 coordinator disappears or turns malicious, users must have access to the published transaction data on L1 to reconstruct the L2 ledger and safely withdraw their funds."
            }
          ]
        };
      case "dao":
        return {
          title: "🏛️ DAO Dome: Decentralized Governance",
          concept: (
            <span>
              A <Term word="DAO">Decentralized Autonomous Organization (DAO)</Term> is a community governed by smart contracts instead of a central board. Members hold <Term word="Governance Tokens">Governance Tokens</Term> to write proposals and vote on treasury upgrades. If a vote passes, the proposal's code is executed automatically and trustlessly on-chain.
            </span>
          ),
          challengeDesc: "Draft a new governance upgrade proposal, cast a token-weighted vote, mobilize quorum, and execute the upgrade payload on-chain.",
          quizQ: "What decides a voter's voting power in a standard DAO smart contract?",
          options: [
            "The quantity of governance tokens they hold or have been delegated.",
            "The physical age of their wallet address.",
            "The amount of computing power their machine uses to vote."
          ],
          answerIndex: 0,
          explanation: "DAO governance uses token-weighted voting (1 Token = 1 Vote). The more tokens you hold, the more stake you have in the platform's future, giving you greater voting power.",
          xp: 500,
          badgeId: "badge_dao",
          bossName: "The Centralist Overlord",
          bossAvatar: "👑",
          bossFlavor: "A rogue developer has proposed a centralized back-door to access the island's treasury! Organize the voting quorum and execute a veto proposal to secure the funds.",
          bossQuestions: [
            {
              q: "What does 'On-Chain Execution' mean in community governance?",
              options: [
                "A governance contract executes the approved code proposal automatically without requiring manual administrator actions.",
                "Posting the final voting results on public social media channels.",
                "Writing down the final votes in a paper ledger book."
              ],
              answer: 0,
              explanation: "In a true DAO, proposals contain actual code payload (e.g. transfer funds, upgrade a contract). If the vote passes, the contract executes the code payload trustlessly."
            },
            {
              q: "What is 'Governance Token Delegation'?",
              options: [
                "Authorizing another trusted member to vote with your token weight without transferring ownership of your tokens.",
                "Selling your governance tokens to an institutional investment fund.",
                "Locking your tokens in a security vault forever to earn staking yield."
              ],
              answer: 0,
              explanation: "Delegation allows community members who don't have time to review every proposal to delegate their voting power to active and trusted experts, preserving voter turnout and security."
            }
          ]
        };
      default:
        return null;
    }
  };

  const lesson = getLessonData();

  if (!lesson) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Layers className="w-12 h-12 mx-auto mb-3 animate-pulse" />
        Select a zone on the Blockchain Island map to begin your quest!
      </div>
    );
  }

  // BEGINNER-FRIENDLY HELPERS (Visual Flowcharts & progressive Hint Systems)
  const getHintText = (zone: string, index: number) => {
    const hints: Record<string, string[]> = {
      wallet: [
        "Select the words in the exact sequence they appeared in Stage 1. Keep a notepad or mental image of the original layout!",
        "Click the shuffled words at the bottom to arrange them on the dashed slots. If you make a mistake, click a placed word to remove it.",
        "Exact Order: Ensure all 12 slots are populated precisely, then click 'Verify Backup Order' to activate your keys!"
      ],
      transaction: [
        "In blockchain, signing is secure. Paste or leave the derived private key in the 'Private Signing Key' input box.",
        "Your private key creates a unique mathematical signature. Click the 'Sign Transaction' button to generate this block proof.",
        "Once signed, click 'Broadcast Transaction' to send it to node memory. Watch it queue in the Mempool waiting board!"
      ],
      mining: [
        "Mining requires finding a specific 'Nonce' (number used once) that results in a hash with the required difficulty zeros.",
        "Adjust the Difficulty slider to 1 for an easy task. Click 'Start Mining Block' to launch the automated proof calculator.",
        "Let the simulator complete its work. It will loop-hash variable nonces until it finds a SHA-256 result starting with '0'!"
      ],
      contract: [
        "You are setting rules for an automated shop. The Vending Smart Contract will only release the item if paid correctly.",
        "Set the 'Item Price' to 1, compile/deploy the code, and then make sure the 'Input Deposit' is set to 1 or higher.",
        "Deploy, then click 'Deposit & Mint NFT'. If the deposit equals or exceeds the price, the smart contract executes instantly!"
      ],
      defi: [
        "Automated pools use the math formula (x * y = k) to price assets. Changing the ratio changes the token prices.",
        "Try swapping a smaller amount of DAI (e.g. 5 or 10) to reduce slippage, and check how Token A decreases while Token B increases.",
        "Input any amount (e.g. 10 DAI), then click 'Execute Swap (DAI to ETH)' to complete your constant product trade."
      ],
      oracle: [
        "Blockchain smart contracts cannot pull real-world web API data directly, so trusted oracle networks report the data.",
        "Oracles average or take the median price of multiple exchanges (e.g., Feed 1, 2, and 3) to prevent fake price manipulation.",
        "Median is the middle sorted value. For feeds 3000, 2985, and 3015, the sorted order is [2985, 3000, 3015]. The median is 3000!"
      ],
      l2: [
        "Layer-1 mainnets have limited throughput and high fees. Layer-2 rollups bundle transactions off-chain to scale.",
        "Click 'Simulate User Transactions' multiple times to queue trades. Then click 'Bundle and Generate Proof' to compress them.",
        "Finalize the cycle by clicking 'Publish Rollup Proof to Layer-1'. This settles 100s of off-chain transactions securely on L1!"
      ],
      dao: [
        "Decentralized Autonomous Organizations vote on upgrades. You must use governance tokens to vote.",
        "Click the 'Cast Vote (YES)' button to secure your vote weight. Watch the voting progress bars shift in real-time.",
        "Once you have cast your vote, click the 'Execute Passed Proposal' button to autonomously trigger the upgraded contract!"
      ]
    };
    return hints[zone]?.[index] || "Follow the instructions in the prompt.";
  };

  const getContextualAIQuestions = (zone: string) => {
    const questions: Record<string, string[]> = {
      wallet: [
        "Explain public vs private keys like I am 5 years old.",
        "What happens if someone steals my 12-word seed phrase?",
        "Are blockchain keys stored physically on my device?"
      ],
      transaction: [
        "Why does a higher transaction fee speed up mining?",
        "What is a mempool and how does a transaction enter it?",
        "How does a cryptographic signature prove transaction ownership?"
      ],
      mining: [
        "How do computer chips calculate proof of work hashes?",
        "Why does blockchain difficulty adjust over time?",
        "What is a block reward and how do miners earn it?"
      ],
      contract: [
        "What makes a smart contract 'immutable' and unchangeable?",
        "Can a smart contract make decisions based on off-chain data?",
        "How does EVM bytecode execute on a decentralized node?"
      ],
      defi: [
        "Explain constant product formula (x * y = k) simply.",
        "What is price slippage in DeFi pools?",
        "How do liquidity providers earn fees in automated pools?"
      ],
      oracle: [
        "What is the blockchain 'oracle problem'?",
        "Why is using the median price safer than a single price feed?",
        "How do oracle consensus mechanisms prevent price manipulation?"
      ],
      l2: [
        "What is the difference between Layer 1 and Layer 2?",
        "How do zero-knowledge (ZK) rollups scale throughput?",
        "How do L2 rollups secure themselves using L1 Ethereum?"
      ],
      dao: [
        "What is a governance token and how does voting work?",
        "How does token delegation protect a DAO from voter fatigue?",
        "Are DAO vote executions legally binding or code-enforced?"
      ]
    };
    return questions[zone] || ["Tell me more about this blockchain concept.", "How does this lesson relate to real-world crypto?", "What are some security best practices?"];
  };

  const renderVisualFlowchart = () => {
    const flowData: Record<string, { step: string; desc: string; analogy: string }[]> = {
      wallet: [
        { step: "🌱 12-Word Seed", desc: "A human-readable phrase. Think of it as a master key seed.", analogy: "The master blueprint to your entire house." },
        { step: "🔑 Private Key", desc: "A long cryptographical secret key used to sign all actions.", analogy: "The secret key to your safe. Never share or duplicate!" },
        { step: "🔒 Public Key", desc: "Paired with private key, safe to view, used to verify messages.", analogy: "Your safe lock's public serial number." },
        { step: "📬 Wallet Address", desc: "Derived from public key, like your account email address.", analogy: "Your house mailing address—anyone can drop letters in." }
      ],
      transaction: [
        { step: "✍️ Sign Details", desc: "Encrypt amount, fee, and target address using your private key.", analogy: "Your unique ink signature on a financial bank check." },
        { step: "📥 Mempool Waiting", desc: "Wait inside temporary node memory space boards.", analogy: "An airport waiting lounge before boarding the plane." },
        { step: "⛽ Gas Auction", desc: "Miners select transactions based on competitive fee bribes.", analogy: "Paying express shipping to skip the normal post line." },
        { step: "📦 Block Ledger", desc: "Miner writes signed details permanently to the blockchain.", analogy: "Your passport gets stamped and filed." }
      ],
      mining: [
        { step: "📂 Group Tx", desc: "Combine multiple transactions from the mempool waiting board.", analogy: "Packing letters into a secure mailing bag." },
        { step: "🔢 Nonce Guess", desc: "Miner repeatedly increments a counter variable (0, 1, 2...).", analogy: "Spinning dial combinations on a locked suitcase." },
        { step: "⚙️ SHA-256 Hash", desc: "Compute signature of block contents + incremented Nonce.", analogy: "A digital fingerprint scan of the suitcase." },
        { step: "🎯 Target Check", desc: "If fingerprint begins with multiple 0s, block is mined! Else, retry.", analogy: "Success if suitcase opens—otherwise, twist and try again!" }
      ],
      contract: [
        { step: "📝 Solidity Code", desc: "Developer writes automated rules (e.g. if paid ➔ release NFT).", analogy: "Writing instructions on a physical custom vending machine." },
        { step: "⚙️ EVM Compile", desc: "Compiler converts code into machine byte commands.", analogy: "Translating human laws into mechanical gears and logic." },
        { step: "🚀 Deploy On-chain", desc: "Bytecode published to a permanent, unchangeable address.", analogy: "Bolting down a heavy metal machine in the public square." },
        { step: "🤖 Auto Execute", desc: "Whenever payment matches rules, contract triggers automatically.", analogy: "You insert the coin, and the soda can immediately drops." }
      ],
      defi: [
        { step: "📊 Liquidity Pool", desc: "Smart contracts loaded with balances of two swap tokens (DAI/ETH).", analogy: "A bucket containing equal weights of green and yellow marbles." },
        { step: "📥 Swap Deposit", desc: "Trader deposits Token A into the pool contract.", analogy: "Pouring green marbles into the bucket." },
        { step: "🧮 x * y = k Math", desc: "Engine adjusts price dynamically to keep combined ratio invariant.", analogy: "Making yellow marbles much more expensive because they are rarer now." },
        { step: "📤 Swap Out", desc: "Trader withdraws Token B. Pools balance securely.", analogy: "Taking yellow marbles out in fair swap proportion." }
      ],
      oracle: [
        { step: "🌐 Exchanges", desc: "Crypto prices float independently on various world servers.", analogy: "Different street markets selling apples at slightly different costs." },
        { step: "📡 Price Feeds", desc: "Consensus oracle nodes monitor and report prices simultaneously.", analogy: "Reporters walking to each market and writing down prices." },
        { step: "📊 Median Filter", desc: "Consensus sorts feeds and picks middle value, ignoring outliers.", analogy: "Discarding a street seller claiming an apple is worth a million dollars." },
        { step: "🔗 Chain Write", desc: "Aggregated median price written to smart contract state.", analogy: "Publishing the fair price on the town hall notice board." }
      ],
      l2: [
        { step: "⚡ Off-chain Tx", desc: "Users complete fast, micro-transactions on Layer-2 boards.", analogy: "Buying drinks with tabs on a café scratchpad." },
        { step: "📦 Batch Rollup", desc: "Rollup engines pack thousands of L2 actions into a single packet.", analogy: "A restaurant owner summing up all tabs at the end of the day." },
        { step: "🔒 Proof Gen", desc: "Generate a compact cryptographic proof summarizing updates.", analogy: "Printing a single audited receipt showing the day's total cash flow." },
        { step: "🏛️ L1 Settlement", desc: "Submit cryptographic proof to Layer-1 mainnet for security.", analogy: "Depositing the single daily receipt to the main vault." }
      ],
      dao: [
        { step: "💡 Proposal", desc: "Draft smart contract updates or token spend budgets.", analogy: "Suggesting a new rule for a local community clubhouse." },
        { step: "🗳️ Stake Vote", desc: "Members stake governance tokens to cast weighted votes.", analogy: "Casting club votes where your vote power equals your share count." },
        { step: "📊 Quorum Check", desc: "Verify if minimum active turnout and yes-votes are achieved.", analogy: "Ensuring at least 50% of the club attends before making rules." },
        { step: "⚙️ Autonomous Execution", desc: "Smart contract executes proposal automatically with code.", analogy: "The safe opens and pays the builder without needing a signature." }
      ]
    };

    const steps = flowData[zoneId] || [];
    const activeData = steps[selectedFlowchartStep] || steps[0] || { step: "", desc: "", analogy: "" };

    return (
      <div className="space-y-6">
        {/* Horizontal steps line */}
        <div className="relative py-2">
          {/* Connecting line background */}
          <div className="absolute top-[21px] sm:top-[25px] left-6 right-6 h-0.5 bg-slate-800 z-0" />
          
          <div className="flex flex-row items-center justify-between gap-1 sm:gap-4 relative z-10 overflow-x-auto scrollbar-none">
            {steps.map((s, idx) => {
              const isSelected = selectedFlowchartStep === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { playSound("click"); setSelectedFlowchartStep(idx); }}
                  className="flex-1 min-w-[65px] sm:w-full flex flex-col items-center group cursor-pointer focus:outline-none"
                >
                  <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${
                    isSelected 
                      ? "bg-indigo-600 border-indigo-400 text-white scale-105 sm:scale-110 shadow-lg shadow-indigo-600/25" 
                      : "bg-slate-900 border-slate-800 text-slate-400 group-hover:border-slate-700 group-hover:text-slate-300"
                  }`}>
                    <span className="text-xs sm:text-sm font-mono font-bold">{idx + 1}</span>
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-mono mt-1.5 sm:mt-2 font-bold uppercase tracking-wider text-center line-clamp-1 transition-colors ${
                    isSelected ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
                  }`}>
                    {s.step.split(" ")[1] || s.step}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Explanation Panel */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2">
            <span className="text-base">{activeData.step.split(" ")[0]}</span>
            <h5 className="text-xs font-bold font-mono tracking-wider uppercase text-white">{activeData.step}</h5>
          </div>
          
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {activeData.desc}
          </p>

          <div className="border-t border-slate-850 pt-2.5 mt-2 font-mono text-[10px] text-indigo-300">
            <span className="font-bold uppercase tracking-wider block mb-0.5 text-[9px] text-slate-500">Real-life Analogy:</span>
            <span className="text-slate-300 italic">“{activeData.analogy}”</span>
          </div>
        </div>
      </div>
    );
  };

  // 1. Wallet village handlers
  const handleWordClick = (word: string) => {
    if (reconstructedSeed.includes(word)) {
      setReconstructedSeed(reconstructedSeed.filter((w) => w !== word));
    } else {
      setReconstructedSeed([...reconstructedSeed, word]);
    }
  };

  const verifyWalletSeed = () => {
    const matched = reconstructedSeed.every((w, idx) => w === seedPhrase[idx]) && reconstructedSeed.length === 12;
    if (matched) {
      const derivedKeys = generateKeyPair();
      setKeys(derivedKeys);
      onUpdateProfileKeys?.(derivedKeys);
      setChallengePassed(true);
      onProgressMission?.("wallet_seed");
    } else {
      showToast("Incorrect seed phrase order!", "error", "Protect your recovery phrase carefully and try again.");
      setReconstructedSeed([]);
    }
  };

  // 2. Transaction valley handlers
  const signAndSignTx = () => {
    playSound("click");
    const rawMsg = `${txDetails.amount}_DAI_to_${txDetails.recipient}_gas_${txDetails.fee}`;
    const signingKey = activeSigningKey || generateKeyPair().privateKey;
    const sig = signTransaction(signingKey, rawMsg);
    setTxSignature(sig);
  };

  const broadcastTx = () => {
    if (!txSignature) return;
    playSound("mission_complete");
    setTxBroadcasted(true);
    setChallengePassed(true);
    onProgressMission?.("sandbox_sign");
  };

  // 3. Mining Mountain handers
  const startMiningSimulation = async () => {
    if (isMining) return;
    setIsMining(true);
    playSound("click");
    
    let currentNonce = miningNonce;
    let targetZero = "0".repeat(miningDifficulty);
    let found = false;

    // Simulate mining iterations with dynamic speed
    const miningInterval = setInterval(() => {
      const hash = simpleHash(`block_3_transactions_${currentNonce}`);
      setMiningHash(hash);
      setMiningNonce(currentNonce);

      if (hash.startsWith(targetZero)) {
        found = true;
        setMinedBlock(true);
        setChallengePassed(true);
        setIsMining(false);
        onProgressMission?.("sandbox_mine");
        clearInterval(miningInterval);
        playSound("mission_complete");
      } else {
        currentNonce += 1;
      }
    }, 120);
  };

  // 4. Smart contract handlers
  const handleContractCompile = () => {
    if (contractCode.itemPrice <= 0) {
      showToast("Invalid item price!", "error", "Price must be at least 1 token!");
      return;
    }
    setCompileSuccess(true);
    onProgressMission?.("contract_deploy");
  };

  const handleDepositToken = () => {
    if (!compileSuccess) return;
    if (contractCode.inputDeposit < contractCode.itemPrice) {
      setVendingMachineOutput("❌ Error: Insufficient tokens deposited! Agreement conditions unfulfilled.");
      return;
    }
    setVendingMachineOutput(`✅ Deposited ${contractCode.inputDeposit} token(s). Success! Vending conditions satisfied. Smart Contract executed autonomously.`);
    setMintedNFT(`NFT Badge: ${contractCode.nftTier}`);
    setChallengePassed(true);
  };

  // 5. DeFi District Handlers
  const handleSwapExecute = () => {
    const k = poolA * poolB;
    const newPoolA = poolA + swapAmount;
    const newPoolB = k / newPoolA;
    
    setPoolA(newPoolA);
    setPoolB(newPoolB);
    setChallengePassed(true);
    onProgressMission?.("sandbox_swap");
  };

  // 6. Oracle Citadel Handlers
  const handleOracleBroadcast = () => {
    const sorted = [...oraclePrices].sort((a, b) => a - b);
    const median = sorted[1];
    setOracleMedian(median);
    setOracleBroadcasted(true);
    setChallengePassed(true);
    onProgressMission?.("quest_complete");
    playSound("mission_complete");
  };

  // 7. Layer-2 Lagoon Handlers
  const handleAddTxToL2 = (txDesc: string) => {
    if (l2TxList.length >= 5) {
      showToast("Batch space full!", "error", "You can compress a maximum of 5 transactions per rollup batch.");
      return;
    }
    setL2TxList([...l2TxList, txDesc]);
    playSound("click");
  };

  const handleL2RollupExecute = () => {
    if (l2TxList.length === 0) {
      showToast("No transactions!", "error", "Add some transactions to the off-chain batch first!");
      return;
    }
    setIsL2Rolling(true);
    playSound("click");
    setTimeout(() => {
      setIsL2Rolling(false);
      setL2RollupProof("0x" + simpleHash("l2_proof_" + Math.random()).substring(0, 40));
      setChallengePassed(true);
      onProgressMission?.("quest_complete");
      playSound("mission_complete");
    }, 1500);
  };

  // 8. DAO Dome Handlers
  const handleDaoVote = (support: boolean) => {
    if (daoVoted) return;
    setDaoVotes(prev => ({
      yes: prev.yes + (support ? 250 : 0),
      no: prev.no + (support ? 0 : 250)
    }));
    setDaoVoted(true);
    playSound("click");
  };

  const handleDaoExecute = () => {
    if (!daoVoted) return;
    setDaoExecuted(true);
    setChallengePassed(true);
    onProgressMission?.("quest_complete");
    playSound("mission_complete");
  };

  // Submissions
  const handleQuizSubmit = (index: number) => {
    if (quizSubmitted) return;
    setSelectedQuizAns(index);
    setQuizSubmitted(true);
    if (index === lesson.answerIndex) {
      setQuizIsCorrect(true);
    } else {
      setQuizIsCorrect(false);
    }
  };

  // Boss Battle Functions
  const startBossBattle = () => {
    if (!lesson) return;
    setBossHp(100);
    setPlayerHp(100);
    setBossQuestionIndex(0);
    setBossSelectedAns(null);
    setBossQuizSubmitted(false);
    setBattleStatus("intro");
    setBossBattleLog([
      `⚔️ Battle initiated! You challenge ${lesson.bossName}.`,
      `🛡️ Your cryptographic shields are at 100%. Prepare your knowledge!`,
    ]);
    setStep("boss");
    setTimeout(() => {
      playSound("click");
    }, 10);
  };

  const handleBossAnswerSelect = (index: number) => {
    if (bossQuizSubmitted || !lesson) return;
    setBossSelectedAns(index);
    setBossQuizSubmitted(true);
    
    const currentQuestion = lesson.bossQuestions[bossQuestionIndex];
    const isCorrect = index === currentQuestion.answer;
    
    if (isCorrect) {
      const nextHp = Math.max(0, bossHp - 40);
      setBossHp(nextHp);
      
      const logs = [
        ...bossBattleLog,
        `💥 You answered: "${currentQuestion.options[index]}"`,
        `🔥 CRITICAL HIT! You deal 40 damage with an Asymmetric Cryptographic blast!`,
      ];
      
      if (nextHp <= 0) {
        setBattleStatus("victory");
        logs.push(`👑 VICTORY! You have completely compiled consensus and defeated ${lesson.bossName}!`);
        logs.push(`🎁 Rewards: +100 XP Boss Bonus and a Streak Lootbox secured!`);
        setTimeout(() => {
          playSound("level_up");
        }, 10);
      } else {
        logs.push(`🛡️ ${lesson.bossName} reeled in pain! It has ${nextHp} HP remaining.`);
        setTimeout(() => {
          playSound("click");
        }, 10);
      }
      setBossBattleLog(logs);
    } else {
      const nextPlayerHp = Math.max(0, playerHp - 40);
      setPlayerHp(nextPlayerHp);
      
      const logs = [
        ...bossBattleLog,
        `❌ You answered: "${currentQuestion.options[index]}"`,
        `💀 OUCH! The Boss struck your shields for 40 damage with a malicious Sybil hash!`,
      ];
      
      if (nextPlayerHp <= 0) {
        setBattleStatus("defeat");
        logs.push(`💀 DEFEAT! Your cryptographic shields collapsed! ${lesson.bossName} has defeated you.`);
        logs.push(`🔄 Don't give up! Study the materials and try again.`);
        setTimeout(() => {
          playSound("click");
        }, 10);
      } else {
        logs.push(`⚠️ Your shields are holding at ${nextPlayerHp}% HP. Be careful!`);
        setTimeout(() => {
          playSound("click");
        }, 10);
      }
      setBossBattleLog(logs);
    }
  };

  const handleNextBossQuestion = () => {
    if (bossQuestionIndex < 2) {
      setBossQuestionIndex(bossQuestionIndex + 1);
      setBossSelectedAns(null);
      setBossQuizSubmitted(false);
      setTimeout(() => {
        playSound("click");
      }, 10);
    }
  };

  const handleClaimBossVictory = () => {
    // Award the standard lesson XP plus the +100 Boss bonus!
    onLessonCompleted(lesson.xp + 100, lesson.badgeId);
    resetChallengeStates();
    setStep("learn");
    setBattleStatus("idle");
  };

  const triggerCompletion = () => {
    onLessonCompleted(lesson.xp, lesson.badgeId);
    resetChallengeStates();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col h-full" id="lesson-module">
      {/* Tab Navigation header */}
      <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-4 justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setStep("learn")}
            className={`px-4 py-2 text-xs font-mono tracking-wider font-semibold border-b-2 rounded-t-lg transition-all ${
              step === "learn"
                ? "border-indigo-500 text-white bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            1. LEARN CONCEPT
          </button>
          <button
            onClick={() => setStep("challenge")}
            className={`px-4 py-2 text-xs font-mono tracking-wider font-semibold border-b-2 rounded-t-lg transition-all ${
              step === "challenge"
                ? "border-indigo-500 text-white bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            2. INTERACTIVE QUEST
          </button>
          <button
            onClick={() => setStep("quiz")}
            disabled={!challengePassed}
            className={`px-4 py-2 text-xs font-mono tracking-wider font-semibold border-b-2 rounded-t-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              step === "quiz"
                ? "border-indigo-500 text-white bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            3. CONCEPT CHECK
          </button>
          <button
            onClick={() => {
              if (step !== "boss") {
                startBossBattle();
              }
            }}
            disabled={!quizSubmitted || !quizIsCorrect}
            className={`px-4 py-2 text-xs font-mono tracking-wider font-semibold border-b-2 rounded-t-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              step === "boss"
                ? "border-rose-500 text-rose-400 bg-slate-900"
                : "border-transparent text-slate-500 hover:text-rose-400"
            }`}
          >
            ⚔️ 4. BOSS BATTLE
          </button>
        </div>

        <button
          onClick={onOpenTutor}
          className="text-[10px] text-amber-400 bg-amber-400/5 hover:bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1 mb-2 font-mono flex items-center gap-1.5 transition-all animate-pulse"
        >
          <Sparkles className="w-3 h-3" />
          Ask Satoshi AI
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-900 min-h-0">
        {/* STEP 1: LEARN */}
        {step === "learn" && (
          <div className="max-w-2xl mx-auto w-full space-y-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{lesson.title}</h3>
              
              {/* Pocket Glossary & Ask AI Shortcuts */}
              {isBeginner && (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { playSound("click"); setIsPocketGlossaryOpen(!isPocketGlossaryOpen); }}
                    className={`text-[10px] font-mono px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isPocketGlossaryOpen
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 animate-pulse"
                        : "text-slate-400 bg-slate-900 border-slate-800 hover:text-slate-200 hover:bg-slate-850"
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Pocket Glossary
                  </button>
                  <button
                    type="button"
                    onClick={onOpenTutor}
                    className="text-[10px] text-amber-400 bg-amber-400/5 hover:bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1.5 font-mono flex items-center gap-1.5 transition-all animate-pulse cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask Satoshi AI
                  </button>
                </div>
              )}
            </div>

            {/* Pocket Glossary Drawer */}
            {isBeginner && isPocketGlossaryOpen && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 border-l-4 border-l-cyan-500 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">Blockchain Jargon Dictionary</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPocketGlossaryOpen(false)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={pocketGlossarySearch}
                    onChange={(e) => setPocketGlossarySearch(e.target.value)}
                    placeholder="Search jargon (e.g. key, gas, mining, contract...)"
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Filtered terms list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto scrollbar-thin">
                  {Object.entries(GLOSSARY_DB)
                    .filter(([key, value]) => {
                      return key.includes(pocketGlossarySearch.toLowerCase()) || 
                             value.term.toLowerCase().includes(pocketGlossarySearch.toLowerCase()) ||
                             value.definition.toLowerCase().includes(pocketGlossarySearch.toLowerCase());
                    })
                    .map(([key, entry]) => (
                      <div key={key} className="p-3 bg-slate-900 border border-slate-850/60 rounded-xl space-y-1">
                        <span className="text-xs font-bold text-cyan-400 font-mono tracking-wide block">{entry.term}</span>
                        <p className="text-[10px] text-slate-300 leading-normal font-sans font-medium">{entry.definition}</p>
                        <div className="text-[9px] text-slate-500 font-mono pt-1 flex items-center gap-1">
                          <span className="text-cyan-500 font-bold">Analogy:</span>
                          <span className="truncate">{entry.example}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Sub-tab navigation */}
            {isBeginner && (
              <div className="flex bg-slate-950 p-1 border border-slate-850/80 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => { playSound("click"); setLearnSubTab("text"); }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    learnSubTab === "text"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Read Concept
                </button>
                <button
                  type="button"
                  onClick={() => { playSound("click"); setLearnSubTab("visual"); }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    learnSubTab === "visual"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Concept Flowchart
                </button>
              </div>
            )}
            
            {(!isBeginner || learnSubTab === "text") ? (
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed bg-slate-950/40 border border-slate-850 p-5 rounded-2xl">
                {lesson.concept}
              </p>
            ) : (
              <div className="bg-slate-950/50 border border-slate-850 p-5 rounded-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <h4 className="text-xs font-mono font-bold text-indigo-400 tracking-wider uppercase">Interactive Flow & Mental Models</h4>
                  <span className="text-[10px] font-mono text-slate-500">Click steps to see analogies</span>
                </div>
                {renderVisualFlowchart()}
              </div>
            )}

            <div className="border border-slate-800 rounded-2xl p-5 bg-slate-950/20 space-y-3">
              <h4 className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                HOW TO PLAY THIS QUEST:
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {lesson.challengeDesc} Once you complete the quest, you will unlock the final conceptual quiz.
              </p>
            </div>

            {/* AI Hotkeys prefilled prompt bubble */}
            {isBeginner && (
              <div className="border border-slate-850/60 bg-slate-950/30 rounded-2xl p-4 space-y-3">
                <h4 className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Satoshi AI Quick Questions (Prefilled):
                </h4>
                <p className="text-[10px] text-slate-400">Not sure about a concept? Tap a question to instantly ask your AI mentor:</p>
                <div className="flex flex-col gap-2">
                  {getContextualAIQuestions(zoneId).map((q, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => {
                        onOpenTutor();
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent("ask-satoshi-ai", { detail: { prompt: q } }));
                        }, 150);
                      }}
                      className="w-full text-left text-xs bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 px-3 py-2 rounded-xl text-slate-300 hover:text-amber-300 transition-all flex items-center justify-between group cursor-pointer animate-fade-in"
                    >
                      <span className="truncate">{q}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                playSound("click");
                setStep("challenge");
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 transition-all hover:scale-[1.01] active:scale-95 group cursor-pointer"
            >
              Start Level Quest
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* STEP 2: INTERACTIVE CHALLENGE */}
        {step === "challenge" && (
          <div className="max-w-4xl mx-auto w-full space-y-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-mono font-bold text-indigo-400 tracking-widest uppercase">QUEST SIMULATION</h4>
                {challengePassed && (
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono font-semibold flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" /> QUEST SUCCESS
                  </span>
                )}
              </div>

              {/* Pocket Glossary & Ask AI Shortcuts */}
              {isBeginner && (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { playSound("click"); setIsPocketGlossaryOpen(!isPocketGlossaryOpen); }}
                    className={`text-[10px] font-mono px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isPocketGlossaryOpen
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 animate-pulse"
                        : "text-slate-400 bg-slate-900 border-slate-800 hover:text-slate-200 hover:bg-slate-850"
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Pocket Glossary
                  </button>
                  <button
                    type="button"
                    onClick={onOpenTutor}
                    className="text-[10px] text-amber-400 bg-amber-400/5 hover:bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1.5 font-mono flex items-center gap-1.5 transition-all animate-pulse cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask Satoshi AI
                  </button>
                </div>
              )}
            </div>

            {/* Pocket Glossary Drawer */}
            {isBeginner && isPocketGlossaryOpen && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 border-l-4 border-l-cyan-500 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">Blockchain Jargon Dictionary</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPocketGlossaryOpen(false)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={pocketGlossarySearch}
                    onChange={(e) => setPocketGlossarySearch(e.target.value)}
                    placeholder="Search jargon (e.g. key, gas, mining, contract...)"
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Filtered terms list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto scrollbar-thin">
                  {Object.entries(GLOSSARY_DB)
                    .filter(([key, value]) => {
                      return key.includes(pocketGlossarySearch.toLowerCase()) || 
                             value.term.toLowerCase().includes(pocketGlossarySearch.toLowerCase()) ||
                             value.definition.toLowerCase().includes(pocketGlossarySearch.toLowerCase());
                    })
                    .map(([key, entry]) => (
                      <div key={key} className="p-3 bg-slate-900 border border-slate-850/60 rounded-xl space-y-1">
                        <span className="text-xs font-bold text-cyan-400 font-mono tracking-wide block">{entry.term}</span>
                        <p className="text-[10px] text-slate-300 leading-normal font-sans font-medium">{entry.definition}</p>
                        <div className="text-[9px] text-slate-500 font-mono pt-1 flex items-center gap-1">
                          <span className="text-cyan-500 font-bold">Analogy:</span>
                          <span className="truncate">{entry.example}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Progressive Hint Widget */}
            {isBeginner && (
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Stuck on this simulation?</h5>
                    <p className="text-[10px] text-slate-400">Unlock progressive clues to guide you through the quest step-by-step.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeHintIndex >= 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveHintIndex(-1)}
                      className="text-[10px] font-mono text-slate-500 hover:text-slate-300 underline px-2 py-1 cursor-pointer"
                    >
                      Hide
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setActiveHintIndex((prev) => Math.min(2, prev + 1));
                    }}
                    disabled={activeHintIndex >= 2}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg transition-all shadow-md shadow-amber-500/10 disabled:opacity-40 cursor-pointer"
                  >
                    {activeHintIndex === -1 ? "💡 Get Clue 1" : activeHintIndex === 0 ? "💡 Reveal Clue 2" : "💡 Show Exact Solution"}
                  </button>
                </div>
              </div>
            )}

            {/* Hint Details Box */}
            {isBeginner && activeHintIndex >= 0 && (
              <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 space-y-2.5 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-1.5 border-b border-amber-500/10 pb-1.5">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                    Clue {activeHintIndex + 1} of 3: {activeHintIndex === 0 ? "Conceptual Overview" : activeHintIndex === 1 ? "Guided Instructions" : "Exact Solution / Setup"}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                  {getHintText(zoneId, activeHintIndex)}
                </p>
              </div>
            )}

            {/* 1. Wallet village game interface */}
            {zoneId === "wallet" && (
              <div className="space-y-4">
                {walletStage === "generate" ? (
                  <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Key className="w-5 h-5 shrink-0 animate-pulse" />
                        <h5 className="text-xs font-bold font-mono uppercase tracking-widest">Stage 1: Generate Master Recovery Phrase</h5>
                      </div>
                      
                      <p className="text-xs text-slate-300 leading-relaxed">
                        To construct a new blockchain wallet, we generate <strong className="text-white">12 random recovery words</strong> (also called a seed phrase). This phrase acts as your wallet's master password. Write them down or memorize them in order, because next you will need to re-assemble them to prove you've backed them up!
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 border border-slate-850 p-4 rounded-xl shadow-inner">
                        {seedPhrase.map((word, idx) => (
                          <div
                            key={idx}
                            className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-xs font-mono p-2.5 text-center flex items-center justify-center text-slate-200"
                          >
                            <span className="text-[10px] text-indigo-400 font-bold mr-1.5">{idx + 1}.</span>
                            {word}
                          </div>
                        ))}
                      </div>

                      {/* Cryptographic Keypair sandbox visualization */}
                      <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-xl space-y-3 font-mono text-[11px] text-slate-400">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <p className="text-indigo-400 font-bold flex items-center gap-1.5">
                            <Cpu className="w-4 h-4 text-indigo-400" /> LIVE KEY DERIVATION ENGINE
                          </p>
                          <button
                            onClick={() => {
                              playSound("click");
                              const phrase = generateSeedPhrase();
                              setSeedPhrase(phrase);
                              setShuffledSeed([...phrase].sort(() => Math.random() - 0.5));
                              setReconstructedSeed([]);
                              const derived = generateKeyPair();
                              setKeys(derived);
                              onUpdateProfileKeys?.(derived);
                              onProgressMission?.("sandbox_keypair");
                              showToast("Fresh public/private keypair generated! 🔑", "success", "Your daily mission progress has been updated!");
                            }}
                            className="text-[9px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-mono"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Generate Fresh Keypair
                          </button>
                        </div>
                        <p className="leading-relaxed text-slate-300">
                          These 12 words are transformed via mathematical algorithms into your master private and public keys.
                        </p>
                        
                        <div className="space-y-1.5 border-t border-slate-900 pt-2.5 text-[10px]">
                          <p className="break-all"><strong className="text-indigo-300">Private Key:</strong> <span className="text-slate-400">0x{keys?.privateKey || "..."}</span></p>
                          <p className="break-all"><strong className="text-indigo-300">Public Key:</strong> <span className="text-slate-400">0x{keys?.publicKey || "..."}</span></p>
                          <p className="break-all"><strong className="text-emerald-400">Public Address:</strong> <span className="text-emerald-300">{keys?.address || "..."}</span></p>
                        </div>
                        <div className="text-[9px] bg-indigo-500/5 border border-indigo-500/10 p-2 rounded-lg text-indigo-300/80 leading-snug">
                          💡 <strong>How it works:</strong> The private key signs transactions. The public key derives your address so people can send you coins. Anyone with these 12 words can derive the exact same private key!
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          playSound("click");
                          setWalletStage("test");
                          setReconstructedSeed([]);
                        }}
                        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                      >
                        I have secured my 12 words! Take Recovery Test →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                        <div className="flex items-center gap-2 text-indigo-400">
                          <Key className="w-5 h-5 shrink-0" />
                          <h5 className="text-xs font-bold font-mono uppercase tracking-widest">Stage 2: Restore Memory Recovery Test</h5>
                        </div>
                        <button
                          onClick={() => {
                            playSound("click");
                            setWalletStage("generate");
                            setReconstructedSeed([]);
                          }}
                          className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          ← Show Words Again
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        To activate your cryptographic address and complete your onboarding, reconstruct your seed phrase by clicking the words in the exact sequence they were generated.
                      </p>
                      
                      {/* Target seq list */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-slate-950 border border-slate-850 p-3 rounded-xl min-h-[90px] shadow-inner">
                        {seedPhrase.map((word, idx) => {
                          const selected = reconstructedSeed[idx];
                          const isCorrect = selected === word;
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (selected) {
                                  playSound("click");
                                  setReconstructedSeed(reconstructedSeed.filter((w) => w !== selected));
                                }
                              }}
                              className={`rounded-lg border text-xs font-mono p-2 text-center flex items-center justify-center transition-all ${
                                selected
                                  ? isCorrect
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-pointer hover:bg-emerald-500/20"
                                    : "bg-rose-500/10 border-rose-500/30 text-rose-400 cursor-pointer hover:bg-rose-500/20"
                                  : "bg-slate-950/40 border-slate-850 text-slate-600"
                              }`}
                            >
                              <span className="text-[9px] text-slate-500 mr-1.5">{idx + 1}.</span>
                              {selected || "—"}
                            </div>
                          );
                        })}
                      </div>

                      {/* Shuffled pool */}
                      <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                        <p className="text-[10px] font-mono text-slate-500 mb-2.5 uppercase tracking-wider">Word Pool:</p>
                        <div className="flex flex-wrap gap-2">
                          {shuffledSeed.map((word, idx) => {
                            const alreadySelected = reconstructedSeed.includes(word);
                            return (
                              <button
                                key={idx}
                                disabled={alreadySelected}
                                onClick={() => {
                                  playSound("click");
                                  handleWordClick(word);
                                }}
                                className={`text-xs font-mono px-3.5 py-2 rounded-lg border transition-all ${
                                  alreadySelected
                                    ? "bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed opacity-40"
                                    : "bg-slate-900 border-slate-800 hover:border-indigo-500/40 hover:bg-indigo-500/5 text-slate-300"
                                }`}
                              >
                                {word}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {!challengePassed ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              playSound("click");
                              setReconstructedSeed([]);
                            }}
                            disabled={reconstructedSeed.length === 0}
                            className="bg-slate-950 hover:bg-slate-900 text-slate-400 font-bold text-xs px-4 py-3 rounded-xl border border-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Clear Order
                          </button>
                          <button
                            onClick={() => {
                              playSound("click");
                              verifyWalletSeed();
                            }}
                            disabled={reconstructedSeed.length < 12}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-md"
                          >
                            Restore Wallet & Verify Keys
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3 text-xs font-mono">
                          <p className="text-emerald-400 font-bold mb-1 flex items-center gap-1.5 text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" /> WALLET RESTORATION SUCCESSFUL!
                          </p>
                          <p className="text-slate-300 leading-relaxed">
                            Congratulations! You successfully restored your wallet from backup. In doing so, you proved mathematically that you can reproduce your unique cryptographic keypair.
                          </p>
                          <div className="space-y-1.5 border-t border-emerald-500/10 pt-2.5 text-[10px]">
                            <p className="break-all"><strong className="text-emerald-300">Your Private Key:</strong> 0x{keys?.privateKey}</p>
                            <p className="break-all"><strong className="text-emerald-300">Your Public Key:</strong> 0x{keys?.publicKey}</p>
                            <p className="break-all"><strong className="text-emerald-400">Your Wallet Address:</strong> {keys?.address}</p>
                          </div>
                          <div className="text-[10px] bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-lg text-emerald-300/80 leading-normal">
                            🎉 <strong>Concept clear:</strong> Your seed phrase is human-readable. It produces your unique Private Key. The Private Key allows you to sign transactions. You are now ready to take the quiz and unlock Level 2!
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Transaction valley game interface */}
            {zoneId === "transaction" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1">RECIPIENT ADDRESS</label>
                    <input
                      type="text"
                      value={txDetails.recipient}
                      onChange={(e) => setTxDetails({ ...txDetails, recipient: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1">AMOUNT (QUEST COINS)</label>
                    <input
                      type="number"
                      value={txDetails.amount}
                      onChange={(e) => setTxDetails({ ...txDetails, amount: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300"
                    />
                  </div>
                </div>

                {/* Gas fee slider */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-850">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono text-slate-500">SET TX GAS FEE</span>
                    <span className="text-xs font-mono text-amber-400 font-semibold">{txDetails.fee} Gwei</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={txDetails.fee}
                    onChange={(e) => setTxDetails({ ...txDetails, fee: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-1">
                    <span>1 Gwei (Slow)</span>
                    <span>5 Gwei (Normal)</span>
                    <span>10 Gwei (Priority Mined)</span>
                  </div>
                </div>

                {/* Cryptographic Signing Key Simulator Panel (Sandbox integrated!) */}
                <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-400 font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      🔒 ECDSA SIGNING SANDBOX
                    </span>
                    <button
                      onClick={() => {
                        playSound("click");
                        setActiveSigningKey(generateKeyPair().privateKey);
                        setTxSignature("");
                        onProgressMission?.("sandbox_keypair");
                        showToast("Generated a fresh cryptographic signing key! 🔑", "success", "Daily mission progress updated!");
                      }}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      🔄 Generate Random Key
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Signing Private Key (Secret):</label>
                    <input
                      type="text"
                      value={activeSigningKey}
                      onChange={(e) => {
                        setActiveSigningKey(e.target.value);
                        setTxSignature("");
                      }}
                      placeholder="Paste your 0x private key here..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {keys && keys.privateKey === activeSigningKey && (
                      <p className="text-[9px] text-emerald-400 mt-0.5">✓ Auto-filled your Private Key derived in Level 1!</p>
                    )}
                  </div>

                  {/* Visual formula flow */}
                  <div className="bg-slate-900 border border-slate-850/80 rounded-xl p-2.5 space-y-1.5 text-[10px] text-slate-400">
                    <p className="font-bold text-slate-300">Live Mathematical Flow:</p>
                    <p className="break-all">
                      <strong className="text-indigo-300">1. TX Payload:</strong> {`${txDetails.amount}_DAI_to_${txDetails.recipient.substring(0, 16)}..._gas_${txDetails.fee}`}
                    </p>
                    <p className="break-all">
                      <strong className="text-indigo-300">2. Payload Hash (SHA-256):</strong> 0x{simpleHash(`${txDetails.amount}_DAI_to_${txDetails.recipient}_gas_${txDetails.fee}`).substring(0, 32)}...
                    </p>
                    <p>
                      <strong className="text-indigo-300">3. ECDSA Output:</strong> <span className="text-slate-500 font-bold">Sign(Payload Hash, Private Key)</span>
                    </p>
                  </div>
                </div>

                {!txSignature ? (
                  <button
                    onClick={signAndSignTx}
                    disabled={!activeSigningKey}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <Key className="w-4 h-4" />
                    Cryptographically Sign Transaction
                  </button>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/25 rounded-2xl text-xs font-mono space-y-2">
                      <p className="text-indigo-400 font-bold mb-1 flex items-center gap-1.5">
                        ✓ SECURE SIGNATURE PRODUCED!
                      </p>
                      <p className="text-slate-300 break-all leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                        <strong className="text-slate-500 block text-[9px] mb-1">ECDSA Signature Hash (r, s, v):</strong>
                        {txSignature}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        💡 This signature proves that the owner of Private Key <span className="text-indigo-300 font-bold">0x{activeSigningKey.substring(0, 8)}...</span> approved transferring {txDetails.amount} DAI. No one can forge this without having your secret key!
                      </p>
                    </div>
                    
                    {!txBroadcasted ? (
                      <button
                        onClick={broadcastTx}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        Broadcast signed TX to Mempool
                      </button>
                    ) : (
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs font-mono space-y-1.5">
                        <p className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" /> TRANSACTION BROADCAST SUCCESSFUL!
                        </p>
                        <p className="text-slate-300 leading-relaxed">
                          Your signed transaction has been broadcasted to the network mempool! Nodes will now verify the signature against your public address and queue it for mining. You are ready to unlock the Level 2 quiz!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Mining Mountain game interface */}
            {zoneId === "mining" && (
              <div className="space-y-4">
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 sm:p-5 space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-center text-slate-400 border-b border-slate-900 pb-3">
                    <span className="font-bold flex items-center gap-1.5 text-indigo-400">
                      <Layers className="w-4 h-4 text-indigo-400" /> BLOCK #3 DETECTOR
                    </span>
                    <span className="text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg text-[10px]">
                      TARGET PREFIX: {"0".repeat(miningDifficulty)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-slate-400">
                    <div className="break-all">
                      <span className="text-slate-500">Previous Hash:</span> e03d7bc105b4e7235a92d4f5b3a1a67a9202618fb8f73ac282...
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Mempool Tx List:</span>
                      <span className="text-slate-300 font-semibold">2 signed transactions ready</span>
                    </div>
                  </div>

                  {/* Difficulty controls (Sandbox integration!) */}
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">PoW DIFFICULTY SELECTOR</span>
                      <span className="text-indigo-400 font-bold">{"0".repeat(miningDifficulty)} (Hex)</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((diff) => (
                        <button
                          key={diff}
                          disabled={isMining}
                          onClick={() => {
                            playSound("click");
                            setMiningDifficulty(diff);
                            setMinedBlock(false);
                            setChallengePassed(false);
                            setMiningHash(simpleHash("block_3_transactions_" + miningNonce));
                          }}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                            miningDifficulty === diff
                              ? "bg-amber-500 border-amber-500 text-slate-950 shadow-sm"
                              : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300 disabled:opacity-40"
                          }`}
                        >
                          {diff} {diff === 1 ? "Zero" : "Zeros"}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-500 leading-relaxed font-sans">
                      💡 <strong>Why it matters:</strong> Each additional zero requires a hash starting with that prefix. Because SHA-256 output is completely pseudo-random, finding 3 zeros requires checking ~4,096 times more hashes on average than 1 zero!
                    </p>
                  </div>
                  
                  {/* Nonce adjustor */}
                  <div className="flex items-center justify-between border-t border-slate-900 pt-3.5 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">NONCE:</span>
                      <input
                        type="number"
                        disabled={isMining}
                        value={miningNonce}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMiningNonce(val);
                          setMiningHash(simpleHash("block_3_transactions_" + val));
                        }}
                        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1 w-24 text-center font-bold text-xs"
                      />
                    </div>
                    <button
                      disabled={isMining || minedBlock}
                      onClick={() => {
                        playSound("click");
                        const n = miningNonce + 1;
                        setMiningNonce(n);
                        setMiningHash(simpleHash("block_3_transactions_" + n));
                      }}
                      className="bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed px-3.5 py-1.5 rounded-lg text-slate-300 font-semibold"
                    >
                      +1 Nonce Manual
                    </button>
                  </div>

                  {/* Hash results */}
                  <div className={`p-4 rounded-xl border break-all transition-all ${
                    minedBlock 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold shadow-lg shadow-emerald-500/5 animate-pulse" 
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}>
                    <span className="text-[10px] text-slate-500 block mb-1">SHA-256 HASH OUTPUT:</span>
                    <span className="text-xs break-all leading-relaxed">{miningHash || simpleHash("block_3_transactions_" + miningNonce)}</span>
                  </div>
                </div>

                {!minedBlock ? (
                  <button
                    onClick={startMiningSimulation}
                    disabled={isMining}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg transition-colors"
                  >
                    <Cpu className={`w-4 h-4 ${isMining ? "animate-spin text-amber-300" : ""}`} />
                    {isMining ? "Hashing Nonce Space (Auto-miner active)..." : "Start Auto-Mine Hash Exploration"}
                  </button>
                ) : (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs font-mono space-y-1.5">
                    <p className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" /> BLOCK VALIDATED & MINED!
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      Amazing! You found nonce <strong className="text-white">#{miningNonce}</strong> which yields a hash starting with <strong className="text-emerald-300">{"0".repeat(miningDifficulty)}</strong>. You have broadcasted block #3, secured the transactions, and earned block mining rewards! Take the quiz to advance.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 4. Smart contract builder interface */}
            {zoneId === "contract" && (
              <div className="space-y-4">
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 space-y-3 font-mono text-xs">
                  <div className="text-slate-500 flex items-center gap-1">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    VENDING_MACHINE.SOL (SIMULATED SOLIDITY)
                  </div>
                  <div className="bg-slate-900 border border-slate-850 rounded-lg p-3 space-y-2 text-slate-300">
                    <p className="text-indigo-400">contract VendingMachine {"{"}</p>
                    <p className="pl-4 text-emerald-400">address public nftBadgeTier = &quot;{contractCode.nftTier}&quot;;</p>
                    <p className="pl-4 flex items-center gap-1.5">
                      <span>uint public price = </span>
                      <input
                        type="number"
                        value={contractCode.itemPrice}
                        onChange={(e) => setContractCode({ ...contractCode, itemPrice: Number(e.target.value) })}
                        className="bg-slate-950 border border-slate-800 text-indigo-400 text-center font-bold px-1 py-0.5 rounded w-12"
                      />
                      <span>QuestCoins;</span>
                    </p>
                    <p className="pl-4 text-indigo-400">function depositAndMint() public payable {"{"}</p>
                    <p className="pl-8 flex items-center gap-1.5">
                      <span>require(msg.value == </span>
                      <span className="text-yellow-400 font-bold">{contractCode.itemPrice}</span>
                      <span>, &quot;Incorrect price!&quot;);</span>
                    </p>
                    <p className="pl-8 text-slate-400">emit NFTSuccess(msg.sender, nftBadgeTier);</p>
                    <p className="pl-4 text-indigo-400">{"}"}</p>
                    <p className="text-indigo-400">{"}"}</p>
                  </div>
                </div>

                {!compileSuccess ? (
                  <button
                    onClick={handleContractCompile}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl py-2.5 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Compile & Deploy Smart Contract
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-950 border border-violet-500/20 rounded-xl p-3 font-mono text-xs space-y-2">
                      <p className="text-indigo-400 font-bold">STATE CONTROLLER</p>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span>DEPOSIT COINS:</span>
                        <input
                          type="number"
                          value={contractCode.inputDeposit}
                          onChange={(e) => setContractCode({ ...contractCode, inputDeposit: Number(e.target.value) })}
                          className="bg-slate-900 border border-slate-800 text-center text-slate-100 rounded px-2 py-0.5 w-14 font-bold"
                        />
                        <button
                          onClick={handleDepositToken}
                          className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded text-white font-sans text-xs font-medium"
                        >
                          Execute Vending Machine
                        </button>
                      </div>
                    </div>

                    {vendingMachineOutput && (
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-slate-300 space-y-1.5">
                        <p>{vendingMachineOutput}</p>
                        {mintedNFT && (
                          <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <Award className="w-4 h-4" /> MINTED: {mintedNFT}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. DeFi District Pool Interface */}
            {zoneId === "defi" && (
              <div className="space-y-4 font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center text-xs">
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl">
                    <p className="text-slate-500 font-bold mb-1">DAI POOL BALANCE (x)</p>
                    <p className="text-white text-lg font-bold">{poolA.toFixed(2)} DAI</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl">
                    <p className="text-slate-500 font-bold mb-1">ETH POOL BALANCE (y)</p>
                    <p className="text-white text-lg font-bold">{poolB.toFixed(4)} ETH</p>
                  </div>
                </div>

                {/* Constant product curve graph (Sandbox integration!) */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col items-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Constant Product Curve (k = {(poolA * poolB).toFixed(0)})</p>
                  <svg width="240" height="130" className="overflow-visible">
                    {/* Axes */}
                    <line x1="30" y1="10" x2="30" y2="100" stroke="#334155" strokeWidth="1.5" />
                    <line x1="30" y1="100" x2="230" y2="100" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
                    
                    {/* Labels */}
                    <text x="230" y="112" fill="#64748b" fontSize="8" textAnchor="end" className="font-mono">DAI (x)</text>
                    <text x="25" y="15" fill="#64748b" fontSize="8" textAnchor="end" className="font-mono" transform="rotate(-90 25 15)">ETH (y)</text>

                    {/* Curve path */}
                    {(() => {
                      const kVal = poolA * poolB;
                      const points: string[] = [];
                      // We map x from 40 to 180 (DAI balance)
                      // SVG width is 240, height is 130
                      // x range for mapping: 30 to 180
                      // y range for mapping: 2 to 18 (ETH balance)
                      for (let xVal = 40; xVal <= 180; xVal += 5) {
                        const yVal = kVal / xVal;
                        // Mapping formulas:
                        const sx = 30 + ((xVal - 30) / 150) * 190;
                        const sy = 100 - ((yVal - 1.5) / 16.5) * 85;
                        if (sx >= 30 && sx <= 230 && sy >= 10 && sy <= 100) {
                          points.push(`${sx},${sy}`);
                        }
                      }
                      const curveD = `M ${points.join(" L ")}`;
                      
                      // Current dot coordinates
                      const curX = 30 + ((poolA - 30) / 150) * 190;
                      const curY = 100 - ((poolB - 1.5) / 16.5) * 85;

                      // Expected dot coordinates after swapAmount
                      const nextPoolA = poolA + swapAmount;
                      const nextPoolB = kVal / nextPoolA;
                      const nextX = 30 + ((nextPoolA - 30) / 150) * 190;
                      const nextY = 100 - ((nextPoolB - 1.5) / 16.5) * 85;

                      return (
                        <>
                          <path d={curveD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                          
                          {/* Dotted lines to current position */}
                          <line x1="30" y1={curY} x2={curX} y2={curY} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                          <line x1={curX} y1="100" x2={curX} y2={curY} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />

                          {/* Line connecting current position to next position */}
                          <path d={`M ${curX},${curY} Q ${(curX + nextX)/2},${(curY + nextY)/2 - 5} ${nextX},${nextY}`} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3,3" />

                          {/* Next projected dot */}
                          <circle cx={nextX} cy={nextY} r="5" fill="#f43f5e" className="animate-pulse" />
                          <text x={nextX + 8} y={nextY - 4} fill="#f43f5e" fontSize="7" className="font-bold">PROJECTED</text>

                          {/* Current dot */}
                          <circle cx={curX} cy={curY} r="6" fill="#6366f1" stroke="#1e1b4b" strokeWidth="1.5" />
                          <text x={curX + 8} y={curY + 8} fill="#818cf8" fontSize="7" className="font-bold">CURRENT POOL</text>
                        </>
                      );
                    })()}
                  </svg>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl space-y-1 text-xs text-center">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">Constant Product Invariant formula</p>
                  <p className="text-indigo-400 font-bold text-xs">x * y = k</p>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    {poolA.toFixed(1)} DAI * {poolB.toFixed(3)} ETH = <span className="text-amber-400 font-bold">{(poolA * poolB).toFixed(2)}</span>
                  </p>
                </div>

                {/* Swap slider */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-500">SWAP INFLOW:</span>
                    <span className="text-white font-bold">{swapAmount} DAI</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={swapAmount}
                    onChange={(e) => {
                      playSound("click");
                      setSwapAmount(Number(e.target.value));
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  
                  <div className="flex justify-between items-center border-t border-slate-900 pt-3 mt-3 text-xs">
                    <span className="text-slate-500">EXPECTED OUTFLOW (ETH):</span>
                    <span className="text-emerald-400 font-bold">{expectedEth} ETH</span>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center mt-1.5 italic">Rate changes dynamically depending on pool size.</p>
                </div>

                {challengePassed && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl text-xs font-mono space-y-1.5">
                    <p className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" /> LIQUIDITY SWAP COMPLETE!
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      Wonderful! You executed the swap. Notice how the pool balances adjusted but the product constant (k) remained exactly invariant. You are ready to take the Level 5 quiz!
                    </p>
                  </div>
                )}

                {!challengePassed && (
                  <button
                    onClick={() => {
                      playSound("mission_complete");
                      handleSwapExecute();
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-rose-600/10 transition-colors"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    Perform Liquidity Swap
                  </button>
                )}
              </div>
            )}

            {/* 6. Oracle Citadel Interface */}
            {zoneId === "oracle" && (
              <div className="space-y-4 font-mono">
                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl space-y-3">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Configure Node API Feeds</p>
                  
                  <div className="space-y-2 text-xs">
                    {/* Feed 1 */}
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-300">
                        <span>🔌 Coinbase Exchange API:</span>
                        <span className="text-cyan-400">${oraclePrices[0]} USD</span>
                      </div>
                      <input
                        type="range"
                        min="2900"
                        max="3100"
                        value={oraclePrices[0]}
                        disabled={oracleBroadcasted}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setOraclePrices([val, oraclePrices[1], oraclePrices[2]]);
                          playSound("click");
                        }}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    {/* Feed 2 */}
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-300">
                        <span>🔌 Binance Exchange API:</span>
                        <span className="text-cyan-400">${oraclePrices[1]} USD</span>
                      </div>
                      <input
                        type="range"
                        min="2900"
                        max="3100"
                        value={oraclePrices[1]}
                        disabled={oracleBroadcasted}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setOraclePrices([oraclePrices[0], val, oraclePrices[2]]);
                          playSound("click");
                        }}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    {/* Feed 3 */}
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-300">
                        <span>🔌 Kraken Exchange API (Rogue?):</span>
                        <span className="text-cyan-400">${oraclePrices[2]} USD</span>
                      </div>
                      <input
                        type="range"
                        min="2900"
                        max="3100"
                        value={oraclePrices[2]}
                        disabled={oracleBroadcasted}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setOraclePrices([oraclePrices[0], oraclePrices[1], val]);
                          playSound("click");
                        }}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Real-time aggregation */}
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1 text-xs text-center">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">Decentralized Median Consolidation</p>
                  <p className="text-indigo-400 font-bold text-sm">
                    Median(${oraclePrices[0]}, ${oraclePrices[1]}, ${oraclePrices[2]}) ={" "}
                    <span className="text-amber-400 font-extrabold text-base">
                      ${[...oraclePrices].sort((a, b) => a - b)[1]}
                    </span>
                  </p>
                  <p className="text-slate-500 text-[10px] leading-relaxed">
                    By pulling multiple feeds and taking the middle (median) price, we safely nullify outlier manipulation from compromised exchanges!
                  </p>
                </div>

                {oracleBroadcasted && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl text-xs font-mono space-y-1.5">
                    <p className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" /> ORACLE FEEDS AGGREGATED!
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      Excellent node consolidation! You successfully calculated the median price of{" "}
                      <strong className="text-white">${oracleMedian} USD</strong> and securely signed & broadcasted it to the on-chain smart contract feed. Outliers filtered, ledger secured!
                    </p>
                  </div>
                )}

                {!oracleBroadcasted && (
                  <button
                    onClick={handleOracleBroadcast}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/10 transition-colors"
                  >
                    <Database className="w-4 h-4" />
                    Consolidate & Broadcast Price Feed
                  </button>
                )}
              </div>
            )}

            {/* 7. Layer-2 Lagoon Interface */}
            {zoneId === "l2" && (
              <div className="space-y-4 font-mono">
                <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl space-y-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Off-Chain L2 Tx Mempool</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {[
                      { icon: "💸", text: "Alice send 1.2 ETH to Bob" },
                      { icon: "🛒", text: "Charlie mint NFT Badge #402" },
                      { icon: "🏦", text: "Dave swap 500 DAI in AMM" },
                      { icon: "🗳️", text: "Eve cast DAO vote Yes" },
                    ].map((tx, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddTxToL2(`${tx.icon} ${tx.text}`)}
                        disabled={l2TxList.includes(`${tx.icon} ${tx.text}`) || challengePassed}
                        className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:hover:bg-slate-900 rounded-lg text-left text-slate-300 truncate font-mono flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Plus className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{tx.text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Batch Box */}
                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-bold uppercase">CURRENT ROLLUP BATCH ({l2TxList.length} / 5)</span>
                    {l2TxList.length > 0 && !challengePassed && (
                      <button
                        onClick={() => {
                          setL2TxList([]);
                          playSound("click");
                        }}
                        className="text-red-400 hover:text-red-300 flex items-center gap-0.5 cursor-pointer text-[9px]"
                      >
                        <Trash className="w-3 h-3" /> Clear Batch
                      </button>
                    )}
                  </div>

                  <div className="min-h-[70px] bg-slate-900 border border-slate-850 rounded-lg p-2 flex flex-col justify-center space-y-1.5">
                    {l2TxList.length === 0 ? (
                      <p className="text-[10px] text-slate-500 text-center italic">Batch empty. Click transactions above to buffer them off-chain!</p>
                    ) : (
                      l2TxList.map((tx, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-950 border border-slate-900 px-2 py-1 rounded text-[10px] text-slate-200">
                          <span className="truncate font-mono">{tx}</span>
                          <span className="text-emerald-400 font-mono text-[9px]">✓ Pending</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Rollup Proof Execution Loader */}
                {isL2Rolling && (
                  <div className="p-3 bg-slate-950 border border-indigo-500/20 rounded-xl flex items-center justify-center gap-2.5 text-xs text-slate-300 animate-pulse text-center">
                    <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span>Compressing off-chain transactions & generating zk-SNARK proof...</span>
                  </div>
                )}

                {l2RollupProof && (
                  <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl text-xs font-mono space-y-1.5">
                    <p className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" /> BATCH PROOF BROADCASTED!
                    </p>
                    <div className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-[10px] font-mono text-slate-400 break-all space-y-1">
                      <p className="font-bold text-slate-300">SUCCINCT PROOF KEY:</p>
                      <p className="text-slate-400">{l2RollupProof}</p>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px] pt-1">
                      Success! You compressed {l2TxList.length} transactions into a single rollup proof. Gas cost saved by <strong className="text-emerald-400">92%</strong>! Ready for the Zone 7 quiz.
                    </p>
                  </div>
                )}

                {!l2RollupProof && !isL2Rolling && (
                  <button
                    onClick={handleL2RollupExecute}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    Generate Rollup Proof & Submit to L1
                  </button>
                )}
              </div>
            )}

            {/* 8. DAO Dome Interface */}
            {zoneId === "dao" && (
              <div className="space-y-4 font-mono">
                {/* Active Proposal Card */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-indigo-400">ACTIVE PROPOSAL #104</span>
                    <span className="bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/20 uppercase tracking-widest text-[8px]">Voting Open</span>
                  </div>
                  <h4 className="font-bold text-xs text-white">Scale Island Treasury using zk-Rollup layer networks</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    This proposal deploys Layer-2 scaling integrations across the main island bridge, reducing global transaction gas overhead by 92%.
                  </p>
                </div>

                {/* Quorum Progress bar */}
                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                    <span>YES VOTES: {daoVotes.yes}</span>
                    <span>NO VOTES: {daoVotes.no}</span>
                  </div>

                  {/* Progress bar */}
                  {(() => {
                    const total = daoVotes.yes + daoVotes.no;
                    const yesPct = total > 0 ? (daoVotes.yes / total) * 100 : 0;
                    return (
                      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden flex border border-slate-800">
                        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${yesPct}%` }} />
                        <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${100 - yesPct}%` }} />
                      </div>
                    );
                  })()}

                  <div className="flex justify-between text-[10px] text-slate-500 pt-0.5 italic">
                    <span>Approval Quorum: 60%</span>
                    <span>Current approval: {((daoVotes.yes / (daoVotes.yes + daoVotes.no)) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Interaction Section */}
                {!daoVoted && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDaoVote(true)}
                      className="bg-emerald-600/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-600/20 font-bold text-xs rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Check className="w-4 h-4" /> Vote FOR Proposal
                    </button>
                    <button
                      onClick={() => handleDaoVote(false)}
                      className="bg-red-600/10 border border-red-500/25 text-red-400 hover:bg-red-600/20 font-bold text-xs rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Trash className="w-3.5 h-3.5" /> Vote AGAINST
                    </button>
                  </div>
                )}

                {daoVoted && !daoExecuted && (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl text-center text-xs text-slate-300 space-y-1.5">
                      <p className="text-emerald-400 font-bold flex items-center justify-center gap-1 text-[11px]">
                        ✓ YOUR VOTE WAS SUBMITTED SUCCESSFULLY!
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Quorum threshold has been surpassed. The proposal is ready to be dispatched to the blockchain executor!
                      </p>
                    </div>

                    <button
                      onClick={handleDaoExecute}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      Execute Smart Upgrade Contract
                    </button>
                  </div>
                )}

                {daoExecuted && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl text-xs font-mono space-y-1.5">
                    <p className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" /> GOVERNANCE UPGRADE EXECUTED!
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      Amazing work! The contract automatically executed the code payload to initiate ZK-rollup scaling. Decentralized governance secures the Island! Ready for the Zone 8 quiz.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* AI Hotkeys prefilled prompt bubble */}
            {isBeginner && (
              <div className="border border-slate-850/60 bg-slate-950/30 rounded-2xl p-4 space-y-3">
                <h4 className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Ask Satoshi AI about this Quest:
                </h4>
                <p className="text-[10px] text-slate-400">Tap a question to instantly ask your AI mentor about this specific challenge simulation:</p>
                <div className="flex flex-col gap-2">
                  {getContextualAIQuestions(zoneId).map((q, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => {
                        onOpenTutor();
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent("ask-satoshi-ai", { detail: { prompt: q } }));
                        }, 150);
                      }}
                      className="w-full text-left text-xs bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 px-3 py-2 rounded-xl text-slate-300 hover:text-amber-300 transition-all flex items-center justify-between group cursor-pointer animate-fade-in"
                    >
                      <span className="truncate">{q}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Complete challenge actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setStep("learn")}
                className="text-xs text-indigo-400 font-mono hover:underline flex items-center gap-1"
              >
                ← Back to Concept
              </button>

              {challengePassed && (
                <button
                  onClick={() => setStep("quiz")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono rounded-lg px-4 py-2 flex items-center gap-1 group"
                >
                  Move to Concept Quiz
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: CONCEPT QUIZ */}
        {step === "quiz" && (
          <div className="max-w-2xl mx-auto w-full space-y-6 py-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
              <h4 className="text-xs font-mono font-bold text-indigo-400 tracking-widest uppercase">CONCEPT CHECK</h4>
            </div>
            
            <div className="bg-slate-950/50 border border-slate-850 p-5 rounded-2xl shadow-xl">
              <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed flex items-start gap-3">
                <HelpCircle className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
                {lesson.quizQ}
              </p>
            </div>

            <div className="space-y-3">
              {lesson.options.map((option, idx) => {
                const isSelected = selectedQuizAns === idx;
                const isCorrectAns = idx === lesson.answerIndex;
                let btnStyle = "border-slate-800 hover:border-slate-700 bg-slate-950/20 text-slate-300";
                
                if (quizSubmitted) {
                  if (isCorrectAns) {
                    btnStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-400";
                  } else if (isSelected) {
                    btnStyle = "border-rose-500 bg-rose-500/10 text-rose-400";
                  } else {
                    btnStyle = "border-slate-850 opacity-40 text-slate-500";
                  }
                } else if (isSelected) {
                  btnStyle = "border-indigo-500 bg-indigo-500/5 text-white ring-1 ring-indigo-500/25";
                }

                const optionLetters = ["A", "B", "C", "D"];
                const letter = optionLetters[idx] || String.fromCharCode(65 + idx);

                return (
                  <button
                    key={idx}
                    disabled={quizSubmitted}
                    onClick={() => handleQuizSubmit(idx)}
                    className={`w-full rounded-2xl border p-4 text-xs sm:text-sm text-left transition-all duration-200 flex items-center gap-4 ${btnStyle} ${
                      !quizSubmitted ? "hover:bg-slate-800/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer" : ""
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs border shrink-0 transition-all ${
                      isSelected 
                        ? (quizSubmitted ? (quizIsCorrect ? "bg-emerald-500/20 border-emerald-400 text-emerald-400" : "bg-rose-500/20 border-rose-400 text-rose-400") : "bg-indigo-500/20 border-indigo-400 text-indigo-400")
                        : "bg-slate-900 border-slate-800 text-slate-400 group-hover:border-slate-700"
                    }`}>
                      {letter}
                    </span>
                    <span className="flex-1 font-sans font-medium leading-relaxed">{option}</span>
                  </button>
                );
              })}
            </div>

            {quizSubmitted && (
              <div className={`p-5 rounded-2xl text-xs sm:text-sm space-y-2 border leading-relaxed ${
                quizIsCorrect 
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                  : "bg-rose-500/5 border-rose-500/20 text-rose-400"
              }`}>
                <p className="font-bold flex items-center gap-2 text-sm">
                  {quizIsCorrect ? "🎉 EXCELLENT WORK! CORRECT." : "❌ INCORRECT SELECTION."}
                </p>
                <p className="text-slate-300">{lesson.explanation}</p>
              </div>
            )}

            {/* Complete / Claim actions */}
            <div className="flex justify-between items-center pt-5 border-t border-slate-850">
              <button
                onClick={() => setStep("challenge")}
                className="text-xs text-slate-500 hover:text-slate-400 font-mono flex items-center gap-1 transition-colors"
              >
                ← Back to Simulation
              </button>

              {quizSubmitted && quizIsCorrect ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={triggerCompletion}
                    className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs sm:text-sm font-bold font-mono rounded-xl px-4 py-3 flex items-center gap-1.5 transition-all"
                  >
                    <Award className="w-4 h-4 text-amber-500" />
                    SKIP BOSS & CLAIM {lesson.xp} XP
                  </button>
                  <button
                    onClick={startBossBattle}
                    className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-extrabold font-mono rounded-xl px-5 py-3 flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all hover:scale-[1.03] active:scale-95"
                  >
                    <span>⚔️ CHALLENGE ZONE GUARDIAN (+100 XP BONUS)</span>
                  </button>
                </div>
              ) : quizSubmitted ? (
                <button
                  onClick={triggerCompletion}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-extrabold font-mono rounded-xl px-5 py-3 flex items-center gap-1.5 shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Award className="w-4 h-4 stroke-[2.5]" />
                  CLAIM {lesson.xp} XP & UNLOCK BADGE
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* STEP 4: ZONE GUARDIAN BOSS BATTLE */}
        {step === "boss" && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-6 overflow-y-auto max-w-5xl mx-auto w-full">
            {/* Header Title */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-lg animate-pulse">⚔️</span>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white uppercase">Guardian Boss Battle</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">{lesson.title}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setStep("quiz");
                  setBattleStatus("idle");
                }}
                className="text-[10px] font-mono text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1"
              >
                ← Retreat to Quiz
              </button>
            </div>

            {/* Main Battle Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Left Column: Battle Arena HUD (3 Cols) */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                
                {/* Boss and Player HUD card */}
                <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-xl">
                  {/* Boss HUD */}
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={battleStatus === "fighting" ? {
                        y: [0, -6, 0],
                        scale: [1, 1.05, 1]
                      } : {}}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-5xl select-none shrink-0"
                    >
                      {lesson.bossAvatar}
                    </motion.div>
                    <div className="flex-1 space-y-1.5 text-left">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-extrabold text-xs sm:text-sm text-red-400 uppercase tracking-wide">{lesson.bossName}</h4>
                        <span className="text-[10px] font-mono font-bold text-red-500">HP {bossHp}/100</span>
                      </div>
                      <div className="w-full bg-slate-900 border border-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: "100%" }}
                          animate={{ width: `${bossHp}%` }}
                          transition={{ type: "spring", stiffness: 80 }}
                          className="bg-gradient-to-r from-red-600 to-rose-500 h-full rounded-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* VS Divider */}
                  <div className="flex items-center justify-center gap-4 py-1">
                    <div className="h-px bg-slate-800 flex-1" />
                    <span className="text-[10px] font-mono font-black text-rose-500/70 border border-rose-500/30 px-2 py-0.5 rounded-full bg-slate-900">VS</span>
                    <div className="h-px bg-slate-800 flex-1" />
                  </div>

                  {/* Player HUD */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1.5 text-left">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-extrabold text-xs sm:text-sm text-indigo-400 uppercase tracking-wide">
                          {userProfile?.username || "You"}
                        </h4>
                        <span className="text-[10px] font-mono font-bold text-indigo-400">Shields {playerHp}/100</span>
                      </div>
                      <div className="w-full bg-slate-900 border border-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: "100%" }}
                          animate={{ width: `${playerHp}%` }}
                          transition={{ type: "spring", stiffness: 80 }}
                          className="bg-gradient-to-r from-indigo-600 to-indigo-500 h-full rounded-full"
                        />
                      </div>
                    </div>
                    <div className="text-4xl select-none shrink-0">
                      {userProfile?.avatar || "🧙‍♂️"}
                    </div>
                  </div>
                </div>

                {/* Real-time Battle Event Log */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex-1 flex flex-col shadow-inner">
                  <span className="text-[9px] font-mono font-extrabold text-slate-500 uppercase tracking-widest mb-2.5 text-left block">
                    ⚡ BATTLE LOG & CONSENSUS FLOW
                  </span>
                  <div className="font-mono text-[10px] text-slate-300 space-y-2 h-[120px] lg:h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-900 pr-1 text-left">
                    {bossBattleLog.map((log, idx) => {
                      let bulletColor = "text-indigo-400";
                      if (log.includes("CRITICAL HIT")) bulletColor = "text-emerald-400 font-bold";
                      else if (log.includes("OUCH") || log.includes("DEFEAT")) bulletColor = "text-rose-500 font-bold";
                      else if (log.includes("VICTORY")) bulletColor = "text-yellow-400 font-extrabold";
                      
                      return (
                        <div key={idx} className="flex items-start gap-1.5 leading-relaxed border-b border-slate-900/50 pb-1.5 last:border-0">
                          <span className={`${bulletColor} shrink-0`}>❯</span>
                          <span className={log.includes("VICTORY") || log.includes("CRITICAL") ? "text-white" : ""}>{log}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Interaction Window (2 Cols) */}
              <div className="lg:col-span-2 flex flex-col justify-center bg-slate-900/50 border border-slate-850 rounded-2xl p-5 shadow-xl min-h-[340px]">
                {battleStatus === "intro" && (
                  <div className="space-y-4 text-center py-6">
                    <span className="text-5xl">⚔️</span>
                    <h4 className="font-bold text-white text-base">Prepare for Combat!</h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                      {lesson.bossFlavor} To defeat {lesson.bossName}, answer a series of 3 rapid-fire questions correctly. Missing keys or loose hashes will harm your shield!
                    </p>
                    <button
                      onClick={() => setBattleStatus("fighting")}
                      className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-red-600/10 uppercase"
                    >
                      Draw Crypto Sword & Begin
                    </button>
                  </div>
                )}

                {battleStatus === "fighting" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2.5">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                        ACTIVE CHALLENGE {bossQuestionIndex + 1} OF 3
                      </span>
                      <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase font-extrabold">
                        100% SECURE
                      </span>
                    </div>

                    {/* Question Box */}
                    <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl text-left">
                      <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                        {lesson.bossQuestions[bossQuestionIndex].q}
                      </p>
                    </div>

                    {/* Options Grid */}
                    <div className="space-y-2">
                      {lesson.bossQuestions[bossQuestionIndex].options.map((option, idx) => {
                        const isSelected = bossSelectedAns === idx;
                        const isCorrect = idx === lesson.bossQuestions[bossQuestionIndex].answer;
                        let btnStyle = "border-slate-800 hover:border-slate-700 bg-slate-950/20 text-slate-300";
                        
                        if (bossQuizSubmitted) {
                          if (isCorrect) {
                            btnStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold";
                          } else if (isSelected) {
                            btnStyle = "border-rose-500 bg-rose-500/10 text-rose-400";
                          } else {
                            btnStyle = "border-slate-850 opacity-40 text-slate-500";
                          }
                        } else if (isSelected) {
                          btnStyle = "border-indigo-500 bg-indigo-500/5 text-white ring-1 ring-indigo-500/25";
                        }

                        return (
                          <button
                            key={idx}
                            disabled={bossQuizSubmitted}
                            onClick={() => handleBossAnswerSelect(idx)}
                            className={`w-full rounded-xl border p-3 text-xs text-left transition-all flex items-center gap-3 ${btnStyle} ${
                              !bossQuizSubmitted ? "hover:bg-slate-800/40 hover:-translate-y-0.5 cursor-pointer" : ""
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center font-mono text-[9px] text-slate-400 font-bold border border-slate-850">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1">{option}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation and Next Step */}
                    {bossQuizSubmitted && (
                      <div className="space-y-3 pt-2 text-left">
                        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-[11px] text-slate-400 leading-normal">
                          {lesson.bossQuestions[bossQuestionIndex].explanation}
                        </div>
                        {bossHp > 0 && playerHp > 0 && (
                          <button
                            onClick={handleNextBossQuestion}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs py-2 rounded-xl transition-all shadow uppercase flex items-center justify-center gap-1.5"
                          >
                            <span>Next Battle Phase</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {battleStatus === "victory" && (
                  <div className="space-y-4 text-center py-6">
                    <span className="text-6xl animate-bounce drop-shadow-[0_0_15px_rgba(245,158,11,0.25)] block">👑</span>
                    <h4 className="font-extrabold text-yellow-400 text-lg uppercase tracking-wide">VICTORY SECURED!</h4>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                      You dismantled {lesson.bossName}'s corrupted states and compiled perfect consensus on the ledger! You saved Blockchain Island.
                    </p>
                    <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3 max-w-xs mx-auto space-y-1.5">
                      <span className="text-[10px] font-mono text-emerald-400 font-extrabold uppercase block">🎁 TOTAL BOSS GUARDIAN REWARDS</span>
                      <div className="flex justify-around text-xs font-bold font-mono text-white">
                        <span className="flex items-center gap-1 text-amber-400">⚡ +{lesson.xp + 100} XP</span>
                        <span className="flex items-center gap-1 text-indigo-400">📦 +1 Lootbox</span>
                      </div>
                    </div>
                    <button
                      onClick={handleClaimBossVictory}
                      className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-mono font-black text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-amber-500/10 uppercase"
                    >
                      Claim Guardian Loot & Close Zone
                    </button>
                  </div>
                )}

                {battleStatus === "defeat" && (
                  <div className="space-y-4 text-center py-6">
                    <span className="text-6xl block">💀</span>
                    <h4 className="font-extrabold text-rose-500 text-lg uppercase tracking-wide">CRITICAL OVERLOAD!</h4>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                      {lesson.bossName} corrupted your variables before your checks could trigger! Your shields failed.
                    </p>
                    <button
                      onClick={startBossBattle}
                      className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-red-600/10 uppercase"
                    >
                      Re-Align Shields & Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
