import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';

export const useXConnection = () => {
  const { data: session } = useSession();
  const { publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    // Check if user just connected X and we have wallet info
    if (session?.user?.twitterUsername && publicKey) {
      const urlParams = new URLSearchParams(window.location.search);
      const walletParam = urlParams.get('wallet');
      
      if (walletParam === publicKey.toString()) {
        // Update user profile with X info
        updateProfile();
        // Clean up URL
        router.replace(window.location.pathname);
      }
    }
  }, [session, publicKey, router]);

  const updateProfile = async () => {
    if (!session?.user?.twitterUsername || !publicKey) return;

    try {
      const response = await fetch('/api/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: publicKey.toString(),
          username: session.user.twitterUsername,
          profile_picture: session.user.twitterProfilePicture,
        }),
      });

      if (response.ok) {
        console.log('Profile updated successfully');
        // Optionally refresh the page or update state
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return { updateProfile };
};
