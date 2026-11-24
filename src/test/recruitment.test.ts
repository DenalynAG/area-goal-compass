import { describe, it, expect } from "vitest";
import { coverageDays } from "@/lib/recruitment";
describe("coverageDays", () => {
  it("cierre menos apertura", () => expect(coverageDays("2026-11-01", "2026-11-24")).toBe(23));
  it("activa cuenta hasta hoy", () => expect(coverageDays("2026-11-01", null, new Date(2026, 10, 11))).toBe(10));
});
