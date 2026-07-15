export function successResponse(data, model = "unknown", tokens = 0) {
  return {
    success: true,
    data,
    model,
    tokens
  };
}

export function errorResponse(message, code = 500, details = null) {
  return {
    success: false,
    message,
    code,
    details
  };
}