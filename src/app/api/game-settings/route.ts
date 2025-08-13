import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get current game settings
    const result = await db.query(`
      SELECT current_stage, total_tokens_burned, board_width, board_height
      FROM pixey_game_settings 
      WHERE id = 1
    `);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Game settings not found' },
        { status: 404 }
      );
    }

    const settings = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        currentStage: settings.current_stage,
        totalBurned: parseFloat(settings.total_tokens_burned),
        boardSize: settings.board_width || 200, // Default to 200 if not set
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching game settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch game settings' },
      { status: 500 }
    );
  }
}
