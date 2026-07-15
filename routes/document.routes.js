import { Router } from "express";
import { upload } from "../middleware/upload.middleware.js";
import {
  uploadDocument,
  summarizeDocument,
  quizFromDocument,
  explainDocument,
  askDocument
} from "../controllers/documentController.js";

const router = Router();

router.post("/upload", upload.single("file"), uploadDocument);
router.post("/summarize", summarizeDocument);
router.post("/quiz", quizFromDocument);
router.post("/explain", explainDocument);
router.post("/ask", askDocument);

export default router;