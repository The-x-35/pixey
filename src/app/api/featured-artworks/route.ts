import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET() {
  try {
    // Get featured artworks ordered by created_at DESC
    const result = await db.query(`
      SELECT 
        fa.id,
        fa.title,
        fa.description,
        fa.image_url,
        fa.creator_wallet,
        u.username,
        fa.start_x,
        fa.start_y,
        fa.end_x,
        fa.end_y,
        fa.is_featured,
        fa.created_at
      FROM pixey_featured_artworks fa
      LEFT JOIN pixey_users u ON fa.creator_wallet = u.wallet_address
      WHERE fa.is_featured = true
      ORDER BY fa.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching featured artworks:', error);
    
    let errorMessage = 'Failed to fetch featured artworks';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
