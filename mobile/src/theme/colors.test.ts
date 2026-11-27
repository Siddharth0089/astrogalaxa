import { describe, expect, it } from "vitest";
import { C, disclaimer } from "./colors";

describe("Theme Colors and Constants", () => {
  it("defines standard brand colors", () => {
    expect(C.bg).toBe("#000");
    expect(C.gold).toBe("#E8B64C");
    expect(C.text).toBe("#F5F5F7");
    expect(C.onGold).toBe("#111");
  });

  it("defines the legal guidance disclaimer", () => {
    expect(disclaimer).toContain("For guidance and entertainment");
    expect(disclaimer).toContain("Not a substitute for professional medical");
  });
});
