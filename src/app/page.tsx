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
      // Create or get user from database
      const createOrGetUser = async () => {
        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              wallet_address: publicKey.toString(),
            }),
          });

          const result = await response.json();
          
          if (result.success) {
            const userData = result.data.user;
            setUser(userData);
            
            if (result.data.isNewUser) {
              addToast({
                message: `Welcome to Pixey! You have ${userData.free_pixels} free pixels to start.`,
                type: 'success',
              });
            } else {
              addToast({
                message: `Welcome back! You have ${userData.free_pixels} pixels available.`,
                type: 'info',
              });
            }
          } else {
            console.error('Failed to create/get user:', result.error);
            addToast({
              message: 'Failed to connect wallet. Please try again.',
              type: 'error',
            });
          }
        } catch (error) {
          console.error('Error creating/getting user:', error);
          addToast({
            message: 'Failed to connect wallet. Please try again.',
            type: 'error',
          });
        }
      };

      createOrGetUser();
    } else {
      setUser(null);
    }
  }, [connected, publicKey, setUser, addToast]);

  return (
    <div className="min-h-screen">
      {/* Toast Container */}
      <ToastContainer />
      
      {/* Navbar */}
      <Navbar />
      
      {/* Main Game Layout */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Center - Pixel Board */}
        <div className="flex-1 p-4">
          <PixelBoard className="w-full h-full" />
        </div>
        
        {/* Right Sidebar - Chat */}
        <div className="w-80 p-4 border-l border-[#262626]">
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
