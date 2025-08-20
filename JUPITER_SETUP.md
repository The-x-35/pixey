# Jupiter Integration Setup Guide

This guide explains how to set up and use the Jupiter integration for buying VIBEY tokens in the Pixey application.

## Prerequisites

1. **Solana Wallet**: Phantom, Solflare, or any other Solana wallet
2. **Jupiter Pro API Key**: Get one from [Jupiter Pro](https://pro.jup.ag/)
3. **SOL Balance**: You need SOL in your wallet to buy VIBEY tokens

## Environment Setup

1. Add your Jupiter Pro API key to your `.env.local` file:
```env
JUPITER_API_KEY=your_jupiter_pro_api_key_here
```

2. Make sure you have the required dependencies in your `package.json`:
```json
{
  "@solana/web3.js": "^1.87.0",
  "@solana/wallet-adapter-react": "^0.15.35",
  "@solana/wallet-adapter-react-ui": "^0.9.34"
}
```

## How to Use

### 1. Access the Buy VIBEY Section
- Click on the "Buy Pixels" button in the mobile bottom bar or navbar
- In the modal, click on the "Buy VIBEY" tab

### 2. Buy VIBEY Tokens
- Click the "Buy VIBEY" button to expand the buy dialog
- Enter the amount of SOL you want to spend (minimum 0.001 SOL)
- Use quick amount buttons (0.1, 0.5, 1 SOL) for convenience
- Set your preferred slippage tolerance (0.5%, 1%, 2%, or 5%)
- Click "Confirm Buy" to proceed

### 3. Transaction Process
1. **Quote Generation**: Jupiter generates the best swap route
2. **Transaction Signing**: Your wallet will prompt you to sign the transaction
3. **Execution**: The swap is executed on-chain
4. **Confirmation**: You'll receive VIBEY tokens in your wallet

## Features

- **Real-time Price**: Fetches current VIBEY price from Jupiter
- **Estimated Tokens**: Shows approximately how many VIBEY tokens you'll receive
- **Quick Amounts**: Pre-set amounts for common purchase sizes
- **Slippage Control**: Adjustable slippage tolerance for better rates
- **Error Handling**: Comprehensive error messages and validation
- **Mobile Optimized**: Responsive design for both mobile and desktop

## API Endpoints

### `/api/jupiter/buy`
- **Method**: POST
- **Purpose**: Creates Jupiter swap orders
- **Body**: `{ amount, outputMint, wallet, slippage }`

### `/api/jupiter/price`
- **Method**: GET
- **Purpose**: Fetches token prices
- **Query**: `?tokenId=<token_mint_address>`

## Troubleshooting

### Common Issues

1. **"Jupiter API key not configured"**
   - Add `JUPITER_API_KEY` to your `.env.local` file

2. **"Route not found"**
   - The token pair might not have sufficient liquidity
   - Try adjusting the amount or slippage

3. **"Insufficient funds"**
   - Make sure you have enough SOL in your wallet
   - Account for transaction fees

4. **Transaction signing fails**
   - Check wallet connection
   - Ensure wallet supports transaction signing

### Error Messages

- **Validation Errors**: Clear messages for invalid amounts
- **Network Errors**: Helpful information about connection issues
- **Transaction Errors**: Specific details about swap failures

## Security Features

- **Input Validation**: Client and server-side amount validation
- **API Key Protection**: Secure storage of Jupiter API key
- **Transaction Verification**: Proper transaction signing and execution
- **Error Handling**: Graceful error handling without exposing sensitive data

## Customization

You can customize various aspects of the integration:

- **Button Colors**: Modify the `className` values in the component
- **Dialog Height**: Adjust the height classes for different content sizes
- **Slippage Options**: Change the available slippage percentages
- **Quick Amounts**: Modify the pre-set SOL amounts
- **Minimum Buy**: Adjust the minimum purchase amount

## Support

For issues related to:
- **Jupiter API**: Contact Jupiter support
- **Application**: Check the console for error logs
- **Wallet**: Refer to your wallet's documentation

## Notes

- The integration uses Jupiter's Ultra API for optimal swap routes
- Referral fees are automatically applied to support the project
- All transactions are executed on Solana mainnet
- Prices are fetched in real-time from Jupiter's price API
