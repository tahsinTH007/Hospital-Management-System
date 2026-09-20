import express from "express";

import { deleteFile } from "../controllers/uploadthing.ts";
import { requireAuth } from "../middleware/auth.ts";

const uploadthingRouter = express.Router();

uploadthingRouter.delete("/", requireAuth, deleteFile);

export default uploadthingRouter;
