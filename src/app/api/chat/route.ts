import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, message } = await request.json();

    // Validate inputs
    if (!wallet_address || !message || message.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input parameters',
      }, { status: 400 });
    }

    // Validate message length
    if (message.length > 500) {
      return NextResponse.json({
        success: false,
        error: 'Message too long (max 500 characters)',
      }, { status: 400 });
    }

    // Save message to database
    const result = await db.query(`
      INSERT INTO pixey_chat_messages (wallet_address, message, created_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [wallet_address, message.trim(), new Date()]);

    const savedMessage = result.rows[0];

    // TODO: Broadcast to all connected clients via WebSocket/Supabase Realtime
    // broadcastChatMessage(savedMessage);

    return NextResponse.json({
      success: true,
      data: savedMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    
    let errorMessage = 'Failed to send message';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get last 100 messages ordered by created_at DESC
    const result = await db.query(`
      SELECT 
        cm.id,
        cm.wallet_address,
        u.username,
        cm.message,
        cm.created_at,
        cm.is_deleted
      FROM pixey_chat_messages cm
      LEFT JOIN pixey_users u ON cm.wallet_address = u.wallet_address
      WHERE cm.is_deleted = false
      ORDER BY cm.created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    
    let errorMessage = 'Failed to fetch messages';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
