import { afterEach, describe, expect, it } from "vitest";
import { loadStudioPrefs, saveStudioPrefs } from "./studio-prefs.ts";

const KEY = "machina.studio.prefs";

afterEach(() => {
  localStorage.removeItem(KEY);
});

describe("loadStudioPrefs", () => {
  it("returns the machina theme when localStorage is garbage", () => {
    localStorage.setItem(KEY, "not-json{{{");
    expect(loadStudioPrefs().theme).toBe("machina");
  });

  it("returns the machina theme when the stored theme id is unknown", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        theme: "not-a-theme",
        uiFont: "ibm-plex-sans",
        monoFont: "iosevka",
      }),
    );
    expect(loadStudioPrefs().theme).toBe("machina");
  });
});

describe("saveStudioPrefs", () => {
  it("round-trips eve, ibm-plex-sans, and iosevka", () => {
    saveStudioPrefs({
      schemaVersion: 1,
      theme: "eve",
      uiFont: "ibm-plex-sans",
      monoFont: "iosevka",
    });
    expect(loadStudioPrefs()).toEqual({
      schemaVersion: 1,
      theme: "eve",
      uiFont: "ibm-plex-sans",
      monoFont: "iosevka",
    });
  });
});
