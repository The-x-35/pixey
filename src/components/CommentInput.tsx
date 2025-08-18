'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Send } from 'lucide-react';

interface CommentInputProps {
  onSubmit: (content: string, walletAddress: string) => Promise<void>;
  isSubmitting: boolean;
}

export default function CommentInput({ onSubmit, isSubmitting }: CommentInputProps) {
  const [comment, setComment] = useState('');
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || isSubmitting) return;

    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    try {
      await onSubmit(comment.trim(), publicKey.toString());
      setComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  return (
    <div className="mt-4 pt-4 pb-8 border-t border-[#262626]">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <Input
          placeholder="Send it..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="flex-1 border-[#262626] text-white placeholder:text-gray-400 bg-black focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button 
          type="submit" 
          size="sm"
          className='bg-[#3405EE] hover:bg-[#2804cc] text-white p-2 h-10 w-10' 
          disabled={isSubmitting || !comment.trim()}
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
