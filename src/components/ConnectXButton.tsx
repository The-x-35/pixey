'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Twitter } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

interface ConnectXButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export default function ConnectXButton({ 
  className, 
  variant = 'default', 
  size = 'default' 
}: ConnectXButtonProps) {
  const { data: session, status } = useSession();
  const { publicKey } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);



  const handleConnectX = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setIsConnecting(true);
    try {
      // Sign in with Twitter to verify ownership
      await signIn('twitter', { 
        callbackUrl: `${window.location.origin}?wallet=${publicKey.toString()}` 
      });
    } catch (error) {
      console.error('Error signing in with Twitter:', error);
    } finally {
      setIsConnecting(false);
    }
  };



  if (status === 'loading') {
    return (
      <Button
        disabled
        variant={variant}
        size={size}
        className={`bg-gray-500 text-white ${className}`}
      >
        <Twitter className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (session?.user?.username) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <Twitter className="h-4 w-4" />
        <span className="text-sm font-medium">X Connected</span>
      </div>
    );
  }

  return (
    <div className="text-center">
      <Button
        onClick={handleConnectX}
        disabled={isConnecting || !publicKey}
        variant="ghost"
        size="sm"
        className="w-full justify-center text-sm px-2 py-1.5 h-8 rounded-full mx-2 mb-2"
        style={{
          background: 'linear-gradient(to right, #EE2B7E, #EE5705)',
          color: 'white'
        }}
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
        <svg className="h-4 w-4 ml-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </Button>
      <div className="text-xs text-gray-400 px-2">
        Connect X and get 25 pixels free
      </div>
    </div>
  );
}
