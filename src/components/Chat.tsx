'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import useGameStore from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatProps } from '@/types';
import { formatWalletAddress } from '@/lib/solana';

export default function Chat({ className }: ChatProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { connected } = useWallet();
  const { chatMessages, addChatMessage, user } = useGameStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !connected || !user) return;

    setIsTyping(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: user.wallet_address,
          message: message.trim(),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Message will be added via real-time subscription
        setMessage('');
      } else {
        console.error('Failed to send message:', result.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className={cn("flex flex-col h-full bg-gray-800/50 backdrop-blur-sm rounded-lg border border-purple-500/20", className)}>
      {/* Header */}
      <div className="flex items-center space-x-2 p-4 border-b border-gray-700">
        <MessageCircle className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-bold text-white">Live Chat</h3>
        <div className="flex-1" />
        <div className="text-xs text-gray-400">
          {chatMessages.length} messages
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">💬</div>
            <div>No messages yet</div>
            <div className="text-sm">Start the conversation!</div>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className="flex space-x-3">
              {/* Avatar */}
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {(msg.username || msg.wallet_address).slice(0, 2).toUpperCase()}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-purple-400 text-sm">
                    {msg.username || formatWalletAddress(msg.wallet_address)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <div className="text-white text-sm break-words">
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        {connected ? (
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={1}
                maxLength={500}
                disabled={isTyping}
              />
              <div className="absolute bottom-1 right-2 text-xs text-gray-500">
                {message.length}/500
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isTyping}
              variant="game"
              size="sm"
              className="px-3"
            >
              {isTyping ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-4">
            <div className="text-sm">Connect your wallet to chat</div>
          </div>
        )}
      </div>
    </div>
  );
}
