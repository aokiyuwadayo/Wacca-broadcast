import { describe, it, expect } from "vitest";
import { buildUserText } from "./prompts";

describe("buildUserText", () => {
  it("rawText だけ → メモから組み立てるモード", () => {
    const out = buildUserText({ kind: "activity", rawText: "来週木曜 16:30 R教室" });
    expect(out).toContain("# ふんわりメモ");
    expect(out).toContain("来週木曜 16:30 R教室");
    expect(out).toContain("activity");
  });

  it("json あり・instruction なし → JSONから生成するモード", () => {
    const out = buildUserText({ kind: "event", json: { title: "x" } });
    expect(out).toContain("確定済みの中間JSON");
    expect(out).toContain("event");
  });

  it("json ＋ instruction → 修正モード", () => {
    const out = buildUserText({
      kind: "activity",
      json: { title: "x" },
      instruction: "もっと短く",
    });
    expect(out).toContain("修正指示");
    expect(out).toContain("もっと短く");
  });

  it("today を渡すと基準日が含まれる", () => {
    const out = buildUserText({ kind: "activity", rawText: "x", today: "2026-05-30" });
    expect(out).toContain("2026-05-30");
  });

  it("不正な kind は activity 扱い", () => {
    const out = buildUserText({ kind: "weird", rawText: "x" });
    expect(out).toContain("activity");
    expect(out).not.toContain("weird");
  });
});
