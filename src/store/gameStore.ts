import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GameStore, User, Pixel, ChatMessage, LeaderboardEntry, Toast, PixelBoardState } from '@/types';
import { PIXEL_BOARD_STAGES, FREE_PIXELS_PER_USER, PIXEL_COLORS } from '@/constants';

const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    
    pixelBoard: {
      pixels: {},
      totalBurned: 0,
      currentStage: 1,
      boardSize: PIXEL_BOARD_STAGES.STAGE_1.size,
    },
    
    selectedPixel: null,
    selectedColor: PIXEL_COLORS[0],
    
    toasts: [],
    
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

    addChatMessage: (message: ChatMessage) => {
      set(state => ({
        chatMessages: [message, ...state.chatMessages].slice(0, 100) // Keep only 100 messages
      }));
    },
    
    updateLeaderboard: (leaderboard: LeaderboardEntry[]) => {
      set({ leaderboard });
    },
    
    refreshUserData: async (walletAddress: string) => {
      try {
        const response = await fetch(`/api/users?wallet_address=${walletAddress}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.user) {
            const userData = result.data.user;
            set({ user: userData });
          }
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
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
          
          // Get penalty and easter egg information from response
          const pixelsDeducted = result.data.pixels_deducted || 1;
          const wasOverwrite = result.data.was_overwrite || false;
          const easterEggFound = result.data.easter_egg_found || false;
          const easterEggReward = result.data.easter_egg_reward || 0;
          
          // Update local state with correct pixel count from server
          const updatedUser = {
            ...user,
            free_pixels: result.data.user_pixels_remaining,
            total_pixels_placed: user.total_pixels_placed + 1,
          };
          
          set({
            pixelBoard: {
              ...state.pixelBoard,
              pixels: newPixels,
            },
            user: updatedUser,
            selectedPixel: null,
          });
          
          // Show appropriate toast message
          if (easterEggFound) {
            state.addToast({
              message: `🎉 EASTER EGG FOUND! +${easterEggReward} free pixels!`,
              type: 'success',
            });
          } else if (wasOverwrite) {
            state.addToast({
              message: `Pixel overwritten! -${pixelsDeducted} pixels`,
              type: 'warning',
            });
          } else {
            state.addToast({
              message: `Pixel placed! -${pixelsDeducted} pixels`,
              type: 'success',
            });
          }
          
          // Force a re-render by updating user state again
          set({ user: updatedUser });

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

  }))
);

export default useGameStore;
