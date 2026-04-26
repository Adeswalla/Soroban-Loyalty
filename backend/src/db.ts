import { Pool, PoolClient } from "pg";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import dotenv from "dotenv";
import { logger } from "./logger";

dotenv.config();

// ── Secret shape stored in AWS Secrets Manager ────────────────────────────────
interface DbSecret {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

// Use test database in test environment
const isTest = process.env.NODE_ENV === "test";
export let pool: Pool;

if (isTest && global.testDbPool) {
  pool = global.testDbPool;
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

pool.on("error", (err) => {
  logger.critical("DB connection error", err);
});

function isAuthError(err: any): boolean {
  // PostgreSQL error codes for authentication / password failures
  return ["28P01", "28000"].includes(err?.code);
}

// ── Initialise pool from Secrets Manager on startup ──────────────────────────
export async function initDb(): Promise<void> {
  if (isTest) return; // Skip in test environment
  await rotatePool();
}

async function rotatePool(): Promise<void> {
  // TODO: Implement pool rotation from Secrets Manager
}
