"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Zap } from 'lucide-react';
import useGameStore from '@/store/gameStore';
import { VIBEY_TO_PIXELS_RATE, VIBEY_TOKEN_MINT_ADDRESS, JUP_ULTRA_API, JUP_REFERRAL_ADDRESS, JUP_REFERRAL_FEE, API_ENDPOINTS, TOKENS } from '@/constants';
import { burnVIBEYTokens } from '@/lib/burnTokens';
import { VersionedTransaction } from '@solana/web3.js';

interface GetPixelsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GetPixelsModal({ isOpen, onClose }: GetPixelsModalProps) {
  const { publicKey, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { addToast, refreshUserData } = useGameStore();
  const [pixelsWanted, setPixelsWanted] = useState<string>('');
  const [vibeyToBurn, setVibeyToBurn] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'vibey' | 'pixels'>('pixels');
  
  // Jupiter buy state variables
  const [buyAmount, setBuyAmount] = useState<string>('');
  const [showBuyInput, setShowBuyInput] = useState<boolean>(false);
  const [isBuying, setIsBuying] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState<number>(0);
  const [slippage, setSlippage] = useState<number>(1); // 1% default slippage
  const [copied, setCopied] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);

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
      const vibey = Number(value) * 10;
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

  // Handle buy amount change
  const handleBuyAmountChange = (value: string) => {
    setBuyAmount(value);
    const amount = Number(value);
    if (amount > 0) {
      fetchVibeyPrice(amount);
    } else {
      setEstimatedTokens(0);
    }
  };

  // Fetch price when tab changes to Buy VIBEY
  useEffect(() => {
    if (activeTab === "vibey") {
      // Set a default amount to show price
      setBuyAmount("0.01");
      fetchVibeyPriceData();
      fetchVibeyPrice(0.01);
    } else if (activeTab === "pixels") {
      // Set default pixels value
      handlePixelsChange("10");
    }
  }, [activeTab]);

