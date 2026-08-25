import { describe, expect, it } from "vitest";
import {
  kindIdReservedCopy,
  kindNoRuntimeCopy,
  kindPinMismatchCopy,
  kindPinMissingFileCopy,
  kindUnpinnedFileCopy,
  portMismatchCopy,
} from "../src/index.ts";

describe("portMismatchCopy", () => {
  it("returns resource-to-personality sentence", () => {
    expect(portMismatchCopy("RESOURCE", "PERSONALITY")).toBe(
      "A resource can't shape a personality. Attach it to a nation or an economy.",
    );
  });

  it("returns generic sentence for other mismatches", () => {
    expect(portMismatchCopy("MEMORY", "PERSONALITY")).toBe(
      "These ports don't speak the same language.",
    );
  });
});

describe("kind english re-exports", () => {
  it("re-exports frozen kind copy from core", () => {
    expect(kindIdReservedCopy()).toBe("That id is reserved by a built-in kind.");
    expect(kindNoRuntimeCopy("Radio", "custom.radio")).toBe(
      "Radio (custom.radio) has no simulation yet. Ship a plugin or remove it from the graph.",
    );
    expect(kindPinMismatchCopy()).toBe(
      "This kind file does not match the pin. Restore the file or accept a new pin.",
    );
    expect(kindUnpinnedFileCopy()).toBe("This folder has a kind file that is not pinned.");
    expect(kindPinMissingFileCopy()).toBe(
      "This project pins a kind that is missing from the folder.",
    );
  });
});
