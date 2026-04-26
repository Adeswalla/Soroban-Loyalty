import { Pool } from "pg";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { initDb } from "../db";

// Test database configuration
const TEST_DB_NAME = "soroban_loyalty_test";
const TEST_DB_URL = `postgresql://postgres:password@localhost:5432/${TEST_DB_NAME}`;

declare global {
  var testDbPool: Pool;
}

// Setup test database before all tests
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = "test";

  // Create test database if it doesn't exist
  try {
    const adminPool = new Pool({
      connectionString: "postgresql://postgres:password@localhost:5432/postgres",
    });

    await adminPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    await adminPool.end();
  } catch (err) {
    // Database might already exist, that's fine
  }

  // Create test pool
  global.testDbPool = new Pool({
    connectionString: TEST_DB_URL,
  });

  // Override the main pool with test pool
  process.env.DATABASE_URL = TEST_DB_URL;

  // Initialize database connection
  await initDb();

  // Run schema
  const schemaPath = path.join(__dirname, "../../../database/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await global.testDbPool.query(schema);

  // Seed with test data
  await seedTestData();
});

// Clean up after each test
afterEach(async () => {
  // Clear all tables
  await global.testDbPool.query(`
    TRUNCATE TABLE transactions, rewards, campaigns, users RESTART IDENTITY CASCADE;
  `);
});

// Clean up after all tests
afterAll(async () => {
  await global.testDbPool.end();

  // Optionally drop test database
  try {
    const adminPool = new Pool({
      connectionString: "postgresql://postgres:password@localhost:5432/postgres",
    });
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    await adminPool.end();
  } catch (err) {
    // Ignore errors
  }
});

async function seedTestData() {
  // Insert test campaigns
  await global.testDbPool.query(`
    INSERT INTO campaigns (id, merchant, reward_amount, expiration, active, total_claimed, display_order) VALUES
    (1, 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ', 100, 1735689600, true, 5, 1),
    (2, 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ', 200, 1735689600, true, 3, 2),
    (3, 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ', 50, 1635689600, false, 1, 3);
  `);

  // Insert test users
  await global.testDbPool.query(`
    INSERT INTO users (address) VALUES
    ('GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6'),
    ('GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG7');
  `);

  // Insert test rewards
  await global.testDbPool.query(`
    INSERT INTO rewards (id, user_address, campaign_id, amount, redeemed, redeemed_amount) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6', 1, 100, false, 0),
    ('550e8400-e29b-41d4-a716-446655440001', 'GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6', 2, 200, true, 150),
    ('550e8400-e29b-41d4-a716-446655440002', 'GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG7', 1, 100, false, 0);
  `);
}