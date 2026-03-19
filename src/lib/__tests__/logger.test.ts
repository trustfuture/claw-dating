import { logger } from "../logger";

describe("logger", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv });
  });

  it("logs info messages", () => {
    logger.info("test message");
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("logs warn messages", () => {
    logger.warn("test warning");
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("logs error messages", () => {
    logger.error("test error");
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("includes context in log output", () => {
    logger.info("test message", { route: "/api/test", userId: "user123" });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as jest.Mock).mock.calls[0][0];
    expect(output).toContain("test message");
    expect(output).toContain("/api/test");
  });

  it("outputs structured JSON in production", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production" });
    logger.error("prod error", { route: "/api/events" });
    expect(console.error).toHaveBeenCalledTimes(1);
    const output = (console.error as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("prod error");
    expect(parsed.route).toBe("/api/events");
    expect(parsed.timestamp).toBeDefined();
  });

  it("outputs readable format in development", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development" });
    logger.warn("dev warning", { route: "/api/agents" });
    expect(console.warn).toHaveBeenCalledTimes(1);
    const output = (console.warn as jest.Mock).mock.calls[0][0];
    expect(output).toContain("[WARN]");
    expect(output).toContain("dev warning");
    expect(output).toContain("route=/api/agents");
  });

  it("handles context with non-string values", () => {
    logger.info("test", { route: "/api/test", count: 42, nested: { a: 1 } });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as jest.Mock).mock.calls[0][0];
    expect(output).toContain("42");
  });

  it("works without context", () => {
    logger.info("bare message");
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("includes timestamp in production JSON output", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production" });
    logger.info("timestamped");
    const output = (console.log as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
