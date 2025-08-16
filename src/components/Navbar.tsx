'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import useGameStore from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { Copy, LogOut, Trophy, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { getTotalBurnedTokens } from '@/constants';
import GetPixelsModal from './GetPixelsModal';

interface NavbarProps {
  className?: string;
  isAuthenticated?: boolean;
}

export default function Navbar({ className, isAuthenticated }: NavbarProps) {
  const { publicKey, disconnect } = useWallet();
  const { user, pixelBoard } = useGameStore();
  const [showTopPlayers, setShowTopPlayers] = useState(false);
  const [topPlayers, setTopPlayers] = useState<Array<{wallet_address: string, total_pixels_placed: number, free_pixels: number, total_tokens_burned: string}>>([]);
  const [totalBurnedTokens, setTotalBurnedTokens] = useState(0);
  const [currentNotification, setCurrentNotification] = useState<string | null>(null);
  const [currentNotificationType, setCurrentNotificationType] = useState<string>('pixel_placed');
  const [currentNotificationColor, setCurrentNotificationColor] = useState<string>('green');
  const [isShaking, setIsShaking] = useState(false);
  const [showGetPixels, setShowGetPixels] = useState(false);
  
  // Fetch total burned tokens on component mount
  useEffect(() => {
    const fetchBurnedTokens = async () => {
      try {
        const burnedTokens = await getTotalBurnedTokens();
        setTotalBurnedTokens(burnedTokens);
      } catch (error) {
        console.error('Error fetching burned tokens:', error);
      }
    };
    
    fetchBurnedTokens();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchBurnedTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch latest pixel placement notification
  useEffect(() => {
    const fetchLatestNotification = async () => {
      try {
        const response = await fetch('/api/notifications?type=pixel_placed&limit=1');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.length > 0) {
            const notification = result.data[0];
            const newMessage = `${notification.data.placed_by.slice(0, 4)}...${notification.data.placed_by.slice(-4)} placed pixel at (${notification.data.x}, ${notification.data.y})`;
            
            if (currentNotification !== newMessage) {
              setCurrentNotification(newMessage);
              setCurrentNotificationType('pixel_placed');
              setCurrentNotificationColor(getRandomNotificationColor());
              // Trigger shaking animation
              setIsShaking(true);
              setTimeout(() => setIsShaking(false), 800);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching notification:', error);
      }
    };
    
    fetchLatestNotification();
    
    // Refresh every 5 seconds for new notifications
    const interval = setInterval(fetchLatestNotification, 5000);
    return () => clearInterval(interval);
  }, [currentNotification]);

  const handleDisconnect = async () => {
    await disconnect();
  };

  const getInitials = () => {
    if (!publicKey) return "U";
    return publicKey.toString().substring(0, 2).toUpperCase();
  };

  const getAvatarUrl = () => {
    if (!publicKey) return "";
    return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${publicKey.toString()}`;
  };

  const getRandomNotificationColor = () => {
    const colors = [
      'green', 'yellow', 'red', 'blue', 'purple', 'pink', 'orange', 'cyan'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
    }
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(2) + ' million';
    } else if (num >= 1_000) {
      return (num / 1_000).toFixed(2) + 'k';
    } else {
      return num.toFixed(2);
    }
  };

  const fetchTopPlayers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const sortedUsers = result.data
            .filter((user: any) => user.total_pixels_placed > 0)
            .slice(0, 10); // Already sorted by API
          setTopPlayers(sortedUsers);
        } else {
          console.error('Invalid API response format');
        }
      } else {
        console.error('Failed to fetch top players');
      }

      // Fetch total burned tokens from Solana
      try {
        const burnedTokens = await getTotalBurnedTokens();
        setTotalBurnedTokens(burnedTokens);
      } catch (error) {
        console.error('Error fetching burned tokens:', error);
      }
    } catch (error) {
      console.error('Error fetching top players:', error);
    }
  };

  const openStats = () => {
    setShowTopPlayers(true);
    fetchTopPlayers();
  };

  return (
    <>
      <nav className={cn(
        "flex items-center justify-between pt-4 px-4",
        className
      )}>
        {/* Left side - Logo and Notification */}
        <div className="flex items-center space-x-4">
          <img src="/logo.svg" alt="Pixey Logo" className="h-16 w-auto" />
          
          {/* Pixel Placement Notification */}
          {currentNotification && (
            <div className={`rounded-lg px-3 py-2 border backdrop-blur-md ${
              currentNotificationColor === 'green' ? 'bg-green-400/20 border-green-400/40 shadow-lg shadow-green-400/20' :
              currentNotificationColor === 'yellow' ? 'bg-yellow-400/20 border-yellow-400/40 shadow-lg shadow-yellow-400/20' :
              currentNotificationColor === 'red' ? 'bg-red-400/20 border-red-400/40 shadow-lg shadow-red-400/20' :
              currentNotificationColor === 'blue' ? 'bg-blue-400/20 border-blue-400/40 shadow-lg shadow-blue-400/20' :
              currentNotificationColor === 'purple' ? 'bg-purple-400/20 border-purple-400/40 shadow-lg shadow-purple-400/20' :
              currentNotificationColor === 'pink' ? 'bg-pink-400/20 border-pink-400/40 shadow-lg shadow-pink-400/20' :
              currentNotificationColor === 'orange' ? 'bg-orange-400/20 border-orange-400/40 shadow-lg shadow-orange-400/20' :
              'bg-cyan-400/20 border-cyan-400/40 shadow-lg shadow-cyan-400/20'
            } ${
              isShaking ? 'animate-shake' : ''
            }`}>
              <div className="text-sm font-medium text-white drop-shadow-sm">
                {currentNotification}
              </div>
            </div>
          )}
        </div>

        {/* Right side - Actions & Wallet */}
        <div className="flex items-center space-x-2">
          {/* Pixels Placed Stats */}
          <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-2 py-1 border border-white/20">
            <div className="text-center">
              <div className="text-sm text-white">
                <span className="text-gray-300">Pixels Placed: </span>
                <span className="font-bold">
                  {pixelBoard.pixels ? Object.keys(pixelBoard.pixels).length : 0}
                </span>
              </div>
            </div>
          </div>
          
          {/* Total Burned Stats */}
          <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-2 py-1 border border-white/20">
            <div className="text-center">
              <div className="text-sm font-bold text-white">
                🔥Burned {formatLargeNumber(totalBurnedTokens)} $VIBEY              </div>
            </div>
          </div>
          
          {/* Leaderboard Button */}
          <Button
            onClick={openStats}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm px-2 py-1"
          >
            <Trophy className="h-3 w-3 mr-1" />
            Leaderboard
          </Button>

          {/* Wallet Section */}
          {publicKey && isAuthenticated ? (
            <div className="flex items-center space-x-1">
              {/* Get Pixels Button */}
              <Button
                onClick={() => setShowGetPixels(true)}
                variant="outline"
                size="sm"
                className="bg-yellow-500/20 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 text-sm px-1.5 py-0.5"
              >
                <Coins className="h-3 w-3 mr-1" />
                Get Pixels
              </Button>

              {/* User Info */}
              <div className="flex items-center space-x-1.5 bg-white/10 rounded-lg px-1.5 py-0.5">
                <img
                  src={getAvatarUrl()}
                  alt="Avatar"
                  className="h-5 w-5 rounded-full"
                />
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                  </div>
                  <div className="text-sm text-gray-300">
                    {user?.total_pixels_placed || 0} placed • {user?.free_pixels || 0} left
                  </div>
                </div>
                <Button
                  onClick={copyAddress}
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 text-gray-400 hover:text-white"
                >
                  <Copy className="h-2 w-2" />
                </Button>
              </div>

              {/* Disconnect Button */}
              <Button
                onClick={handleDisconnect}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white h-4 w-4 p-0"
              >
                <LogOut className="h-2 w-2" />
              </Button>
            </div>
          ) : (
            <WalletMultiButton className="bg-purple-600 hover:bg-purple-700 text-white" />
          )}
        </div>
      </nav>

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
                          src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${player.wallet_address}`}
                          alt="Avatar"
                          className="h-8 w-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-white">
                            {player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}
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

      {/* Get Pixels Modal */}
      <GetPixelsModal 
        isOpen={showGetPixels} 
        onClose={() => setShowGetPixels(false)} 
      />
    </>
  );
}
