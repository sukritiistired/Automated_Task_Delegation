/**
 * ═══════════════════════════════════════════════════════════════
 *  AUTOFLOW — FULL CONTROLLER INTEGRATION TESTS
 *  Covers: taskController, projectController, userController,
 *          notificationController, teamController, searchController
 * ═══════════════════════════════════════════════════════════════
 */

import request from "supertest";
import app from "../app";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 99999)}`;

// ─── Shared state ─────────────────────────────────────────────────────────────
let projectId:      number;
let userId:         number;
let taskId:         number;
let teamId:         number;
let notifId:        number;
let user2Id:        number;

// ─── Setup: create baseline project + user ────────────────────────────────────
beforeAll(async () => {
  const team = await prisma.team.create({ data: { teamName: `Test Team ${uid()}` } });
  teamId = team.id;

  const proj = await prisma.project.create({
    data: { name: `Coverage Project ${uid()}`, ownerName: "CovTester" },
  });
  projectId = proj.id;

  const user = await prisma.user.create({
    data: {
      username:          `cov_user_${uid()}`,
      cognitoId:         `cog-cov-${uid()}`,
      skills:            "typescript,react,python",
      availabilityHours: 40,
      teamId:            team.id,
    },
  });
  userId = user.userId;

  const user2 = await prisma.user.create({
    data: {
      username:          `cov_user2_${uid()}`,
      cognitoId:         `cog-cov2-${uid()}`,
      skills:            "python,ml",
      availabilityHours: 32,
    },
  });
  user2Id = user2.userId;

  // pre-create a task for update/delete/status/workload tests
  const task = await prisma.task.create({
    data: {
      title:        "Baseline Coverage Task",
      status:       "To Do",
      priority:     "Medium",
      tags:         "typescript",
      projectId,
      authorUserId: userId,
    },
  });
  taskId = task.id;

  // pre-create a notification
  const notif = await prisma.notification.create({
    data: { userId, title: "Test Notif", message: "Hello", type: "info" },
  });
  notifId = notif.id;
});

afterAll(async () => {
  // clean up in reverse-dependency order
  await prisma.notification.deleteMany({ where: { userId: { in: [userId, user2Id] } } });
  await prisma.comment.deleteMany({ where: { taskId } });
  await prisma.attachment.deleteMany({ where: { taskId } });
  await prisma.taskAssignment.deleteMany({ where: { taskId } });
  await prisma.task.deleteMany({ where: { projectId } });
  await prisma.projectTeam.deleteMany({ where: { projectId } });
  await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { userId: { in: [userId, user2Id] } } });
  await prisma.team.delete({ where: { id: teamId } }).catch(() => {});
  await prisma.$disconnect();
});

// ══════════════════════════════════════════════════════════════════════════════
//  TASK CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
describe("📋 Task Controller", () => {

  let newTaskId: number;

  // GET /tasks?projectId=N
  it("GET /tasks?projectId — returns tasks for a project", async () => {
    const res = await request(app).get(`/tasks?projectId=${projectId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // GET /tasks (no filter)
  it("GET /tasks — returns all tasks (no filter)", async () => {
    const res = await request(app).get("/tasks");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // GET /tasks/all
  it("GET /tasks/all — returns all tasks", async () => {
    const res = await request(app).get("/tasks/all");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // POST /tasks — UT-01 valid data
  it("POST /tasks — creates task with valid data (UT-01)", async () => {
    const res = await request(app).post("/tasks").send({
      title:        "API Integration Task",
      description:  "Full coverage test",
      status:       "To Do",
      priority:     "High",
      tags:         "typescript,testing",
      projectId,
      authorUserId: userId,
      assignedUserId: userId,
      points:       5,
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("API Integration Task");
    newTaskId = res.body.id;
  });
  // PUT /tasks/:taskId — update
  it("PUT /tasks/:taskId — updates task fields", async () => {
    // Create a dedicated task for this test to avoid shared-state races
    const t = await prisma.task.create({
      data: { title: "PUT Test Task", status: "To Do", priority: "Low", projectId, authorUserId: userId },
    });
    const res = await request(app).put(`/tasks/${t.id}`).send({
      title: "Updated Coverage Task", status: "Work In Progress", priority: "Urgent",
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Work In Progress");
    // cleanup
    await prisma.task.delete({ where: { id: t.id } }).catch(() => {});
  });

  // PUT /tasks/:taskId — with assignedUserId to trigger notification branch
  it("PUT /tasks/:taskId — status change triggers notification branch", async () => {
    const t = await prisma.task.create({
      data: { title: "PUT Notif Task", status: "To Do", priority: "Medium", projectId, authorUserId: userId },
    });
    const res = await request(app).put(`/tasks/${t.id}`).send({
      status: "Under Review", assignedUserId: userId,
    });
    expect(res.status).toBe(200);
    await prisma.notification.deleteMany({ where: { message: { contains: "PUT Notif" } } }).catch(() => {});
    await prisma.task.delete({ where: { id: t.id } }).catch(() => {});
  });

  // PATCH /tasks/:taskId/status
  it("PATCH /tasks/:taskId/status — updates status only", async () => {
    const t = await prisma.task.create({
      data: { title: "PATCH Status Task", status: "To Do", priority: "Medium", projectId, authorUserId: userId },
    });
    const res = await request(app).patch(`/tasks/${t.id}/status`).send({ status: "Completed" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Completed");
    await prisma.task.delete({ where: { id: t.id } }).catch(() => {});
  });

  // GET /tasks/user/:userId
  it("GET /tasks/user/:userId — returns tasks for a user", async () => {
    const res = await request(app).get(`/tasks/user/${userId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // GET /tasks/workload
  it("GET /tasks/workload — returns workload array", async () => {
    const res = await request(app).get("/tasks/workload");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) expect(res.body[0]).toHaveProperty("workload");
  });

  // POST /tasks/:taskId/delegate — single assignee
  it("POST /tasks/:taskId/delegate — delegates task to best user", async () => {
    const t = await prisma.task.create({
      data: { title: "Delegate Task", status: "To Do", priority: "High", tags: "typescript", projectId, authorUserId: userId },
    });
    const res = await request(app).post(`/tasks/${t.id}/delegate`).send({ count: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("task");
    expect(res.body).toHaveProperty("assignees");
    expect(res.body).toHaveProperty("reason");
    await prisma.taskAssignment.deleteMany({ where: { taskId: t.id } });
    await prisma.notification.deleteMany({ where: { message: { contains: "Delegate Task" } } }).catch(() => {});
    await prisma.task.delete({ where: { id: t.id } }).catch(() => {});
  });

  // DELETE /tasks/:taskId
  it("DELETE /tasks/:taskId — deletes task", async () => {
    if (!newTaskId) return;
    const res = await request(app).delete(`/tasks/${newTaskId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Task deleted");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  PROJECT CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
describe("📁 Project Controller", () => {

  let tempProjectId: number;

  it("GET /projects — lists all projects", async () => {
    const res = await request(app).get("/projects");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /projects/:id — returns single project", async () => {
    const res = await request(app).get(`/projects/${projectId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(projectId);
  });

  it("GET /projects/99999999 — 404 for non-existent project", async () => {
    const res = await request(app).get("/projects/99999999");
    expect(res.status).toBe(404);
  });

  it("POST /projects — creates project (UT-03)", async () => {
    const res = await request(app).post("/projects").send({
      name:        `Temp Project ${uid()}`,
      description: "Coverage project",
      ownerName:   "Tester",
      startDate:   "2025-01-01",
      endDate:     "2025-12-31",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    tempProjectId = res.body.id;
  });

  it("PUT /projects/:id — updates project", async () => {
    const res = await request(app).put(`/projects/${tempProjectId}`).send({
      name:        "Updated Project Name",
      description: "Updated desc",
      ownerName:   "NewOwner",
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Project Name");
  });

  it("DELETE /projects/:id — deletes project and its tasks", async () => {
    const res = await request(app).delete(`/projects/${tempProjectId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Project deleted");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  USER CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
describe("👤 User Controller", () => {

  let tempUserId: number;
  let tempCognitoId: string;

  it("GET /users — lists all users", async () => {
    const res = await request(app).get("/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("workload");
  });

  it("POST /users — creates user (UT-02)", async () => {
    tempCognitoId = `cog-temp-${uid()}`;
    const res = await request(app).post("/users").send({
      username:          `temp_user_${uid()}`,
      cognitoId:         tempCognitoId,
      role:              "member",
      skills:            "nodejs,docker",
      availabilityHours: 30,
    });
    expect(res.status).toBe(200);
    expect(res.body.newUser).toHaveProperty("userId");
    tempUserId = res.body.newUser.userId;
  });

  it("GET /users/:cognitoId — returns user by cognitoId", async () => {
    const res = await request(app).get(`/users/${tempCognitoId}`);
    expect(res.status).toBe(200);
    expect(res.body.cognitoId).toBe(tempCognitoId);
  });

  it("GET /users/nonexistent-cog — 404 for unknown cognitoId", async () => {
    const res = await request(app).get("/users/no-such-cog-id-xyz");
    expect(res.status).toBe(404);
  });

  it("PUT /users/:userId — updates user profile", async () => {
    const res = await request(app).put(`/users/${tempUserId}`).send({
      username:          "updated_user",
      skills:            "nodejs,kubernetes",
      availabilityHours: 35,
    });
    expect(res.status).toBe(200);
    expect(res.body.skills).toBe("nodejs,kubernetes");
  });

  it("POST /users/csv-import — imports users from CSV payload", async () => {
    const res = await request(app).post("/users/csv-import").send({
      users: [
        {
          username:          `csv_user_${uid()}`,
          cognitoId:         `cog-csv-${uid()}`,
          role:              "member",
          skills:            "python",
          availabilityHours: 20,
        },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(1);
    // Cleanup the csv-imported user
    if (res.body.users && res.body.users[0]) {
      const csvUserId = res.body.users[0].userId;
      await prisma.notification.deleteMany({ where: { userId: csvUserId } });
      await prisma.user.delete({ where: { userId: csvUserId } });
    }
  });

  it("POST /users/csv-import — empty array returns 400", async () => {
    const res = await request(app).post("/users/csv-import").send({ users: [] });
    expect(res.status).toBe(400);
  });

  it("DELETE /users/:userId — deletes user", async () => {
    const res = await request(app).delete(`/users/${tempUserId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("User deleted");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  NOTIFICATION CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
describe("🔔 Notification Controller", () => {

  let tempNotifId: number;

  it("POST /notifications — creates notification", async () => {
    const res = await request(app).post("/notifications").send({
      userId,
      title:   "Coverage Notification",
      message: "This is a test notification",
      type:    "task",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    tempNotifId = res.body.id;
  });

  it("GET /notifications — returns all notifications (root route)", async () => {
    const res = await request(app).get("/notifications");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /notifications/:userId — returns user notifications", async () => {
    const res = await request(app).get(`/notifications/${userId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("PATCH /notifications/:id/read — marks notification as read", async () => {
    const res = await request(app).patch(`/notifications/${notifId}/read`);
    expect(res.status).toBe(200);
    expect(res.body.isRead).toBe(true);
  });

  it("PATCH /notifications/user/:userId/read-all — marks all as read", async () => {
    const res = await request(app).patch(`/notifications/user/${userId}/read-all`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("All notifications marked as read");
  });

  it("DELETE /notifications/:id — deletes notification", async () => {
    const res = await request(app).delete(`/notifications/${tempNotifId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Notification deleted");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  TEAM CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
describe("👥 Team Controller", () => {

  let tempTeamId: number;

  it("GET /teams — lists all teams", async () => {
    const res = await request(app).get("/teams");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /teams — creates a team", async () => {
    const res = await request(app).post("/teams").send({
      teamName: `Temp Team ${uid()}`,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    tempTeamId = res.body.id;
  });

  it("POST /teams — creates team with owner and manager", async () => {
    const res = await request(app).post("/teams").send({
      teamName:             `Team With Leads ${uid()}`,
      productOwnerUserId:   userId,
      projectManagerUserId: userId,
    });
    expect(res.status).toBe(201);
    // Cleanup
    await prisma.team.delete({ where: { id: res.body.id } });
  });

  it("PUT /teams/:teamId — updates team", async () => {
    const res = await request(app).put(`/teams/${tempTeamId}`).send({
      teamName:           "Updated Team Name",
      productOwnerUserId: userId,
    });
    expect(res.status).toBe(200);
    expect(res.body.teamName).toBe("Updated Team Name");
  });

  it("DELETE /teams/:teamId — deletes team", async () => {
    const res = await request(app).delete(`/teams/${tempTeamId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Team deleted");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  SEARCH CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
describe("🔍 Search Controller", () => {

  it("GET /search?query=Coverage — returns tasks, projects, users", async () => {
    const res = await request(app).get("/search?query=Coverage");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("tasks");
    expect(res.body).toHaveProperty("projects");
    expect(res.body).toHaveProperty("users");
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(Array.isArray(res.body.projects)).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it("GET /search?query=typescript — matches tasks with typescript tag", async () => {
    const res = await request(app).get("/search?query=typescript");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("tasks");
  });

  it("GET /search?query=zzznoresultsxyz — returns empty arrays", async () => {
    const res = await request(app).get("/search?query=zzznoresultsxyz");
    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(0);
    expect(res.body.users.length).toBe(0);
  });

  it("GET /search (no query) — still responds 200", async () => {
    const res = await request(app).get("/search");
    expect(res.status).toBe(200);
  });
});
