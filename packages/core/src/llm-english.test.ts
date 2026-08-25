import { describe, expect, it } from "vitest";
import {
  agentLlmIncompleteCopy,
  credentialsUnreadableCopy,
  describeNoLlmCopy,
  illegalModelActionCopy,
  keyRefusedCopy,
  noDefaultModelCopy,
  providerUnreachableCopy,
} from "./llm-english.ts";

describe("llm-english", () => {
  it("returns frozen key-refused copy", () => {
    expect(keyRefusedCopy()).toBe("This key was refused.");
  });

  it("returns frozen provider-unreachable copy", () => {
    expect(providerUnreachableCopy("anthropic")).toBe(
      "Couldn't reach anthropic. Try again.",
    );
  });

  it("returns frozen illegal-model-action copy", () => {
    expect(illegalModelActionCopy()).toBe(
      "The model did not return a legal action.",
    );
  });

  it("returns frozen incomplete agent LLM copy", () => {
    expect(agentLlmIncompleteCopy()).toBe(
      "This agent needs both a provider and a model, or neither to use the default.",
    );
  });

  it("returns frozen credentials-unreadable copy", () => {
    expect(credentialsUnreadableCopy()).toBe(
      "Machina couldn't read the credentials file. Fix or remove ~/.machina/credentials.json.",
    );
  });

  it("returns frozen no-default-model copy", () => {
    expect(noDefaultModelCopy()).toBe("No default model. Save a key and pick one.");
  });

  it("returns frozen describe missing-model copy", () => {
    expect(describeNoLlmCopy()).toBe(
      "No language model is configured. Build by hand or set an API key.",
    );
  });
});
