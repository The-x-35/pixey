import { NextResponse } from 'next/server';
import { PublicKey, Connection } from "@solana/web3.js";
import { getMint } from '@solana/spl-token';
import { API_ENDPOINTS } from '@/constants';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('tokenId');

  if (!tokenId) {
    return NextResponse.json(
      { error: 'Token ID is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://lite-api.jup.ag/price/v3?ids=${tokenId}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch price: ${response.statusText}`);
    }

    const data = await response.json();
    const tokenData = data[tokenId];

    if (!tokenData || !tokenData.usdPrice) {
      throw new Error("Price data not available for the given token.");
    }

    const price = tokenData.usdPrice;

    // Get token supply for market cap calculation
    const connection = new Connection(API_ENDPOINTS.SOLANA_RPC_ENDPOINT, 'confirmed');
    const mintInfo = await getMint(connection, new PublicKey(tokenId));
    const supply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
    const marketCap = supply * parseFloat(price);

    // Format price to show more decimal places for very small numbers
    const formatPrice = (price: number) => {
      if (price < 0.0001) {
        return price.toFixed(12); // Show up to 12 decimal places for very small numbers
      } else if (price < 0.01) {
        return price.toFixed(8); // Show up to 8 decimal places for small numbers
      } else if (price < 1) {
        return price.toFixed(6); // Show up to 6 decimal places for numbers < 1
      } else {
        return price.toFixed(4); // Show up to 4 decimal places for larger numbers
      }
    };

    return NextResponse.json({
      price: formatPrice(price),
      lastUpdated: new Date().toISOString(),
      marketCap: marketCap
    });

  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch price' },
      { status: 500 }
    );
  }
}
