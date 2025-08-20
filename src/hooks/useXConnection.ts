import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';

export const useXConnection = () => {
  const { data: session } = useSession();
  const { publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    console.log('useXConnection hook - Session:', session);
    console.log('useXConnection hook - PublicKey:', publicKey?.toString());
    
    // Check if user just connected X and we have wallet info
    if (session?.user?.username && publicKey) {
      console.log('Found X session and wallet, checking URL params...');
      const urlParams = new URLSearchParams(window.location.search);
      const walletParam = urlParams.get('wallet');
      
      if (walletParam === publicKey.toString()) {
        console.log('Wallet param matches, updating profile...');
        // Update user profile with X info
        updateProfile();
        // Clean up URL
        router.replace(window.location.pathname);
      }
    }
  }, [session, publicKey, router]);

  const updateProfile = async () => {
    if (!session?.user?.username || !publicKey) return;

    try {
      const response = await fetch('/api/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: publicKey.toString(),
          username: session.user.username,
          profile_picture: session.user.profilePicture,
          isXConnection: true,
        }),
      });

      if (response.ok) {
        console.log('Profile updated successfully');
        // Redirect back to original URL without wallet parameter
        router.replace(window.location.pathname);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return { updateProfile };
};
