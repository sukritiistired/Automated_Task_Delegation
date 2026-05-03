import { Router } from "express";
import {
  getTasks,
  getAllTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getUserTasks,
  delegateTask,
  getWorkload,
} from "../controllers/taskController";

const router = Router();

router.get("/",                   getTasks);
router.get("/all",                getAllTasks);
router.post("/",                  createTask);
router.get("/workload",           getWorkload);
router.get("/user/:userId",       getUserTasks);
router.put("/:taskId",            updateTask);
router.patch("/:taskId/status",   updateTaskStatus);
router.delete("/:taskId",         deleteTask);
router.post("/:taskId/delegate",  delegateTask);

export default router;
