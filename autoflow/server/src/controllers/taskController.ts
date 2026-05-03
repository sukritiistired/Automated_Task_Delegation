import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import http from "http";

const prisma = new PrismaClient();

// ─── Delegation scoring weights ───────────────────────────────────────────────
const PRIORITY_WEIGHTS: Record<string, number> = {
  Urgent:  1.0,
  High:    0.75,
  Medium:  0.5,
  Low:     0.25,
  Backlog: 0.1,
};

// ─── n8n Notification trigger ─────────────────────────────────────────────────
async function triggerN8nNotification(payload: object): Promise<void> {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) return;
    const data = JSON.stringify(payload);
    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    };
    const req = http.request(options);
    req.write(data);
    req.end();
  } catch (_) {}
}

// ─── Workload calculator ──────────────────────────────────────────────────────
export async function calculateUserWorkload(userId: number): Promise<number> {
  const totalTasks = await prisma.task.count({ where: { assignedUserId: userId } });
  const user = await prisma.user.findUnique({ where: { userId } });
  const maxHours = user?.availabilityHours ?? 40;
  const usedHours = totalTasks * 4;
  return Math.min(100, Math.round((usedHours / maxHours) * 100));
}

// --- Pure TypeScript Machine Learning Setup ---
class SimpleNeuralNetwork {
  weights1: number[][] = Array(3).fill(0).map(() => Array(4).fill(0).map(() => Math.random() - 0.5));
  weights2: number[] = Array(4).fill(0).map(() => Math.random() - 0.5);
  bias1: number[] = Array(4).fill(0).map(() => Math.random() - 0.5);
  bias2: number = Math.random() - 0.5;
  learningRate = 0.1;

  sigmoid(x: number) { return 1 / (1 + Math.exp(-x)); }
  dSigmoid(y: number) { return y * (1 - y); }

  run(input: number[]) {
    const hidden = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      let sum = this.bias1[i];
      for (let j = 0; j < 3; j++) sum += input[j] * this.weights1[j][i];
      hidden[i] = this.sigmoid(sum);
    }
    let sum = this.bias2;
    for (let i = 0; i < 4; i++) sum += hidden[i] * this.weights2[i];
    return { output: this.sigmoid(sum), hidden };
  }

  train(data: {input: number[], output: number[]}[], iterations: number) {
    for (let ep = 0; ep < iterations; ep++) {
      for (const row of data) {
        const { output, hidden } = this.run(row.input);
        const error = row.output[0] - output;
        const dOutput = error * this.dSigmoid(output);
        const dHidden = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) dHidden[i] = dOutput * this.weights2[i] * this.dSigmoid(hidden[i]);

        for (let i = 0; i < 4; i++) this.weights2[i] += this.learningRate * dOutput * hidden[i];
        this.bias2 += this.learningRate * dOutput;

        for (let j = 0; j < 3; j++) {
          for (let i = 0; i < 4; i++) this.weights1[j][i] += this.learningRate * dHidden[i] * row.input[j];
        }
        for (let i = 0; i < 4; i++) this.bias1[i] += this.learningRate * dHidden[i];
      }
    }
  }

  predict(input: number[]) { return this.run(input).output; }
}

let delegationModel: SimpleNeuralNetwork | null = null;
let isTraining = false;

