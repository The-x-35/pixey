import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, username, profile_picture } = await request.json();

    if (!wallet_address || !username) {
      return NextResponse.json(
        { success: false, error: 'Wallet address and username are required' },
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

    // Update user profile
    const updatedUser = await db.query(
      `UPDATE pixey_users 
       SET username = $1, profile_picture = $2, updated_at = NOW()
       WHERE wallet_address = $3 
       RETURNING *`,
      [username, profile_picture || null, wallet_address]
    );

    if (updatedUser.rows.length === 0) {
      throw new Error('Failed to update user');
    }

    const user = updatedUser.rows[0];

    return NextResponse.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
