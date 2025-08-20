import { NextResponse } from 'next/server';
import { PublicKey, Connection, VersionedTransaction } from '@solana/web3.js';
import { API_ENDPOINTS, TOKENS, JUP_ULTRA_API, JUP_REFERRAL_ADDRESS, JUP_REFERRAL_FEE } from '@/constants';

interface JupiterUltraOrderResponse {
  requestId: string;
  transaction: string;
  errorMessage?: string;
}

interface JupiterExecuteResponse {
  status: string;
  signature?: string;
  error?: string;
}

export async function POST(request: Request) {
  try {
    console.log('Starting Jupiter Pro API buy request...');
    
    const { amount, outputMint, wallet, signedTransaction } = await request.json();
    console.log('Request params:', { amount, outputMint, wallet, hasSignedTx: !!signedTransaction });
    
    // Check for Jupiter API key
    const apiKey = process.env.JUPITER_API_KEY;
    if (!apiKey) {
      console.error('Jupiter API key not found');
      return NextResponse.json({ error: 'Jupiter API key not configured' }, { status: 500 });
    }

    // If we have a signed transaction, execute it
    if (signedTransaction) {
      const { requestId } = await request.json();
      
      console.log('Executing signed transaction...');
      const executeResponse = await fetch(`${JUP_ULTRA_API}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signedTransaction,
          requestId,
        }),
      });

      const executeData: JupiterExecuteResponse = await executeResponse.json();
      
      if (executeData.status === 'Success') {
        return NextResponse.json({
          success: true,
          signature: executeData.signature,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(`Swap execution failed: ${executeData.error}`);
      }
    }
    
    // Initial order creation flow
    if (!amount || !outputMint || !wallet) {
      console.log('Missing required parameters');
      return NextResponse.json({ error: 'Amount, outputMint, and wallet are required' }, { status: 400 });
    }

    const connection = new Connection(API_ENDPOINTS.SOLANA_RPC_ENDPOINT, 'confirmed');
    const fromPublicKey = new PublicKey(wallet);
    const inputMint = TOKENS.SOL;
    const inputDecimals = 9;
    const scaledAmount = amount * Math.pow(10, inputDecimals);

    console.log('Swap parameters:', {
      inputMint: inputMint.toString(),
      outputMint,
      amount: scaledAmount,
      taker: fromPublicKey.toString(),
      referralAccount: JUP_REFERRAL_ADDRESS,
      referralFee: JUP_REFERRAL_FEE
    });

    // Get Jupiter swap quote with Pro API features
    const orderUrl = `${JUP_ULTRA_API}/order?` +
      `inputMint=${inputMint.toString()}` +
      `&outputMint=${outputMint}` +
      `&amount=${scaledAmount}` +
      `&taker=${fromPublicKey.toString()}` +
      `&referralAccount=${JUP_REFERRAL_ADDRESS}` +
      `&referralFee=${JUP_REFERRAL_FEE}`;
    
    console.log('Fetching Jupiter order with Pro API...');
    
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    // Handle 400 errors specifically (route not found)
    if (orderResponse.status === 400) {
      throw new Error("Route not found");
    }

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Jupiter order failed:', errorText);
      throw new Error(`Jupiter order failed: ${errorText}`);
    }

    const orderData: JupiterUltraOrderResponse = await orderResponse.json();
    console.log('Jupiter order response:', orderData);

    // Check for specific error messages
    if (orderData.errorMessage === "Taker has insufficient input") {
      throw new Error("You have insufficient funds");
    } else if (orderData.errorMessage) {
      throw new Error(orderData.errorMessage);
    }

    const requestId = orderData.requestId;
    const transactionBase64 = orderData.transaction;

    if (!transactionBase64) {
      throw new Error("Swap transaction not found");
    }

    // Convert base64 transaction to hex for client-side signing
    const transactionBuffer = Buffer.from(transactionBase64, 'base64');
    const transactionHex = transactionBuffer.toString('hex');
    console.log('Converted transaction to hex for signing');

    // Return the transaction hex and request ID for client-side signing
    return NextResponse.json({
      transactionHex,
      requestId,
      success: true
    });

  } catch (error) {
    console.error('Jupiter buy error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false
    }, { status: 500 });
  }
}
