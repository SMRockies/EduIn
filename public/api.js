const API_BASE = "/api";

export async function post(endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
  }
  return data;
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    body: form
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Upload failed (${response.status})`);
  }
  return data;
}

export async function docAction(documentId, action, document = null) {
  const data = await post(`/documents/${action}`, { documentId, document });
  return data?.data?.output || "No response received";
}

export async function docAsk(documentId, question, document = null) {
  const data = await post("/documents/ask", { documentId, document, question });
  return data?.data?.output || "No response received";
}

export async function sendChat(input, type = "askAi") {
  const data = await post("/chat", { prompt: input, type });
  return data?.data?.output || data?.response || "No response received";
}
