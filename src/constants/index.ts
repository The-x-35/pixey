export const SOLANA_RPC_ENDPOINT = "https://flying-torrie-fast-mainnet.helius-rpc.com";

export const VIBEY_TOKEN_MINT_ADDRESS = "3nf8LgahHm57gEUx64cDNJf4h53C2MwqZCK6LGDTsend";

export const VIBEY_TOTAL_SUPPLY = 1_000_000_000; // 1 billion tokens

// Game Configuration
export const FREE_PIXELS_PER_USER = 10; // Free pixels given to new users

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

// Colors for pixel board
export const PIXEL_COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFFFFF', '#000000', '#808080', '#800000', '#008000', '#000080',
  '#808000', '#800080', '#008080', '#C0C0C0', '#FFA500', '#FFC0CB',
  '#A52A2A', '#90EE90', '#87CEEB', '#DDA0DD', '#F0E68C',
] as const;
