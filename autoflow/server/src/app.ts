import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";

/* ROUTE IMPORTS */
import projectRoutes from "./routes/projectRoutes";
import taskRoutes from "./routes/taskRoutes";
import searchRoutes from "./routes/searchRoutes";
import userRoutes from "./routes/userRoutes";
import teamRoutes from "./routes/teamRoutes";
import notificationRoutes from "./routes/notificationRoutes";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: false, limit: "50mb" }));
app.use(cors());

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const publicDir = path.join(__dirname, "../../client/public");
app.use("/public", express.static(publicDir));

app.get("/", (_req, res) => res.send("AutoFlow API Server - Running"));

app.use("/projects",      projectRoutes);
app.use("/tasks",         taskRoutes);
app.use("/search",        searchRoutes);
app.use("/users",         userRoutes);
app.use("/teams",         teamRoutes);
app.use("/notifications", notificationRoutes);

export default app;
