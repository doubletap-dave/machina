import { describe, expect, it } from "vitest";
import { filterModels } from "./filter-models.ts";

const models = [
  { id: "claude-sonnet-4-5", name: "Claude Sonnet" },
  { id: "gpt-4o", name: "GPT-4o" },
];

describe("filterModels", () => {
  it("matches sonnet against id claude-sonnet-4-5 and name Claude Sonnet, case-insensitive", () => {
    expect(filterModels(models, "sonnet").map((model) => model.id)).toEqual([
      "claude-sonnet-4-5",
    ]);
    expect(filterModels(models, "SONNET").map((model) => model.id)).toEqual([
      "claude-sonnet-4-5",
    ]);
    expect(filterModels(models, "Claude Sonnet").map((model) => model.id)).toEqual([
      "claude-sonnet-4-5",
    ]);
  });

  it("returns all models when the query is empty", () => {
    expect(filterModels(models, "  ")).toEqual(models);
  });
});
