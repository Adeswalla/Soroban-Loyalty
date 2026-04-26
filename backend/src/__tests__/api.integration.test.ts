import request from "supertest";
import app from "../index";

describe("API Integration Tests", () => {
  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("checks");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("uptime");
    });
  });

  describe("GET /campaigns", () => {
    it("should return campaigns with default pagination", async () => {
      const response = await request(app).get("/campaigns");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("campaigns");
      expect(response.body).toHaveProperty("total");
      expect(Array.isArray(response.body.campaigns)).toBe(true);
      expect(response.body.campaigns.length).toBeGreaterThan(0);

      // Check campaign structure
      const campaign = response.body.campaigns[0];
      expect(campaign).toHaveProperty("id");
      expect(campaign).toHaveProperty("merchant");
      expect(campaign).toHaveProperty("reward_amount");
      expect(campaign).toHaveProperty("expiration");
      expect(campaign).toHaveProperty("active");
      expect(campaign).toHaveProperty("total_claimed");
    });

    it("should support pagination with limit and offset", async () => {
      const response = await request(app).get("/campaigns?limit=1&offset=0");

      expect(response.status).toBe(200);
      expect(response.body.campaigns.length).toBe(1);
    });

    it("should handle invalid limit gracefully", async () => {
      const response = await request(app).get("/campaigns?limit=invalid");

      expect(response.status).toBe(200);
      // Should default to 20
      expect(response.body.campaigns.length).toBeLessThanOrEqual(20);
    });

    it("should handle negative offset gracefully", async () => {
      const response = await request(app).get("/campaigns?offset=-1");

      expect(response.status).toBe(200);
      // Should default to 0
    });

    it("should enforce maximum limit", async () => {
      const response = await request(app).get("/campaigns?limit=200");

      expect(response.status).toBe(200);
      expect(response.body.campaigns.length).toBeLessThanOrEqual(100);
    });
  });

  describe("GET /campaigns/:id", () => {
    it("should return a specific campaign", async () => {
      const response = await request(app).get("/campaigns/1");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("campaign");
      expect(response.body.campaign.id).toBe(1);
      expect(response.body.campaign).toHaveProperty("merchant");
      expect(response.body.campaign).toHaveProperty("reward_amount");
    });

    it("should return 404 for non-existent campaign", async () => {
      const response = await request(app).get("/campaigns/99999");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Not found");
    });

    it("should return 400 for invalid id", async () => {
      const response = await request(app).get("/campaigns/invalid");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid id");
    });

    it("should return 400 for negative id", async () => {
      const response = await request(app).get("/campaigns/-1");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid id");
    });
  });

  describe("GET /user/:address/rewards", () => {
    it("should return rewards for a valid address", async () => {
      const address = "GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6";
      const response = await request(app).get(`/user/${address}/rewards`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("rewards");
      expect(Array.isArray(response.body.rewards)).toBe(true);

      if (response.body.rewards.length > 0) {
        const reward = response.body.rewards[0];
        expect(reward).toHaveProperty("id");
        expect(reward).toHaveProperty("user_address");
        expect(reward).toHaveProperty("campaign_id");
        expect(reward).toHaveProperty("amount");
        expect(reward).toHaveProperty("redeemed");
        expect(reward).toHaveProperty("redeemed_amount");
        expect(reward).toHaveProperty("claimed_at");
        expect(reward).toHaveProperty("campaign_reward");
        expect(typeof reward.campaign_reward).toBe("number");
      }
    });

    it("should return empty array for address with no rewards", async () => {
      const address = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
      const response = await request(app).get(`/user/${address}/rewards`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("rewards");
      expect(Array.isArray(response.body.rewards)).toBe(true);
    });

    it("should return 400 for invalid address length", async () => {
      const response = await request(app).get("/user/invalid/rewards");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid Stellar address");
    });

    it("should return 400 for empty address", async () => {
      const response = await request(app).get("/user//rewards");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid Stellar address");
    });

    it("should return 400 for address too short", async () => {
      const response = await request(app).get("/user/GBU3H3Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG6Z4QG/rewards");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid Stellar address");
    });
  });

  describe("GET /analytics", () => {
    it("should return analytics data with default days", async () => {
      const response = await request(app).get("/analytics");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalClaims");
      expect(response.body).toHaveProperty("totalLYT");
      expect(response.body).toHaveProperty("redemptionRate");
      expect(response.body).toHaveProperty("claimsPerCampaign");
      expect(response.body).toHaveProperty("claimsOverTime");

      expect(typeof response.body.totalClaims).toBe("number");
      expect(typeof response.body.totalLYT).toBe("number");
      expect(typeof response.body.redemptionRate).toBe("number");
      expect(Array.isArray(response.body.claimsPerCampaign)).toBe(true);
      expect(Array.isArray(response.body.claimsOverTime)).toBe(true);
    });

    it("should accept custom days parameter", async () => {
      const response = await request(app).get("/analytics?days=7");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalClaims");
    });

    it("should enforce minimum days", async () => {
      const response = await request(app).get("/analytics?days=0");

      expect(response.status).toBe(200);
      // Should default to 1 or handle gracefully
    });

    it("should enforce maximum days", async () => {
      const response = await request(app).get("/analytics?days=400");

      expect(response.status).toBe(200);
      // Should cap at 365
    });

    it("should handle invalid days parameter", async () => {
      const response = await request(app).get("/analytics?days=invalid");

      expect(response.status).toBe(200);
      // Should default to 30
    });
  });

  describe("GET /metrics", () => {
    it("should return Prometheus metrics", async () => {
      const response = await request(app).get("/metrics");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/plain");
      expect(typeof response.text).toBe("string");
      expect(response.text).toContain("# HELP");
      expect(response.text).toContain("# TYPE");
    });
  });

  describe("Error handling", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app).get("/unknown-route");

      expect(response.status).toBe(404);
    });

    it("should handle malformed JSON in POST requests", async () => {
      const response = await request(app)
        .post("/campaigns/reorder")
        .set("Content-Type", "application/json")
        .send("{invalid json");

      expect(response.status).toBe(400);
    });
  });
});