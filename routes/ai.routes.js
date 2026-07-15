import { Router } from "express";
import { handleChat, handleVision, handleAudio, handleVideo } from "../controllers/aiController.js";

const router = Router();

router.post("/chat", handleChat);
router.post("/vision", handleVision);
router.post("/audio", handleAudio);
router.post("/video", handleVideo);

export default router;