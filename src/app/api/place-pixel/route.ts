import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
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

      // 1. Check if user has available pixels
      const userResult = await client.query(
        'SELECT free_pixels FROM pixey_users WHERE wallet_address = $1',
        [wallet_address]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      
      // 2. Check if pixel already exists at this location
      const existingPixelResult = await client.query(
        'SELECT wallet_address FROM pixey_pixels WHERE x_coordinate = $1 AND y_coordinate = $2',
        [x, y]
      );
      
      const pixelExists = existingPixelResult.rows.length > 0;
      const pixelsToDeduct = pixelExists ? 2 : 1; // -2 if overwriting, -1 if new pixel
      
      if (user.free_pixels < pixelsToDeduct) {
        throw new Error(`Not enough pixels available. Need ${pixelsToDeduct} pixels.`);
      }

      // 3. Place pixel (handles conflicts with UNIQUE constraint)
      await client.query(`
        INSERT INTO pixey_pixels (x_coordinate, y_coordinate, color, wallet_address) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (x_coordinate, y_coordinate) 
        DO UPDATE SET color = $3, wallet_address = $4, placed_at = NOW()
      `, [x, y, color, wallet_address]);

      // 4. Update user stats with appropriate pixel deduction
      await client.query(`
        UPDATE pixey_users 
        SET free_pixels = free_pixels - $1,
            total_pixels_placed = total_pixels_placed + 1,
            updated_at = NOW()
        WHERE wallet_address = $2
      `, [pixelsToDeduct, wallet_address]);

      // 5. Record pixel history
      await client.query(`
        INSERT INTO pixey_pixel_history (x_coordinate, y_coordinate, new_color, wallet_address)
        VALUES ($1, $2, $3, $4)
      `, [x, y, color, wallet_address]);

      // 6. Send notification to all users about the new pixel
      const allUsersResult = await client.query(
        'SELECT wallet_address FROM pixey_users WHERE wallet_address != $1',
        [wallet_address]
      );
      
      // Create notifications for all other users
      for (const userRow of allUsersResult.rows) {
        await client.query(`
          INSERT INTO pixey_notifications (type, message, data, recipient_wallet)
          VALUES ($1, $2, $3, $4)
        `, [
          'pixel_placed',
          `A new pixel was placed at (${x}, ${y})`,
          JSON.stringify({ x, y, color, placed_by: wallet_address }),
          userRow.wallet_address
        ]);
      }

      await client.query('COMMIT');

      // 6. Get updated user data
      const updatedUser = await client.query(
        'SELECT free_pixels FROM pixey_users WHERE wallet_address = $1',
        [wallet_address]
      );

      return NextResponse.json({
        success: true,
        data: {
          pixel: { x, y, color, wallet_address, placed_at: new Date() },
          user_pixels_remaining: updatedUser.rows[0].free_pixels,
          pixels_deducted: pixelsToDeduct,
          was_overwrite: pixelExists,
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
