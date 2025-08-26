'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  wallet_address: string;
}

interface CommentItemProps {
  comment: Comment;
}

export default function CommentItem({ comment }: CommentItemProps) {
  const getInitials = (wallet: string) => {
    return wallet.substring(0, 2).toUpperCase();
  };

  const getAvatarUrl = (wallet: string) => {
    return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${wallet}`;
  };

  const shortenWallet = (wallet: string) => {
    if (!wallet) return '';
    if (wallet.length <= 7) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      // Debug: log the incoming date string
      console.log('Original date string:', dateString);
      
      // Parse the date string properly
      let parsedDate: Date;
      
      // Check if the date string is already a valid date
      if (dateString.includes('T') || dateString.includes('Z')) {
        // ISO format or UTC format
        parsedDate = new Date(dateString);
      } else {
        // Assume it's a local date string
        parsedDate = new Date(dateString + 'Z');
      }
      
      // Debug: log the parsed date
      console.log('Parsed date:', parsedDate);
      console.log('Parsed date ISO:', parsedDate.toISOString());
      
      // Validate the parsed date
      if (isNaN(parsedDate.getTime())) {
        console.error('Invalid date:', dateString);
        return 'recently';
      }
      
      const now = new Date();
      const timeDiff = now.getTime() - parsedDate.getTime();
      
      // Debug: log time calculations
      console.log('Current time:', now);
      console.log('Time difference (ms):', timeDiff);
      
      // Convert to minutes
      const minutes = Math.floor(timeDiff / (1000 * 60));
      
      if (minutes < 1) return 'just now';
      if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      
      // Convert to hours
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      
      // Convert to days
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
      
      // For older comments, show date and time
      return parsedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' ' + parsedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'recently';
    }
  };

  return (
    <div className="flex gap-3 p-2 rounded-lg border border-[#262626]">
      <Avatar className="h-8 w-8">
        <AvatarImage src={getAvatarUrl(comment.wallet_address)} alt={comment.wallet_address} className="h-8 w-8" />
        <AvatarFallback className="text-xs">{getInitials(comment.wallet_address)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1 min-w-0">
        {/* Name */}
        <div className="flex flex-col">
          <span className="font-medium leading-tight text-white">{shortenWallet(comment.wallet_address)}</span>
        </div>
        {/* Comment text */}
        <p className="text-sm break-words whitespace-pre-line text-white">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
