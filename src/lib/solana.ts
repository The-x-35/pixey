import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
} from '@solana/web3.js';
import {
  createBurnInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getMint,
} from '@solana/spl-token';
import { SOLANA_RPC_ENDPOINT } from '@/constants';

// Initialize Solana connection
export const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');

// Utility functions
export const getTokenBalance = async (walletAddress: PublicKey, tokenMint: PublicKey): Promise<number> => {
  try {
    const associatedTokenAddress = await getAssociatedTokenAddress(
      tokenMint,
      walletAddress
    );
    
    const tokenAccount = await getAccount(connection, associatedTokenAddress);
    return Number(tokenAccount.amount);
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
};

export const getSolBalance = async (walletAddress: PublicKey): Promise<number> => {
  try {
    const balance = await connection.getBalance(walletAddress);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    return 0;
  }
};

export const calculatePixelsFromBurn = (tokenAmount: number): number => {
  // Simple 1:1 ratio for now, can be enhanced later with bulk discounts
  return tokenAmount;
};

export const createBurnTransaction = async (
  walletAddress: PublicKey,
  tokenMint: PublicKey,
  tokenAmount: number,
  rpcEndpoint?: string
): Promise<Transaction> => {
  try {
    const connectionToUse = rpcEndpoint ? new Connection(rpcEndpoint, 'confirmed') : connection;
    
    // Get the owner's Associated Token Address
    const ownerAta = await getAssociatedTokenAddress(tokenMint, walletAddress);
    
    // Check if the token account exists
    const ataInfo = await connectionToUse.getAccountInfo(ownerAta);
    
    const transaction = new Transaction();
    
    // Create owner's ATA if it doesn't exist
    if (!ataInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletAddress,  // payer
          ownerAta,       // ATA address
          walletAddress,  // owner
          tokenMint       // mint
        )
      );
    }
    
    // Get token decimals and adjust amount
    const mintInfo = await getMint(connectionToUse, tokenMint);
    const adjustedAmount = Math.floor(tokenAmount * Math.pow(10, mintInfo.decimals));
    
    // Only add burn instruction if we actually have an amount to burn
    if (adjustedAmount > 0) {
      // Add burn instruction
      transaction.add(
        createBurnInstruction(
          ownerAta,       // token account to burn from
          tokenMint,      // mint address
          walletAddress,  // owner of the token account
          adjustedAmount  // amount to burn (adjusted for decimals)
        )
      );
    }
    
    // Set recent blockhash and fee payer
    const { blockhash } = await connectionToUse.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletAddress;
    
    return transaction;
  } catch (error) {
    console.error('Error creating burn transaction:', error);
    throw new Error('Failed to create burn transaction');
  }
};

export const confirmTransaction = async (signature: string): Promise<boolean> => {
  try {
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    return !confirmation.value.err;
  } catch (error) {
    console.error('Error confirming transaction:', error);
    return false;
  }
};

// Retry logic for transaction confirmation
export const confirmTransactionWithRetry = async (
  signature: string,
  maxRetries: number = 3
): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const confirmed = await confirmTransaction(signature);
      if (confirmed) return true;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Retry ${i + 1} failed:`, error);
      if (i === maxRetries - 1) return false;
    }
  }
  return false;
};

// Error handling utilities
export const handleSolanaError = (error: any): string => {
  if (error?.message?.includes('insufficient funds')) {
    return 'Insufficient SOL balance for transaction fees';
  }
  
  if (error?.message?.includes('insufficient tokens')) {
    return 'Insufficient $VIBEY tokens to burn';
  }
  
  if (error?.message?.includes('user rejected')) {
    return 'Transaction was cancelled by user';
  }
  
  if (error?.message?.includes('blockhash not found')) {
    return 'Network congestion, please try again';
  }
  
  return error?.message || 'Transaction failed. Please try again.';
};

// Simulate token distribution for development
export const simulateTokenDistribution = async (
  walletAddress: PublicKey,
  amount: number = 1000
): Promise<boolean> => {
  // This is a mock function for development
  // In production, this would be handled by the token faucet or airdrop mechanism
  console.log(`Simulating ${amount} $VIBEY tokens distributed to ${walletAddress.toString()}`);
  return true;
};

// Validate wallet address
export const isValidWalletAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

// Format token amounts for display
export const formatTokenAmount = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
};

// Format wallet address for display
export const formatWalletAddress = (address: string): string => {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Complete burn token implementation
export const burnTokens = async (
  walletSignTransaction: (transaction: Transaction) => Promise<Transaction>,
  ownerPubkey: string,
  mint: string,
  amount: number,
  rpcEndpoint?: string
): Promise<{ signature: string }> => {
  try {
    if (!walletSignTransaction) {
      throw new Error('No wallet connected');
    }

    const connectionToUse = new Connection(rpcEndpoint || SOLANA_RPC_ENDPOINT, 'confirmed');
    const ownerKey = new PublicKey(ownerPubkey);
    const mintKey = new PublicKey(mint);
    
    // Get the owner's Associated Token Address
    const ownerAta = await getAssociatedTokenAddress(mintKey, ownerKey);
    
    // Check if the token account exists
    const ataInfo = await connectionToUse.getAccountInfo(ownerAta);
    
    const transaction = new Transaction();
    
    // Create owner's ATA if it doesn't exist
    if (!ataInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          ownerKey,  // payer
          ownerAta,  // ATA address
          ownerKey,  // owner
          mintKey    // mint
        )
      );
    }
    
    // Get token decimals and adjust amount
    const mintInfo = await getMint(connectionToUse, mintKey);
    const adjustedAmount = Math.floor(amount * Math.pow(10, mintInfo.decimals));
    
    // Only add burn instruction if we actually have an amount to burn
    if (adjustedAmount > 0) {
      // Add burn instruction
      transaction.add(
        createBurnInstruction(
          ownerAta,       // token account to burn from
          mintKey,        // mint address
          ownerKey,       // owner of the token account
          adjustedAmount  // amount to burn (adjusted for decimals)
        )
      );
    }
    
    // Set recent blockhash and fee payer
    const { blockhash } = await connectionToUse.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = ownerKey;
    
    // Validate transaction has instructions
    if (transaction.instructions.length === 0) {
      return { signature: 'no-transaction-needed' };
    }
    
    // Sign transaction
    const signedTransaction = await walletSignTransaction(transaction);
    
    // Send transaction
    const signature = await connectionToUse.sendRawTransaction(signedTransaction.serialize(), {
      preflightCommitment: 'processed'
    });
    
    // Wait for confirmation
    const latestBlockhash = await connectionToUse.getLatestBlockhash();
    await connectionToUse.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    return { signature };
  } catch (error) {
    console.error('Error burning tokens:', error);
    throw error;
  }
};
