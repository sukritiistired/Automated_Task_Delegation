/**
 * ═══════════════════════════════════════════════════════════════
 *  AUTOFLOW — UTILITY FUNCTION TESTS (Category 5)
 *  Tests: Jaccard similarity, Availability calculation,
 *         Priority weight lookup, Feature extraction
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Pure utility functions (mirrors taskController.ts logic) ─────────────────

const PRIO_W: Record<string, number> = {
  Urgent: 1.0, High: 0.75, Medium: 0.5, Low: 0.25, Backlog: 0.1,
};

/** Jaccard similarity between two string arrays */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Availability = 1 − (openTasks * 4 hrs / maxHours), clamped to [0,1] */
function calculateAvailability(openTasks: number, maxHours = 40): number {
  const usedHours = openTasks * 4;
  return Math.max(0, Math.min(1, 1 - usedHours / maxHours));
}

/** Skill match fraction between user skills and task tags */
function skillMatch(userSkillsCsv: string, taskTagsCsv: string): number {
  const userSkills = userSkillsCsv.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const taskTags   = taskTagsCsv.toLowerCase().split(",").map(t => t.trim()).filter(Boolean);
  if (userSkills.length === 0 || taskTags.length === 0) return 0.5; // neutral default
  const matched = taskTags.filter(t => userSkills.includes(t)).length;
  return matched / Math.max(taskTags.length, userSkills.length);
}

/** Feature vector for ML input */
function extractFeatures(
  userSkillsCsv: string,
  taskTagsCsv: string,
  openTasks: number,
  maxHours: number,
  priority: string
): [number, number, number] {
  const skill  = skillMatch(userSkillsCsv, taskTagsCsv);
  const avail  = calculateAvailability(openTasks, maxHours);
  const prio   = PRIO_W[priority] ?? 0.5;
  return [skill, avail, prio];
}

// ─────────────────────────────────────────────────────────────────────────────
describe("🔧 Utility Tests — Jaccard Similarity", () => {

  it("identical sets → similarity = 1.0", () => {
    expect(jaccardSimilarity(["a", "b", "c"], ["a", "b", "c"])).toBe(1);
  });

  it("disjoint sets → similarity = 0.0", () => {
    expect(jaccardSimilarity(["a", "b"], ["c", "d"])).toBe(0);
  });

  it("50% overlap → similarity = 0.333…", () => {
    // intersection {b}, union {a,b,c} → 1/3
    expect(jaccardSimilarity(["a", "b"], ["b", "c"])).toBeCloseTo(1 / 3, 5);
  });

  it("both empty → similarity = 1.0 (convention)", () => {
    expect(jaccardSimilarity([], [])).toBe(1);
  });

  it("one empty → similarity = 0.0", () => {
    expect(jaccardSimilarity(["react"], [])).toBe(0);
  });

  it("single common element → similarity = 0.5", () => {
    // intersection {typescript}, union {typescript, python} → 1/2
    expect(jaccardSimilarity(["typescript"], ["typescript", "python"])).toBeCloseTo(0.5, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("🔧 Utility Tests — Availability Calculation", () => {

  it("0 open tasks → availability = 1.0 (fully free)", () => {
    expect(calculateAvailability(0, 40)).toBe(1);
  });

  it("10 open tasks @ 40 h cap → availability = 0.0 (fully loaded)", () => {
    // 10 * 4 = 40 h → 1 - 40/40 = 0
    expect(calculateAvailability(10, 40)).toBe(0);
  });

  it("5 open tasks @ 40 h cap → availability = 0.5", () => {
    expect(calculateAvailability(5, 40)).toBeCloseTo(0.5, 5);
  });

  it("availability is clamped to [0, 1] even for excessive tasks", () => {
    expect(calculateAvailability(100, 40)).toBe(0);
  });

  it("custom maxHours = 80 with 5 tasks → availability = 0.75", () => {
    // 5 * 4 = 20, 1 - 20/80 = 0.75
    expect(calculateAvailability(5, 80)).toBeCloseTo(0.75, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("🔧 Utility Tests — Skill Match", () => {

  it("All task tags found in user skills → match ≈ 0.667 (2 matched / max(3,2))", () => {
    // userSkills has 3 items, taskTags has 2; both match → 2/3
    expect(skillMatch("typescript,python,react", "typescript,react")).toBeCloseTo(2 / 3, 5);
  });

  it("No overlap → match = 0.0", () => {
    expect(skillMatch("java,c++", "python,react")).toBe(0);
  });

  it("Empty skills → neutral 0.5", () => {
    expect(skillMatch("", "react,python")).toBe(0.5);
  });

  it("Empty tags → neutral 0.5", () => {
    expect(skillMatch("typescript", "")).toBe(0.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("🔧 Utility Tests — Priority Weights", () => {

  it("Urgent priority → weight 1.0", () => {
    expect(PRIO_W["Urgent"]).toBe(1.0);
  });

  it("Backlog priority → weight 0.1 (lowest)", () => {
    expect(PRIO_W["Backlog"]).toBe(0.1);
  });

  it("Priorities are ordered: Urgent > High > Medium > Low > Backlog", () => {
    expect(PRIO_W["Urgent"]).toBeGreaterThan(PRIO_W["High"]);
    expect(PRIO_W["High"]).toBeGreaterThan(PRIO_W["Medium"]);
    expect(PRIO_W["Medium"]).toBeGreaterThan(PRIO_W["Low"]);
    expect(PRIO_W["Low"]).toBeGreaterThan(PRIO_W["Backlog"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("🔧 Utility Tests — Feature Extraction", () => {

  it("Returns array of 3 numbers in [0, 1]", () => {
    const f = extractFeatures("typescript,react", "react,testing", 2, 40, "High");
    expect(f).toHaveLength(3);
    f.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it("High workload user → low availability feature", () => {
    const [, avail] = extractFeatures("typescript", "typescript", 9, 40, "Medium");
    expect(avail).toBeLessThan(0.2); // nearly fully loaded
  });

  it("Perfect skill match → skill feature = 1.0", () => {
    const [skill] = extractFeatures("react,typescript", "react,typescript", 0, 40, "Low");
    expect(skill).toBeCloseTo(1.0, 5);
  });

  it("Urgent priority → priority feature = 1.0", () => {
    const [,, prio] = extractFeatures("x", "x", 0, 40, "Urgent");
    expect(prio).toBe(1.0);
  });
});
