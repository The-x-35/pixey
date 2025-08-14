'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import CommentInput from './CommentInput';
import CommentItem from './CommentItem';
import { MessageSquare, Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  wallet_address: string;
}

interface ChatProps {
  className?: string;
}

export default function Chat({ className }: ChatProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { connected } = useWallet();
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch comments from database
  const fetchComments = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      
      const response = await fetch('/api/comments');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setComments(result.data);
        } else {
          console.error('Failed to fetch comments:', result.error);
        }
      } else {
        console.error('Failed to fetch comments');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  };

  // Submit new comment
  const handleSubmitComment = async (content: string, walletAddress: string) => {
    if (!connected) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Add new comment to the bottom of the list
          setComments(prev => [...prev, result.data]);
        } else {
          console.error('Failed to post comment:', result.error);
        }
      } else {
        console.error('Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-scroll to bottom when new comments arrive
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  // Fetch comments on mount and set up interval
  useEffect(() => {
    // Initial fetch with loading state
    fetchComments(true);
    
    // Background refresh every 5 seconds without loading state
    const interval = setInterval(() => fetchComments(false), 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm">Be the first to comment!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
            <div ref={commentsEndRef} />
          </>
        )}
      </div>

      {/* Comment input form */}
      <CommentInput 
        onSubmit={handleSubmitComment}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
