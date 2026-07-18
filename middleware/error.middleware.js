export function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  
  if (err.message.includes("OPENROUTER_API_KEY")) {
    return res.status(500).json({
      success: false,
      message: "AI service not configured. Please set OPENROUTER_API_KEY in .env",
      error: "CONFIGURATION_ERROR"
    });
  }

  if (err.message.includes("OpenRouter API error (429)")) {
    return res.status(503).json({
      success: false,
      message: "Model overloaded. Switching to backup...",
      error: "MODEL_OVERLOADED",
      retry: true
    });
  }

  if (err.message.includes("OpenRouter API error (401)")) {
    return res.status(401).json({
      success: false,
      message: "Invalid API key. Please check your OPENROUTER_API_KEY",
      error: "AUTH_ERROR"
    });
  }

  if (err.message.includes("OpenRouter API error (400)")) {
    return res.status(400).json({
      success: false,
      message: "Invalid request to AI service",
      error: "BAD_REQUEST"
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File too large for this deployment. Please upload a PDF under 4MB.",
      error: "FILE_TOO_LARGE"
    });
  }

  if (err.message?.startsWith("UNSUPPORTED_FILE")) {
    return res.status(415).json({
      success: false,
      message: err.message.replace("UNSUPPORTED_FILE: ", ""),
      error: "UNSUPPORTED_FILE"
    });
  }

  return res.status(500).json({
    success: false,
    message: "Document processing failed. Please try a smaller file or try again later.",
    error: "SERVICE_UNAVAILABLE",
    retry: true
  });
}
