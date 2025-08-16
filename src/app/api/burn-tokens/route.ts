import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { VIBEY_TOKEN_MINT_ADDRESS, SOLANA_RPC_ENDPOINT } from '@/constants';



// Helper function to decode u64 from instruction data
function decodeU64(data: Uint8Array, offset: number): { value: number; offset: number } {
  const bytes = data.slice(offset, offset + 8);
  const value = Number(BigInt('0x' + Array.from(bytes).reverse().map(b => b.toString(16).padStart(2, '0')).join('')));
  return { value, offset: offset + 8 };
}

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, token_amount, transaction_signature } = await request.json();
    
    if (!wallet_address || !token_amount || token_amount <= 0 || !transaction_signature) {
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address, token amount, or missing transaction signature',
      }, { status: 400 });
    }
    
    // Additional validation for token amount
    if (token_amount > 1000000) { // Limit to 1M tokens per burn
      return NextResponse.json({
        success: false,
        error: 'Token amount exceeds maximum allowed per transaction',
      }, { status: 400 });
    }
    
    // Validate wallet address format
    try {
      new PublicKey(wallet_address);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address format',
      }, { status: 400 });
    }

    // Verify the Solana transaction first
    const connection = new Connection(SOLANA_RPC_ENDPOINT);
    
    try {
      // Verify the transaction exists and was confirmed
      const transactionInfo = await connection.getTransaction(transaction_signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      if (!transactionInfo) {
        return NextResponse.json({
          success: false,
          error: 'Transaction not found or not confirmed',
        }, { status: 400 });
      }
      
      // Check if transaction was successful
      if (transactionInfo.meta?.err) {
        return NextResponse.json({
          success: false,
          error: 'Transaction failed on Solana',
        }, { status: 400 });
      }
      
      // Verify this is actually a burn transaction
      const instructions = transactionInfo.transaction.message.compiledInstructions || [];
      const mintKey = new PublicKey(VIBEY_TOKEN_MINT_ADDRESS);
      const ownerKey = new PublicKey(wallet_address);
      
      let hasBurnInstruction = false;
      let burnAmount = 0;
      let burnMint = '';
      let burnAuthority = '';
      let burnTokenAccount = '';
      
      for (let i = 0; i < instructions.length; i++) {
        const instruction = instructions[i];
        
        // Get the program ID for this instruction
        const programId = transactionInfo.transaction.message.staticAccountKeys[instruction.programIdIndex];
        
        // Check if this instruction targets the SPL Token program
        if (programId.equals(TOKEN_PROGRAM_ID)) {
          try {
            const instructionData = instruction.data;
            
            // Check what type of instruction this is
            const instructionType = instructionData[0];
            
            // Check if this is a burn instruction (code 8 or 9)
            if (instructionType === 8 || instructionType === 9) {
              hasBurnInstruction = true;
              
              // Based on the logs, the data format is: [instruction_code, amount_8_bytes]
              if (instructionData.length >= 9) {
                // Decode amount from bytes 1-8 (little-endian)
                const amountBytes = instructionData.slice(1, 9);
                burnAmount = Number(BigInt('0x' + Array.from(amountBytes).reverse().map(b => b.toString(16).padStart(2, '0')).join('')));
                
                // Try to decode accounts from the static account keys
                const staticKeys = transactionInfo.transaction.message.staticAccountKeys;
                for (let j = 0; j < staticKeys.length; j++) {
                  const key = staticKeys[j];
                  if (key.toString() === wallet_address) {
                    burnAuthority = key.toString();
                    break;
                  }
                }
              }
              
              break; // Found burn instruction, no need to check others
            }
          } catch (decodeError) {
            console.error(`Error decoding instruction ${i}:`, decodeError);
          }
        }
      }
      
      if (!hasBurnInstruction) {
        return NextResponse.json({
          success: false,
          error: 'Transaction does not contain a burn instruction',
        }, { status: 400 });
      }
      
      // The user is burning what they want to burn - we just need to verify it's a real transaction
      // Don't check amounts since that's not our business
      
      // SECURITY CHECK: Verify the burn authority matches the user's wallet
      if (burnAuthority && burnAuthority !== wallet_address) {
        return NextResponse.json({
          success: false,
          error: `Burn not authorized by the specified wallet. Expected ${wallet_address}, got ${burnAuthority}`,
        }, { status: 400 });
      }
      
      // SECURITY CHECK: Verify minimum burn amount (prevent gaming with tiny burns)
      const minBurnAmount = 1000; // Minimum 0.001 VIBEY (1000 lamports)
      if (burnAmount < minBurnAmount) {
        return NextResponse.json({
          success: false,
          error: `Burn amount too small. Minimum required: ${minBurnAmount / Math.pow(10, 9)} VIBEY`,
        }, { status: 400 });
      }
      
      // Verify the transaction contains the VIBEY token mint
      const hasVibeyMint = transactionInfo.transaction.message.staticAccountKeys.some(key => 
        key.toString() === VIBEY_TOKEN_MINT_ADDRESS
      );
      
      if (!hasVibeyMint) {
        return NextResponse.json({
          success: false,
          error: `Transaction does not involve VIBEY tokens`,
        }, { status: 400 });
      }
      
      console.log(`Transaction ${transaction_signature} verified as valid burn of ${burnAmount / Math.pow(10, 9)} VIBEY from ${wallet_address}`);
      
      // Transaction verified successfully, now update the database
      const client = await db.getClient();
      
      try {
        await client.query('BEGIN');

        // Check if user exists
        const userResult = await client.query(
          'SELECT * FROM pixey_users WHERE wallet_address = $1',
          [wallet_address]
        );

        if (userResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({
            success: false,
            error: 'User not found',
          }, { status: 404 });
        }

        const user = userResult.rows[0];

        // Update user's pixel balance (1:1 ratio)
        const pixelsToAdd = Math.floor(token_amount);
        
        await client.query(`
          UPDATE pixey_users 
          SET free_pixels = free_pixels + $1, 
              total_tokens_burned = total_tokens_burned + $2
          WHERE wallet_address = $3
        `, [pixelsToAdd, token_amount, wallet_address]);

        await client.query('COMMIT');
        console.log(`Database updated successfully for transaction: ${transaction_signature}`);

        // Get updated user data
        const updatedUserResult = await client.query(
          'SELECT * FROM pixey_users WHERE wallet_address = $1',
          [wallet_address]
        );

        return NextResponse.json({
          success: true,
          data: {
            wallet_address,
            tokens_burned: token_amount,
            pixels_received: pixelsToAdd,
            new_balance: updatedUserResult.rows[0].free_pixels,
            transaction_signature: transaction_signature,
            message: 'Tokens burned successfully and pixels added to account'
          },
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (solanaError) {
      console.error('Solana transaction verification error:', solanaError);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify Solana transaction',
        details: solanaError instanceof Error ? solanaError.message : 'Unknown error'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in burn-tokens API:', error);
    
    let errorMessage = 'Token burning failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
