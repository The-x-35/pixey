import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, username, profile_picture, isXConnection } = await request.json();

    if (!wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
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

    // Check if this X username is already connected to another wallet
    if (isXConnection && username && username !== wallet_address) {
      const existingXUser = await db.query(
        'SELECT wallet_address FROM pixey_users WHERE username = $1 AND wallet_address != $2',
        [username, wallet_address]
      );

      if (existingXUser.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'This X account is already connected to another wallet address' },
          { status: 409 }
        );
      }
    }

    // If this is an X connection, add 25 free pixels
    let freePixelsUpdate = '';
    let freePixelsValue = existingUser.rows[0].free_pixels;
    
    if (isXConnection && username && profile_picture) {
      // Check if user already has a custom username (not wallet address)
      const hasCustomUsername = existingUser.rows[0].username !== existingUser.rows[0].wallet_address;
      
      // Only add 25 pixels if this is the first time connecting X (no custom username yet)
      if (!hasCustomUsername) {
        freePixelsUpdate = ', free_pixels = free_pixels + 25';
        freePixelsValue += 25;
      }
    } else if (!isXConnection && username && username !== wallet_address) {
      // For manual username changes (not X connection), check if username is already taken
      const existingUsernameUser = await db.query(
        'SELECT wallet_address FROM pixey_users WHERE username = $1 AND wallet_address != $2',
        [username, wallet_address]
      );

      if (existingUsernameUser.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'This username is already taken by another wallet' },
          { status: 409 }
        );
      }
    }

    // Update user profile
    const updatedUser = await db.query(
      `UPDATE pixey_users 
       SET username = $1, profile_picture = $2, updated_at = NOW()${freePixelsUpdate}
       WHERE wallet_address = $3 
       RETURNING *`,
      [username || wallet_address, profile_picture || null, wallet_address]
    );

    if (updatedUser.rows.length === 0) {
      throw new Error('Failed to update user');
    }

    const user = updatedUser.rows[0];

    return NextResponse.json({
      success: true,
      data: { 
        user,
        pixelsAdded: isXConnection && username && profile_picture && existingUser.rows[0].username === existingUser.rows[0].wallet_address ? 25 : 0
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
