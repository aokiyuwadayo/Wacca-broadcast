import { describe, it, expect } from "vitest";
import { splitList, buildJsonFromForm, slideToText, type FormFields } from "./util";

describe("splitList", () => {
  it("読点区切りを配列にする", () => {
    expect(splitList("ノートPC、メモ、ペン")).toEqual(["ノートPC", "メモ", "ペン"]);
  });
  it("カンマ区切りも扱う", () => {
    expect(splitList("a, b ,c")).toEqual(["a", "b", "c"]);
  });
  it("空文字や空要素は除去する", () => {
    expect(splitList("")).toEqual([]);
    expect(splitList("a、、b、 ")).toEqual(["a", "b"]);
  });
});

const baseForm: FormFields = {
  title: "立花祭の出展を決める",
  start: "2026-06-04T16:30",
  location: "E棟3階 R教室",
  summary: "出展内容を決める",
  body: "方向性共有、アイデア出し、決定",
  bring: "ノートPC、メモ",
  hook: "今回次第！",
  note: "19時クローズ",
  fee: "",
  guests: "",
  cta: "",
};

describe("buildJsonFromForm", () => {
  it("区切り欄を配列化し、kind/必須項目を写す", () => {
    const j = buildJsonFromForm("activity", baseForm);
    expect(j.kind).toBe("activity");
    expect(j.title).toBe("立花祭の出展を決める");
    expect(j.datetime).toEqual({ start: "2026-06-04T16:30", end: null });
    expect(j.location).toEqual({ name: "E棟3階 R教室", access: "", online_url: "" });
    expect(j.body).toEqual(["方向性共有", "アイデア出し", "決定"]);
    expect(j.bring).toEqual(["ノートPC", "メモ"]);
  });

  it("空の任意項目は null / 空配列に正規化", () => {
    const j = buildJsonFromForm("event", baseForm);
    expect(j.kind).toBe("event");
    expect(j.fee).toBeNull();
    expect(j.cta).toBeNull();
    expect(j.guests).toEqual([]);
    expect(j.rsvp).toBeNull();
    expect(j.links).toEqual([]);
    expect(j.images).toEqual([]);
  });

  it("fee/guests/cta があれば反映", () => {
    const j = buildJsonFromForm("event", { ...baseForm, fee: "500円", guests: "青木、田中", cta: "拡散歓迎" });
    expect(j.fee).toBe("500円");
    expect(j.guests).toEqual(["青木", "田中"]);
    expect(j.cta).toBe("拡散歓迎");
  });
});

describe("slideToText", () => {
  it("タイトル＋「・」箇条書きに整形", () => {
    expect(slideToText({ title: "今日の流れ", bullets: ["共有", "決定"] })).toBe(
      "今日の流れ\n・共有\n・決定",
    );
  });
  it("bullets が空ならタイトルのみ（末尾に改行）", () => {
    expect(slideToText({ title: "タイトル", bullets: [] })).toBe("タイトル\n");
  });
});
