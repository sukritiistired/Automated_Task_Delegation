import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── GET /notifications/:userId ───────────────────────────────────────────────
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving notifications: ${error.message}` });
  }
};

// ─── GET /notifications/all ───────────────────────────────────────────────────
export const getAllNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving all notifications: ${error.message}` });
  }
};

// ─── PATCH /notifications/:id/read ───────────────────────────────────────────
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const updated = await prisma.notification.update({
      where: { id: Number(id) },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: `Error marking notification as read: ${error.message}` });
  }
};

// ─── PATCH /notifications/user/:userId/read-all ───────────────────────────────
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    await prisma.notification.updateMany({
      where: { userId: Number(userId), isRead: false },
      data: { isRead: true },
    });
    res.json({ message: "All notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ message: `Error marking all notifications as read: ${error.message}` });
  }
};

// ─── POST /notifications ──────────────────────────────────────────────────────
export const createNotification = async (req: Request, res: Response): Promise<void> => {
  const { userId, title, message, type, link } = req.body;
  try {
    const notification = await prisma.notification.create({
      data: { userId: Number(userId), title, message, type: type || "info", link },
    });
    res.status(201).json(notification);
  } catch (error: any) {
    res.status(500).json({ message: `Error creating notification: ${error.message}` });
  }
};

// ─── DELETE /notifications/:id ────────────────────────────────────────────────
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.notification.delete({ where: { id: Number(id) } });
    res.json({ message: "Notification deleted" });
  } catch (error: any) {
    res.status(500).json({ message: `Error deleting notification: ${error.message}` });
  }
};
