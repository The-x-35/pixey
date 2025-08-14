'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import useGameStore from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { Copy, LogOut, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { getTotalBurnedTokens } from '@/constants';

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className }: NavbarProps) {
  const { publicKey, disconnect } = useWallet();
  const { user, pixelBoard } = useGameStore();
  const [showTopPlayers, setShowTopPlayers] = useState(false);
  const [topPlayers, setTopPlayers] = useState<Array<{wallet_address: string, total_pixels_placed: number, free_pixels: number, total_tokens_burned: string}>>([]);
  const [totalBurnedTokens, setTotalBurnedTokens] = useState(0);

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
        "flex items-center justify-between p-4",
        className
      )}>
        {/* Left side - Logo */}
        <div className="flex items-center space-x-2">
          <img src="/logo.svg" alt="Pixey Logo" className="h-16 w-auto" />
        </div>

        {/* Right side - Actions & Wallet */}
        <div className="flex items-center space-x-4">
          {/* Stats Button */}
          <Button
            onClick={openStats}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Stats
          </Button>

          {/* Wallet Section */}
          {publicKey ? (
            <div className="flex items-center space-x-3">
              {/* User Info */}
              <div className="flex items-center space-x-3 bg-white/10 rounded-lg px-3 py-2">
                <img
                  src={getAvatarUrl()}
                  alt="Avatar"
                  className="h-8 w-8 rounded-full"
                />
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                  </div>
                  <div className="text-xs text-gray-300">
                    {user?.total_pixels_placed || 0} placed • {user?.free_pixels || 0} free
                  </div>
                </div>
                <Button
                  onClick={copyAddress}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {/* Disconnect Button */}
              <Button
                onClick={handleDisconnect}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
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
              Stats
            </DialogTitle>
          </DialogHeader>
          
          {/* Total Pixels Placed Counter */}
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 mb-4 border border-white/10">
            <div className="text-center">
              <div className="text-sm text-gray-300 mb-1">Total Pixels Placed</div>
              <div className="text-2xl font-bold text-white">
                {topPlayers.reduce((total, player) => total + player.total_pixels_placed, 0)}
              </div>
            </div>
          </div>
          
          {/* Total Tokens Burned Counter */}
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-4 mb-4 border border-white/10">
            <div className="text-center">
              <div className="text-sm text-gray-300 mb-1">Total Tokens Burned</div>
              <div className="text-2xl font-bold text-white">
                {formatLargeNumber(totalBurnedTokens)}
              </div>
            </div>
          </div>
          
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
                        <div>
                          <div className="font-medium text-white">
                            {player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}
                          </div>
                          <div className="text-sm text-gray-400">
                            {player.total_pixels_placed} pixels placed
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Free pixels</div>
                        <div className="font-medium text-white">{player.free_pixels}</div>
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
    </>
  );
}
