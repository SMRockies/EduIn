import { aiService } from "../services/ai.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

const validTypes = ["askAi", "summarize", "quiz"];

export async function handleChat(req, res, next) {
  try {
    const { prompt, type } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json(errorResponse("Prompt is required and must be a string", 400));
    }

    const actionType = type || "askAi";

    if (!validTypes.includes(actionType)) {
      return res.status(400).json(errorResponse(`Invalid type. Must be one of: ${validTypes.join(", ")}`, 400));
    }

    let result;

    switch (actionType) {
      case "askAi":
        result = await aiService.chat(prompt);
        break;
      case "summarize":
        result = await aiService.summarize(prompt);
        break;
      case "quiz":
        result = await aiService.quiz(prompt);
        break;
      default:
        result = await aiService.chat(prompt);
    }

    res.locals.tokens = result.tokens;
    return res.json(successResponse({ output: result.content }, result.model, result.tokens));
  } catch (error) {
    next(error);
  }
}

export async function handleVision(req, res, next) {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json(errorResponse("Prompt is required", 400));
    }

    const result = await aiService.vision(prompt);
    res.locals.tokens = result.tokens;
    return res.json(successResponse({ output: result.content }, result.model, result.tokens));
  } catch (error) {
    next(error);
  }
}

export async function handleAudio(req, res, next) {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json(errorResponse("Prompt is required", 400));
    }

    const result = await aiService.audio(prompt);
    res.locals.tokens = result.tokens;
    return res.json(successResponse({ output: result.content }, result.model, result.tokens));
  } catch (error) {
    next(error);
  }
}

export async function handleVideo(req, res, next) {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json(errorResponse("Prompt is required", 400));
    }

    const result = await aiService.video(prompt);
    res.locals.tokens = result.tokens;
    return res.json(successResponse({ output: result.content }, result.model, result.tokens));
  } catch (error) {
    next(error);
  }
}