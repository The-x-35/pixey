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
} from '@solana/spl-token';
import { SOLANA_RPC_ENDPOINT, VIBEY_TOKEN_MINT, BURN_PROGRAM_ID, BULK_BURN_DISCOUNTS } from '@/constants';

// Initialize Solana connection
export const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');

// Utility functions
export const getTokenBalance = async (walletAddress: PublicKey): Promise<number> => {
  try {
    const associatedTokenAddress = await getAssociatedTokenAddress(
      VIBEY_TOKEN_MINT,
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
  // Find the best bulk discount
  const applicableDiscounts = BULK_BURN_DISCOUNTS.filter(
    discount => tokenAmount >= discount.tokens
  );
  
  if (applicableDiscounts.length === 0) {
    return tokenAmount; // 1:1 ratio for small amounts
  }
  
  // Get the best discount (highest token amount that applies)
  const bestDiscount = applicableDiscounts.reduce((best, current) => 
    current.tokens > best.tokens ? current : best
  );
  
  // Calculate how many full discount packages can be applied
  const fullPackages = Math.floor(tokenAmount / bestDiscount.tokens);
  const remainingTokens = tokenAmount % bestDiscount.tokens;
  
  // Calculate pixels: full packages with discount + remaining tokens at 1:1
  const pixelsFromPackages = fullPackages * bestDiscount.pixels;
  const pixelsFromRemaining = remainingTokens;
  
  return pixelsFromPackages + pixelsFromRemaining;
};

export const createBurnTransaction = async (
  walletAddress: PublicKey,
  tokenAmount: number
): Promise<Transaction> => {
  try {
    const transaction = new Transaction();
    
    // Get the associated token account for the wallet
    const associatedTokenAddress = await getAssociatedTokenAddress(
      VIBEY_TOKEN_MINT,
      walletAddress
    );
    
    // Check if the associated token account exists
    try {
      await getAccount(connection, associatedTokenAddress);
    } catch (error) {
      // If account doesn't exist, create it
      const createAccountInstruction = createAssociatedTokenAccountInstruction(
        walletAddress, // payer
        associatedTokenAddress, // associated token account
        walletAddress, // owner
        VIBEY_TOKEN_MINT, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      transaction.add(createAccountInstruction);
    }
    
    // Create burn instruction
    const burnInstruction = createBurnInstruction(
      associatedTokenAddress, // account to burn from
      VIBEY_TOKEN_MINT, // mint
      walletAddress, // owner
      tokenAmount * Math.pow(10, 9), // amount (assuming 9 decimals)
      [], // multiSigners
      TOKEN_PROGRAM_ID
    );
    
    transaction.add(burnInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
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
