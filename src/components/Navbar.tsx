'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Palette, ShoppingCart, Sparkles } from 'lucide-react';
import useGameStore from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { formatTokenAmount } from '@/lib/solana';
import { cn } from '@/lib/utils';
import { NavbarProps } from '@/types';

export default function Navbar({ className }: NavbarProps) {
  const { connected } = useWallet();
  const { user, toggleModal, toasts } = useGameStore();

  const pixelBalance = user?.free_pixels || 0;

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

        {/* Wallet Connect Button */}
        <div className="wallet-adapter-button-wrapper">
          <WalletMultiButton className="!bg-gradient-to-r !from-blue-500 !to-cyan-500 hover:!from-blue-600 hover:!to-cyan-600 !border-none !rounded-lg !text-white !font-medium !transition-all !duration-200 !transform hover:!scale-105" />
        </div>
      </div>
    </nav>
  );
}