// Helper to extract features between user and task
function extractFeatures(user: any, task: any, openTaskCounts: Record<number, number>): number[] {
  const userSkills = (user.skills || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
  const taskTags = (task.tags || "").toLowerCase().split(",").map((t: string) => t.trim()).filter(Boolean);

  let skillMatch = 0.5;
  if (userSkills.length > 0 && taskTags.length > 0) {
    const matched = taskTags.filter((t: string) => userSkills.includes(t)).length;
    skillMatch = matched / Math.max(taskTags.length, userSkills.length);
  }

  const maxHours = user.availabilityHours ?? 40;
  const openCount = openTaskCounts[user.userId] ?? 0;
  const usedHours = openCount * 4;
  const availability = Math.max(0, Math.min(1, 1 - usedHours / maxHours));

  const priorityWeight = PRIORITY_WEIGHTS[task.priority ?? "Medium"] ?? 0.5;

  return [skillMatch, availability, priorityWeight];
}

async function getOpenTaskCounts(): Promise<Record<number, number>> {
  const openRows = await prisma.task.groupBy({
    by: ["assignedUserId"],
    where: { status: { not: "Completed" }, assignedUserId: { not: null } },
    _count: { id: true },
  });
  const counts: Record<number, number> = {};
  openRows.forEach((row) => {
    if (row.assignedUserId) counts[row.assignedUserId] = row._count.id;
  });
  return counts;
}

export async function trainDelegationModel(): Promise<void> {
  if (isTraining) return;
  isTraining = true;
  console.log("🤖 Training Pure TS Neural Network Model for Delegation...");

  const users = await prisma.user.findMany();
  const tasks = await prisma.task.findMany({
    where: { assignedUserId: { not: null } }
  });

  const trainingData: {input: number[], output: number[]}[] = [];

  // Generate synthetic baseline so the network learns the basic logic
  for (let i = 0; i < 200; i++) {
    const sMatch = Math.random();
    const avail = Math.random();
    const prio = Math.random();
    const target = sMatch * 0.5 + avail * (0.3 + prio * 0.2);
    trainingData.push({
      input: [sMatch, avail, prio],
      output: [target]
    });
  }

  // Add actual historical assignments as strong positive signals
  const openTaskCounts = await getOpenTaskCounts();
  for (const task of tasks) {
    if (!task.assignedUserId) continue;
    
    // Assigned user (Positive)
    const assignedUser = users.find(u => u.userId === task.assignedUserId);
    if (assignedUser) {
      const features = extractFeatures(assignedUser, task, openTaskCounts);
      trainingData.push({ input: features, output: [0.95] }); // High score for historical assignments
    }

    // Unassigned users (Negative)
    const unassigned = users.filter(u => u.userId !== task.assignedUserId).slice(0, 3); // Sample up to 3
    for (const u of unassigned) {
       const features = extractFeatures(u, task, openTaskCounts);
       trainingData.push({ input: features, output: [0.1] }); // Low score
    }
  }

  const net = new SimpleNeuralNetwork();
  net.train(trainingData, 2000);

  delegationModel = net;
  isTraining = false;
  console.log("✅ Custom ML Model Training Complete! The AI is now ready to delegate.");
}

// Automatically trigger training asynchronously when module loads
trainDelegationModel().catch(console.error);

async function scoreUserForTask(
  user: any,
  task: any,
  openTaskCounts: Record<number, number>
): Promise<number> {
  if (!delegationModel) {
    // Fallback if model is still training
    const features = extractFeatures(user, task, openTaskCounts);
    return features[0] * 0.5 + features[1] * (0.3 + features[2] * 0.2);
  }

  const features = extractFeatures(user, task, openTaskCounts);
  return delegationModel.predict(features);
}

// ─── GET /tasks?projectId=N ───────────────────────────────────────────────────
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.query;
  try {
    const where: any = {};
    if (projectId) where.projectId = Number(projectId);
    const tasks = await prisma.task.findMany({
      where,
      include: {
        author: true,
        assignee: true,
        comments: { include: { user: true } },
        attachments: true,
        taskAssignments: { include: { user: true } },
      },
      orderBy: { id: "desc" },
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving tasks: ${error.message}` });
  }
};

// ─── GET /tasks/all ───────────────────────────────────────────────────────────
export const getAllTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        author: true,
        assignee: true,
        taskAssignments: { include: { user: true } },
      },
      orderBy: { id: "desc" },
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving all tasks: ${error.message}` });
  }
};

// ─── POST /tasks ──────────────────────────────────────────────────────────────
export const createTask = async (req: Request, res: Response): Promise<void> => {
  const {
    title, description, status, priority, tags,
    startDate, dueDate, points, projectId, authorUserId, assignedUserId, assigneeCount,
  } = req.body;
  try {
    const newTask = await prisma.task.create({
      data: {
        title, description, status, priority, tags,
        startDate:      startDate      ? new Date(startDate)      : undefined,
        dueDate:        dueDate        ? new Date(dueDate)        : undefined,
        points,         projectId,     authorUserId,
        assignedUserId: assignedUserId ?? undefined,
        assigneeCount:  assigneeCount  ?? 1,
      },
      include: { author: true, assignee: true },
    });

    // Create notification for assigned user
    if (assignedUserId) {
      await prisma.notification.create({
        data: {
          userId: assignedUserId,
          title: "New Task Assigned",
          message: `You have been assigned to task: "${title}"`,
          type: "task",
        },
      });
      await triggerN8nNotification({ event: "task_assigned", task: newTask });
    }

    res.status(201).json(newTask);
  } catch (error: any) {
    res.status(500).json({ message: `Error creating task: ${error.message}` });
  }
};