  // Jupiter buy handler
  const handleBuy = async () => {
    // Enhanced validation
    const amount = Number(buyAmount);
    if (!buyAmount || isNaN(amount) || amount <= 0) {
      addToast({
        message: "Please enter a valid amount to buy",
        type: "error",
      });
      return;
    }

    if (amount < 0.001) {
      addToast({
        message: "Minimum buy amount is 0.001 SOL",
        type: "error",
      });
      return;
    }

    if (!publicKey) {
      setVisible(true);
      return;
    }

    if (!signTransaction) {
      addToast({
        message: "Your wallet doesn't support signing transactions",
        type: "error",
      });
      return;
    }

    setIsBuying(true);
    try {
      // Get the transaction from Jupiter API
      const res = await fetch('/api/jupiter/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          outputMint: VIBEY_TOKEN_MINT_ADDRESS,
          wallet: publicKey.toString(),
          slippage: 1, // Fixed 1% slippage
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error! status: ${res.status}`);
      }

      // Convert hex back to transaction
      const transactionBuffer = Uint8Array.from(Buffer.from(data.transactionHex, 'hex'));
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      
      // Sign the transaction
      const signedTransaction = await signTransaction(transaction);
      
      // Send to Jupiter's execute endpoint
      const executeRes = await fetch(`${JUP_ULTRA_API}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedTransaction: Buffer.from(signedTransaction.serialize()).toString('base64'),
          requestId: data.requestId,
        }),
      });
      
      const executeResult = await executeRes.json();
      if (!executeRes.ok) {
        throw new Error(executeResult.error || 'Failed to execute transaction');
      }

      addToast({
        message: `Successfully bought VIBEY tokens worth ${buyAmount} SOL!`,
        type: "success",
      });

      setBuyAmount("0.01"); // Reset to default
      setEstimatedTokens(0);
    } catch (error) {
      console.error('Buy error:', error);
      addToast({
        message: error instanceof Error ? error.message : 'Failed to process transaction',
        type: "error",
      });
    } finally {
      setIsBuying(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      setVisible(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  // Fetch VIBEY price and calculate estimated tokens
  const fetchVibeyPrice = async (solAmount: number) => {
    try {
      if (vibeyPriceSOL > 0) {
        // Calculate estimated VIBEY tokens using the correct SOL price
        const estimatedVibey = solAmount / vibeyPriceSOL;
        setEstimatedTokens(estimatedVibey);
      }
    } catch (error) {
      console.error('Failed to calculate estimated tokens:', error);
    }
  };

  // Fetch VIBEY price in USD and SOL
  const [vibeyPriceUSD, setVibeyPriceUSD] = useState<number>(0);
  const [vibeyPriceSOL, setVibeyPriceSOL] = useState<number>(0);

  const fetchVibeyPriceData = async () => {
    try {
      const response = await fetch(`/api/jupiter/price?tokenId=${VIBEY_TOKEN_MINT_ADDRESS}`);
      if (response.ok) {
        const data = await response.json();
        const priceUSD = parseFloat(data.price);
        setVibeyPriceUSD(priceUSD);
        
        // Also fetch SOL price to calculate VIBEY/SOL rate
        const solResponse = await fetch(`/api/jupiter/price?tokenId=${TOKENS.SOL}`);
        if (solResponse.ok) {
          const solData = await solResponse.json();
          const solPriceUSD = parseFloat(solData.price);
          if (solPriceUSD > 0) {
            const vibeyPriceSOL = priceUSD / solPriceUSD;
            setVibeyPriceSOL(vibeyPriceSOL);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch VIBEY price data:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className=" bg-[#1A1A1A]/95 border border-white/40 sm:max-w-md w-[calc(100vw-24px)] md:w-full">
        <DialogHeader>
          <DialogTitle className="text-white">
            {/* Removed "Buy Pixels" heading */}
          </DialogTitle>
        </DialogHeader>
        
        {/* Toggle Tabs */}
        <div className="flex mb-4">
          <button
            onClick={() => setActiveTab("vibey")}
            className={`flex-1 py-3 px-4 rounded-l-md text-sm font-medium transition-all ${
              activeTab === "vibey"
                ? "bg-black text-transparent bg-clip-text"
                : "bg-black text-gray-300 hover:text-white"
            }`}
            style={
              activeTab === "vibey"
                ? {
                    background: "linear-gradient(to right, #EE05E7, #EE5705)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    border: "2px solid",
                    borderImage:
                      "linear-gradient(to right, #EE05E7, #EE5705) 1",
                  }
                : {}
            }
          >
            Buy $VIBEY
          </button>
          <button
            onClick={() => setActiveTab("pixels")}
            className={`flex-1 py-3 px-4 rounded-r-md text-sm font-medium transition-all ${
              activeTab === "pixels"
                ? "bg-black text-transparent bg-clip-text"
                : "bg-black text-gray-300 hover:text-white"
            }`}
            style={
              activeTab === "pixels"
                ? {
                    background: "linear-gradient(to right, #EE05E7, #EE5705)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    border: "2px solid",
                    borderImage:
                      "linear-gradient(to right, #EE05E7, #EE5705) 1",
                  }
                : {}
            }
          >
            Buy Pixels
          </button>
        </div>

        {/* Buy VIBEY Section */}
        {activeTab === "vibey" && (
          <div className="space-y-4">
            {/* Live VIBEY Price Display */}
            <div className="bg-black rounded-lg p-4 text-center">
              <div className="text-sm text-white font-medium">
                1 VIBEY = $
                {vibeyPriceUSD > 0 ? vibeyPriceUSD.toFixed(6) : "0.000000"}
              </div>
            </div>

            {/* Buy Dialog - Always Visible */}
            <div className="w-full bg-[#1A1A1A]/95 backdrop-blur-sm border border-white/20 rounded-lg p-4 shadow-lg">
              <div className="flex flex-col gap-4">
                {/* Amount Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">
                    Amount in SOL
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={buyAmount}
                    onChange={(e) => handleBuyAmountChange(e.target.value)}
                    className="w-full focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-white/10 border-white/20 text-white"
                    min="0.001"
                    step="0.001"
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBuyAmountChange("0.1")}
                    className="flex-1 text-xs h-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    0.1 SOL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBuyAmountChange("0.5")}
                    className="flex-1 text-xs h-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    0.5 SOL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBuyAmountChange("1")}
                    className="flex-1 text-xs h-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    1 SOL
                  </Button>
                </div>

                {/* Estimated Tokens */}
                {buyAmount && Number(buyAmount) > 0 && (
                  <div className="text-sm text-gray-300">
                    You'll receive approximately:{" "}
                    <span className="font-semibold text-white">
                      {vibeyPriceSOL > 0
                        ? (Number(buyAmount) * (1 / vibeyPriceSOL)).toFixed(6)
                        : "..."}{" "}
                      VIBEY
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Buy Button - Outside the bordered box */}
            <Button
              onClick={handleBuy}
              disabled={isBuying || !buyAmount || Number(buyAmount) < 0.001}
              className="w-full h-12 text-lg font-medium text-white"
              style={{
                background: 'linear-gradient(to right, #EE05E7, #EE5705)',
                border: 'none'
              }}
            >
              {isBuying ? 'Processing...' : 'Buy VIBEY'}
            </Button>
          </div>
        )}

        {/* Buy Pixels Section */}
        {activeTab === 'pixels' && (
          <div className="space-y-4">
            {/* Live Pixel Price Display */}
            <div className="bg-black rounded-lg p-4 text-center">
              <div className="text-sm text-white font-medium">
                1 Pixel = 10 $VIBEY
              </div>
            </div>

            {/* Buy Dialog - Always Visible */}
            <div className="w-full bg-[#1A1A1A]/95 backdrop-blur-sm border border-white/20 rounded-lg p-4 shadow-lg">
              <div className="flex flex-col gap-4">
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
                      className="pr-12 bg-white/10 border-white/20 text-white"
                      min="1"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                      PX
                    </div>
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePixelsChange("25")}
                    className="flex-1 text-xs h-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    25 PX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePixelsChange("50")}
                    className="flex-1 text-xs h-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    50 PX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePixelsChange("100")}
                    className="flex-1 text-xs h-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    100 PX
                  </Button>
                </div>

                {/* VIBEY to Burn Display */}
                {pixelsWanted && Number(pixelsWanted) > 0 && (
                  <div className="text-sm text-gray-300">
                    You will burn{" "}
                    <span className="font-semibold text-white">
                      {vibeyToBurn} $VIBEY
                    </span>{" "}
                    to get these pixels
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !pixelsWanted || !vibeyToBurn}
              className="w-full h-12 text-lg font-medium text-white"
              style={{
                background: "linear-gradient(to right, #EE05E7, #EE5705)",
                border: "none",
              }}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
