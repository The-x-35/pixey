'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletProviderWrapper from '@/components/WalletProvider';
import Navbar from '@/components/Navbar';
import PixelBoard from '@/components/PixelBoard';
import Chat from '@/components/Chat';
import Leaderboard from '@/components/Leaderboard';
import ToastContainer from '@/components/Toast';
import ColorPicker from '@/components/ColorPicker';
import BuyPixelsModal from '@/components/BuyPixelsModal';
import FeaturedArtworksModal from '@/components/FeaturedArtworksModal';
import useGameStore from '@/store/gameStore';

function GameContent() {
  const { publicKey, connected } = useWallet();
  const { setUser, addToast } = useGameStore();

  useEffect(() => {
    if (connected && publicKey) {
      // Simulate user login/creation
      const mockUser = {
        wallet_address: publicKey.toString(),
        free_pixels: 5, // Initial free pixels
        total_pixels_placed: 0,
        total_tokens_burned: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      setUser(mockUser);
      addToast({
        message: `Welcome to Pixey! You have 5 free pixels to start.`,
        type: 'success',
      });
    } else {
      setUser(null);
    }
  }, [connected, publicKey, setUser, addToast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Toast Container */}
      <ToastContainer />
      
      {/* Navbar */}
      <Navbar />
      
      {/* Main Game Layout */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Leaderboard */}
        <div className="w-80 p-4 bg-gray-900/50 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
          <Leaderboard />
        </div>
        
        {/* Center - Pixel Board */}
        <div className="flex-1 p-4">
          <PixelBoard className="w-full h-full" />
        </div>
        
        {/* Right Sidebar - Chat */}
        <div className="w-80 p-4 bg-gray-900/50 backdrop-blur-sm border-l border-purple-500/20">
          <Chat className="h-full" />
        </div>
      </div>
      
      {/* Modals */}
      <ColorPicker />
      <BuyPixelsModal />
      <FeaturedArtworksModal />
    </div>
  );
}

export default function Home() {
  return (
    <WalletProviderWrapper>
      <GameContent />
    </WalletProviderWrapper>
  );
}
