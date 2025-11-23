import { useToast } from "@/hooks/use-toast";
import { CreateQuestParams,CreateQuestResult, GlobalState, Quest } from "@/lib/solana-types";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import QuestManagerIDL from "../abis/sol_quest_manager.json";
import { getSolanaChainByNetwork } from "@/lib/chain-config";
import { OWNER_SOLANA_ADDRESS } from "@/lib/constants";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const GLOBAL_STATE_SEED = "global_state";

// Create Anchor wallet adapter from Privy Solana wallet
export const createWalletAdapter = (privySolanaWallet: any, privyChainId: string): Wallet => {
  if (!privySolanaWallet) {
    throw new Error("Privy Solana wallet not provided");
  }

  const publicKey = new PublicKey(privySolanaWallet.address);
  
  console.log("Creating wallet adapter for:", {
    address: privySolanaWallet.address,
    hasStandardWallet: !!privySolanaWallet.standardWallet,
    standardWalletName: privySolanaWallet.standardWallet?.name,
    standardWalletType: typeof privySolanaWallet.standardWallet,
    features: privySolanaWallet.standardWallet?.features ? Object.keys(privySolanaWallet.standardWallet.features) : [],
  });
  
  const walletAdapter = {
    publicKey,
    signTransaction: async (tx: Transaction): Promise<Transaction> => {
      try {
        console.log("Signing transaction with Privy Solana wallet:", publicKey.toString());
        
        // Validate transaction structure
        if (!tx) {
          throw new Error("Transaction is null or undefined");
        }

        if (!tx.instructions || tx.instructions.length === 0) {
          throw new Error("Transaction has no instructions");
        }

        if (!tx.recentBlockhash) {
          throw new Error("Transaction missing recent blockhash");
        }

        if (!tx.feePayer) {
          throw new Error("Transaction missing fee payer");
        }

        console.log("Transaction details:", {
          instructions: tx.instructions.length,
          recentBlockhash: tx.recentBlockhash,
          feePayer: tx.feePayer?.toString(),
          signatures: tx.signatures.length,
        });

        // Serialize the transaction
        const serializedTx = tx.serialize({ requireAllSignatures: false });
        console.log("Transaction serialized successfully, length:", serializedTx.length);

        // Try to access signTransaction feature from Privy wallet
        const signTransactionFeature = privySolanaWallet.standardWallet?.features?.['solana:signTransaction'];
        
        if (!signTransactionFeature) {
          console.error("Available features:", privySolanaWallet.standardWallet?.features);
          throw new Error("Solana signTransaction feature not available on wallet");
        }

        console.log("Using signTransaction feature:", signTransactionFeature);

        // Sign using the feature's signTransaction method
        const signedTxResult = await signTransactionFeature.signTransaction({
          transaction: serializedTx,
          account: privySolanaWallet.standardWallet.accounts[0],
          chain: privyChainId,
        });

            console.log("Raw signed transaction result:", signedTxResult);
            console.log("Signed transaction result type:", {
              type: typeof signedTxResult,
              isArray: Array.isArray(signedTxResult),
              length: Array.isArray(signedTxResult) ? signedTxResult.length : 'N/A',
            });

            // Deserialize the signed transaction - handle different formats
            let signedTx: Transaction;
            
            // Privy returns an array with the signed transaction
            if (Array.isArray(signedTxResult) && signedTxResult.length > 0) {
              console.log("Result is an array, taking first element...");
              const firstResult = signedTxResult[0];
              console.log("First element type:", typeof firstResult, "isUint8Array:", firstResult instanceof Uint8Array);
              
              if (firstResult instanceof Uint8Array) {
                signedTx = Transaction.from(Buffer.from(firstResult));
              } else if (typeof firstResult === 'object' && firstResult !== null) {
                // Check if it has signedTransaction property
                if ('signedTransaction' in firstResult) {
                  const signedTransactionData = firstResult.signedTransaction;
                  console.log("Found signedTransaction property, type:", typeof signedTransactionData);
                  
                  if (signedTransactionData instanceof Uint8Array) {
                    console.log("signedTransaction is Uint8Array, converting...");
                    signedTx = Transaction.from(Buffer.from(signedTransactionData));
                  } else if (typeof signedTransactionData === 'object' && signedTransactionData !== null) {
                    // It's an object with numeric keys - convert to Uint8Array
                    console.log("Converting object with numeric keys to Uint8Array...");
                    console.log("Sample keys:", Object.keys(signedTransactionData).slice(0, 10));
                    const bytes = Object.values(signedTransactionData) as number[];
                    console.log("Total bytes:", bytes.length);
                    const uint8Array = new Uint8Array(bytes);
                    console.log("Created Uint8Array with length:", uint8Array.length);
                    signedTx = Transaction.from(Buffer.from(uint8Array));
                    console.log("Successfully deserialized transaction");
                  } else {
                    throw new Error(`signedTransaction has unexpected type: ${typeof signedTransactionData}`);
                  }
                } else if (firstResult instanceof Transaction) {
                  signedTx = firstResult;
                } else {
                  throw new Error(`First element has unexpected format: ${Object.keys(firstResult).join(', ')}`);
                }
              } else {
                throw new Error(`First element is not a Uint8Array or object: ${typeof firstResult}`);
              }
            } else if (signedTxResult instanceof Uint8Array) {
              console.log("Result is Uint8Array, deserializing...");
              signedTx = Transaction.from(Buffer.from(signedTxResult));
            } else if (signedTxResult?.signedTransaction instanceof Uint8Array) {
              console.log("Result.signedTransaction is Uint8Array, deserializing...");
              signedTx = Transaction.from(Buffer.from(signedTxResult.signedTransaction));
            } else {
              console.error("Unable to parse signed transaction result:", signedTxResult);
              throw new Error(`Unexpected signed transaction format. Type: ${typeof signedTxResult}, isArray: ${Array.isArray(signedTxResult)}`);
            }
        
        console.log("Transaction signed successfully:", signedTx);
        
        return signedTx;
      } catch (error: any) {
        console.error("Error signing transaction:", error);
        console.error("Error details:", {
          message: error?.message,
          stack: error?.stack,
          wallet: privySolanaWallet,
        });

        // Provide more specific error messages
        if (error?.message?.includes("User rejected") || error?.message?.includes("rejected")) {
          throw new Error("Transaction rejected by user");
        } else if (error?.message?.includes("Insufficient funds")) {
          throw new Error("Insufficient SOL balance for transaction fees");
        } else {
          throw new Error(
            `Transaction signing failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    },
    signAllTransactions: async (txs: Transaction[]): Promise<Transaction[]> => {
      try {
        if (!txs || txs.length === 0) {
          throw new Error("No transactions to sign");
        }

        console.log(`Signing ${txs.length} transactions with Privy Solana wallet:`, publicKey.toString());
        
        const signTransactionFeature = privySolanaWallet.standardWallet?.features?.['solana:signTransaction'];
        
        if (!signTransactionFeature) {
          throw new Error("Solana signTransaction feature not available on wallet");
        }
        
        // Sign each transaction individually
        const signedTxs = await Promise.all(
          txs.map(async (tx) => {
            const serializedTx = tx.serialize({ requireAllSignatures: false });
            const signedTxResult = await signTransactionFeature.signTransaction({
              transaction: serializedTx,
              account: privySolanaWallet.standardWallet.accounts[0],
              chain: privyChainId,
            });
            
            // Handle array format (Privy returns an array)
            if (Array.isArray(signedTxResult) && signedTxResult.length > 0) {
              const firstResult = signedTxResult[0];
              if (firstResult instanceof Uint8Array) {
                return Transaction.from(Buffer.from(firstResult));
              } else if (typeof firstResult === 'object' && firstResult !== null) {
                if ('signedTransaction' in firstResult) {
                  const signedTransactionData = firstResult.signedTransaction;
                  
                  if (signedTransactionData instanceof Uint8Array) {
                    return Transaction.from(Buffer.from(signedTransactionData));
                  } else if (typeof signedTransactionData === 'object' && signedTransactionData !== null) {
                    // Convert object with numeric keys to Uint8Array
                    const bytes = Object.values(signedTransactionData) as number[];
                    const uint8Array = new Uint8Array(bytes);
                    return Transaction.from(Buffer.from(uint8Array));
                  }
                } else if (firstResult instanceof Transaction) {
                  return firstResult;
                }
              }
            } else if (signedTxResult instanceof Uint8Array) {
              return Transaction.from(Buffer.from(signedTxResult));
            } else if (signedTxResult?.signedTransaction instanceof Uint8Array) {
              return Transaction.from(Buffer.from(signedTxResult.signedTransaction));
            }
            
            throw new Error(`Unexpected signed transaction format in signAllTransactions`);
          })
        );
        
        console.log("All transactions signed successfully");
        return signedTxs;
      } catch (error: any) {
        console.error("Error signing transactions:", error);
        throw new Error(
          `Transaction signing failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
  } as Wallet;

  return walletAdapter;
};

export const useSolanaContract = (network: "mainnet" | "devnet" = "mainnet") => {

  const privyChainId = network === "mainnet" ? "solana:mainnet" : "solana:devnet";
  
  const chainConfig = getSolanaChainByNetwork(network);
  const { toast } = useToast();
  const { ready: solanaReady, wallets: solanaWallets } = useSolanaWallets();
  const [program, setProgram] = useState<Program | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [provider, setProvider] = useState<AnchorProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [privyWallet, setPrivyWallet] = useState<any>(null);
  let _creatingQuestInFlight = false;

  // Caches to avoid excessive RPC calls
  const tokenProgramIdCacheRef = useRef<Map<string, PublicKey>>(new Map());
  const ataExistenceCacheRef = useRef<Map<string, { exists: boolean; timestampMs: number }>>(new Map());
  const ATA_EXISTENCE_TTL_MS = 60_000; // 10 seconds TTL to debounce repeated checks
  
  // Ref for lazily-initialized read-only connection (for ATA checks without wallet)
  const lazyConnectionRef = useRef<Connection | null>(null);


  // Initialize Solana connection and program
  const initSolanaContract = async () => {
    try {
      if (!wallet) {
        console.warn("Solana wallet not found");
        return;
      }

      setIsInitializing(true);

      // Create connection
      const conn = new Connection(chainConfig.rpcUrl, "confirmed");
      setConnection(conn);

      // Create provider with better configuration
      const anchorProvider = new AnchorProvider(conn, wallet, {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
        skipPreflight: false,
      });
      setProvider(anchorProvider);

      // Create program instance
      if (!chainConfig.questContract.address) {
        throw new Error("Quest manager program ID not configured");
      }

      const programId = new PublicKey(chainConfig.questContract.address);
      console.log("programId", programId.toString());

      // Create program instance with proper error handling
      let programInstance;
      try {
        // Create program directly with IDL
        programInstance = new Program(
          QuestManagerIDL,
          anchorProvider
        );
        console.log("Program instance created successfully");
      } catch (programError: any) {
        console.error("Error creating program instance:", programError);
        console.error("Program error details:", programError);
        throw new Error(
          `Failed to create program instance: ${programError?.message}`
        );
      }

      setProgram(programInstance);

      setIsConnected(true);
    } catch (error) {
      console.error("Error initializing Solana contract:", error);
      setIsConnected(false);
      throw error; // Re-throw to let ensureInitialized handle it
    } finally {
      setIsInitializing(false);
    }
  };

  // Initialize wallet using Privy's Solana wallets
  useEffect(() => {
    if (solanaReady && solanaWallets.length > 0) {
      const firstWallet = solanaWallets[0];
      console.log("Privy Solana wallet found:", firstWallet.address);
      
      try {
        const walletAdapter = createWalletAdapter(firstWallet, privyChainId);
        setWallet(walletAdapter);
        setPrivyWallet(firstWallet);
        console.log("Wallet adapter created successfully");
      } catch (error) {
        console.error("Error creating wallet adapter:", error);
        setWallet(null);
        setPrivyWallet(null);
      }
    } else {
      console.log("No Privy Solana wallet available", { solanaReady, walletsCount: solanaWallets.length });
      setWallet(null);
      setPrivyWallet(null);
    }
  }, [solanaReady, solanaWallets]);

  useEffect(() => {
    if (wallet) {
      initSolanaContract();
    }
  }, [wallet]);

  // Helper function to get global state PDA
  const getGlobalStatePDA = async () => {
    if (!program) throw new Error("Program not initialized");
    const [globalStatePDA] = await PublicKey.findProgramAddress(
      [Buffer.from(GLOBAL_STATE_SEED)],
      program.programId
    );
    return globalStatePDA;
  };

  const resolveTokenProgramId = async (c: Connection, mint: PublicKey) => {
    const mintKey = mint.toString();
    const cached = tokenProgramIdCacheRef.current.get(mintKey);
    if (cached) return cached;

    const info = await c.getAccountInfo(mint);
    if (!info) throw new Error("Mint account not found");
    const programId = info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    tokenProgramIdCacheRef.current.set(mintKey, programId);
    return programId;
  };
  

  // Helper function to get quest account by Pubkey
  // Note: Quests are regular accounts (not PDAs), so we need the quest account address directly
  // This is returned from createQuest, or can be discovered by querying all quest accounts
  const getQuestAccount = async (questPubkey: PublicKey | string) => {
    if (!program) throw new Error("Program not initialized");
    const pubkey = typeof questPubkey === 'string' 
      ? new PublicKey(questPubkey) 
      : questPubkey;
    return pubkey;
  };

  // Helper function to get escrow account PDA
  const getEscrowPDA = async (questPubkey: PublicKey) => {
    if (!program) throw new Error("Program not initialized");

    const [escrowPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("escrow"), questPubkey.toBuffer()],
      program.programId
    );
    return escrowPDA;
  };

  // Helper function to get reward claimed PDA
  // Note: RewardClaimed PDA now uses quest Pubkey (not questId string) based on updated contract
  const getRewardClaimedPDA = async (questPubkey: PublicKey | string, winner: PublicKey) => {
    if (!program) throw new Error("Program not initialized");

    const questPub = typeof questPubkey === 'string' 
      ? new PublicKey(questPubkey) 
      : questPubkey;

    const [rewardClaimedPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("reward_claimed"),
        questPub.toBuffer(),
        winner.toBuffer(),
      ],
      program.programId
    );
    return rewardClaimedPDA;
  };

  const sendSignedTxHandlingDuplicates = async (signedTx: Transaction, connection: Connection) => {
    const sig = bs58.encode(signedTx.signatures[0].signature!);
    try {
      const wireSig = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      return wireSig; // usually equals sig
    } catch (e: any) {
      const msg = String(e?.message || "");
      const dup = msg.includes("already been processed");
      if (!dup) throw e;
  
      // Treat as success — confirm the known signature
      const status = await connection.getSignatureStatus(sig);
      if (status?.value?.err) throw e;         // failed for real
      if (status?.value) return sig;           // landed or pending
      throw new Error("Duplicate tx detected; please rebuild with fresh blockhash and resign.");
    }
  };

  // Simplified implementation matching working pattern from oldUseSolana.tsx
  const signAndSendTransaction = async (
    transaction: Transaction,
    feePayer: PublicKey,
    additionalSigners: Keypair[] = []
  ): Promise<string> => {
    if (!connection) throw new Error("Solana connection not established");
    if (!wallet) throw new Error("Wallet not initialized");

    try {
      // Get fresh blockhash
      const blockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash.blockhash;
      transaction.feePayer = feePayer;

      console.log("Transaction prepared for signing:", {
        instructions: transaction.instructions.length,
        recentBlockhash: transaction.recentBlockhash,
        feePayer: transaction.feePayer?.toString(),
        additionalSigners: additionalSigners.length,
      });

      // Partial sign with any additional signers (e.g., quest Keypair)
      if (additionalSigners.length > 0) {
        transaction.partialSign(...additionalSigners);
        console.log(
          "Transaction partially signed with",
          additionalSigners.length,
          "additional signers"
        );
      }

      // Use the wallet adapter's signTransaction method to add the creator signature
      const signedTx = await wallet.signTransaction(transaction);

      // Serialize and send the transaction
      const serializedTx = signedTx.serialize();
      console.log("Sending transaction to network...");

      const txHash = await sendSignedTxHandlingDuplicates(signedTx, connection);
      console.log("Transaction sent successfully:", txHash);

      // Check transaction status manually with retries
      let retries = 5;
      let status = null;

      while (retries > 0 && status?.value?.confirmationStatus !== "confirmed") {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
          status = await connection.getSignatureStatus(txHash);
          console.log(
            `Transaction status check ${6 - retries}/5:`,
            status?.value?.confirmationStatus
          );
        } catch (err) {
          console.warn("Error checking transaction status:", err);
        }
        retries--;
      }

      if (status?.value?.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(status.value.err)}`
        );
      }

      return txHash;
    } catch (error: any) {
      console.error("Error in signAndSendTransaction:", error);

      // Provide more specific error messages
      if (error?.message?.includes("Transaction rejected")) {
        throw new Error("Transaction was rejected by the user");
      } else if (error?.message?.includes("Insufficient funds")) {
        throw new Error("Insufficient SOL balance for transaction fees");
      } else if (error?.message?.includes("Wallet disconnected")) {
        throw new Error(
          "Wallet disconnected during transaction. Please reconnect and try again."
        );
      } else {
        throw new Error(
          `Transaction failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  };

  // Helper function to build, sign and send transactions
  const buildAndSendTransaction = async (transactionBuilder: any) => {
    if (!program || !wallet || !connection) {
      throw new Error("Program, wallet, or connection not initialized");
    }

    try {
      console.log("Building transaction...");

      // Get recent blockhash first
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      console.log("Got latest blockhash:", blockhash);

      // Create a new Transaction object and add the instruction
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      // Get the instruction from the transaction builder
      const instruction = await transactionBuilder.instruction();
      tx.add(instruction);

      console.log("Transaction built successfully");

      console.log("Transaction prepared for signing:", {
        recentBlockhash: blockhash,
        feePayer: wallet.publicKey.toString(),
        instructions: tx.instructions.length,
      });

      // Sign the transaction
      console.log("Signing transaction...");
      const signedTx = await wallet.signTransaction(tx);
      console.log("Transaction signed successfully");

      // Check if transaction has proper signatures
      if (!signedTx.signature) {
        throw new Error(
          "Transaction was not signed properly - no signature found"
        );
      }

      console.log("Transaction signature:", signedTx.signature.toString());

      // Serialize the transaction
      console.log("Serializing transaction...");
      const serializedTx = signedTx.serialize();
      console.log(
        "Transaction serialized successfully, size:",
        serializedTx.length
      );

      // Check transaction size (Solana limit is ~1232 bytes)
      if (serializedTx.length > 1232) {
        throw new Error(
          `Transaction too large: ${serializedTx.length} bytes (max 1232)`
        );
      }

      // Send the signed transaction
      console.log("Sending transaction...");
      const signature = await sendSignedTxHandlingDuplicates(signedTx, connection);
      console.log("Transaction sent successfully:", signature);

      // Wait for confirmation
      console.log("Waiting for confirmation...");
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      console.log("Transaction confirmed successfully:", signature);
      return signature;
    } catch (error) {
      console.error("Error in buildAndSendTransaction:", error);
      throw error;
    }
  };

  // Quest Management Functions
  const initialize = async (supportedTokenMints: PublicKey[]) => {
    try {
      if (!program || !wallet)
        throw new Error("Program or wallet not initialized");

      // Enforce admin wallet if configured
      if (OWNER_SOLANA_ADDRESS && wallet.publicKey.toString() !== OWNER_SOLANA_ADDRESS) {
        throw new Error(
          `Please connect the admin wallet (${OWNER_SOLANA_ADDRESS}) to initialize`
        );
      }

      const globalStatePDA = await getGlobalStatePDA();

      const transactionBuilder = program.methods
        .initialize(supportedTokenMints)
        .accounts({
          owner: wallet.publicKey,
          globalState: globalStatePDA,
          systemProgram: SystemProgram.programId,
        });

      const signature = await buildAndSendTransaction(transactionBuilder);

      toast({
        title: "Program initialized",
        description: "Quest manager program initialized successfully",
      });

      return signature;
    } catch (error) {
      console.error("Error initializing program:", error);
      toast({
        title: "Initialization failed",
        description: "Failed to initialize quest manager program",
        variant: "destructive",
      });
      throw error;
    }
  };

  const initializeProgram = async (supportedTokenMints: PublicKey[]) => {
    try {
      if (!program || !wallet)
        throw new Error("Program or wallet not initialized");

      // Enforce admin wallet if configured
      if (OWNER_SOLANA_ADDRESS && wallet.publicKey.toString() !== OWNER_SOLANA_ADDRESS) {
        throw new Error(
          `Please connect the admin wallet (${OWNER_SOLANA_ADDRESS}) to initialize`
        );
      }
      const globalStatePDA = await getGlobalStatePDA();

      const transactionBuilder = program.methods
        .initialize(supportedTokenMints)
        .accounts({
          owner: wallet.publicKey,
          globalState: globalStatePDA,
          systemProgram: SystemProgram.programId,
        });

      const signature = await buildAndSendTransaction(transactionBuilder);

      toast({
        title: "Program initialized",
        description: "Quest manager program initialized successfully",
      });

      return signature;
    } catch (error) {
      console.error("Error initializing program:", error);
      toast({
        title: "Initialization failed",
        description: "Failed to initialize quest manager program",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createQuest = async (params: CreateQuestParams): Promise<CreateQuestResult> => {
    if (_creatingQuestInFlight) {
      throw new Error("A quest creation is already in flight");
    }
    _creatingQuestInFlight = true;
    try {
      // Ensure Solana contracts are initialized
      await ensureInitialized();

      if (!program || !wallet) {
        throw new Error("Program or wallet not initialized");
      }

      const { questId, tokenMint, amount, deadline, maxWinners } = params;

      // Validate questId length (max 32 characters as per Rust program)
      let finalQuestId = questId;
      if (questId.length > 36) {
        console.warn(
          `Quest ID too long: ${questId.length} characters (max 36). Hashing to fit within limit.`
        );
        // Hash the questId to ensure it fits within the 32-character limit
        const crypto = await import("crypto");
        const hashedQuestId = crypto
          .createHash("sha256")
          .update(questId)
          .digest("hex")
          .substring(0, 36);
        finalQuestId = hashedQuestId;
        console.log(`Hashed quest ID: ${finalQuestId}`);
      }
      console.log("tokenMint", tokenMint);
      console.log("Creating quest with params:", {
        originalQuestId: questId,
        finalQuestId,
        questIdLength: questId.length,
        tokenMint: tokenMint.toString(),
        amount,
        deadline,
        maxWinners,
        creator: wallet.publicKey.toString(),
      });

      const globalStatePDA = await getGlobalStatePDA();
      // Create a fresh quest account (non-PDA) and derive escrow PDA from it
      const questKeypair = Keypair.generate();
      const escrowPDA = await getEscrowPDA(questKeypair.publicKey);

      console.log("Derived PDAs:", {
        globalStatePDA: globalStatePDA.toString(),
        questPubkey: questKeypair.publicKey.toString(),
        escrowPDA: escrowPDA.toString(),
      });

      // Get creator's token account
      const creatorTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );

      console.log("Creator token account:", creatorTokenAccount.toString());

      // Validate deadline is in the future
      const currentTime = Math.floor(Date.now() / 1000);
      console.log("Deadline validation:", {
        deadline,
        currentTime,
        deadlineInFuture: deadline > currentTime,
      });

      if (deadline <= currentTime) {
        throw new Error(
          `Quest deadline must be in the future. Deadline: ${deadline}, Current: ${currentTime}`
        );
      }

      // Validate amount is positive
      if (amount <= 0) {
        throw new Error(`Quest amount must be positive. Amount: ${amount}`);
      }

      // Validate maxWinners is positive
      if (maxWinners <= 0) {
        throw new Error(
          `Max winners must be positive. Max winners: ${maxWinners}`
        );
      }

      // Additional validation for BN conversion
      const amountBN = new BN(amount);
      const deadlineBN = new BN(deadline);

      console.log("BN conversion validation:", {
        originalAmount: amount,
        amountBN: amountBN.toString(),
        originalDeadline: deadline,
        deadlineBN: deadlineBN.toString(),
        maxWinners,
      });

      // Verify global state and token support
      try {
        
        const globalState = await (program!.account as any).globalState.fetch(
          globalStatePDA
        );
        console.log("Global state exists:", {
          owner: globalState.owner.toString(),
          paused: globalState.paused,
          supportedTokens: globalState.supportedTokenMints.length,
        });

        // Check if the token is supported
        const isTokenSupported = globalState.supportedTokenMints.some(
          (mint: PublicKey) => mint.toString() === tokenMint.toString()
        );

        if (!isTokenSupported) {
          throw new Error(
            `Token ${tokenMint.toString()} is not supported by the program. Supported tokens: ${globalState.supportedTokenMints
              .map((m: PublicKey) => m.toString())
              .join(", ")}`
          );
        }

        console.log("Token is supported:", isTokenSupported);
      } catch (globalStateError) {
        console.error("Error fetching global state:", globalStateError);
        throw new Error(
          "Failed to verify global state. This should not happen if ensureInitialized was called properly."
        );
      }

      const tokenProgramForMint = await resolveTokenProgramId(connection!, tokenMint);

      // Build transaction using Anchor's transaction builder (matching working pattern)
      const transaction = await program.methods
        .createQuest(finalQuestId, new BN(amount), new BN(deadline), maxWinners)
        .accounts({
          creator: wallet.publicKey,
          globalState: globalStatePDA,
          tokenMint: tokenMint,
          escrowAccount: escrowPDA,
          creatorTokenAccount: creatorTokenAccount,
          quest: questKeypair.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgramForMint || TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .transaction();

      console.log("Transaction created successfully:", transaction);

      const signedTx = await signAndSendTransaction(
        transaction,
        wallet.publicKey,
        [questKeypair]
      );
      toast({
        title: "Quest created",
        description: `Quest "${finalQuestId}" created successfully`,
      });

      console.log("Quest created successfully:", {
        txHash: signedTx,
        questAccountAddress: questKeypair.publicKey.toString(),
      });
      return {
        txHash: signedTx,
        questAccountAddress: questKeypair.publicKey.toString(),
      };
    } catch (error) {
      console.error("Error creating quest:", error);
      toast({
        title: "Quest creation failed",
        description: `Failed to create quest: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
      throw error;
    } finally {
      _creatingQuestInFlight = false;
    }
  };

  // Updated: Get quest info by quest account Pubkey (not questId)
  // Quests are regular accounts, so we need the quest account address
  // You should store this when creating the quest, or fetch from globalState.quests
  const getQuestInfo = async (questPubkey: PublicKey | string): Promise<Quest> => {
    try {
      if (!program) throw new Error("Program not initialized");

      const questPub = typeof questPubkey === 'string' 
        ? new PublicKey(questPubkey) 
        : questPubkey;

      const questAccount = await (program!.account as any).quest.fetch(questPub);

      return {
        id: questAccount.id,
        creator: questAccount.creator,
        tokenMint: questAccount.tokenMint,
        escrowAccount: questAccount.escrowAccount,
        amount: questAccount.amount.toNumber(),
        deadline: questAccount.deadline.toNumber(),
        isActive: questAccount.isActive,
        totalWinners: questAccount.totalWinners,
        totalRewardDistributed: questAccount.totalRewardDistributed.toNumber(),
        maxWinners: questAccount.maxWinners,
      };
    } catch (error) {
      console.error("Error getting quest info:", error);
      throw error;
    }
  };

  // Updated: Returns quest Pubkeys by querying all Quest accounts
  const getAllQuests = async (): Promise<PublicKey[]> => {
    try {
      if (!program) throw new Error("Program not initialized");

      // Fetch all quest accounts and return their public keys
      const allQuests = await (program!.account as any).quest.all();
      return allQuests.map((q: any) => q.publicKey as PublicKey);
    } catch (error) {
      console.error("Error getting all quests:", error);
      throw error;
    }
  };

  const getGlobalState = async (): Promise<any> => {
    try {
      if (!program) throw new Error("Program not initialized");

      const globalStatePDA = await getGlobalStatePDA();
      const globalState = await (program!.account as any).globalState.fetch(
        globalStatePDA
      );

      return {
        owner: globalState.owner,
        paused: globalState.paused,
        supportedTokenMints: globalState.supportedTokenMints,
        questCount: globalState.questCount,
      };
    } catch (error) {
      console.error("Error getting global state:", error);
      throw error;
    }
  };

  // Manual connection function - with Privy, connection is handled by Privy's UI
  // This function now just checks if wallet is available
  const connectWallet = async () => {
    try {
      setIsInitializing(true);
      
      if (solanaWallets.length > 0) {
        const firstWallet = solanaWallets[0];
        const walletAdapter = createWalletAdapter(firstWallet,privyChainId);
        setWallet(walletAdapter);
        setPrivyWallet(firstWallet);
        
        toast({
          title: "Wallet connected",
          description: "Solana wallet connected successfully",
        });
      } else {
        toast({
          title: "No wallet found",
          description: "Please connect a Solana wallet through Privy first",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: "Connection failed",
        description: "Failed to connect to Solana wallet",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // Check if program is initialized
  const checkProgramInitialized = async () => {
    try {
      if (!program) return false;

      const globalStatePDA = await getGlobalStatePDA();
      await (program!.account as any).globalState.fetch(globalStatePDA);
      return true;
    } catch (error) {
      console.log("Program not initialized:", error);
      return false;
    }
  };

  // Initialize program if not already initialized
  const initializeProgramIfNeeded = async () => {
    try {
      const isInitialized = await checkProgramInitialized();

      if (isInitialized) {
        console.log("Program is already initialized");
        return true;
      }

      console.log("Program not initialized, initializing now...");

      // Default supported tokens - you can modify this list as needed
      const defaultSupportedTokens = [
        new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
        new PublicKey("So11111111111111111111111111111111111111112"), // SOL
        new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), // DEV USDC
      ];

      const signature = await initializeProgram(defaultSupportedTokens);
      console.log("Program initialized successfully:", signature);

      toast({
        title: "Program Initialized",
        description: "Quest manager program has been initialized successfully",
      });

      return true;
    } catch (error) {
      console.error("Error initializing program:", error);
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize the quest manager program",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Ensure Solana contracts are initialized
  const ensureInitialized = async () => {
    try {
      console.log("Ensuring Solana contracts are initialized...");
      console.log("Current state:", {
        hasProgram: !!program,
        hasWallet: !!wallet,
        isConnected,
        isInitializing,
      });

      // If already initialized, return
      if (program && wallet && isConnected) {
        console.log("Solana contracts already initialized");

        // Check if program is actually initialized on-chain
        const isInitialized = await checkProgramInitialized();
        if (!isInitialized) {
          console.log("Program not initialized on-chain, initializing now...");
          await initializeProgramIfNeeded();
        }

        return true;
      }

      // If wallet is not connected, try to connect
      if (!wallet) {
        console.log("Wallet not found, attempting to connect...");
        await connectWallet();

        // Wait a bit for wallet to be set
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // If program is not initialized, try to initialize
      if (!program && wallet) {
        console.log("Program not initialized, attempting to initialize...");
        await initSolanaContract();

        // Wait a bit for program to be set
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Final check if everything is ready
      if (program && wallet && isConnected) {
        console.log("Solana contracts successfully initialized");

        // Check if program is actually initialized on-chain
        const isInitialized = await checkProgramInitialized();
        if (!isInitialized) {
          console.log("Program not initialized on-chain, initializing now...");
          await initializeProgramIfNeeded();
        }

        return true;
      }

      // If we still don't have everything, provide detailed error
      const missing = [];
      if (!wallet) missing.push("wallet");
      if (!program) missing.push("program");
      if (!isConnected) missing.push("connection");

      throw new Error(
        `Failed to initialize Solana contracts. Missing: ${missing.join(", ")}`
      );
    } catch (error) {
      console.error("Error ensuring Solana contracts are initialized:", error);
      throw error;
    }
  };

  // Get wallet address
  const getWalletAddress = () => {
    if (wallet) {
      return wallet.publicKey.toString();
    }
    return null;
  };

  // Check if Associated Token Account exists for a user and token mint
  const checkATAExists = useCallback(async (owner: PublicKey, tokenMint: PublicKey): Promise<boolean> => {
    // Use the main connection if available, otherwise lazily initialize a read-only connection
    let activeConnection = connection;
    
    if (!activeConnection) {
      if (!lazyConnectionRef.current) {
        try {
          const rpcUrl = (chainConfig as any)?.rpcUrl || process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
          lazyConnectionRef.current = new Connection(rpcUrl, "confirmed");
          console.log("[ATA] Lazily initialized read-only Solana connection for ATA check", { rpcUrl });
        } catch (e) {
          throw new Error("Connection not initialized");
        }
      }
      activeConnection = lazyConnectionRef.current;
    }

    const cacheKey = `${owner.toString()}::${tokenMint.toString()}`;
    const now = Date.now();
    const cached = ataExistenceCacheRef.current.get(cacheKey);
    if (cached && now - cached.timestampMs < ATA_EXISTENCE_TTL_MS) {
      return cached.exists;
    }

    const tokenProgramId = await resolveTokenProgramId(activeConnection, tokenMint);
    const ata = await getAssociatedTokenAddress(
      tokenMint,
      owner,
      false,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const accountInfo = await activeConnection.getAccountInfo(ata);
    const exists = accountInfo !== null;
    ataExistenceCacheRef.current.set(cacheKey, { exists, timestampMs: now });
    return exists;
  }, [connection, chainConfig]);


  // Create Associated Token Account for a user (user pays rent ~0.002 SOL)
  // This function should be called from UI when missing ATA error appears
  const createATA = async (owner: PublicKey, tokenMint: PublicKey): Promise<string> => {
    if (!wallet || !connection) throw new Error("Wallet or connection not initialized");
    await ensureInitialized();

    let tokenProgramId = await resolveTokenProgramId(connection, tokenMint);
    let ata = await getAssociatedTokenAddress(tokenMint, owner, false, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID);

    // fast-exit
    if (await checkATAExists(owner, tokenMint)) {
      toast({ title: "Token Account Already Exists", description: "Your token account is already set up" });
      return ata.toString();
    }

    const buildIx = () =>
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        ata,
        owner,
        tokenMint,
        tokenProgramId,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    const send = async () => {
      const tx = new Transaction().add(buildIx());
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      const signed = await wallet.signTransaction(tx);
      const sig = await sendSignedTxHandlingDuplicates(signed, connection);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      return sig;
    };

    try {
      toast({ title: "Creating Token Account", description: "Please approve the transaction (~0.002 SOL fee)" });
      return await send();
    } catch (e: any) {
      const msg = String(e?.message || "");
      const looksLikeMismatch = msg.includes("incorrect program id") || msg.includes("IncorrectProgramId");
      if (!looksLikeMismatch) throw e;

      // flip program and retry once (defensive fallback)
      tokenProgramId = tokenProgramId.equals(TOKEN_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
      ata = await getAssociatedTokenAddress(tokenMint, owner, false, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID);
      if (await checkATAExists(owner, tokenMint)) return ata.toString();
      return await send();
    }
  };


  // Helper: Check and create ATA if needed (returns true if created, false if already exists)
  const ensureATAExists = async (owner: PublicKey, tokenMint: PublicKey): Promise<boolean> => {
    const exists = await checkATAExists(owner, tokenMint);
    if (!exists) {
      await createATA(owner, tokenMint);
      return true; // Was created
    }
    return false; // Already existed
  };

  // Convenience: Check current user's ATA for a mint
  const hasUserAtaForMint = useCallback(async (tokenMint: PublicKey): Promise<boolean> => {
    if (!wallet || !connection) {
      await ensureInitialized();
    }
    if (!wallet) throw new Error("Wallet not initialized");
    if (!connection) throw new Error("Connection not initialized");
    return await checkATAExists(wallet.publicKey, tokenMint);
  }, [wallet, connection, checkATAExists]);

  // Convenience: Ensure current user's ATA for a mint exists (payer = user)
  const ensureUserAtaForMint = async (tokenMint: PublicKey): Promise<string | null> => {
    if (!wallet || !connection) {
      await ensureInitialized();
    }
    if (!wallet) throw new Error("Wallet not initialized");
    if (!connection) throw new Error("Connection not initialized");
    const exists = await checkATAExists(wallet.publicKey, tokenMint);
    if (exists) return null; // nothing to do
    return await createATA(wallet.publicKey, tokenMint);
  };

  return {
    // State
    program,
    connection,
    provider,
    isConnected,
    isInitializing,
    wallet,
    walletAddress: getWalletAddress(),
    chainConfig,

    // Connection
    connectWallet,

    // Initialization
    initSolanaContract,
    initialize,
    initializeProgramIfNeeded,
    ensureInitialized,

    // Quest Management
    initializeProgram,
    createQuest,
    getQuestInfo,
    getAllQuests,

    // Getters
    getGlobalState,

    // ATA Management (for handling missing token accounts)
    checkATAExists,
    createATA,
    ensureATAExists,
    hasUserAtaForMint,
    ensureUserAtaForMint,
  };
};
