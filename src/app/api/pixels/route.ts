import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get all pixels from the database
    const result = await db.query(`
      SELECT x_coordinate as x, y_coordinate as y, color, wallet_address, placed_at
      FROM pixey_pixels 
      ORDER BY placed_at DESC
    `);

    const pixels = result.rows.map(row => ({
      x: row.x,
      y: row.y,
      color: row.color,
      wallet_address: row.wallet_address,
      placed_at: row.placed_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        pixels,
        count: pixels.length,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching pixels:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pixels' },
      { status: 500 }
    );
  }
}
