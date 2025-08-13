import { NextRequest, NextResponse } from 'next/server';
import { calculatePixelsFromBurn } from '@/lib/solana';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, token_amount, wallet_sign_transaction } = await request.json();

    // Validate inputs
    if (!wallet_address || typeof token_amount !== 'number' || token_amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input parameters',
      }, { status: 400 });
    }

    // Calculate pixels from token amount
    const pixelsReceived = calculatePixelsFromBurn(token_amount);

    // Start database transaction
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // 1. Insert burn transaction record
      const mockSignature = `burn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      await client.query(`
        INSERT INTO pixey_burn_transactions 
        (signature, wallet_address, tokens_burned, pixels_received, status)
        VALUES ($1, $2, $3, $4, 'confirmed')
      `, [mockSignature, wallet_address, token_amount, pixelsReceived]);

      // 2. Update user's pixel balance
      await client.query(`
        UPDATE pixey_users 
        SET free_pixels = free_pixels + $1,
            total_tokens_burned = total_tokens_burned + $2,
            updated_at = NOW()
        WHERE wallet_address = $3
      `, [pixelsReceived, token_amount, wallet_address]);

      // 3. Update global burn count
      await client.query(`
        UPDATE pixey_game_settings 
        SET total_tokens_burned = total_tokens_burned + $1,
            updated_at = NOW()
        WHERE id = 1
      `, [token_amount]);

      // 4. Check for stage upgrade
      const settingsResult = await client.query('SELECT * FROM pixey_game_settings WHERE id = 1');
      const { total_tokens_burned, current_stage } = settingsResult.rows[0];
      
      let newStage = current_stage;
      if (total_tokens_burned >= 100000 && current_stage < 3) newStage = 3;
      else if (total_tokens_burned >= 20000 && current_stage < 2) newStage = 2;
      
      if (newStage !== current_stage) {
        await client.query(`
          UPDATE pixey_game_settings 
          SET current_stage = $1, board_size = $2 
          WHERE id = 1
        `, [newStage, newStage === 2 ? 500 : 1000]);
      }

      await client.query('COMMIT');

      // 5. Get updated user data
      const updatedUser = await client.query(
        'SELECT free_pixels FROM pixey_users WHERE wallet_address = $1',
        [wallet_address]
      );

      return NextResponse.json({
        success: true,
        data: {
          transaction_signature: mockSignature,
          tokens_burned: token_amount,
          pixels_received: pixelsReceived,
          new_pixel_balance: updatedUser.rows[0].free_pixels,
        },
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error processing burn transaction:', error);
    
    let errorMessage = 'Failed to process burn transaction';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
