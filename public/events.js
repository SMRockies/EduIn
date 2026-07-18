import { sendChat, uploadFile, docAction, docAsk } from "./api.js";
import {
  setLoading, setOutput, setStatus, getInput, getOutputText, showCopied,
  showDocInfo, setDocStatus, getDocQuestion, clearDocQuestion,
  setDocButtonsDisabled, clearFileInput
} from "./ui.js";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

document.getElementById("askAiBtn").addEventListener("click", () => handleAction("askAi"));
document.getElementById("summarizeBtn").addEventListener("click", () => handleAction("summarize"));
document.getElementById("quizBtn").addEventListener("click", () => handleAction("quiz"));

document.getElementById("copyBtn").addEventListener("click", async () => {
  const text = getOutputText();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  showCopied();
});

async function handleAction(type) {
  const input = getInput();
  if (!input) {
    setOutput("Please enter a topic or notes first.", true);
    setStatus("Ready");
    return;
  }
  setLoading(true);
  try {
    const response = await sendChat(input, type);
    setOutput(response);
    setStatus("Done");
  } catch (error) {
    setOutput(`Error: ${error.message}`, true);
    setStatus("Error");
  } finally {
    setLoading(false);
  }
}

let currentDocId = null;
let currentDocument = null;

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");

fileInput.addEventListener("change", () => {
  uploadBtn.disabled = !fileInput.files.length;
  if (fileInput.files.length) {
    const selected = fileInput.files[0];
    if (selected.size > MAX_UPLOAD_BYTES) {
      setDocStatus(`File too large. Upload a PDF under 4MB.`);
      uploadBtn.disabled = true;
      return;
    }
    setDocStatus(`Selected: ${selected.name}`);
  }
});

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  if (file.size > MAX_UPLOAD_BYTES) {
    setOutput("Upload error: File too large for this deployment. Please upload a PDF under 4MB.", true);
    setDocStatus("File too large");
    return;
  }

  setDocStatus("Uploading...");
  setDocButtonsDisabled(true);

  try {
    const result = await uploadFile(file);
    currentDocument = result.data.document;
    currentDocId = currentDocument.id;
    showDocInfo(currentDocument);
    sessionStorage.setItem("eduaiCurrentDocument", JSON.stringify(currentDocument));
    setOutput(`**Document uploaded:** ${currentDocument.filename}\n\n${result.data.message}`, false);
    setStatus("Done");
    clearFileInput();
  } catch (error) {
    setOutput(`Upload error: ${error.message}`, true);
    setDocStatus("Error");
  } finally {
    setDocButtonsDisabled(false);
  }
});

document.querySelectorAll(".doc-action").forEach(btn => {
  btn.addEventListener("click", async () => {
    if (!currentDocId) return;
    const action = btn.dataset.action;
    setDocStatus("Processing...");
    setDocButtonsDisabled(true);
    try {
      const response = await docAction(currentDocId, action, currentDocument);
      setOutput(response);
      setStatus("Done");
      setDocStatus("Ready");
    } catch (error) {
      setOutput(`Error: ${error.message}`, true);
      setDocStatus("Error");
    } finally {
      setDocButtonsDisabled(false);
    }
  });
});

document.getElementById("askBtn").addEventListener("click", async () => {
  const question = getDocQuestion();
  if (!question || !currentDocId) return;

  setDocStatus("Processing...");
  setDocButtonsDisabled(true);
  try {
    const response = await docAsk(currentDocId, question, currentDocument);
    setOutput(response);
    setStatus("Done");
    setDocStatus("Ready");
    clearDocQuestion();
  } catch (error) {
    setOutput(`Error: ${error.message}`, true);
    setDocStatus("Error");
  } finally {
    setDocButtonsDisabled(false);
  }
});

const savedDocument = sessionStorage.getItem("eduaiCurrentDocument");
if (savedDocument) {
  try {
    currentDocument = JSON.parse(savedDocument);
    currentDocId = currentDocument?.id || null;
    if (currentDocument?.id) {
      showDocInfo(currentDocument);
      setDocStatus("Ready");
    }
  } catch {
    sessionStorage.removeItem("eduaiCurrentDocument");
  }
}
