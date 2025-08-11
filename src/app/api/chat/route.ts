import { NextRequest, NextResponse } from 'next/server';

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

    // TODO: Implement database operations
    // 1. Save message to database
    // 2. Broadcast to all connected clients via WebSocket/Supabase Realtime
    // 3. Rate limiting and spam protection

    // Mock response for now
    const mockResponse = {
      success: true,
      data: {
        id: Date.now().toString(),
        wallet_address,
        message: message.trim(),
        created_at: new Date(),
      },
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // TODO: Implement database query for recent messages
    // Return last 100 messages ordered by created_at DESC

    // Mock messages for now
    const mockMessages = [
      {
        id: '1',
        wallet_address: 'ABC123...XYZ789',
        username: null,
        message: 'Welcome to Pixey! 🎨',
        created_at: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      },
      {
        id: '2',
        wallet_address: 'DEF456...UVW012',
        username: null,
        message: 'Just placed my first pixel!',
        created_at: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
      },
      {
        id: '3',
        wallet_address: 'GHI789...RST345',
        username: null,
        message: 'This is amazing! Love the concept.',
        created_at: new Date(Date.now() - 1000 * 60 * 1), // 1 minute ago
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockMessages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
