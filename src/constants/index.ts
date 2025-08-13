// Solana Configuration
export const SOLANA_RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';

// Token Configuration (string addresses to avoid build-time issues)
export const VIBEY_TOKEN_MINT_ADDRESS = process.env.NEXT_PUBLIC_VIBEY_TOKEN_MINT || '11111111111111111111111111111112';

// Contract Addresses (string addresses to avoid build-time issues)
export const BURN_PROGRAM_ID_ADDRESS = process.env.NEXT_PUBLIC_BURN_PROGRAM_ID || '11111111111111111111111111111112';

// Game Configuration
export const FREE_PIXELS_PER_USER = 10; // Free pixels given to new users

// Helper functions to create PublicKey objects when needed
export const getVibeyTokenMint = () => {
  if (typeof window === 'undefined') return null; // Avoid SSR issues
  const { PublicKey } = require('@solana/web3.js');
  return new PublicKey(VIBEY_TOKEN_MINT_ADDRESS);
};

export const getBurnProgramId = () => {
  if (typeof window === 'undefined') return null; // Avoid SSR issues
  const { PublicKey } = require('@solana/web3.js');
  return new PublicKey(BURN_PROGRAM_ID_ADDRESS);
};

// Game Configuration
export const PIXEL_BOARD_STAGES = {
  STAGE_1: { size: 200, required_burns: 0 },
  STAGE_2: { size: 500, required_burns: 20000 },
  STAGE_3: { size: 1000, required_burns: 100000 },
} as const;

// Bulk Burn Discounts
export const BULK_BURN_DISCOUNTS = [
  { tokens: 10, pixels: 11 },
  { tokens: 50, pixels: 60 },
  { tokens: 100, pixels: 120 },
  { tokens: 500, pixels: 650 },
] as const;

// UI Configuration
export const MAX_TOASTS = 2;
export const TOAST_DURATION = 5000; // 5 seconds

// Colors for pixel board
export const PIXEL_COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFFFFF', '#000000', '#808080', '#800000', '#008000', '#000080',
  '#808000', '#800080', '#008080', '#C0C0C0', '#FFA500', '#FFC0CB',
  '#A52A2A', '#90EE90', '#87CEEB', '#DDA0DD', '#F0E68C',
] as const;

// Database table prefix
export const DB_TABLE_PREFIX = 'pixey_';
