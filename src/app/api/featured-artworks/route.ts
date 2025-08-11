import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: Implement database query for featured artworks
    // Return artworks where is_featured = true ordered by created_at DESC

    // Mock featured artworks for now
    const mockArtworks = [
      {
        id: '1',
        title: 'Pixel Sunset',
        description: 'A beautiful sunset created with vibrant orange and pink pixels, showcasing the collaborative spirit of the Pixey community.',
        image_url: '/api/placeholder/400/400',
        creator_wallet: 'ABC123def456GHI789jkl012MNO345pqr678STU901',
        created_at: new Date('2024-01-15'),
        is_featured: true,
      },
      {
        id: '2',
        title: 'Digital Mandala',
        description: 'Intricate geometric patterns forming a mesmerizing mandala, demonstrating the artistic potential of pixel art.',
        image_url: '/api/placeholder/400/400',
        creator_wallet: 'DEF456ghi789JKL012mno345PQR678stu901VWX234',
        created_at: new Date('2024-01-20'),
        is_featured: true,
      },
      {
        id: '3',
        title: 'Crypto Mosaic',
        description: 'A stunning mosaic representing the fusion of art and blockchain technology.',
        image_url: '/api/placeholder/400/400',
        creator_wallet: 'GHI789jkl012MNO345pqr678STU901vwx234YZA567',
        created_at: new Date('2024-01-25'),
        is_featured: true,
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockArtworks,
    });
  } catch (error) {
    console.error('Error fetching featured artworks:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
