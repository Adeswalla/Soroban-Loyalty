import { getRewardsByUser, claimReward } from "../services/reward.service";

// Mock the pool
jest.mock("../db", () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

// Override Jest setup to avoid database initialization
beforeAll(() => {
  // Skip database setup for unit tests
});

afterAll(() => {
  // Skip database cleanup for unit tests
});

describe("Reward Service - Query Optimization", () => {
  const mockPool = require("../db").pool;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe("getRewardsByUser", () => {
    it("should use a single JOIN query to fetch rewards with campaign data", async () => {
      const mockRows = [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          user_address: "GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6",
          campaign_id: 1,
          amount: 100,
          redeemed: false,
          redeemed_amount: 0,
          claimed_at: new Date("2024-01-01"),
          campaign_reward: 100,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await getRewardsByUser("GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6");

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("JOIN campaigns c ON c.id = r.campaign_id"),
        ["GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6"]
      );

      expect(result).toEqual(mockRows);
      expect(result[0]).toHaveProperty("campaign_reward");
    });

    it("should not make multiple queries (avoids N+1 problem)", async () => {
      const mockRows = [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          user_address: "GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6",
          campaign_id: 1,
          amount: 100,
          redeemed: false,
          redeemed_amount: 0,
          claimed_at: new Date("2024-01-01"),
          campaign_reward: 100,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          user_address: "GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6",
          campaign_id: 2,
          amount: 200,
          redeemed: true,
          redeemed_amount: 150,
          claimed_at: new Date("2024-01-02"),
          campaign_reward: 200,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await getRewardsByUser("GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6");

      // Should make exactly one query, regardless of number of rewards
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result.every(r => r.campaign_reward !== undefined)).toBe(true);
    });

    it("should order results by claimed_at descending", async () => {
      const mockRows = [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          user_address: "GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6",
          campaign_id: 2,
          amount: 200,
          redeemed: true,
          redeemed_amount: 150,
          claimed_at: new Date("2024-01-02"),
          campaign_reward: 200,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          user_address: "GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6",
          campaign_id: 1,
          amount: 100,
          redeemed: false,
          redeemed_amount: 0,
          claimed_at: new Date("2024-01-01"),
          campaign_reward: 100,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await getRewardsByUser("GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY r.claimed_at DESC"),
        expect.any(Array)
      );
    });
  });

  describe("claimReward - Concurrency Protection", () => {
    it("should successfully claim a reward when no existing claim exists", async () => {
      // Mock all queries in order
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce(undefined) // INSERT INTO users
        .mockResolvedValueOnce(undefined) // INSERT INTO rewards
        .mockResolvedValueOnce(undefined); // COMMIT

      await expect(claimReward("GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6", 1, 100))
        .resolves.toBeUndefined();

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        `SELECT id FROM rewards 
       WHERE user_address = $1 AND campaign_id = $2 
       FOR UPDATE`,
        ["GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6", 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should throw DUPLICATE_CLAIM error when reward already exists", async () => {
      // Mock SELECT FOR UPDATE returns existing row
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: "existing-id" }] }); // SELECT FOR UPDATE

      await expect(claimReward("GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6", 1, 100))
        .rejects.toThrow('DUPLICATE_CLAIM');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        `SELECT id FROM rewards 
       WHERE user_address = $1 AND campaign_id = $2 
       FOR UPDATE`,
        ["GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6", 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should handle transaction rollback on database errors", async () => {
      const dbError = new Error('Database connection failed');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE
        .mockRejectedValueOnce(dbError); // INSERT INTO users fails

      await expect(claimReward("GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6", 1, 100))
        .rejects.toThrow('Database connection failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should handle concurrent claims with only one succeeding", async () => {
      const userAddress = "GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6";
      const campaignId = 1;
      const amount = 100;

      // Create 10 mock clients
      const mockClients = Array.from({ length: 10 }, () => ({
        query: jest.fn(),
        release: jest.fn(),
      }));

      // Set up mocks - first client succeeds, others find existing record
      mockClients[0].query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE - no existing
        .mockResolvedValueOnce(undefined) // INSERT INTO users
        .mockResolvedValueOnce(undefined) // INSERT INTO rewards
        .mockResolvedValueOnce(undefined); // COMMIT

      for (let i = 1; i < mockClients.length; i++) {
        mockClients[i].query
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: "existing-id" }] }); // SELECT FOR UPDATE - existing found
      }

      // Mock pool.connect to return different clients
      let clientIndex = 0;
      mockPool.connect.mockImplementation(() => {
        return Promise.resolve(mockClients[clientIndex++]);
      });

      // Fire 10 concurrent claims
      const claimPromises = Array.from({ length: 10 }, () =>
        claimReward(userAddress, campaignId, amount)
      );

      const results = await Promise.allSettled(claimPromises);

      // Exactly one should succeed
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(9);

      // Check that rejected promises threw DUPLICATE_CLAIM
      rejected.forEach(result => {
        expect(result.status).toBe('rejected');
        expect((result as PromiseRejectedResult).reason.message).toBe('DUPLICATE_CLAIM');
      });

      // Verify transactions were properly handled
      mockClients.forEach(client => {
        expect(client.query).toHaveBeenCalledWith('BEGIN');
        expect(client.release).toHaveBeenCalled();
      });

      // First client should have committed
      expect(mockClients[0].query).toHaveBeenCalledWith('COMMIT');
      
      // Other clients should have rolled back
      for (let i = 1; i < mockClients.length; i++) {
        expect(mockClients[i].query).toHaveBeenCalledWith('ROLLBACK');
      }
    });
  });
});