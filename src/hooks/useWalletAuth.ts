import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import useGameStore from '@/store/gameStore';
import bs58 from 'bs58';

export const useWalletAuth = () => {
  const { publicKey, signMessage, disconnect } = useWallet();
  const { setUser, addToast } = useGameStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasCheckedStoredAuth, setHasCheckedStoredAuth] = useState(false);
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);
  




  const authenticateWallet = async () => {
    if (!publicKey || !signMessage) {
      return;
    }

    // Prevent duplicate authentication calls
    if (isAuthInProgress) {
      return;
    }

    setIsAuthenticating(true);
    setIsAuthInProgress(true);
    
    try {
      const message = 'I am logging in to pixey.vibegame.fun';
      const encodedMessage = new TextEncoder().encode(message);
      
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: publicKey.toString(),
          message,
          signature: signatureBase58,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.data.user);
        setIsAuthenticated(true);
        
        // Store authentication in localStorage
        const authData = {
          user: result.data.user,
          timestamp: Date.now()
        };
        localStorage.setItem(`pixey_auth_${publicKey.toString()}`, JSON.stringify(authData));
        
        if (result.data.isNewUser) {
          addToast({
            message: `Welcome to Pixey! You have ${result.data.user.free_pixels} free pixels to start.`,
            type: 'success',
          });
        } else {
          addToast({
            message: `Welcome back! You have ${result.data.user.free_pixels} pixels available.`,
            type: 'info',
          });
        }
      } else {
        addToast({
          message: result.error || 'Authentication failed',
          type: 'error',
        });
        // Disconnect wallet on authentication failure
        disconnect();
      }
    } catch (error) {
      addToast({
        message: 'Failed to authenticate wallet',
        type: 'error',
      });
      // Disconnect wallet on any error
      disconnect();
    } finally {
      setIsAuthenticating(false);
      setIsAuthInProgress(false);
    }
  };

  // Reset auth state when wallet changes
  useEffect(() => {
    if (publicKey) {
      setHasCheckedStoredAuth(false);
      setIsAuthenticated(false);
      // Clear stored auth to force fresh signature every time
      localStorage.removeItem(`pixey_auth_${publicKey.toString()}`);
    }
  }, [publicKey]);

  // Handle authentication when wallet connects
  useEffect(() => {
    if (!publicKey) {
      setIsAuthenticated(false);
      setHasCheckedStoredAuth(false);
      setIsAuthInProgress(false);
      return;
    }

    // Only run if we haven't checked stored auth yet
    if (hasCheckedStoredAuth) {
      return;
    }

    // Only run if authentication is not already in progress
    if (isAuthInProgress) {
      return;
    }

    setHasCheckedStoredAuth(true);
    authenticateWallet();
  }, [publicKey, setUser, authenticateWallet, hasCheckedStoredAuth, isAuthInProgress]);
  
  return { isAuthenticated, isAuthenticating, authenticateWallet, triggerAuth: () => setHasCheckedStoredAuth(false) };
};
