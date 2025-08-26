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
  onVisibilityChange?: (isVisible: boolean) => void;
}

export default function Chat({ className, onVisibilityChange }: ChatProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
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

  // Don't render anything when not visible - the floating button is handled by the parent
  if (!isVisible) {
    return null;
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with title and close button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#262626]">
        <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Matrix Sans, sans-serif' }}>Chats ({comments.length})</h3>
        <button
          onClick={() => {
            setIsVisible(false);
            onVisibilityChange?.(false);
          }}
          className="text-gray-400 hover:text-white transition-colors p-1"
          title="Close Comments"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 p-2">
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
