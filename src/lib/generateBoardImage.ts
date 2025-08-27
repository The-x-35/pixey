import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function generateBoardImage(request?: Request): Promise<void> {
  try {
    // Get base URL from request or use localhost
    const baseUrl = request ? new URL(request.url).origin : 'http://localhost:3000';
    
    // Fetch current board state
    const pixelsResponse = await fetch(`${baseUrl}/api/pixels`);
    const pixelsData = await pixelsResponse.json();
    
    // Fetch game settings for board size
    const settingsResponse = await fetch(`${baseUrl}/api/game-settings`);
    const settingsData = await settingsResponse.json();
    
    if (!pixelsData.success || !settingsData.success) {
      throw new Error('Failed to fetch board data');
    }

    const pixels = pixelsData.data.pixels || [];
    const { boardSize } = settingsData.data;
    
    // Create canvas for OG image dimensions (1200x630)
    const { createCanvas } = await import('canvas');
    const ogWidth = 1200;
    const ogHeight = 630;
    const canvas = createCanvas(ogWidth, ogHeight);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate board dimensions to fit in OG image
    // Use full height, only horizontal padding
    const horizontalPadding = 100;
    const maxBoardSize = ogHeight; // Use full height
    const pixelSize = Math.floor(maxBoardSize / boardSize);
    const boardWidth = boardSize * pixelSize;
    const boardHeight = boardSize * pixelSize;
    
    // Center horizontally, align to top
    const boardX = (ogWidth - boardWidth) / 2;
    const boardY = 0; // No top padding
    
    // Draw pixels
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        const pixel = pixels.find((p: any) => p.x === x && p.y === y);
        if (pixel) {
          ctx.fillStyle = pixel.color;
          ctx.fillRect(
            boardX + x * pixelSize, 
            boardY + y * pixelSize, 
            pixelSize, 
            pixelSize
          );
        }
      }
    }
    
    // Save to file
    const imagePath = join(process.cwd(), 'public', 'current-board.png');
    const buffer = canvas.toBuffer('image/png');
    await writeFile(imagePath, buffer);
    
    console.log('Board image generated successfully');
  } catch (error) {
    console.error('Error generating board image:', error);
  }
}
