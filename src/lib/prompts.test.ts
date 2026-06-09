import { describe, it, expect } from "vitest";
import { SYSTEM, buildUserText } from "./prompts";

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

  it("配信先を一部だけ指定 → 不要PFは空文字でよい指示が入る", () => {
    const out = buildUserText({ kind: "activity", rawText: "x", platforms: ["line", "discord"] });
    expect(out).toContain("生成する配信先");
    expect(out).toContain("teams"); // オフのPFが明示される
    expect(out).toContain("空文字");
  });

  it("全PF指定 or 省略 → 配信先の絞り込み指示は入らない", () => {
    const all = buildUserText({ kind: "activity", rawText: "x", platforms: ["line", "teams", "discord"] });
    const none = buildUserText({ kind: "activity", rawText: "x" });
    expect(all).not.toContain("生成する配信先");
    expect(none).not.toContain("生成する配信先");
  });
});

describe("SYSTEM", () => {
  it("相対日付は今日の日付を基準に具体化し、解釈を assumptions に残すよう指示する", () => {
    expect(SYSTEM).toContain("与えられた『今日の日付』を基準に具体的な日付へ必ず解決する");
    expect(SYSTEM).toContain("assumptions");
    expect(SYSTEM).toContain("(日付) 来週木曜");
    expect(SYSTEM).toContain("基準日が無く解決できない曖昧表現");
  });

  it("LINE 文面は出力前に文字数を自己点検するよう指示する", () => {
    expect(SYSTEM).toContain("出力前に文字数を自己点検する");
    expect(SYSTEM).toContain("500字を超えたら");
    expect(SYSTEM).toContain("200字を下回る");
    expect(SYSTEM).toContain("改行・絵文字も字数に含めて数える");
  });
});
