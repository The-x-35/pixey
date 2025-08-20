export const SOLANA_RPC_ENDPOINT = "https://flying-torrie-fast-mainnet.helius-rpc.com";

export const VIBEY_TOKEN_MINT_ADDRESS = "3nf8LgahHm57gEUx64cDNJf4h53C2MwqZCK6LGDTsend";

export const VIBEY_TOTAL_SUPPLY = 1_000_000_000; // 1 billion tokens

// Jupiter Ultra API URL
export const JUP_ULTRA_API = "https://lite-api.jup.ag/ultra/v1";

// Jupiter referral configuration
export const JUP_REFERRAL_ADDRESS = "JBbc8MBy1KiVAbqbk1BPKdXxV6jRT4PWUgKnMb1KXFc1";
export const JUP_REFERRAL_FEE = 100; // 1% in basis points

// API Endpoints
export const API_ENDPOINTS = {
    SOLANA_RPC_ENDPOINT: SOLANA_RPC_ENDPOINT,
} as const;

// Common token addresses
export const TOKENS = {
    SOL: "So11111111111111111111111111111111111111112",
} as const;

// Game Configuration
export const FREE_PIXELS_PER_USER = 10; // Free pixels given to new users
export const VIBEY_TO_PIXELS_RATE = 1; // 1 VIBEY = 1 pixel

// Helper functions to create PublicKey objects when needed
export const getVibeyTokenMint = () => {
  if (typeof window === 'undefined') return null; // Avoid SSR issues
  const { PublicKey } = require('@solana/web3.js');
  return new PublicKey(VIBEY_TOKEN_MINT_ADDRESS);
};


// Function to calculate total burned tokens
export const getTotalBurnedTokens = async () => {
  if (typeof window === 'undefined') return 0; // Avoid SSR issues
  
  try {
    const { Connection, PublicKey } = require('@solana/web3.js');
    
    const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
    const mintPublicKey = new PublicKey(VIBEY_TOKEN_MINT_ADDRESS);
    
    const tokenSupply = await connection.getTokenSupply(mintPublicKey);
    const currentSupply = tokenSupply.value.uiAmount || 0;
    
    return VIBEY_TOTAL_SUPPLY - currentSupply;
  } catch (error) {
    console.error('Error fetching VIBEY token supply:', error);
    return 0;
  }
};

// Game Configuration
export const PIXEL_BOARD_STAGES = {
  STAGE_1: { size: 200, required_burns: 0 },
  STAGE_2: { size: 500, required_burns: 20000 },
  STAGE_3: { size: 1000, required_burns: 100000 },
} as const;

// Colors for pixel board - Complete Reddit r/place official palette
export const PIXEL_COLORS = [
  '#FF0000', // Red
  '#FFA500', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Lime
  '#00FA9A', // Medium Spring Green
  '#00FFFF', // Cyan
  '#87CEEB', // Sky Blue
  '#0000FF', // Blue
  '#8A2BE2', // Blue Violet
  '#FF00FF', // Magenta
  '#FF69B4', // Hot Pink
  '#800080', // Purple
  '#008000', // Dark Green
  '#008080', // Teal
  '#A52A2A', // Brown
  '#C0C0C0', // Silver
  '#FFFFFF', // White
  '#000000', // Black
] as const;
