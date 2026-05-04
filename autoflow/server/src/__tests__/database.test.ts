/**
 * ═══════════════════════════════════════════════════════════════
 *  AUTOFLOW — DATABASE FUNCTION TESTS (Category 4)
 *  Tests: Insert task, Update task, Fetch users (real Prisma DB)
 * ═══════════════════════════════════════════════════════════════
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 9999)}`;

let testProjectId: number;
let testUserId:    number;
let testTaskId:    number;

beforeAll(async () => {
  const proj = await prisma.project.create({
    data: { name: `DB Test Project ${uid()}`, ownerName: "DBTester" },
  });
  testProjectId = proj.id;

  const user = await prisma.user.create({
    data: { username: `db_user_${uid()}`, cognitoId: `cog-db-${uid()}` },
  });
  testUserId = user.userId;
});

afterAll(async () => {
  if (testTaskId) {
    await prisma.comment.deleteMany({ where: { taskId: testTaskId } });
    await prisma.attachment.deleteMany({ where: { taskId: testTaskId } });
    await prisma.taskAssignment.deleteMany({ where: { taskId: testTaskId } });
    await prisma.task.deleteMany({ where: { id: testTaskId } });
  }
  if (testUserId) {
    await prisma.notification.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { userId: testUserId } });
  }
  if (testProjectId) {
    await prisma.project.delete({ where: { id: testProjectId } });
  }
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("🗄️ Database Tests — Task CRUD", () => {

  it("DB-01 | Insert task → record found in DB", async () => {
    const task = await prisma.task.create({
      data: {
        title:        "DB Test Insert Task",
        status:       "To Do",
        priority:     "Medium",
        tags:         "db,test",
        projectId:    testProjectId,
        authorUserId: testUserId,
        points:       3,
      },
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe("DB Test Insert Task");
    expect(task.priority).toBe("Medium");

    testTaskId = task.id;
  });

  it("DB-02 | Fetch inserted task by ID", async () => {
    const task = await prisma.task.findUnique({ where: { id: testTaskId } });
    expect(task).not.toBeNull();
    expect(task!.title).toBe("DB Test Insert Task");
  });

  it("DB-03 | Update task status → persisted correctly", async () => {
    const updated = await prisma.task.update({
      where: { id: testTaskId },
      data:  { status: "Work In Progress" },
    });
    expect(updated.status).toBe("Work In Progress");

    // Confirm persistence
    const fetched = await prisma.task.findUnique({ where: { id: testTaskId } });
    expect(fetched!.status).toBe("Work In Progress");
  });

  it("DB-04 | Update task priority", async () => {
    const updated = await prisma.task.update({
      where: { id: testTaskId },
      data:  { priority: "Urgent" },
    });
    expect(updated.priority).toBe("Urgent");
  });

  it("DB-05 | Assign user to task → assignedUserId persisted", async () => {
    const updated = await prisma.task.update({
      where: { id: testTaskId },
      data:  { assignedUserId: testUserId },
    });
    expect(updated.assignedUserId).toBe(testUserId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("🗄️ Database Tests — User Queries", () => {

  it("DB-06 | Fetch all users → returns array", async () => {
    const users = await prisma.user.findMany();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  it("DB-07 | Fetch specific user by userId", async () => {
    const user = await prisma.user.findUnique({ where: { userId: testUserId } });
    expect(user).not.toBeNull();
    expect(user!.userId).toBe(testUserId);
  });

  it("DB-08 | Update user skills → persisted", async () => {
    const updated = await prisma.user.update({
      where: { userId: testUserId },
      data:  { skills: "typescript,python,ml" },
    });
    expect(updated.skills).toBe("typescript,python,ml");
  });

  it("DB-09 | Non-existent user returns null", async () => {
    const user = await prisma.user.findUnique({ where: { userId: 999999 } });
    expect(user).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("🗄️ Database Tests — Project Queries", () => {

  it("DB-10 | Fetch project by ID", async () => {
    const proj = await prisma.project.findUnique({ where: { id: testProjectId } });
    expect(proj).not.toBeNull();
    expect(proj!.id).toBe(testProjectId);
  });

  it("DB-11 | Fetch all projects → array", async () => {
    const projects = await prisma.project.findMany();
    expect(Array.isArray(projects)).toBe(true);
  });
});
