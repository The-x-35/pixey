import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT 
        id, 
        message as content, 
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at, 
        wallet_address 
      FROM pixey_chat_messages 
      ORDER BY created_at ASC 
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Comment too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Get wallet address from request headers (set by middleware or client)
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' },
        { status: 401 }
      );
    }

    // Insert new comment
    const result = await db.query(`
      INSERT INTO pixey_chat_messages (message, wallet_address, created_at)
      VALUES ($1, $2, NOW())
      RETURNING id, message as content, TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at, wallet_address
    `, [content.trim(), walletAddress]);

    if (result.rows.length === 0) {
      throw new Error('Failed to create comment');
    }

    const newComment = result.rows[0];

    return NextResponse.json({
      success: true,
      data: newComment
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
