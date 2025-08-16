import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

// Get all notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet_address = searchParams.get('wallet_address');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit') || '50';
    
    let query = '';
    let params: any[] = [];
    
    if (type) {
      // Get latest notifications of specific type (for global display)
      query = `
        SELECT * FROM pixey_notifications 
        WHERE type = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      params = [type, parseInt(limit)];
    } else if (wallet_address) {
      // Get user-specific notifications
      query = `
        SELECT * FROM pixey_notifications 
        WHERE recipient_wallet = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      params = [wallet_address, parseInt(limit)];
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either wallet_address or type parameter is required',
      }, { status: 400 });
    }

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch notifications',
    }, { status: 500 });
  }
}

// Create a new notification
export async function POST(request: NextRequest) {
  try {
    const { type, message, data, recipient_wallet } = await request.json();

    if (!type || !message || !recipient_wallet) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
      }, { status: 400 });
    }

    const result = await db.query(`
      INSERT INTO pixey_notifications (type, message, data, recipient_wallet)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [type, message, JSON.stringify(data), recipient_wallet]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create notification',
    }, { status: 500 });
  }
}

// Mark notification as read
export async function PUT(request: NextRequest) {
  try {
    const { notification_id } = await request.json();

    if (!notification_id) {
      return NextResponse.json({
        success: false,
        error: 'Notification ID is required',
      }, { status: 400 });
    }

    const result = await db.query(`
      UPDATE pixey_notifications 
      SET is_read = true, read_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [notification_id]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });

  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update notification',
    }, { status: 500 });
  }
}
