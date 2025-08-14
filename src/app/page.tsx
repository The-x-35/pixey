'use client';

import { useEffect, useState } from 'react';
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
  const [isCommentsVisible, setIsCommentsVisible] = useState(true);

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
      <div className={`flex h-[calc(100vh-80px)] ${isCommentsVisible ? '' : 'justify-center'}`}>
        {/* Center - Pixel Board */}
        <div className={`p-4 ${isCommentsVisible ? 'flex-1' : 'w-full'}`}>
          <PixelBoard className="w-full h-full" />
        </div>
        
        {/* Right Sidebar - Chat */}
        {isCommentsVisible && (
          <div className="w-80 p-4 border-l border-[#262626]">
            <Chat className="h-full" onVisibilityChange={setIsCommentsVisible} />
          </div>
        )}
      </div>
      
      {/* Floating Chat Button - Only show when comments are closed */}
      {!isCommentsVisible && (
        <button
          onClick={() => setIsCommentsVisible(true)}
          className="fixed top-20 right-4 z-50 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          style={{
            background: 'linear-gradient(to right, #EE00FF 0%, #EE5705 66%, #EE05E7 100%)',
            color: 'white',
            padding: '12px',
            borderRadius: '50%',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Open Comments"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M12 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
      
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
