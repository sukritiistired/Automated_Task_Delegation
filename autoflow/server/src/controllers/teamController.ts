import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── GET /teams ───────────────────────────────────────────────────────────────
export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const teams = await prisma.team.findMany();

    const teamsWithUsernames = await Promise.all(
      teams.map(async (team: any) => {
        const productOwner = team.productOwnerUserId
          ? await prisma.user.findUnique({
              where: { userId: team.productOwnerUserId },
              select: { username: true },
            })
          : null;

        const projectManager = team.projectManagerUserId
          ? await prisma.user.findUnique({
              where: { userId: team.projectManagerUserId },
              select: { username: true },
            })
          : null;

        return {
          ...team,
          productOwnerUsername: productOwner?.username,
          projectManagerUsername: projectManager?.username,
        };
      })
    );

    res.json(teamsWithUsernames);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving teams: ${error.message}` });
  }
};

// ─── POST /teams ──────────────────────────────────────────────────────────────
export const createTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamName, productOwnerUserId, projectManagerUserId } = req.body;
  try {
    const newTeam = await prisma.team.create({
      data: {
        teamName,
        productOwnerUserId:  productOwnerUserId  ? Number(productOwnerUserId)  : undefined,
        projectManagerUserId: projectManagerUserId ? Number(projectManagerUserId) : undefined,
      },
    });
    res.status(201).json(newTeam);
  } catch (error: any) {
    res.status(500).json({ message: `Error creating team: ${error.message}` });
  }
};

// ─── PUT /teams/:teamId ───────────────────────────────────────────────────────
export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.params;
  const { teamName, productOwnerUserId, projectManagerUserId } = req.body;
  try {
    const updated = await prisma.team.update({
      where: { id: Number(teamId) },
      data: {
        teamName,
        productOwnerUserId:  productOwnerUserId  ? Number(productOwnerUserId)  : undefined,
        projectManagerUserId: projectManagerUserId ? Number(projectManagerUserId) : undefined,
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating team: ${error.message}` });
  }
};

// ─── DELETE /teams/:teamId ────────────────────────────────────────────────────
export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.params;
  const tid = Number(teamId);
  try {
    // Unlink users from this team
    await prisma.user.updateMany({ where: { teamId: tid }, data: { teamId: undefined } });
    await prisma.projectTeam.deleteMany({ where: { teamId: tid } });
    await prisma.team.delete({ where: { id: tid } });
    res.json({ message: "Team deleted" });
  } catch (error: any) {
    res.status(500).json({ message: `Error deleting team: ${error.message}` });
  }
};
