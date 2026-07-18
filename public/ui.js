const userInput = document.getElementById("userInput");
const output = document.getElementById("output");
const statusText = document.getElementById("statusText");
const askAiBtn = document.getElementById("askAiBtn");
const summarizeBtn = document.getElementById("summarizeBtn");
const quizBtn = document.getElementById("quizBtn");
const copyBtn = document.getElementById("copyBtn");

export function setLoading(isLoading) {
  statusText.textContent = isLoading ? "Loading..." : "Ready";
  if (isLoading) output.textContent = "Please wait, generating response...";
  toggleButtons(isLoading);
}

export function setOutput(content, isError = false) {
  if (isError) {
    output.textContent = content;
  } else {
    output.innerHTML = window.marked.parse(content);
  }
}

export function setStatus(message) {
  statusText.textContent = message;
}

export function toggleButtons(disabled) {
  askAiBtn.disabled = disabled;
  summarizeBtn.disabled = disabled;
  quizBtn.disabled = disabled;
  copyBtn.disabled = disabled;
}

export function getInput() {
  return userInput.value.trim();
}

export function getOutputText() {
  return output.innerText.trim();
}

export function showCopied() {
  const t = copyBtn.textContent;
  copyBtn.textContent = "Copied";
  setTimeout(() => { copyBtn.textContent = t; }, 1500);
}

export function showDocInfo(doc) {
  document.getElementById("docName").textContent = doc.filename;
  document.getElementById("docWords").textContent = `${doc.wordCount} words`;
  document.getElementById("docPages").textContent = doc.pages ? `${doc.pages} pages` : "";
  document.getElementById("docInfo").classList.remove("hidden");
  document.getElementById("docActions").classList.remove("hidden");
  document.getElementById("docStatus").textContent = "Ready";
}

export function setDocStatus(msg) {
  document.getElementById("docStatus").textContent = msg;
}

export function getDocQuestion() {
  return document.getElementById("questionInput").value.trim();
}

export function clearDocQuestion() {
  document.getElementById("questionInput").value = "";
}

export function setDocButtonsDisabled(disabled) {
  document.querySelectorAll(".doc-action, #askBtn, #uploadBtn, #browseBtn, #captureBtn").forEach(b => b.disabled = disabled);
}

export function clearFileInput() {
  document.getElementById("fileInput").value = "";
  const cameraInput = document.getElementById("cameraInput");
  if (cameraInput) cameraInput.value = "";
}
