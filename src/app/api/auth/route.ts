import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import * as nacl from 'tweetnacl';
import { SOLANA_RPC_ENDPOINT } from '@/constants';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, message, signature } = await request.json();
    
    console.log('Auth API received:', { wallet_address, message, signature });

    // Validate inputs
    if (!wallet_address || !message || !signature) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters',
      }, { status: 400 });
    }

    // Verify the message signature
    try {
      console.log('Verifying signature...');
      const publicKey = new PublicKey(wallet_address);
      console.log('PublicKey created:', publicKey.toString());
      
      const messageBytes = new TextEncoder().encode(message);
      console.log('Message bytes length:', messageBytes.length);
      
      const signatureBytes = bs58.decode(signature);
      console.log('Signature bytes length:', signatureBytes.length);
      
      const publicKeyBytes = publicKey.toBytes();
      console.log('PublicKey bytes length:', publicKeyBytes.length);
      
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
      console.log('Signature verification result:', isValid);
      
      if (!isValid) {
        return NextResponse.json({
          success: false,
          error: 'Invalid signature',
        }, { status: 400 });
      }
    } catch (error) {
      console.error('Signature verification error:', error);
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address or signature',
      }, { status: 400 });
    }

    // Check if this is the correct message
    const expectedMessage = 'I am logging in to pixey.vibegame.fun';
    if (message !== expectedMessage) {
      return NextResponse.json({
        success: false,
        error: 'Invalid message content',
      }, { status: 400 });
    }

    // Start database transaction
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if user exists
      const userResult = await client.query(
        'SELECT * FROM pixey_users WHERE wallet_address = $1',
        [wallet_address]
      );

      if (userResult.rows.length === 0) {
        // Check SOL balance before creating new user
        try {
          const publicKey = new PublicKey(wallet_address);
          const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
          const balance = await connection.getBalance(publicKey);
          const solBalance = balance / LAMPORTS_PER_SOL;
          
          if (solBalance < 0.1) {
            return NextResponse.json({
              success: false,
              error: 'Insufficient SOL balance. You need at least 0.1 SOL to create an account.',
            }, { status: 400 });
          }
          
          console.log(`New user ${wallet_address} has ${solBalance} SOL, creating account...`);
        } catch (error) {
          console.error('Error checking SOL balance:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to verify SOL balance. Please try again.',
          }, { status: 500 });
        }
        
        // Create new user with wallet address as username and 10 free pixels
        await client.query(`
          INSERT INTO pixey_users (wallet_address, username, free_pixels, total_pixels_placed, total_tokens_burned, auth_message, auth_signature, last_login)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [wallet_address, wallet_address, 10, 0, 0, message, signature]);
      } else {
        // Update existing user's auth info and last login
        await client.query(`
          UPDATE pixey_users 
          SET auth_message = $1, auth_signature = $2, last_login = NOW()
          WHERE wallet_address = $3
        `, [message, signature, wallet_address]);
      }

      // Get or create user data
      const finalUserResult = await client.query(
        'SELECT * FROM pixey_users WHERE wallet_address = $1',
        [wallet_address]
      );

      await client.query('COMMIT');

      const userData = finalUserResult.rows[0];

      // Create a JWT token with wallet_address for API authentication (for both new and existing users)
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { 
          wallet_address: wallet_address,
          username: userData.username,
          sub: userData.wallet_address 
        },
        process.env.NEXTAUTH_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      return NextResponse.json({
        success: true,
        data: {
          user: userData,
          isNewUser: userResult.rows.length === 0,
          token: token, // Include JWT token in response for both new and existing users
        },
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error in auth API:', error);
    
    let errorMessage = 'Authentication failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
