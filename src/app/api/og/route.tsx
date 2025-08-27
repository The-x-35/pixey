import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Try to serve the current board image
    const boardImagePath = join(process.cwd(), 'public', 'current-board.png');
    const boardImage = await readFile(boardImagePath);
    
    return new NextResponse(new Uint8Array(boardImage), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    // Fallback to static OG image
    try {
      const fallbackImagePath = join(process.cwd(), 'public', 'og-pixey.png');
      const fallbackImage = await readFile(fallbackImagePath);
      
      return new NextResponse(new Uint8Array(fallbackImage), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      });
    } catch (fallbackError) {
      console.error('Both board image and fallback failed:', error, fallbackError);
      return new NextResponse('Image not found', { status: 404 });
    }
  }
}
