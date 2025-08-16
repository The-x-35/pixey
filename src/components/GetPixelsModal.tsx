'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Zap } from 'lucide-react';
import useGameStore from '@/store/gameStore';
import { VIBEY_TO_PIXELS_RATE } from '@/constants';
import { burnVIBEYTokens } from '@/lib/burnTokens';

interface GetPixelsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GetPixelsModal({ isOpen, onClose }: GetPixelsModalProps) {
  const { publicKey, signTransaction } = useWallet();
  const { addToast, refreshUserData } = useGameStore();
  const [pixelsWanted, setPixelsWanted] = useState<string>('');
  const [vibeyToBurn, setVibeyToBurn] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate pixels when VIBEY amount changes
  const handleVibeyChange = (value: string) => {
    setVibeyToBurn(value);
    if (value && !isNaN(Number(value))) {
      const pixels = Math.floor(Number(value) * VIBEY_TO_PIXELS_RATE);
      setPixelsWanted(pixels.toString());
    } else {
      setPixelsWanted('');
    }
  };

  // Calculate VIBEY when pixels amount changes
  const handlePixelsChange = (value: string) => {
    setPixelsWanted(value);
    if (value && !isNaN(Number(value))) {
      const vibey = Number(value) / VIBEY_TO_PIXELS_RATE;
      setVibeyToBurn(vibey.toString());
    } else {
      setVibeyToBurn('');
    }
  };

  const handleSubmit = async () => {
    if (!publicKey || !signTransaction) {
      addToast({
        message: 'Please connect your wallet first',
        type: 'error',
      });
      return;
    }

    if (!vibeyToBurn || !pixelsWanted) {
      addToast({
        message: 'Please enter both VIBEY amount and pixels',
        type: 'error',
      });
      return;
    }

    const vibeyAmount = Number(vibeyToBurn);
    const pixelsAmount = Number(pixelsWanted);

    if (isNaN(vibeyAmount) || vibeyAmount <= 0) {
      addToast({
        message: 'Please enter a valid VIBEY amount',
        type: 'error',
      });
      return;
    }

    if (isNaN(pixelsAmount) || pixelsAmount <= 0) {
      addToast({
        message: 'Please enter a valid pixel amount',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // First, burn the tokens on Solana
      const result = await burnVIBEYTokens({
        walletSignTransaction: signTransaction,
        ownerPubkey: publicKey.toString(),
        amount: vibeyAmount,
      });

      // Now call the API to update the database
      const response = await fetch('/api/burn-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: publicKey.toString(),
          token_amount: vibeyAmount,
          transaction_signature: result.signature,
        }),
      });

      const apiResult = await response.json();

      if (apiResult.success) {
        addToast({
          message: `Successfully burned ${vibeyAmount} $VIBEY for ${pixelsAmount} pixels!`,
          type: 'success',
        });
        
        // Refresh user data in the store so navbar updates
        if (publicKey) {
          await refreshUserData(publicKey.toString());
        }
        
        onClose();
        // Reset form
        setPixelsWanted('');
        setVibeyToBurn('');
      } else {
        addToast({
          message: apiResult.error || 'Failed to update database',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error burning tokens:', error);
      addToast({
        message: error instanceof Error ? error.message : 'Failed to burn tokens. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Get Pixels
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Rate Display */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="text-center">
              <div className="text-sm text-blue-400 font-medium">Current Rate</div>
              <div className="text-lg text-white font-bold">
                1 $VIBEY = {VIBEY_TO_PIXELS_RATE} Pixel
              </div>
            </div>
          </div>

          {/* Pixels Input */}
          <div className="space-y-2">
            <Label htmlFor="pixels" className="text-white">
              Pixels Wanted
            </Label>
            <div className="relative">
              <Input
                id="pixels"
                type="number"
                placeholder="Enter pixels you want"
                value={pixelsWanted}
                onChange={(e) => handlePixelsChange(e.target.value)}
                className="pr-12"
                min="1"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                PX
              </div>
            </div>
          </div>

          {/* VIBEY Input */}
          <div className="space-y-2">
            <Label htmlFor="vibey" className="text-white">
              $VIBEY to Burn
            </Label>
            <div className="relative">
              <Input
                id="vibey"
                type="number"
                placeholder="Enter VIBEY amount"
                value={vibeyToBurn}
                onChange={(e) => handleVibeyChange(e.target.value)}
                className="pr-16"
                min="0.01"
                step="0.01"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                VIBEY
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !pixelsWanted || !vibeyToBurn}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  Burning...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Burn & Get Pixels
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
