This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Secure Token Burning Flow

This project implements a secure token burning mechanism that ensures database updates only occur after successful Solana blockchain transactions:

### Security Features

1. **Transaction Verification**: All token burn requests must include a signed Solana transaction
2. **Blockchain Confirmation**: The API waits for transaction confirmation on Solana before updating the database
3. **Signature Validation**: Verifies that the transaction was signed by the correct wallet
4. **Rate Limiting**: Basic rate limiting to prevent abuse
5. **Input Validation**: Comprehensive validation of wallet addresses and token amounts

### Flow Overview

1. Frontend creates and signs a burn transaction
2. Signed transaction is sent to the backend API
3. Backend verifies the transaction structure and signature
4. Transaction is submitted to Solana blockchain
5. API waits for blockchain confirmation
6. Only after confirmation, database is updated with new pixel balance
7. Transaction signature is recorded for audit purposes

### API Endpoint

- **POST** `/api/burn-tokens`
- **Body**: `{ wallet_address, token_amount, signed_transaction }`
- **Response**: `{ success, data: { transaction_signature, pixels_received, new_balance } }`

### Database Tables

- `pixey_users`: User accounts with pixel balances
- `pixey_burn_transactions`: Record of all burn transactions with signatures
- `pixey_leaderboard`: Materialized view of top players

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
