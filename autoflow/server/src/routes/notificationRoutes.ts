import { Router } from "express";
import {
  getNotifications,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
} from "../controllers/notificationController";

const router = Router();

router.get("/",                              getAllNotifications);
router.get("/:userId",                       getNotifications);
router.post("/",                             createNotification);
router.patch("/:id/read",                    markAsRead);
router.patch("/user/:userId/read-all",       markAllAsRead);
router.delete("/:id",                        deleteNotification);

export default router;
