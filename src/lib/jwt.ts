import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Verify JWT token from custom auth
export async function verifyAuthToken(request: NextRequest): Promise<{ isValid: boolean; wallet_address?: string; error?: string }> {
  try {
    // Get the JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        isValid: false, 
        error: 'No Bearer token provided' 
      };
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return { 
        isValid: false, 
        error: 'No authentication token provided' 
      };
    }

    // Verify the JWT token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret');
    
    // Check if token has wallet_address
    if (!decoded.wallet_address) {
      return { 
        isValid: false, 
        error: 'Token missing wallet address' 
      };
    }

    return { 
      isValid: true, 
      wallet_address: decoded.wallet_address as string 
    };

  } catch (error) {
    console.error('JWT verification error:', error);
    return { 
      isValid: false, 
      error: 'Invalid authentication token' 
    };
  }
}

// Extract wallet address from request headers or body
export function extractWalletAddress(request: NextRequest): string | null {
  try {
    // Try to get from Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // This would be a custom JWT token
      return null; // We'll use NextAuth JWT instead
    }

    // Try to get from request body
    const body = request.body;
    if (body) {
      // Note: We can't read the body here as it's already consumed
      // The wallet_address should come from the verified JWT token
      return null;
    }

    return null;
  } catch (error) {
    console.error('Error extracting wallet address:', error);
    return null;
  }
}
