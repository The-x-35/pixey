import { PublicKey } from '@solana/web3.js';

// Solana Configuration
export const SOLANA_RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';

// Token Configuration
export const VIBEY_TOKEN_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_VIBEY_TOKEN_MINT || '11111111111111111111111111111112'
);

// Contract Addresses
export const BURN_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_BURN_PROGRAM_ID || '11111111111111111111111111111112'
);

// Game Configuration
export const PIXEL_BOARD_STAGES = {
  STAGE_1: { size: 200, required_burns: 0 },
  STAGE_2: { size: 500, required_burns: 20000 },
  STAGE_3: { size: 1000, required_burns: 100000 },
} as const;

export const FREE_PIXELS_PER_USER = 5;

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
  '#A52A2A', '#800080', '#90EE90', '#87CEEB', '#DDA0DD', '#F0E68C',
] as const;

// Database table prefix
export const DB_TABLE_PREFIX = 'pixey_';
