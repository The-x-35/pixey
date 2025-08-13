import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { FREE_PIXELS_PER_USER } from '@/constants';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address } = await request.json();

    if (!wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT * FROM pixey_users WHERE wallet_address = $1',
      [wallet_address]
    );

    if (existingUser.rows.length > 0) {
      // User exists, return existing user data
      const user = existingUser.rows[0];
      return NextResponse.json({
        success: true,
        data: {
          user,
          isNewUser: false
        }
      });
    }

    // Create new user with free pixels
    const newUser = await db.query(
      `INSERT INTO pixey_users (wallet_address, username, free_pixels, total_tokens_burned, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) 
       RETURNING *`,
      [wallet_address, `User_${wallet_address.slice(0, 6)}`, FREE_PIXELS_PER_USER, 0]
    );

    if (newUser.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    const user = newUser.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        user,
        isNewUser: true
      }
    });

  } catch (error) {
    console.error('Error in /api/users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet_address = searchParams.get('wallet_address');

    if (!wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get user by wallet address
    const result = await db.query(
      'SELECT * FROM pixey_users WHERE wallet_address = $1',
      [wallet_address]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Error in /api/users GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
