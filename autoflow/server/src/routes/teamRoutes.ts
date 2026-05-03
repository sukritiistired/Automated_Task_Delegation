import { Router } from "express";
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
} from "../controllers/teamController";

const router = Router();

router.get("/",           getTeams);
router.post("/",          createTeam);
router.put("/:teamId",    updateTeam);
router.delete("/:teamId", deleteTeam);

export default router;
