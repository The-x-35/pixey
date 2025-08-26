"use client";

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import WalletProviderWrapper from '@/components/WalletProvider';
import Navbar from '@/components/Navbar';
import PixelBoard from '@/components/PixelBoard';
import Chat from '@/components/Chat';
import ToastContainer from '@/components/Toast';
import useGameStore from '@/store/gameStore';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useXConnection } from '@/hooks/useXConnection';
import { PIXEL_COLORS } from '@/constants';
import { Trophy, Coins } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { getTotalBurnedTokens } from '@/constants';
import GetPixelsModal from '@/components/GetPixelsModal';
import { Button } from '@/components/ui/button';

function GameContent() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { placePixel, addToast } = useGameStore();
  const { isAuthenticated, isAuthenticating } = useWalletAuth();
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(PIXEL_COLORS[0]);
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null);
  const [showTopPlayers, setShowTopPlayers] = useState(false);
  const [topPlayers, setTopPlayers] = useState<Array<{wallet_address: string, total_pixels_placed: number, free_pixels: number, total_tokens_burned: string, username?: string, profile_picture?: string}>>([]);
  const [showGetPixels, setShowGetPixels] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlacingPixel, setIsPlacingPixel] = useState(false);
  
  // Handle X connection and profile updates
  useXConnection();

  // Fetch top players
  const fetchTopPlayers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const sortedUsers = result.data
            .filter((user: any) => user.total_pixels_placed > 0)
            .slice(0, 10);
          setTopPlayers(sortedUsers);
        }
      }
    } catch (error) {
      console.error('Error fetching top players:', error);
    }
  };

  const openStats = () => {
    setShowTopPlayers(true);
    fetchTopPlayers();
  };

  // Keyboard shortcut to toggle chat
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.metaKey) {
        setIsCommentsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  const handlePlacePixel = async () => {
    if (!selectedPixel) return;
    
    if (!connected || !publicKey) {
      // Open wallet selection dialog if no wallet is connected
      setVisible(true);
      return;
    }
    
    if (!isAuthenticated) {
      // Show toast message instead of hiding UI
      addToast({
        message: 'Please sign the authentication message to place pixels',
        type: 'info',
      });
      return;
    }
    
    setIsPlacingPixel(true);
    try {
      await placePixel(selectedPixel.x, selectedPixel.y, selectedColor);
      setSelectedPixel(null);
    } catch (error) {
      console.error('Error placing pixel:', error);
      addToast({
        message: 'Failed to place pixel. Please try again.',
        type: 'error',
      });
    } finally {
      setIsPlacingPixel(false);
    }
  };





  return (
    <div className="min-h-screen">
      {/* Toast Container */}
      <ToastContainer />
      
      {/* Navbar */}
      <Navbar
        isAuthenticated={isAuthenticated}
        onMobileMenuChange={setIsMobileMenuOpen}
      />
      {/* Airdrop Announcement */}
      <div className="mx-4 mt-2 mb-1">
        <div className="w-full text-center text-white font-semibold bg-EE5705/10 rounded-lg p-2 border border-white/20 text-xs sm:text-sm">
          🚀 AIRDROP FOR THE TOP 10 ON THE LEADERBOARD
        </div>
      </div>

      {/* Main Game Layout */}
      <div className={`flex h-[calc(100vh-120px)] ${isCommentsVisible ? '' : 'justify-center'}`}>
        {/* Center - Pixel Board */}
        <div className={`p-2 ${isCommentsVisible ? 'flex-1' : 'w-full'}`}>
          <PixelBoard 
            className="w-full h-full" 
            selectedPixel={selectedPixel}
            onPixelSelect={setSelectedPixel}
          />
        </div>
        
        {/* Right Sidebar - Chat */}
        {isCommentsVisible && (
          <div className="w-80 p-2 border-l border-[#262626] relative z-40 bg-black/30 backdrop-blur-xl">
            <Chat className="h-full" onVisibilityChange={setIsCommentsVisible} />
          </div>
        )}
      </div>
      
      {/* Permanent Color Palette at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-transparent backdrop-blur-md border-t border-[#262626] p-4 z-30">
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
          {/* Color Palette - 2 rows on mobile, 1 row on desktop */}
          <div className="flex flex-col items-center space-y-2 md:flex-row md:space-y-0 md:space-x-2">
            {/* First row of colors */}
            <div className="flex gap-1 md:gap-2">
              {PIXEL_COLORS.slice(0, Math.ceil(PIXEL_COLORS.length / 2)).map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-9 h-9 md:w-10 md:h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                    selectedColor === color ? 'border-white shadow-lg' : 'border-[#262626]'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Select ${color}`}
                />
              ))}
            </div>
            
            <div className="flex gap-1 md:gap-2">
              {PIXEL_COLORS.slice(Math.ceil(PIXEL_COLORS.length / 2)).map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-9 h-9 md:w-10 md:h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                    selectedColor === color ? 'border-white shadow-lg' : 'border-[#262626]'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Select ${color}`}
                />
              ))}
              
              {/* Custom Color Picker - inline with second row */}
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-9 h-9 md:w-10 md:h-10 rounded-lg border-2 border-[#262626] cursor-pointer transition-all duration-200 hover:scale-110"
                title="Pick custom color"
              />
            </div>
          </div>
            
          {/* Place Pixel Button - Below colors on mobile, beside on desktop */}
          <div className="flex items-center space-x-4">
            {/* Buy Pixels Button - Mobile only */}
            {publicKey && isAuthenticated && (
              <Button
                onClick={() => setShowGetPixels(true)}
                className="md:hidden border border-yellow-500/30 text-white hover:bg-yellow-500/30 px-6 py-2 h-auto flex items-center"
                style={{ backgroundColor: '#FFAE0033' }}
              >
                <Coins className="h-3 w-3 mr-1 text-white" />
                Buy Pixels
              </Button>
            )}

            <button
              onClick={handlePlacePixel}
              disabled={!selectedPixel || isPlacingPixel}
              className="text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: 'linear-gradient(to right, #EE00FF 0%, #EE5705 66%, #EE05E7 100%)',
                color: 'white',
                padding: '8px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isPlacingPixel ? 'Placing...' : 'Place Pixel'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Floating Chat Button - Only show when comments are closed and mobile menu is closed */}
      {!isCommentsVisible && !isMobileMenuOpen && (
        <button
          onClick={() => setIsCommentsVisible(true)}
          className="fixed top-36 right-4 z-50 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
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

      {/* Floating Leaderboard Button - Only show when comments are closed and mobile menu is closed */}
      {!isCommentsVisible && !isMobileMenuOpen && (
        <button
          onClick={openStats}
          className="fixed top-52 right-4 z-50 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
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
          title="Open Leaderboard"
        >
          <Trophy className="h-6 w-6" />
        </button>
      )}
      
      {/* Get Pixels Modal */}
      <GetPixelsModal 
        isOpen={showGetPixels} 
        onClose={() => setShowGetPixels(false)} 
      />

      {/* Top Players Dialog */}
      <Dialog open={showTopPlayers} onOpenChange={setShowTopPlayers}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Leaderboard
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {topPlayers.length > 0 ? (
              topPlayers.map((player, index) => (
                <Card key={player.wallet_address} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-black font-bold text-sm">
                          {index + 1}
                        </div>
                        <img
                          src={player.profile_picture || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${player.wallet_address}`}
                          alt="Avatar"
                          className="h-8 w-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-white">
                            {player.username === player.wallet_address ? player.username.slice(0, 4) + '...' + player.username.slice(-4) : player.username}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Placed pixels</div>
                        <div className="font-medium text-white">{player.total_pixels_placed}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                No players found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
