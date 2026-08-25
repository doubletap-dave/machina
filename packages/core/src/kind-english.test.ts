import { describe, expect, it } from "vitest";
import {
  actorNeedsNameCopy,
  goalHasNoStatementCopy,
  kindIdReservedCopy,
  kindNoRuntimeCopy,
  kindPinMismatchCopy,
  kindPinMissingFileCopy,
  kindUnpinnedFileCopy,
} from "./kind-english.ts";

describe("kind-english", () => {
  it("returns frozen no-runtime copy", () => {
    expect(kindNoRuntimeCopy("Radio", "custom.radio")).toBe(
      "Radio (custom.radio) has no simulation yet. Ship a plugin or remove it from the graph.",
    );
  });

  it("returns frozen pin-mismatch copy", () => {
    expect(kindPinMismatchCopy()).toBe(
      "This kind file does not match the pin. Restore the file or accept a new pin.",
    );
  });

  it("returns frozen unpinned-file copy", () => {
    expect(kindUnpinnedFileCopy()).toBe("This folder has a kind file that is not pinned.");
  });

  it("returns frozen pin-missing-file copy", () => {
    expect(kindPinMissingFileCopy()).toBe(
      "This project pins a kind that is missing from the folder.",
    );
  });

  it("returns frozen reserved-id copy", () => {
    expect(kindIdReservedCopy()).toBe("That id is reserved by a built-in kind.");
  });
});

describe("kind config copy", () => {
  it("names a missing actor", () => {
    expect(actorNeedsNameCopy()).toBe("This actor needs a name.");
  });
  it("names a missing goal", () => {
    expect(goalHasNoStatementCopy()).toBe("This goal has no statement.");
  });
});
