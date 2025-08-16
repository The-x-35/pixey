import { PublicKey } from '@solana/web3.js';

// User types
export interface User {
  wallet_address: string;
  free_pixels: number;
  total_pixels_placed: number;
  total_tokens_burned: number;
  created_at: Date;
  updated_at: Date;
}

// Pixel types
export interface Pixel {
  x: number;
  y: number;
  color: string;
  wallet_address: string;
  placed_at: Date;
}

export interface PixelBoardState {
  pixels: Record<string, Pixel>; // key: "x,y"
  totalBurned: number;
  currentStage: 1 | 2 | 3;
  boardSize: number;
}

// Chat types
export interface ChatMessage {
  id: string;
  wallet_address: string;
  username?: string;
  message: string;
  created_at: Date;
}

// Leaderboard types
export interface LeaderboardEntry {
  wallet_address: string;
  username?: string;
  pixels_placed: number;
  tokens_burned: number;
  rank: number;
}

// Toast types
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  createdAt: Date;
}

// Featured artwork types
export interface FeaturedArtwork {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  creator_wallet?: string;
  created_at: Date;
  is_featured: boolean;
}

// Transaction types
export interface BurnTransaction {
  signature: string;
  wallet_address: string;
  tokens_burned: number;
  pixels_received: number;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: Date;
}

// Wallet types
export interface WalletContextType {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  disconnect: () => Promise<void>;
  sendTransaction: (transaction: any) => Promise<string>;
}

// Store types
export interface GameStore {
  // User state
  user: User | null;
  
  // Board state
  pixelBoard: PixelBoardState;
  selectedPixel: { x: number; y: number } | null;
  selectedColor: string;
  
  // UI state
  toasts: Toast[];
  
  // Chat state
  chatMessages: ChatMessage[];
  
  // Leaderboard state
  leaderboard: LeaderboardEntry[];
  
  // Actions
  setUser: (user: User | null) => void;
  updatePixelBoard: (pixels: Pixel[]) => void;
  updateGameSettings: (currentStage: number, totalBurned: number, boardSize: number) => void;
  setSelectedPixel: (pixel: { x: number; y: number } | null) => void;
  setSelectedColor: (color: string) => void;
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
  removeToast: (id: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  placePixel: (x: number, y: number, color: string) => Promise<void>;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Component prop types
export interface PixelBoardProps {
  className?: string;
  selectedPixel: { x: number; y: number } | null;
  onPixelSelect: (pixel: { x: number; y: number } | null) => void;
}

export interface ChatProps {
  className?: string;
}

export interface LeaderboardProps {
  className?: string;
}

export interface NavbarProps {
  className?: string;
}
