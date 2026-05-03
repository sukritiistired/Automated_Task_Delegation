import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── GET /projects ────────────────────────────────────────────────────────────
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany();
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving projects: ${error.message}` });
  }
};

// ─── GET /projects/:id ────────────────────────────────────────────────────────
export const getProject = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const project = await prisma.project.findUnique({
      where:   { id: Number(id) },
      include: { tasks: true, projectTeams: { include: { team: true } } },
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving project: ${error.message}` });
  }
};

// ─── POST /projects ───────────────────────────────────────────────────────────
export const createProject = async (req: Request, res: Response): Promise<void> => {
  const { name, description, ownerName, documents, startDate, endDate } = req.body;
  try {
    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        ownerName,
        documents,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate:   endDate   ? new Date(endDate)   : undefined,
      },
    });
    res.status(201).json(newProject);
  } catch (error: any) {
    res.status(500).json({ message: `Error creating project: ${error.message}` });
  }
};

// ─── PUT /projects/:id ────────────────────────────────────────────────────────
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const { id }                              = req.params;
  const { name, description, ownerName, documents, startDate, endDate } = req.body;
  try {
    const updated = await prisma.project.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        ownerName,
        documents,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate:   endDate   ? new Date(endDate)   : undefined,
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating project: ${error.message}` });
  }
};

// ─── DELETE /projects/:id ─────────────────────────────────────────────────────
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const { id }      = req.params;
  const projectId   = Number(id);
  try {
    const tasks = await prisma.task.findMany({ where: { projectId } });
    for (const task of tasks) {
      await prisma.comment.deleteMany(       { where: { taskId: task.id } });
      await prisma.attachment.deleteMany(    { where: { taskId: task.id } });
      await prisma.taskAssignment.deleteMany({ where: { taskId: task.id } });
    }
    await prisma.task.deleteMany(       { where: { projectId } });
    await prisma.projectTeam.deleteMany({ where: { projectId } });
    await prisma.project.delete(        { where: { id: projectId } });
    res.json({ message: "Project deleted" });
  } catch (error: any) {
    res.status(500).json({ message: `Error deleting project: ${error.message}` });
  }
};
