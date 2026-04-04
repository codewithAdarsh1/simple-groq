import { describe, it, expect } from "vitest";
import { AIClient } from "./client";

describe("AIClient", () => {
  it("should initialize with default provider (groq)", () => {
    const client = new AIClient({ apiKey: "test-key" });
    expect(client).toBeDefined();
  });

  it("should initialize with specific provider", () => {
    const client = new AIClient({ provider: "openai", apiKey: "test-key" });
    expect(client).toBeDefined();
  });

  describe("Utility Functions (Internal)", () => {
    it("should handle cost tracking", () => {
      const client = new AIClient({
        provider: "groq",
        apiKey: "test-key",
        costTracker: true,
      });

      expect(client.cost).not.toBeNull();
      client.cost?.record(
        "llama-3.3-70b-versatile",
        "Hello world",
        "Hi there!"
      );

      const summary = client.cost?.summary;
      expect(summary?.requests).toBe(1);
      expect(summary?.totalUSD).toContain("$");
    });
  });

  describe("Error Handling", () => {
    it("should throw error for unknown provider", () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new AIClient({ provider: "unknown" as any, apiKey: "test" });
      }).toThrow();
    });
  });
});
