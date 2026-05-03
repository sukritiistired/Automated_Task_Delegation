import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

// ─── GET /users ───────────────────────────────────────────────────────────────
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: { team: true },
    });

    // Calculate workload for each user
    const usersWithWorkload = await Promise.all(
      users.map(async (user) => {
        const taskCount = await prisma.task.count({
          where: { assignedUserId: user.userId, status: { not: "Completed" } },
        });
        const maxHours = user.availabilityHours ?? 40;
        const workload = Math.min(100, Math.round((taskCount * 4 / maxHours) * 100));
        return { ...user, workload, activeTaskCount: taskCount };
      })
    );

    res.json(usersWithWorkload);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving users: ${error.message}` });
  }
};

// ─── GET /users/:cognitoId ────────────────────────────────────────────────────
export const getUser = async (req: Request, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { cognitoId }, include: { team: true } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving user: ${error.message}` });
  }
};

// ─── POST /users ──────────────────────────────────────────────────────────────
export const postUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      username,
      cognitoId,
      profilePictureUrl = "i1.jpg",
      teamId            = 1,
      role              = "member",
      skills            = "",
      availabilityHours = 40,
    } = req.body;

    // Handle file upload
    let finalPicUrl = profilePictureUrl;
    if (req.file) {
      finalPicUrl = `/uploads/${req.file.filename}`;
    }

    const newUser = await prisma.user.create({
      data: { username, cognitoId, profilePictureUrl: finalPicUrl, teamId: teamId ? Number(teamId) : undefined, role, skills, availabilityHours: Number(availabilityHours) },
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: newUser.userId,
        title: "Welcome to AutoFlow!",
        message: `Hi ${username}, your account has been created. Start by exploring your dashboard.`,
        type: "system",
      },
    });

    res.json({ message: "User Created Successfully", newUser });
  } catch (error: any) {
    res.status(500).json({ message: `Error creating user: ${error.message}` });
  }
};

// ─── POST /users/csv-import ───────────────────────────────────────────────────
export const importUsersFromCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const { users } = req.body; // array of user objects from parsed CSV
    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json({ message: "No users provided" });
      return;
    }

    const created = [];
    const errors  = [];

    for (const row of users) {
      try {
        const cognitoId = row.cognitoId || `csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const user = await prisma.user.create({
          data: {
            username:         row.username || row.name || `user_${Date.now()}`,
            cognitoId,
            profilePictureUrl: row.profilePictureUrl || "i1.jpg",
            teamId:            row.teamId ? Number(row.teamId) : 1,
            role:              row.role || "member",
            skills:            row.skills || "",
            availabilityHours: row.availabilityHours ? Number(row.availabilityHours) : 40,
          },
        });
        created.push(user);
      } catch (err: any) {
        errors.push({ row, error: err.message });
      }
    }

    res.json({ created: created.length, errors, users: created });
  } catch (error: any) {
    res.status(500).json({ message: `Error importing users: ${error.message}` });
  }
};

// ─── PUT /users/:userId ───────────────────────────────────────────────────────
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { userId }  = req.params;
  const { username, profilePictureUrl, teamId, role, skills, availabilityHours } = req.body;
  try {
    let finalPicUrl = profilePictureUrl;
    if (req.file) {
      finalPicUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await prisma.user.update({
      where: { userId: Number(userId) },
      data:  {
        username,
        profilePictureUrl: finalPicUrl,
        teamId: teamId ? Number(teamId) : undefined,
        role,
        skills,
        availabilityHours: availabilityHours ? Number(availabilityHours) : undefined,
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating user: ${error.message}` });
  }
};

// ─── DELETE /users/:userId ────────────────────────────────────────────────────
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const uid        = Number(userId);
  try {
    await prisma.task.updateMany({
      where: { assignedUserId: uid },
      data:  { assignedUserId: null },
    });
    await prisma.notification.deleteMany(  { where: { userId: uid } });
    await prisma.comment.deleteMany(       { where: { userId: uid } });
    await prisma.attachment.deleteMany(    { where: { uploadedById: uid } });
    await prisma.taskAssignment.deleteMany({ where: { userId: uid } });
    await prisma.user.delete(              { where: { userId: uid } });
    res.json({ message: "User deleted" });
  } catch (error: any) {
    res.status(500).json({ message: `Error deleting user: ${error.message}` });
  }
};
