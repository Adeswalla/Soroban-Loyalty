import { pool } from "../db";
import { Campaign } from "./campaign.service";

export interface Reward {
  id: string;
  user_address: string;
  campaign_id: number;
  amount: number;
  redeemed: boolean;
  redeemed_amount: number;
  claimed_at: Date;
  redeemed_at?: Date;
  campaign_reward?: number; // Associated campaign reward amount
}

/**
 * Claims a reward for a user and campaign. Uses SELECT FOR UPDATE within a transaction
 * to prevent race conditions and duplicate claims under concurrent requests.
 * 
 * @param userAddress - The Stellar public key of the user.
 * @param campaignId - The ID of the campaign.
 * @param amount - The reward amount.
 * @returns A promise that resolves when the claim is recorded.
 * @throws Will throw an error with code 'DUPLICATE_CLAIM' if reward already exists.
 */
export async function claimReward(userAddress: string, campaignId: number, amount: number): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check for existing reward with row-level locking
    const existing = await client.query(
      `SELECT id FROM rewards 
       WHERE user_address = $1 AND campaign_id = $2 
       FOR UPDATE`,
      [userAddress, campaignId]
    );
    
    if (existing.rows.length > 0) {
      throw new Error('DUPLICATE_CLAIM');
    }
    
    // Ensure user exists
    await client.query(
      `INSERT INTO users (address) VALUES ($1) ON CONFLICT DO NOTHING`,
      [userAddress]
    );
    
    // Insert the reward
    await client.query(
      `INSERT INTO rewards (user_address, campaign_id, amount, redeemed, redeemed_amount)
       VALUES ($1, $2, $3, false, 0)`,
      [userAddress, campaignId, amount]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieves all rewards associated with a specific user address.
 * Includes associated campaign data in a single JOIN query to avoid N+1 queries.
 * 
 * @param address - The Stellar public key of the user.
 * @returns A promise that resolves to an array of Reward objects with campaign data.
 * @throws Will throw an error if the database query fails.
 */
/**
 * Retrieves all rewards associated with a specific user address.
 * Uses a single JOIN query to fetch rewards with associated campaign data,
 * avoiding N+1 queries that would occur if campaign data was fetched separately.
 * 
 * @param address - The Stellar public key of the user.
 * @returns A promise that resolves to an array of Reward objects with campaign data.
 * @throws Will throw an error if the database query fails.
 */
export async function getRewardsByUser(address: string): Promise<Reward[]> {
  const { rows } = await pool.query<Reward>(
    `SELECT r.*, c.reward_amount as campaign_reward
     FROM rewards r
     JOIN campaigns c ON c.id = r.campaign_id
     WHERE r.user_address = $1
     ORDER BY r.claimed_at DESC`,
    [address]
  );
  return rows;
}

/**
 * Records a blockchain transaction in the local database for auditing and indexing.
 * 
 * @param txHash - The unique hash of the transaction.
 * @param type - The type of transaction (e.g., 'claim', 'redeem', 'create_campaign').
 * @param userAddress - The address of the user involved, if any.
 * @param campaignId - The ID of the related campaign, if any.
 * @param amount - The amount involved in the transaction, if any.
 * @param ledger - The ledger sequence number.
 * @returns A promise that resolves when the record is inserted.
 * @throws Will throw an error if the database query fails.
 */
export async function recordTransaction(
  txHash: string,
  type: string,
  userAddress: string | null,
  campaignId: number | null,
  amount: number | null,
  ledger: number | null
): Promise<void> {
  await pool.query(
    `INSERT INTO transactions (tx_hash, type, user_address, campaign_id, amount, ledger)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (tx_hash) DO NOTHING`,
    [txHash, type, userAddress, campaignId, amount, ledger]
  );
}
