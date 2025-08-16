import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GameStore, User, Pixel, ChatMessage, LeaderboardEntry, Toast, PixelBoardState } from '@/types';
import { PIXEL_BOARD_STAGES, FREE_PIXELS_PER_USER, PIXEL_COLORS } from '@/constants';

const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    isConnecting: false,
    
    pixelBoard: {
      pixels: {},
      totalBurned: 0,
      currentStage: 1,
      boardSize: PIXEL_BOARD_STAGES.STAGE_1.size,
    },
    
    selectedPixel: null,
    selectedColor: PIXEL_COLORS[0],
    
    toasts: [],
    isModalOpen: {
      buyPixels: false,
      featuredArtworks: false,
      colorPicker: false,
    },
    
    chatMessages: [],
    leaderboard: [],
    
    // Actions
    setUser: (user: User | null) => {
      set({ user });
      
      // Give free pixels to new users
      if (user && user.free_pixels === undefined) {
        set({
          user: {
            ...user,
            free_pixels: FREE_PIXELS_PER_USER,
          }
        });
      }
    },
    
    updatePixelBoard: (pixels: Pixel[]) => {
      const pixelMap: Record<string, Pixel> = {};
      pixels.forEach(pixel => {
        pixelMap[`${pixel.x},${pixel.y}`] = pixel;
      });
      
      const state = get();
      const newBoard: PixelBoardState = {
        ...state.pixelBoard,
        pixels: pixelMap,
      };
      
      // Update stage based on total burns
      if (newBoard.totalBurned >= PIXEL_BOARD_STAGES.STAGE_3.required_burns) {
        newBoard.currentStage = 3;
        newBoard.boardSize = PIXEL_BOARD_STAGES.STAGE_3.size;
      } else if (newBoard.totalBurned >= PIXEL_BOARD_STAGES.STAGE_2.required_burns) {
        newBoard.currentStage = 2;
        newBoard.boardSize = PIXEL_BOARD_STAGES.STAGE_2.size;
      }
      
      set({ pixelBoard: newBoard });
    },

    updateGameSettings: (currentStage: number, totalBurned: number, boardSize: number) => {
      set(state => ({
        pixelBoard: {
          ...state.pixelBoard,
          currentStage: currentStage as 1 | 2 | 3,
          totalBurned,
          boardSize,
        }
      }));
    },
    
    setSelectedPixel: (pixel: { x: number; y: number } | null) => {
      set({ selectedPixel: pixel });
    },
    
    setSelectedColor: (color: string) => {
      set({ selectedColor: color });
    },
    
    addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => {
      const id = Date.now().toString();
      const newToast: Toast = {
        ...toast,
        id,
        createdAt: new Date(),
      };
      
      set(state => {
        const newToasts = [newToast, ...state.toasts].slice(0, 2); // Keep only 2 toasts
        return { toasts: newToasts };
      });
      
      // Auto-remove toast after duration
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration || 5000);
    },
    
    removeToast: (id: string) => {
      set(state => ({
        toasts: state.toasts.filter(toast => toast.id !== id)
      }));
    },
    
    toggleModal: (modal: keyof GameStore['isModalOpen']) => {
      set(state => ({
        isModalOpen: {
          ...state.isModalOpen,
          [modal]: !state.isModalOpen[modal],
        }
      }));
    },
    
    addChatMessage: (message: ChatMessage) => {
      set(state => ({
        chatMessages: [message, ...state.chatMessages].slice(0, 100) // Keep only 100 messages
      }));
    },
    
    updateLeaderboard: (leaderboard: LeaderboardEntry[]) => {
      set({ leaderboard });
    },
    
    placePixel: async (x: number, y: number, color: string) => {
      const state = get();
      const user = state.user;
      
      if (!user) {
        state.addToast({
          message: 'Please connect your wallet first',
          type: 'error',
        });
        return;
      }
      
      if (user.free_pixels <= 0) {
        state.addToast({
          message: 'No pixels available. Buy more pixels!',
          type: 'warning',
        });
        state.toggleModal('buyPixels');
        return;
      }
      
      try {
        // Call API to place pixel
        const response = await fetch('/api/place-pixel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            x,
            y,
            color,
            wallet_address: user.wallet_address,
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Update local state
          const newPixel: Pixel = {
            x,
            y,
            color,
            wallet_address: user.wallet_address,
            placed_at: new Date(),
          };
          
          const newPixels = { ...state.pixelBoard.pixels };
          newPixels[`${x},${y}`] = newPixel;
          
          set({
            pixelBoard: {
              ...state.pixelBoard,
              pixels: newPixels,
            },
            user: {
              ...user,
              free_pixels: user.free_pixels - 1,
              total_pixels_placed: user.total_pixels_placed + 1,
            },
            selectedPixel: null,
          });
          

        } else {
          state.addToast({
            message: result.error || 'Failed to place pixel',
            type: 'error',
          });
        }
      } catch (error) {
        console.error('Error placing pixel:', error);
        state.addToast({
          message: 'Failed to place pixel. Please try again.',
          type: 'error',
        });
      }
    },
    
    burnTokensForPixels: async (tokenAmount: number) => {
      const state = get();
      const user = state.user;
      
      if (!user) {
        state.addToast({
          message: 'Please connect your wallet first',
          type: 'error',
        });
        return;
      }
      
      try {
        state.addToast({
          message: 'Burn transaction initiated...',
          type: 'info',
        });
        
        // Call API to process burn with actual transaction
        const response = await fetch('/api/burn-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet_address: user.wallet_address,
            token_amount: tokenAmount,
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          const pixelsReceived = result.data.pixels_received;
          
          set({
            user: {
              ...user,
              free_pixels: user.free_pixels + pixelsReceived,
              total_tokens_burned: user.total_tokens_burned + tokenAmount,
            },
            pixelBoard: {
              ...state.pixelBoard,
              totalBurned: state.pixelBoard.totalBurned + tokenAmount,
            }
          });
          
          state.addToast({
            message: `Successfully burned ${tokenAmount} $VIBEY for ${pixelsReceived} pixels!`,
            type: 'success',
          });
          
          state.toggleModal('buyPixels');
        } else {
          state.addToast({
            message: result.error || 'Failed to burn tokens',
            type: 'error',
          });
        }
      } catch (error) {
        console.error('Error burning tokens:', error);
        state.addToast({
          message: 'Failed to burn tokens. Please try again.',
          type: 'error',
        });
      }
    },
  }))
);

export default useGameStore;
