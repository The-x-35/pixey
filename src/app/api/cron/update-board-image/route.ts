import { NextResponse } from 'next/server';
import { generateBoardImage } from '@/lib/generateBoardImage';

export async function GET(request: Request) {
  try {
    // Require authentication for cron jobs
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!expectedToken) {
      console.error('CRON_SECRET_TOKEN not configured');
      return NextResponse.json({ error: 'Cron authentication not configured' }, { status: 500 });
    }
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      console.error('Unauthorized cron access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting - only allow one request per minute
    const now = Date.now();
    const lastRequest = (global as any).lastCronRequest || 0;
    if (now - lastRequest < 60000) { // 1 minute
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }
    (global as any).lastCronRequest = now;
    
    // Generate and save the board image
    await generateBoardImage(request);
    
    return NextResponse.json({
      success: true,
      message: 'Board image updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// Also support POST for cron services that prefer POST
export async function POST(request: Request) {
  return GET(request);
}
