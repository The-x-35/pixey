'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Palette, ShoppingCart, Sparkles, LogOut, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import useGameStore from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { formatTokenAmount, formatWalletAddress } from '@/lib/solana';
import { cn } from '@/lib/utils';
import { NavbarProps } from '@/types';

export default function Navbar({ className }: NavbarProps) {
  const { connected, publicKey, disconnect } = useWallet();
  const { user, toggleModal, toasts } = useGameStore();
  const [copied, setCopied] = useState(false);

  const pixelBalance = user?.free_pixels || 0;

  // Handler to disconnect wallet
  const handleDisconnect = async () => {
    await disconnect();
  };

  // Get initials from wallet address
  const getInitials = () => {
    if (!publicKey) return "U";
    return publicKey.toString().substring(0, 2).toUpperCase();
  };

  // Generate DiceBear avatar URL using wallet address as seed
  const getAvatarUrl = () => {
    if (!publicKey) return "";
    return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${publicKey.toString()}`;
  };

  // Copy wallet address to clipboard
  const copyWalletAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <nav className={cn(
      "flex items-center justify-between p-4 bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900 border-b border-purple-500/20 backdrop-blur-sm",
      className
    )}>
      {/* Left side - Logo */}
      <div className="flex items-center space-x-2">
        <Palette className="h-8 w-8 text-purple-400" />
        <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Pixey by VibeGame
        </div>
      </div>

      {/* Center - Live Toasts */}
      <div className="flex items-center space-x-4 flex-1 justify-center">
        {toasts.slice(0, 2).map((toast, index) => (
          <div
            key={toast.id}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium animate-pulse",
              "bg-gradient-to-r shadow-lg border transform hover:scale-105 transition-all duration-200",
              {
                "from-green-500 to-emerald-500 border-green-400 text-white": toast.type === 'success',
                "from-red-500 to-rose-500 border-red-400 text-white": toast.type === 'error',
                "from-blue-500 to-cyan-500 border-blue-400 text-white": toast.type === 'info',
                "from-yellow-500 to-orange-500 border-yellow-400 text-white": toast.type === 'warning',
              }
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-4">
        {/* Featured Artworks Button */}
        <Button
          variant="game"
          size="sm"
          onClick={() => toggleModal('featuredArtworks')}
          className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Good Artworks
        </Button>

        {/* Buy Pixels Button */}
        {connected && (
          <Button
            variant="game"
            onClick={() => toggleModal('buyPixels')}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buy Pixels
            {pixelBalance > 0 && (
              <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs font-bold">
                {formatTokenAmount(pixelBalance)}
              </span>
            )}
          </Button>
        )}

        {/* Custom Wallet Display */}
        {connected ? (
          <div className="flex items-center space-x-3 bg-gray-800/50 backdrop-blur-sm rounded-lg p-2 border border-purple-500/20">
            {/* Avatar */}
            <div className="relative">
              <img
                src={getAvatarUrl()}
                alt="Wallet Avatar"
                className="w-10 h-10 rounded-full border-2 border-purple-400"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm border-2 border-purple-400 hidden">
                {getInitials()}
              </div>
            </div>

            {/* Wallet Info */}
            <div className="flex flex-col">
              <div className="text-white text-sm font-medium">
                {formatWalletAddress(publicKey?.toString() || '')}
              </div>
              <div className="text-purple-300 text-xs">
                {pixelBalance} pixels available
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={copyWalletAddress}
                className="h-8 w-8 p-0 text-purple-300 hover:text-white hover:bg-purple-500/20"
                title="Copy wallet address"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDisconnect}
                className="h-8 w-8 p-0 text-red-300 hover:text-white hover:bg-red-500/20"
                title="Disconnect wallet"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="wallet-adapter-button-wrapper">
            <WalletMultiButton className="!bg-gradient-to-r !from-blue-500 !to-cyan-500 hover:!from-blue-600 hover:!to-cyan-600 !border-none !rounded-lg !text-white !font-medium !transition-all !duration-200 !transform hover:!scale-105" />
          </div>
        )}
      </div>
    </nav>
  );
}
