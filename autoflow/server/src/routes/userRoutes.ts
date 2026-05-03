import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  getUsers,
  getUser,
  postUser,
  updateUser,
  deleteUser,
  importUsersFromCsv,
} from "../controllers/userController";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

const router = Router();

router.get("/",                    getUsers);
router.post("/",                   upload.single("profilePicture"), postUser);
router.post("/csv-import",         importUsersFromCsv);
router.get("/:cognitoId",          getUser);
router.put("/:userId",             upload.single("profilePicture"), updateUser);
router.delete("/:userId",          deleteUser);

export default router;
