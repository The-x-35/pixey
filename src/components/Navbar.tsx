'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import ConnectXButton from './ConnectXButton';
import { getTotalBurnedTokens } from '@/constants';
import GetPixelsModal from './GetPixelsModal';
import useGameStore from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { 
  Trophy, 
  Coins, 
  Copy, 
  LogOut, 
  ChevronDown,
  User,
  Twitter,
  Menu,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession, signOut } from 'next-auth/react';

interface NavbarProps {
  className?: string;
  isAuthenticated?: boolean;
  onMobileMenuChange?: (isOpen: boolean) => void;
}

export default function Navbar({ className, isAuthenticated, onMobileMenuChange }: NavbarProps) {
  const { publicKey, disconnect } = useWallet();
  const { user, pixelBoard, addToast } = useGameStore();
  const { data: session } = useSession();
  const [showTopPlayers, setShowTopPlayers] = useState(false);
  const [topPlayers, setTopPlayers] = useState<Array<{wallet_address: string, total_pixels_placed: number, free_pixels: number, total_tokens_burned: string, username?: string, profile_picture?: string}>>([]);
  const [totalBurnedTokens, setTotalBurnedTokens] = useState(0);
  const [currentNotification, setCurrentNotification] = useState<string | null>(null);
  const [currentNotificationType, setCurrentNotificationType] = useState<string>('pixel_placed');
  const [currentNotificationColor, setCurrentNotificationColor] = useState<string>('green');
  const [isShaking, setIsShaking] = useState(false);
  const [showGetPixels, setShowGetPixels] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Notify parent component when mobile menu state changes
  useEffect(() => {
    onMobileMenuChange?.(isMobileMenuOpen);
  }, [isMobileMenuOpen, onMobileMenuChange]);

  // Fetch total burned tokens on component mount
  useEffect(() => {
    const fetchBurnedTokens = async () => {
      try {
        const burnedTokens = await getTotalBurnedTokens();
        setTotalBurnedTokens(burnedTokens);
      } catch (error) {
        console.error('Error fetching burned tokens:', error);
      }
    };
    
    fetchBurnedTokens();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchBurnedTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  // Debug: Log when user data changes
  useEffect(() => {
    console.log('Navbar - User data changed:', user);
    console.log('Navbar - Username changed:', user?.username);
  }, [user]);

  // Fetch user data when wallet connects
  useEffect(() => {
    if (publicKey && !user) {
      const fetchUserData = async () => {
        try {
          const response = await fetch(`/api/users?wallet=${publicKey.toString()}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              const userData = result.data[0];
              console.log('Navbar - Fetched user data:', userData);
              // Update the store with user data
              useGameStore.getState().setUser(userData);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      
      fetchUserData();
    }
  }, [publicKey, user]);

  // Auto-disconnect X if session exists but username not in database
  useEffect(() => {
    if (session?.user?.username && user && (!user.username || user.username === user.wallet_address)) {
      console.log('Navbar - Auto-disconnecting X: session exists but username not in database');
      signOut({ callbackUrl: window.location.origin });
    }
  }, [session, user, signOut]);

  // Fetch latest pixel placement notification
  useEffect(() => {
    const fetchLatestNotification = async () => {
      try {
        const response = await fetch('/api/notifications?type=pixel_placed&limit=1');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.length > 0) {
            const notification = result.data[0];
            const newMessage = `${notification.data.placed_by.slice(0, 4)}...${notification.data.placed_by.slice(-4)} placed pixel at (${notification.data.x}, ${notification.data.y})`;
            
            if (currentNotification !== newMessage) {
              setCurrentNotification(newMessage);
              setCurrentNotificationType('pixel_placed');
              setCurrentNotificationColor(getRandomNotificationColor());
              // Trigger shaking animation
              setIsShaking(true);
              setTimeout(() => setIsShaking(false), 800);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching notification:', error);
      }
    };
    
    fetchLatestNotification();
    
    // Refresh every 5 seconds for new notifications
    const interval = setInterval(fetchLatestNotification, 5000);
    return () => clearInterval(interval);
  }, [currentNotification]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isAccountOpen) {
        const target = event.target as Element;
        const accountDropdown = document.querySelector('[data-account-dropdown]');
        const accountButton = document.querySelector('[data-account-button]');
        
        // Don't close if clicking on the account button itself
        if (accountButton && accountButton.contains(target)) {
          return;
        }
        
        // Close if clicking outside both the button and dropdown
        if (accountDropdown && !accountDropdown.contains(target)) {
          setIsAccountOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAccountOpen]);

  const handleDisconnect = async () => {
    await disconnect();
  };

  const getInitials = () => {
    if (!publicKey) return "U";
    return publicKey.toString().substring(0, 2).toUpperCase();
  };

  const getAvatarUrl = () => {
    if (!publicKey) return "";
    // Use profile picture if available, otherwise fallback to generated avatar
    if (user?.profile_picture) {
      return user.profile_picture;
    }
    return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${publicKey.toString()}`;
  };

  const getRandomNotificationColor = () => {
    const colors = [
      'green', 'yellow', 'red', 'blue', 'purple', 'pink', 'orange', 'cyan'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
    }
  };

  // Debug: Log user data
  console.log('Navbar - User data:', user);
  console.log('Navbar - Username:', user?.username);
  console.log('Navbar - Session:', session);

  const shareProfileCard = async () => {
    if (!publicKey) return;
    
    try {
      // Create a canvas element to generate the profile card image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = 400;
      canvas.height = 300;

      // Load the card background image
      const cardImg = new Image();
      cardImg.crossOrigin = 'anonymous';
      
      cardImg.onload = () => {
        // Draw the background
        ctx.drawImage(cardImg, 0, 0, 400, 300);
        
        // Draw profile picture
        const profileImg = new Image();
        profileImg.crossOrigin = 'anonymous';
        profileImg.onload = () => {
          // Create circular profile picture
          ctx.save();
          ctx.beginPath();
          ctx.arc(200, 80, 32, 0, 2 * Math.PI);
          ctx.clip();
          ctx.drawImage(profileImg, 168, 48, 64, 64);
          ctx.restore();
          
          // Draw username/wallet
          ctx.fillStyle = 'white';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(
            user?.username && user.username !== user?.wallet_address 
              ? user.username 
              : publicKey.toString().slice(0, 4) + '...' + publicKey.toString().slice(-4),
            200, 140
          );
          
          // Draw stats
          ctx.font = 'bold 24px Arial';
          ctx.fillStyle = '#FCD34D'; // Yellow for pixels
          ctx.textAlign = 'center';
          ctx.fillText((user?.total_pixels_placed || 0).toString(), 120, 200);
          ctx.fillText((user?.total_tokens_burned || 0).toString(), 280, 200);
          
          ctx.font = '12px Arial';
          ctx.fillStyle = '#E5E7EB';
          ctx.fillText('pixels placed', 120, 220);
          ctx.fillText('$VIBEY burned', 280, 220);
          
          // Convert canvas to blob and share to X
          canvas.toBlob((blob) => {
            if (blob) {
              // Share to X using proper X sharing method
              shareToX(blob);
            }
          }, 'image/png');
        };
        profileImg.src = getAvatarUrl();
      };
      
      cardImg.src = '/card.svg';
    } catch (error) {
      console.error('Error sharing profile card:', error);
    }
  };

  const shareToX = async (blob: Blob) => {
    try {
      // Step 1: Copy image to clipboard
      await copyImageToClipboard(blob);
      
      // Step 2: Show success toast
      addToast({
        message: 'Image copied to clipboard! Opening X...',
        type: 'success',
        duration: 3000,
      });
      
      // Step 3: Wait a moment for user to see the toast, then open X
      setTimeout(() => {
        const text = encodeURIComponent('Checkout my progress on pixey.vibegame.fun');
        const xUrl = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(xUrl, '_blank', 'width=600,height=400');
      }, 1500);
      
    } catch (error) {
      console.error('Error copying image to clipboard:', error);
      addToast({
        message: 'Failed to copy image. Opening X anyway...',
        type: 'error',
        duration: 3000,
      });
      
      // Fallback: open X without clipboard copy
      const text = encodeURIComponent('Checkout my progress on pixey.vibegame.fun');
      const xUrl = `https://twitter.com/intent/tweet?text=${text}`;
      window.open(xUrl, '_blank', 'width=600,height=400');
    }
  };

  const copyImageToClipboard = async (blob: Blob): Promise<void> => {
    try {
      // Convert blob to clipboard item
      const clipboardItem = new ClipboardItem({
        'image/png': blob
      });
      
      await navigator.clipboard.write([clipboardItem]);
    } catch (error) {
      console.error('Clipboard API failed, trying fallback method:', error);
      
      // Fallback: convert blob to canvas and use canvas.toBlob
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              const clipboardItem = new ClipboardItem({
                'image/png': blob
              });
              await navigator.clipboard.write([clipboardItem]);
            } catch (fallbackError) {
              throw new Error('All clipboard methods failed');
            }
          }
        }, 'image/png');
      };
      
      img.src = URL.createObjectURL(blob);
    }
  };

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixey-profile-card.png';
    document.body.appendChild(a); // Required for Firefox.
    a.click();
    document.body.removeChild(a); // Clean up.
    URL.revokeObjectURL(url);
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(2) + ' million';
    } else if (num >= 1_000) {
      return (num / 1_000).toFixed(2) + 'k';
    } else {
      return num.toFixed(2);
    }
  };

  const fetchTopPlayers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const sortedUsers = result.data
            .filter((user: any) => user.total_pixels_placed > 0)
            .slice(0, 10); // Already sorted by API
          setTopPlayers(sortedUsers);
        } else {
          console.error('Invalid API response format');
        }
      } else {
        console.error('Failed to fetch top players');
      }

      // Fetch total burned tokens from Solana
      try {
        const burnedTokens = await getTotalBurnedTokens();
        setTotalBurnedTokens(burnedTokens);
      } catch (error) {
        console.error('Error fetching burned tokens:', error);
      }
    } catch (error) {
      console.error('Error fetching top players:', error);
    }
  };

  const openStats = () => {
    setShowTopPlayers(true);
    fetchTopPlayers();
  };

  return (
    <>
      <nav className={cn(
        "flex flex-col pt-4 px-4",
        className
      )}>
        {/* Top row - Logo and Hamburger Menu */}
        <div className="flex items-center justify-between mb-2">
          {/* Left side - Logo */}
          <div className="flex items-center">
            <img src="/logo.svg" alt="Pixey Logo" className="h-8 sm:h-12 w-auto md:hidden" />
          </div>

          {/* Right side - Hamburger Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden text-white p-2"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Bottom row - Mobile Notification */}
        {currentNotification && (
          <div className={`md:hidden rounded-lg px-3 py-2 border backdrop-blur-md ${
            currentNotificationColor === 'green' ? 'bg-green-400/20 border-green-400/40 shadow-lg shadow-green-400/20' :
            currentNotificationColor === 'yellow' ? 'bg-yellow-400/20 border-yellow-400/40 shadow-lg shadow-green-400/20' :
            currentNotificationColor === 'red' ? 'bg-red-400/20 border-red-400/40 shadow-lg shadow-green-400/20' :
            currentNotificationColor === 'blue' ? 'bg-blue-400/20 border-blue-400/40 shadow-lg shadow-blue-400/20' :
            currentNotificationColor === 'purple' ? 'bg-purple-400/20 border-purple-400/40 shadow-lg shadow-green-400/20' :
            currentNotificationColor === 'pink' ? 'bg-pink-400/20 border-pink-400/40 shadow-lg shadow-green-400/20' :
            currentNotificationColor === 'orange' ? 'bg-orange-400/20 border-orange-400/40 shadow-lg shadow-green-400/20' :
            'bg-cyan-400/20 border-cyan-400/40 shadow-lg shadow-cyan-400/20'
          } ${
            isShaking ? 'animate-shake' : ''
          }`}>
            <div className="text-sm font-medium text-white drop-shadow-sm text-center">
              {currentNotification}
            </div>
          </div>
        )}

        {/* Desktop layout - Hidden on mobile */}
        <div className="hidden md:flex items-center justify-between w-full">
          {/* Desktop Logo and Notification */}
          <div className="flex items-center space-x-4">
            <div className="flex flex-col space-y-2">
              <img src="/logo.svg" alt="Pixey Logo" className="h-8 sm:h-12 w-auto" />
            </div>
            
            {/* Desktop Notification */}
            {currentNotification && (
              <div className={`rounded-lg px-3 py-3 border backdrop-blur-md flex items-center text-sm ${
                currentNotificationColor === 'green' ? 'bg-green-400/20 border-green-400/40 shadow-lg shadow-green-400/20' :
                currentNotificationColor === 'yellow' ? 'bg-yellow-400/20 border-yellow-400/40 shadow-lg shadow-green-400/20' :
                currentNotificationColor === 'red' ? 'bg-red-400/20 border-red-400/40 shadow-lg shadow-green-400/20' :
                currentNotificationColor === 'blue' ? 'bg-blue-400/20 border-blue-400/40 shadow-lg shadow-blue-400/20' :
                currentNotificationColor === 'purple' ? 'bg-purple-400/20 border-purple-400/40 shadow-lg shadow-green-400/20' :
                currentNotificationColor === 'pink' ? 'bg-pink-400/20 border-pink-400/40 shadow-lg shadow-green-400/20' :
                currentNotificationColor === 'orange' ? 'bg-orange-400/20 border-orange-400/40 shadow-lg shadow-green-400/20' :
                'bg-cyan-400/20 border-cyan-400/40 shadow-lg shadow-cyan-400/20'
              } ${
                isShaking ? 'animate-shake' : ''
              }`}>
                <div className="text-sm font-medium text-white drop-shadow-sm">
                  {currentNotification}
                </div>
              </div>
            )}
          </div>

          {/* Middle - Pixels and Burned Stats - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Total Burned Stats */}
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-3 border border-white/20">
              <div className="text-center">
                <div className="text-sm text-white">
                  🔥 <span className="bg-gradient-to-r from-[#FFA371] to-[#EE5705] bg-clip-text text-transparent font-bold">
                    {formatLargeNumber(totalBurnedTokens)}
                  </span> $VIBEY Burned
                </div>
              </div>
            </div>
            
            {/* Pixels Placed Stats */}
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-3 border border-white/20">
              <div className="text-center">
                <div className="text-sm text-white">
                  <span className="text-gray-300">Pixels Placed: </span>
                  <span className="font-bold">
                    {pixelBoard.pixels ? Object.keys(pixelBoard.pixels).length : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Leaderboard and Account */}
          <div className="flex items-center space-x-2">
            {/* Wallet Section - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-1">
              {publicKey && isAuthenticated ? (
                <div className="flex items-center space-x-1">
                  {/* Get Pixels Button */}
                  {publicKey && isAuthenticated && (
                    <Button
                      onClick={() => setShowGetPixels(true)}
                      variant="outline"
                      size="sm"
                      className="border-yellow-500/30 text-white hover:bg-yellow-500/30 text-sm px-2 py-2 h-12 flex items-center"
                      style={{ backgroundColor: '#FFAE0033' }}
                    >
                      <Coins className="h-4 w-4 mr-2 text-white" />
                      Buy Pixels
                    </Button>
                  )}

                  {/* Account Dropdown */}
                  <div className="relative">
                    <Button
                      data-account-button
                      onClick={() => {
                        console.log('Account button clicked, current state:', isAccountOpen);
                        setIsAccountOpen(prev => {
                          const newState = !prev;
                          console.log('Setting isAccountOpen to:', newState);
                          return newState;
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/20 text-sm px-2 py-2 h-12 flex items-center gap-2"
                      style={{ backgroundColor: '#3405EE66' }}
                    >
                      <img
                        src={getAvatarUrl()}
                        alt="Avatar"
                        className="h-7 w-7 rounded-full"
                      />
                      <div className="text-left">
                        <div className="text-base font-medium text-white">
                          {user?.username && user.username !== user?.wallet_address ? user.username : publicKey.toString().slice(0, 4) + '...' + publicKey.toString().slice(-4)}
                        </div>
                        <div className="text-base text-gray-300">
                          {user?.total_pixels_placed || 0} placed • {user?.free_pixels || 0} left
                        </div>
                      </div>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    
                    {/* Custom Dropdown Content */}
                    {isAccountOpen && (
                      <div
                        data-account-dropdown
                        className="absolute right-0 top-full mt-2 w-72 rounded-md shadow-lg border border-gray-700 z-[999999]" 
                        style={{ backgroundColor: '#1F1F1F' }}
                      >
                        <div className="py-3">
                          {/* X Connection Section - Only show when NOT connected */}
                          {(!user?.username || user?.username === user?.wallet_address) && (
                            <div className="py-1.5 mb-3 flex justify-center">
                              <ConnectXButton />
                            </div>
                          )}

                          {/* Profile Card */}
                          <div className="px-3 mb-3">
                            <div className="relative w-full h-64 rounded-lg overflow-hidden">
                              {/* Card Background */}
                              <div
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-lg"
                                style={{ 
                                  backgroundImage: 'url(/card.svg)',
                                  backgroundSize: '100% 100%',
                                  width: '100%',
                                  height: '100%'
                                }}
                              />
                              
                              {/* Profile Content Overlay - Positioned on top */}
                              <div className="absolute top-0 left-0 right-0 h-48 flex flex-col items-center text-white p-4 pt-3">
                                {/* Profile Picture */}
                                <img
                                  src={getAvatarUrl()}
                                  alt="Profile"
                                  className="h-16 w-16 rounded-lg border-2 border-white/30 mb-3"
                                />
                                
                                {/* Username/Wallet */}
                                <div className="text-center mb-4">
                                  <div className="text-xl mb-1">
                                    {user?.username && user.username !== user?.wallet_address ? `@${user.username}` : publicKey.toString().slice(0, 4) + '...' + publicKey.toString().slice(-4)}
                                  </div>
                                </div>
                                
                                {/* Stats Row */}
                                <div className="flex justify-between w-full max-w-56">
                                  {/* Pixels Placed */}
                                  <div className="text-left">
                                    <div className="text-3xl font-bold bg-gradient-to-r from-[#EE00FF] to-[#EE5705] bg-clip-text text-transparent">
                                      {user?.total_pixels_placed || 0}
                                    </div>
                                    <div className="text-sm text-gray-200">
                                      Pixels Placed
                                    </div>
                                  </div>
                                  
                                  {/* VIBEY Burned */}
                                  <div className="text-right">
                                    <div className="text-3xl font-bold bg-gradient-to-r from-[#FFA371] to-[#EE5705] bg-clip-text text-transparent">
                                      {Math.floor(Number(user?.total_tokens_burned) || 0)}
                                    </div>
                                    <div className="text-sm text-gray-200">
                                      $VIBEY Burned
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Share on X Button */}
                          <div className="px-3">
                            <Button
                              onClick={() => shareProfileCard()}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-center text-sm px-2 py-1.5 h-8 rounded-full"
                              style={{
                                background: 'linear-gradient(to right, #EE2B7E, #EE5705)',
                                color: 'white'
                              }}
                            >
                              Share on
                              <svg className="h-4 w-4 ml-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                              </svg>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Disconnect Button */}
                  <Button
                    onClick={handleDisconnect}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-600/20 p-2 h-12 w-12"
                    title="Disconnect Wallet"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <WalletMultiButton className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 h-10 !h-10 [&_button]:!py-1 [&_button]:!h-10 [&_button]:!min-h-[40px] [&_button]:!max-h-[40px] [&_button]:!leading-[40px]" />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40">
          <div className="absolute top-0 right-0 w-80 h-full bg-black/20 backdrop-blur-xl border-l border-white/20 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <Button
                onClick={() => setIsMobileMenuOpen(false)}
                variant="ghost"
                size="sm"
                className="text-white p-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

              {/* Mobile Stats */}
              <div className="space-y-4 mb-6">
                {/* Total Burned Stats */}
                <div className="bg-white/10 rounded-lg px-4 py-3 border border-white/20">
                  <div className="text-center">
                    <div className="text-sm text-white">
                      🔥 <span className="bg-gradient-to-r from-[#FFA371] to-[#EE5705] bg-clip-text text-transparent font-bold">
                        {formatLargeNumber(totalBurnedTokens)}
                      </span> $VIBEY Burned
                    </div>
                  </div>
                </div>
                
                {/* Pixels Placed Stats */}
                <div className="bg-white/10 rounded-lg px-4 py-3 border border-white/20">
                  <div className="text-center">
                    <div className="text-sm text-white">
                      <span className="text-gray-300">Pixels Placed: </span>
                      <span className="font-bold">
                        {pixelBoard.pixels ? Object.keys(pixelBoard.pixels).length : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Menu Items */}
              <div className="space-y-4">
                {/* Wallet Connection */}
                {!publicKey ? (
                  <div className="pt-4">
                    <WalletMultiButton className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-3 h-12 !h-12 [&_button]:!py-3 [&_button]:!h-12 [&_button]:!min-h-[48px] [&_button]:!max-h-[48px] [&_button]:!leading-[48px]" />
                  </div>
                ) : (
                  <div className="space-y-4 pt-4">
                    {/* User Profile Section */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center space-x-3 mb-3">
                        <img
                          src={getAvatarUrl()}
                          alt="Avatar"
                          className="h-12 w-12 rounded-full"
                        />
                        <div>
                          <div className="text-base font-medium text-white">
                            {user?.username && user.username !== user?.wallet_address ? user.username : publicKey.toString().slice(0, 4) + '...' + publicKey.toString().slice(-4)}
                          </div>
                          <div className="text-sm text-gray-300">
                            {user?.total_pixels_placed || 0} placed • {user?.free_pixels || 0} left
                          </div>
                        </div>
                      </div>
                      
                      {/* X Connection - Only show when NOT connected */}
                      {(!user?.username || user?.username === user?.wallet_address) && (
                        <div className="mb-3">
                          <ConnectXButton />
                        </div>
                      )}

                    {/* Mobile Profile Card */}
                    <div className="mb-3">
                      <div className="relative w-full h-64 rounded-lg overflow-hidden">
                        {/* Card Background */}
                        <div
                          className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-lg"
                          style={{
                            backgroundImage: "url(/card.svg)",
                            backgroundSize: "100% 100%",
                            width: "100%",
                            height: "100%",
                          }}
                        />

                        {/* Profile Content Overlay - Positioned on top */}
                        <div className="absolute top-0 left-0 right-0 h-48 flex flex-col items-center text-white p-4 pt-3">
                          {/* Profile Picture */}
                          <img
                            src={getAvatarUrl()}
                            alt="Profile"
                            className="h-16 w-16 rounded-lg border-2 border-white/30 mb-3"
                          />

                          {/* Username/Wallet */}
                          <div className="text-center mb-4">
                            <div className="text-xl mb-1">
                              {user?.username &&
                              user.username !== user?.wallet_address
                                ? `@${user.username}`
                                : publicKey.toString().slice(0, 4) +
                                  "..." +
                                  publicKey.toString().slice(-4)}
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div className="flex justify-between w-full max-w-56">
                            {/* Pixels Placed */}
                            <div className="text-left">
                              <div className="text-3xl font-bold bg-gradient-to-r from-[#EE00FF] to-[#EE5705] bg-clip-text text-transparent">
                                {user?.total_pixels_placed || 0}
                              </div>
                              <div className="text-xs text-gray-200">
                                Pixels Placed
                              </div>
                            </div>

                            {/* VIBEY Burned */}
                            <div className="text-right">
                              <div className="text-3xl font-bold bg-gradient-to-r from-[#FFA371] to-[#EE5705] bg-clip-text text-transparent">
                                {Math.floor(
                                  Number(user?.total_tokens_burned) || 0
                                )}
                              </div>
                              <div className="text-xs text-gray-200">
                                $VIBEY Burned
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Share Profile Button */}
                    <Button
                      onClick={() => {
                        shareProfileCard();
                        setIsMobileMenuOpen(false);
                      }}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-sm py-2 h-10 rounded-full mb-3"
                      style={{
                        background:
                          "linear-gradient(to right, #EE2B7E, #EE5705)",
                        color: "white",
                      }}
                    >
                      Share Profile on
                      <svg
                        className="h-4 w-4 ml-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </Button>

                      {/* Disconnect Button */}
                      <Button
                        onClick={() => {
                          handleDisconnect();
                          setIsMobileMenuOpen(false);
                        }}
                        variant="ghost"
                        size="sm"
                        className="w-full text-red-600 hover:bg-red-600/20 py-2 h-10"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Disconnect Wallet
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Top Players Dialog */}
      <Dialog open={showTopPlayers} onOpenChange={setShowTopPlayers}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Leaderboard
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {topPlayers.length > 0 ? (
              topPlayers.map((player, index) => (
                <Card key={player.wallet_address} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-black font-bold text-sm">
                          {index + 1}
                        </div>
                        <img
                          src={player.profile_picture || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${player.wallet_address}`}
                          alt="Avatar"
                          className="h-8 w-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-white">
                            {player.username && player.username !== player.wallet_address ? player.username : player.wallet_address.slice(0, 4) + '...' + player.wallet_address.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Placed pixels</div>
                        <div className="font-medium text-white">{player.total_pixels_placed}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                No players found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Get Pixels Modal */}
      <GetPixelsModal
        isOpen={showGetPixels}
        onClose={() => setShowGetPixels(false)}
      />
    </>
  );
}
