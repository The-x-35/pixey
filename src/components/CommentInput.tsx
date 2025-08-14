'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

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
    <div className="mt-4 pt-4 border-t border-[#262626]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder="Send it to the..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-[100px] resize-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-[#262626]"
        />
        <Button 
          type="submit" 
          className='w-full bg-[#3405EE] hover:bg-[#2804cc] text-white' 
          disabled={isSubmitting || !comment.trim()}
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </Button>
      </form>
    </div>
  );
}
