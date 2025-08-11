'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Flame, Zap, Star, Crown } from 'lucide-react';
import useGameStore from '@/store/gameStore';
import { BULK_BURN_DISCOUNTS } from '@/constants';
import { calculatePixelsFromBurn, formatTokenAmount } from '@/lib/solana';
import { cn } from '@/lib/utils';

interface BurnOption {
  tokens: number;
  pixels: number;
  discount: number;
  popular?: boolean;
  recommended?: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function BuyPixelsModal() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { isModalOpen, toggleModal, burnTokensForPixels, user } = useGameStore();

  const burnOptions: BurnOption[] = [
    {
      tokens: 10,
      pixels: calculatePixelsFromBurn(10),
      discount: 10,
      icon: <Flame className="h-6 w-6" />,
      title: "Starter Pack",
      description: "Perfect for beginners",
    },
    {
      tokens: 50,
      pixels: calculatePixelsFromBurn(50),
      discount: 20,
      popular: true,
      icon: <Zap className="h-6 w-6" />,
      title: "Popular Choice",
      description: "Best value for most users",
    },
    {
      tokens: 100,
      pixels: calculatePixelsFromBurn(100),
      discount: 20,
      recommended: true,
      icon: <Star className="h-6 w-6" />,
      title: "Best Value",
      description: "Maximum savings",
    },
    {
      tokens: 500,
      pixels: calculatePixelsFromBurn(500),
      discount: 30,
      icon: <Crown className="h-6 w-6" />,
      title: "Whale Pack",
      description: "For serious artists",
    },
  ];

  const handleBurnTokens = async () => {
    if (!selectedAmount) return;

    setIsProcessing(true);
    try {
      await burnTokensForPixels(selectedAmount);
      setSelectedAmount(null);
      setCustomAmount('');
    } catch (error) {
      console.error('Burn failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      setSelectedAmount(numValue);
    } else {
      setSelectedAmount(null);
    }
  };

  const getCustomPixels = () => {
    const amount = parseInt(customAmount);
    return !isNaN(amount) && amount > 0 ? calculatePixelsFromBurn(amount) : 0;
  };

  return (
    <Dialog open={isModalOpen.buyPixels} onOpenChange={() => toggleModal('buyPixels')}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🔥 Burn $VIBEY for Pixels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Balance */}
          {user && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
              <div className="text-center">
                <div className="text-sm text-gray-400">Current Pixel Balance</div>
                <div className="text-2xl font-bold text-purple-400">
                  {formatTokenAmount(user.free_pixels)} pixels
                </div>
              </div>
            </div>
          )}

          {/* Preset Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {burnOptions.map((option) => (
              <button
                key={option.tokens}
                onClick={() => {
                  setSelectedAmount(option.tokens);
                  setCustomAmount(option.tokens.toString());
                }}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105",
                  "bg-gradient-to-br from-gray-800 to-gray-900",
                  selectedAmount === option.tokens
                    ? "border-purple-500 shadow-lg shadow-purple-500/25"
                    : "border-gray-600 hover:border-purple-400"
                )}
              >
                {/* Badge */}
                {option.popular && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    POPULAR
                  </div>
                )}
                {option.recommended && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    BEST VALUE
                  </div>
                )}

                <div className="flex items-center space-x-3 mb-3">
                  <div className="text-purple-400">
                    {option.icon}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white">{option.title}</div>
                    <div className="text-sm text-gray-400">{option.description}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Burn:</span>
                    <span className="font-bold text-white">{formatTokenAmount(option.tokens)} $VIBEY</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Get:</span>
                    <span className="font-bold text-purple-400">{formatTokenAmount(option.pixels)} pixels</span>
                  </div>
                  {option.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Bonus:</span>
                      <span className="font-bold text-green-400">+{option.discount}% pixels</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">
              Custom Amount
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="Enter $VIBEY amount"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="1"
              />
              <div className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-purple-400 font-medium">
                $VIBEY
              </div>
            </div>
            {customAmount && getCustomPixels() > 0 && (
              <div className="text-sm text-gray-400">
                You'll receive: <span className="font-bold text-purple-400">{formatTokenAmount(getCustomPixels())} pixels</span>
              </div>
            )}
          </div>

          {/* Discount Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-300 mb-2">💡 Bulk Burn Discounts</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {BULK_BURN_DISCOUNTS.map((discount) => (
                <div key={discount.tokens} className="flex justify-between">
                  <span className="text-gray-400">{discount.tokens}+ $VIBEY:</span>
                  <span className="text-blue-300">+{Math.round(((discount.pixels / discount.tokens) - 1) * 100)}% pixels</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => toggleModal('buyPixels')}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="game"
              onClick={handleBurnTokens}
              disabled={!selectedAmount || selectedAmount <= 0 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  🔥 Burn {selectedAmount ? formatTokenAmount(selectedAmount) : '0'} $VIBEY
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
