import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createBurnInstruction 
} from '@solana/spl-token';
import { getMint } from '@solana/spl-token';
import { VIBEY_TOKEN_MINT_ADDRESS, SOLANA_RPC_ENDPOINT } from '@/constants';

export interface BurnTokensPayload {
  walletSignTransaction: (transaction: Transaction) => Promise<Transaction>;
  ownerPubkey: string;
  amount: number;
}

export async function burnVIBEYTokens(payload: BurnTokensPayload) {
  try {
    const { walletSignTransaction, ownerPubkey, amount } = payload;

    if (!walletSignTransaction) {
      throw new Error('No wallet connected');
    }

    const connection = new Connection(SOLANA_RPC_ENDPOINT);
    const ownerKey = new PublicKey(ownerPubkey);
    const mintKey = new PublicKey(VIBEY_TOKEN_MINT_ADDRESS);
    
    // Get the owner's Associated Token Address
    const ownerAta = await getAssociatedTokenAddress(mintKey, ownerKey);
    
    // Check if the token account exists
    const ataInfo = await connection.getAccountInfo(ownerAta);
    
    const transaction = new Transaction();
    
    // Create owner's ATA if it doesn't exist
    if (!ataInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          ownerKey,  // payer
          ownerAta,  // ATA address
          ownerKey,  // owner
          mintKey    // mint
        )
      );
    }
    
    // Get token decimals and adjust amount
    const mintInfo = await getMint(connection, mintKey);
    const adjustedAmount = Math.floor(amount * Math.pow(10, mintInfo.decimals));
    
    // Add burn instruction
    if (adjustedAmount > 0) {
      transaction.add(
        createBurnInstruction(
          ownerAta,       // token account to burn from
          mintKey,        // mint address
          ownerKey,       // owner of the token account
          adjustedAmount  // amount to burn (adjusted for decimals)
        )
      );
    }
    
    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = ownerKey;
    
    // Sign transaction
    const signedTransaction = await walletSignTransaction(transaction);
    
    // Send transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
      preflightCommitment: 'processed'
    });
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');
    
    // Check if transaction was confirmed successfully
    if (confirmation.value.err) {
      throw new Error('Transaction failed on Solana');
    }
    
    return { signature };
  } catch (error) {
    throw error;
  }
}
