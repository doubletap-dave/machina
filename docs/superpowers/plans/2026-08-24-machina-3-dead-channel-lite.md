# Machina Wave 3 — Dead Channel Lite proof

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. After Wave 2 merge. Writable: `examples/dead-channel-lite/**`, `apps/runtime/tests/dead-channel-lite.test.ts`. Do not add `if (project.name === "dead-channel")` anywhere. If you must edit engine code to make the example compile, that is a **failed V0** — stop and report BLOCKED.

**Goal:** Example project runs 20 turns headlessly with mocked models. Packets never contain true enemy economy.

---

### Task 1: example project on disk

**Files:**
- Create: `examples/dead-channel-lite/machina.json`, `examples/dead-channel-lite/graphs/*.json`

**Interfaces:** none. The folder is a normal Machina project: two Nation presets (Atlantic Federation, Vesper Union), each subgraph two agents (Head of State + Intelligence or Military), personality, memory, perception, relationship, `systems.system` mechanic diplomacy, clock, logger, inspector.

- [ ] **Step 1: After writing files, `loadProject` + `compile` in a test must return a plan, not errors.**

- [ ] **Step 2: Commit** `feat: add Dead Channel Lite example project`

---

### Task 2: 20-turn headless proof

**Files:**
- Create: `apps/runtime/tests/dead-channel-lite.test.ts`

**Interfaces:** use `loadProject`, `compile`, `createKernel` with `think` mock returning `{ type: "signal", params: {} }` or `"wait"`.

- [ ] **Step 1: Test**

```ts
it("runs 20 turns without leaking truth into packets", async () => {
  const project = await loadProject("examples/dead-channel-lite");
  const reg = createRegistry();
  registerCoreKinds(reg);
  const result = compile(project, reg);
  expect("plan" in result).toBe(true);
  const seen: ObservationPacket[] = [];
  const kernel = createKernel({
    seed: 7,
    actorIds: ["atlantic", "vesper"], // use real actor node ids from loaded project
    think: async ({ packet }) => {
      seen.push(packet);
      return { actorId: packet.actorId, type: "wait", params: {} };
    },
  });
  for (let i = 0; i < 20; i++) await kernel.runTurn();
  expect(seen.length).toBeGreaterThan(0);
  const truth = kernel.getTruth();
  for (const packet of seen) {
    for (const obs of packet.observations) {
      // true economies must not appear as a privileged field
      expect(packet).not.toHaveProperty("truth");
      expect(JSON.stringify(packet)).not.toContain("TrueWorldState");
    }
    expect(packet.legalActions.length).toBeGreaterThan(0);
  }
  expect(truth.turn).toBe(20);
});
```

Fix actorIds by reading project nodes (`entities.actor` ids). Grep repo (except this test and docs) for `dead-channel` in `packages/` and `apps/studio` — zero matches required. Test file may load the path `examples/dead-channel-lite`.

- [ ] **Step 2: PASS + commit** `test: prove Dead Channel Lite 20-turn headless run`

---

Wave 3 done when compile works, 20 turns run, no core hacks, no CoT, no truth field on packets.

V0 complete.
