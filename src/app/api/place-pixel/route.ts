import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // CORS check - only allow pixey.vibegame.fun and localhost
    const origin = request.headers.get('origin');
    const allowedOrigins = ['https://pixey.vibegame.fun', 'http://localhost:3000', 'http://localhost:3001'];
    
    if (!origin || !allowedOrigins.includes(origin)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized origin',
      }, { status: 403 });
    }

    const { x, y, color, wallet_address } = await request.json();

    // Validate inputs
    if (typeof x !== 'number' || typeof y !== 'number' || !color || !wallet_address) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input parameters',
      }, { status: 400 });
    }

    // Start transaction
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // 1. Check if user has available pixels (with row lock to prevent race conditions)
      let queryStart = Date.now();
      const userResult = await client.query(
        'SELECT free_pixels FROM pixey_users WHERE wallet_address = $1 FOR UPDATE',
        [wallet_address]
      );
      console.log(`User query: ${Date.now() - queryStart}ms`);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      
      // 2. Check if pixel already exists at this location
      queryStart = Date.now();
      const existingPixelResult = await client.query(
        'SELECT wallet_address FROM pixey_pixels WHERE x_coordinate = $1 AND y_coordinate = $2',
        [x, y]
      );
      console.log(`Existing pixel check: ${Date.now() - queryStart}ms`);
      
      const pixelExists = existingPixelResult.rows.length > 0;
      const pixelsToDeduct = pixelExists ? 2 : 1; // -2 if overwriting, -1 if new pixel
      
      if (user.free_pixels < pixelsToDeduct) {
        throw new Error(`Not enough pixels available. Need ${pixelsToDeduct} pixels.`);
      }

      // 3. Place pixel (handles conflicts with UNIQUE constraint)
      queryStart = Date.now();
      await client.query(`
        INSERT INTO pixey_pixels (x_coordinate, y_coordinate, color, wallet_address) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (x_coordinate, y_coordinate) 
        DO UPDATE SET color = $3, wallet_address = $4, placed_at = NOW()
      `, [x, y, color, wallet_address]);
      console.log(`Pixel placement: ${Date.now() - queryStart}ms`);

      // 4. Check for easter egg at this coordinate
      queryStart = Date.now();
      const easterEggResult = await client.query(
        'SELECT * FROM pixey_easter_eggs WHERE x_coordinate = $1 AND y_coordinate = $2 AND is_claimed = FALSE',
        [x, y]
      );
      console.log(`Easter egg check: ${Date.now() - queryStart}ms`);
      
      let easterEggReward = 0;
      let easterEggId = null;
      
      if (easterEggResult.rows.length > 0) {
        const easterEgg = easterEggResult.rows[0];
        easterEggReward = easterEgg.reward_pixels;
        easterEggId = easterEgg.id;
        
        // Mark easter egg as claimed
        queryStart = Date.now();
        await client.query(
          'UPDATE pixey_easter_eggs SET is_claimed = TRUE, claimed_by_wallet = $1, claimed_at = NOW() WHERE id = $2',
          [wallet_address, easterEggId]
        );
        console.log(`Easter egg update: ${Date.now() - queryStart}ms`);
      }
      
      // 5. Update user stats with appropriate pixel deduction and easter egg reward
      queryStart = Date.now();
      if (easterEggReward > 0) {
        // Easter egg found - give reward directly
        await client.query(`
          UPDATE pixey_users 
          SET free_pixels = free_pixels + $1,
              total_pixels_placed = total_pixels_placed + 1,
              updated_at = NOW()
          WHERE wallet_address = $2
        `, [easterEggReward, wallet_address]);
      } else {
        // Normal pixel placement - deduct pixels
        await client.query(`
          UPDATE pixey_users 
          SET free_pixels = free_pixels - $1,
              total_pixels_placed = total_pixels_placed + 1,
              updated_at = NOW()
          WHERE wallet_address = $2
        `, [pixelsToDeduct, wallet_address]);
      }
      console.log(`User stats update: ${Date.now() - queryStart}ms`);

      // 6. Record pixel history
      queryStart = Date.now();
      await client.query(`
        INSERT INTO pixey_pixel_history (x_coordinate, y_coordinate, new_color, wallet_address)
        VALUES ($1, $2, $3, $4)
      `, [x, y, color, wallet_address]);
      console.log(`Pixel history: ${Date.now() - queryStart}ms`);

      // Create a single central notification for real-time updates
      queryStart = Date.now();
      await client.query(`
        INSERT INTO pixey_notifications (type, message, data, recipient_wallet)
        VALUES ($1, $2, $3, $4)
      `, [
        'pixel_placed',
        `A new pixel was placed at (${x}, ${y})`,
        JSON.stringify({ x, y, color, placed_by: wallet_address }),
        'global' // Single notification for all clients to fetch
      ]);
      console.log(`Central notification creation: ${Date.now() - queryStart}ms`);

      await client.query('COMMIT');

      // 6. Get updated user data
      queryStart = Date.now();
      const updatedUser = await client.query(
        'SELECT free_pixels FROM pixey_users WHERE wallet_address = $1',
        [wallet_address]
      );
      console.log(`Final user query: ${Date.now() - queryStart}ms`);

      return NextResponse.json({
        success: true,
        data: {
          pixel: { x, y, color, wallet_address, placed_at: new Date() },
          user_pixels_remaining: updatedUser.rows[0].free_pixels,
          pixels_deducted: pixelsToDeduct,
          was_overwrite: pixelExists,
          easter_egg_found: easterEggReward > 0,
          easter_egg_reward: easterEggReward,
        },
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error placing pixel:', error);
    
    let errorMessage = 'Failed to place pixel';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