// ─── PUT /tasks/:taskId ───────────────────────────────────────────────────────
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const {
    title, description, status, priority, tags,
    startDate, dueDate, points, assignedUserId, assigneeCount,
  } = req.body;
  try {
    const updated = await prisma.task.update({
      where: { id: Number(taskId) },
      data: {
        title, description, status, priority, tags,
        startDate:      startDate      ? new Date(startDate)      : undefined,
        dueDate:        dueDate        ? new Date(dueDate)        : undefined,
        points,
        assignedUserId: assignedUserId ?? undefined,
        assigneeCount:  assigneeCount  ?? 1,
      },
      include: { author: true, assignee: true },
    });

    // Notify on status change
    if (status && updated.assignedUserId) {
      await prisma.notification.create({
        data: {
          userId: updated.assignedUserId,
          title: "Task Updated",
          message: `Task "${updated.title}" status changed to ${status}`,
          type: "update",
        },
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating task: ${error.message}` });
  }
};

// ─── PATCH /tasks/:taskId/status ─────────────────────────────────────────────
export const updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { status }  = req.body;
  try {
    const updated = await prisma.task.update({
      where: { id: Number(taskId) },
      data:  { status },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating task status: ${error.message}` });
  }
};

// ─── DELETE /tasks/:taskId ────────────────────────────────────────────────────
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;
  try {
    const id = Number(taskId);
    await prisma.comment.deleteMany(        { where: { taskId: id } });
    await prisma.attachment.deleteMany(     { where: { taskId: id } });
    await prisma.taskAssignment.deleteMany( { where: { taskId: id } });
    await prisma.task.delete(               { where: { id } });
    res.json({ message: "Task deleted" });
  } catch (error: any) {
    res.status(500).json({ message: `Error deleting task: ${error.message}` });
  }
};

// ─── GET /tasks/user/:userId ──────────────────────────────────────────────────
export const getUserTasks = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { authorUserId:   Number(userId) },
          { assignedUserId: Number(userId) },
        ],
      },
      include: { author: true, assignee: true },
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving user tasks: ${error.message}` });
  }
};

// ─── GET /tasks/:taskId/workload ──────────────────────────────────────────────
export const getWorkload = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
    const workloads = await Promise.all(
      users.map(async (user) => ({
        userId: user.userId,
        username: user.username,
        workload: await calculateUserWorkload(user.userId),
      }))
    );
    res.json(workloads);
  } catch (error: any) {
    res.status(500).json({ message: `Error getting workload: ${error.message}` });
  }
};

// ─── POST /tasks/:taskId/delegate ────────────────────────────────────────────
export const delegateTask = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { count = 1 } = req.body; // number of people to assign
  try {
    const task = await prisma.task.findUnique({ where: { id: Number(taskId) } });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const users = await prisma.user.findMany();
    if (users.length === 0) {
      res.status(400).json({ message: "No users available for delegation" });
      return;
    }

    const openRows = await prisma.task.groupBy({
      by:    ["assignedUserId"],
      where: { status: { not: "Completed" }, assignedUserId: { not: null } },
      _count: { id: true },
    });
    const openTaskCounts: Record<number, number> = {};
    openRows.forEach((row) => {
      if (row.assignedUserId) openTaskCounts[row.assignedUserId] = row._count.id;
    });

    const scored = await Promise.all(
      users.map(async (user) => ({
        user,
        score: await scoreUserForTask(user, task, openTaskCounts),
      }))
    );
    scored.sort((a, b) => b.score - a.score);

    const topN = scored.slice(0, Math.min(Number(count), scored.length));
    const best = topN[0];

    const updatedTask = await prisma.task.update({
      where: { id: Number(taskId) },
      data:  { assignedUserId: best.user.userId, assigneeCount: Number(count) },
    });

    // Create TaskAssignment records for multi-assignee
    if (Number(count) > 1) {
      await prisma.taskAssignment.deleteMany({ where: { taskId: Number(taskId) } });
      for (const { user } of topN) {
        await prisma.taskAssignment.create({
          data: { userId: user.userId, taskId: Number(taskId) },
        });
        await prisma.notification.create({
          data: {
            userId: user.userId,
            title: "Task Delegated to You",
            message: `AI delegated task "${task.title}" to you based on your skills and availability.`,
            type: "delegation",
          },
        });
      }
    } else {
      await prisma.notification.create({
        data: {
          userId: best.user.userId,
          title: "Task Delegated to You",
          message: `AI delegated task "${task.title}" to you based on your skills and availability.`,
          type: "delegation",
        },
      });
    }

    await triggerN8nNotification({ event: "task_assigned", task: updatedTask, assignees: topN.map(t => t.user) });

    const reason = [
      `Selected top ${topN.length} from ${users.length} candidate(s).`,
      `Best match: ${best.user.username} (score: ${best.score.toFixed(3)}).`,
      best.user.skills ? `Skills: [${best.user.skills}].` : "No skill profile.",
      task.tags ? `Task tags: [${task.tags}].` : "No task tags.",
    ].join(" ");

    res.json({ task: updatedTask, assignees: topN.map(t => t.user), reason, topScores: topN.map(t => ({ user: t.user.username, score: t.score })) });
  } catch (error: any) {
    res.status(500).json({ message: `Error delegating task: ${error.message}` });
  }
};
