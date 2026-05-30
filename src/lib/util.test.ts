import { describe, it, expect } from "vitest";
import { splitList } from "./util";

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
