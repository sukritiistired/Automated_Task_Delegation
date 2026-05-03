import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
const prisma = new PrismaClient();

async function deleteAllData(orderedFileNames: string[]) {
  const modelNames = orderedFileNames.map((fileName) => {
    const modelName = path.basename(fileName, path.extname(fileName));
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);
  });

  for (const modelName of modelNames) {
    const model: any = prisma[modelName as keyof typeof prisma];
    try {
      await model.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } catch (error) {
      console.error(`Error clearing data from ${modelName}:`, error);
    }
  }
}

async function main() {
  const dataDirectory = path.join(__dirname, "seedData");

  const orderedFileNames = [
    "team.json",
    "project.json",
    "projectTeam.json",
    "user.json",
    "task.json",
    "attachment.json",
    "comment.json",
    "taskAssignment.json",
  ];

  await deleteAllData(orderedFileNames);

  for (const fileName of orderedFileNames) {
    const filePath = path.join(dataDirectory, fileName);
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const modelName = path.basename(fileName, path.extname(fileName));
    const model: any = prisma[modelName as keyof typeof prisma];

    try {
      for (const data of jsonData) {
        await model.create({ data });
      }
      console.log(`Seeded ${modelName} with data from ${fileName}`);
    } catch (error) {
      console.error(`Error seeding data for ${modelName}:`, error);
    }
  }

  // Seed sample notifications
  try {
    await prisma.notification.createMany({
      data: [
        {
          userId: 1,
          title: "Welcome to AutoFlow",
          message: "Your AutoFlow workspace is ready. Start by creating a task or inviting team members.",
          type: "system",
          isRead: false,
        },
        {
          userId: 1,
          title: "New Task Assigned",
          message: "You have been assigned to Task 1 by the system.",
          type: "task",
          isRead: false,
        },
        {
          userId: 2,
          title: "Task Deadline Approaching",
          message: "Task 2 is due in 2 days. Please review progress.",
          type: "deadline",
          isRead: false,
        },
      ],
    });
    console.log("Seeded notifications");
  } catch (error) {
    console.error("Error seeding notifications:", error);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
