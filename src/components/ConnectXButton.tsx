'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Twitter, LogOut } from 'lucide-react';
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

  const handleDisconnectX = async () => {
    try {
      await signOut({ callbackUrl: window.location.origin });
    } catch (error) {
      console.error('Error signing out:', error);
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
    <Button
      onClick={handleConnectX}
      disabled={isConnecting || !publicKey}
      variant="ghost"
      size="sm"
      className="w-full justify-start text-sm px-2 py-1.5 h-8 hover:bg-blue-50"
    >
      <Twitter className="h-4 w-4 mr-2" />
      {isConnecting ? 'Connecting...' : 'Connect X'}
    </Button>
  );
}
