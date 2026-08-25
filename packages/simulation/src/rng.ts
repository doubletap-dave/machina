export function createRng(seed: number) {
  return rngFromState(seed >>> 0);
}

function rngFromState(t: number) {
  return {
    next() {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    },
    clone() {
      return rngFromState(t);
    },
  };
}
