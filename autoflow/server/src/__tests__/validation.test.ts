/**
 * ═══════════════════════════════════════════════════════════════
 *  AUTOFLOW — VALIDATION FUNCTION TESTS (Category 3)
 * ═══════════════════════════════════════════════════════════════
 */

const VALID_PRIORITIES = ["Urgent", "High", "Medium", "Low", "Backlog"];
const VALID_STATUSES   = ["To Do", "Work In Progress", "Under Review", "Completed"];

interface TaskInput {
  title?: string;
  status?: string;
  priority?: string;
  projectId?: number;
  points?: number;
}

interface UserInput {
  username?: string;
  cognitoId?: string;
  availabilityHours?: number;
}

interface VResult { valid: boolean; errors: string[]; }

function validateTask(input: TaskInput): VResult {
  const errors: string[] = [];
  if (!input.title || input.title.trim() === "")
    errors.push("Title is required and cannot be empty.");
  if (input.title && input.title.trim().length < 3)
    errors.push("Title must be at least 3 characters.");
  if (input.priority && !VALID_PRIORITIES.includes(input.priority))
    errors.push(`Invalid priority "${input.priority}".`);
  if (input.status && !VALID_STATUSES.includes(input.status))
    errors.push(`Invalid status "${input.status}".`);
  if (input.projectId !== undefined && (!Number.isInteger(input.projectId) || input.projectId <= 0))
    errors.push("projectId must be a positive integer.");
  if (input.points !== undefined && (input.points < 0 || input.points > 100))
    errors.push("Points must be between 0 and 100.");
  return { valid: errors.length === 0, errors };
}

function validateUser(input: UserInput): VResult {
  const errors: string[] = [];
  if (!input.username || input.username.trim() === "") errors.push("Username is required.");
  if (!input.cognitoId || input.cognitoId.trim() === "") errors.push("CognitoId is required.");
  if (input.availabilityHours !== undefined && (input.availabilityHours < 0 || input.availabilityHours > 168))
    errors.push("availabilityHours must be 0–168.");
  return { valid: errors.length === 0, errors };
}

describe("✅ Validation Tests — Task Input", () => {
  // UT-06
  it("UT-06 | Empty title → error", () => {
    const r = validateTask({ title: "" });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.toLowerCase().includes("title"))).toBe(true);
  });

  it("UT-06b | Whitespace-only title → error", () => {
    expect(validateTask({ title: "   " }).valid).toBe(false);
  });

  it("UT-06c | Title < 3 chars → error", () => {
    const r = validateTask({ title: "AB" });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes("3 characters"))).toBe(true);
  });

  // UT-07
  it("UT-07 | Invalid priority → error", () => {
    const r = validateTask({ title: "Good Title", priority: "EXTREME" });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.toLowerCase().includes("priority"))).toBe(true);
  });

  it("UT-07b | Invalid status → error", () => {
    const r = validateTask({ title: "Good Title", status: "Flying" });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.toLowerCase().includes("status"))).toBe(true);
  });

  it("Negative projectId → error", () => {
    expect(validateTask({ title: "Good Title", projectId: -5 }).valid).toBe(false);
  });

  it("Points > 100 → error", () => {
    expect(validateTask({ title: "Good Title", points: 150 }).valid).toBe(false);
  });

  it("Valid task input → passes", () => {
    const r = validateTask({ title: "My Valid Task", priority: "High", status: "To Do", projectId: 1, points: 5 });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("All valid priorities → pass", () => {
    for (const p of VALID_PRIORITIES)
      expect(validateTask({ title: "Test", priority: p }).valid).toBe(true);
  });
});

describe("✅ Validation Tests — User Input", () => {
  it("Missing username → error", () => {
    expect(validateUser({ cognitoId: "cog" }).valid).toBe(false);
  });

  it("Missing cognitoId → error", () => {
    expect(validateUser({ username: "john" }).valid).toBe(false);
  });

  it("availabilityHours > 168 → error", () => {
    expect(validateUser({ username: "john", cognitoId: "c", availabilityHours: 200 }).valid).toBe(false);
  });

  it("Valid user → passes", () => {
    expect(validateUser({ username: "john", cognitoId: "cog-x", availabilityHours: 40 }).valid).toBe(true);
  });
});
