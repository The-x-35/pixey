import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, username, profile_picture } = await request.json();

    if (!wallet_address || !username || !profile_picture) {
      return NextResponse.json(
        { success: false, error: 'Wallet address, username, and profile picture are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT * FROM pixey_users WHERE wallet_address = $1',
      [wallet_address]
    );

    if (existingUser.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = existingUser.rows[0];
    
    // Check if user already has a custom username (not wallet address)
    const hasCustomUsername = user.username !== user.wallet_address;
    
    // Only add 25 pixels if this is the first time connecting X (no custom username yet)
    let freePixelsUpdate = '';
    let pixelsAdded = 0;
    
    if (!hasCustomUsername) {
      freePixelsUpdate = ', free_pixels = free_pixels + 25';
      pixelsAdded = 25;
    }

    // Update user profile with X connection data
    const updatedUser = await db.query(
      `UPDATE pixey_users 
       SET username = $1, profile_picture = $2, updated_at = NOW()${freePixelsUpdate}
       WHERE wallet_address = $3 
       RETURNING *`,
      [username, profile_picture, wallet_address]
    );

    if (updatedUser.rows.length === 0) {
      throw new Error('Failed to update user');
    }

    const updatedUserData = updatedUser.rows[0];

    return NextResponse.json({
      success: true,
      data: { 
        user: updatedUserData,
        pixelsAdded,
        isFirstTimeConnection: !hasCustomUsername
      }
    });

  } catch (error) {
    console.error('Error connecting X account:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
