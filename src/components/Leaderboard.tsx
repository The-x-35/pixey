'use client';

import { Crown, Medal, Award } from 'lucide-react';
import useGameStore from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { LeaderboardProps } from '@/types';
import { formatWalletAddress, formatTokenAmount } from '@/lib/solana';
import { PIXEL_BOARD_STAGES } from '@/constants';

export default function Leaderboard({ className }: LeaderboardProps) {
  const { leaderboard, pixelBoard } = useGameStore();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-400" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getBurnProgress = () => {
    let nextStageTarget = 0;
    let stageName = '';
    
    if (pixelBoard.currentStage === 1) {
      nextStageTarget = PIXEL_BOARD_STAGES.STAGE_2.required_burns;
      stageName = 'Stage 2 (500x500)';
    } else if (pixelBoard.currentStage === 2) {
      nextStageTarget = PIXEL_BOARD_STAGES.STAGE_3.required_burns;
      stageName = 'Stage 3 (1000x1000)';
    } else {
      return { progress: 100, text: 'Max stage reached!', stageName: 'Stage 3 (1000x1000)' };
    }
    
    const progress = (pixelBoard.totalBurned / nextStageTarget) * 100;
    const text = `${formatTokenAmount(pixelBoard.totalBurned)} / ${formatTokenAmount(nextStageTarget)} $VIBEY`;
    
    return { progress, text, stageName };
  };

  const burnProgress = getBurnProgress();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Burn Progress */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-[#262626]">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center">
          🔥 Burn Progress
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-300">Next: {burnProgress.stageName}</span>
            <span className="text-purple-400 font-medium">{Math.round(burnProgress.progress)}%</span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(burnProgress.progress, 100)}%` }}
            />
          </div>
          
          <div className="text-center text-sm text-gray-400">
            {burnProgress.text}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-[#262626]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          🏆 Top Players
        </h3>
        
        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🎯</div>
              <div>No players yet!</div>
              <div className="text-sm">Be the first to place a pixel</div>
            </div>
          ) : (
            leaderboard.map((entry) => (
              <div
                key={entry.wallet_address}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 hover:bg-gray-700/50",
                  {
                    "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20": entry.rank === 1,
                    "bg-gradient-to-r from-gray-500/10 to-slate-500/10 border border-gray-500/20": entry.rank === 2,
                    "bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20": entry.rank === 3,
                  }
                )}
              >
                {/* Rank Icon */}
                <div className="flex-shrink-0">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">
                    {entry.username || formatWalletAddress(entry.wallet_address)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatTokenAmount(entry.pixels_placed)} pixels
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-medium text-purple-400">
                    {formatTokenAmount(entry.tokens_burned)} $VIBEY
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {leaderboard.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-500 text-center">
              Updated in real-time
            </div>
          </div>
        )}
      </div>

      {/* Board Stats */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-[#262626]">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center">
          📊 Board Stats
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-300">Current Stage</span>
            <span className="text-purple-400 font-medium">Stage {pixelBoard.currentStage}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-300">Board Size</span>
            <span className="text-purple-400 font-medium">{pixelBoard.boardSize}x{pixelBoard.boardSize}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-300">Total Pixels</span>
            <span className="text-purple-400 font-medium">
              {formatTokenAmount(Object.keys(pixelBoard.pixels).length)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-300">Total Burned</span>
            <span className="text-purple-400 font-medium">
              {formatTokenAmount(pixelBoard.totalBurned)} $VIBEY
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
