const userInput = document.getElementById("userInput");
const output = document.getElementById("output");
const statusText = document.getElementById("statusText");
const askAiBtn = document.getElementById("askAiBtn");
const summarizeBtn = document.getElementById("summarizeBtn");
const quizBtn = document.getElementById("quizBtn");
const copyBtn = document.getElementById("copyBtn");

async function sendPrompt(prompt) {
  statusText.textContent = "Loading...";
  output.textContent = "Please wait, generating response...";
  toggleButtons(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Something went wrong.");
    }

    const aiResponse = data.response || "No response received.";
    output.innerHTML = marked.parse(aiResponse);
    statusText.textContent = "Done";
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
    statusText.textContent = "Error";
  } finally {
    toggleButtons(false);
  }
}

function toggleButtons(disabled) {
  askAiBtn.disabled = disabled;
  summarizeBtn.disabled = disabled;
  quizBtn.disabled = disabled;
  copyBtn.disabled = disabled;
}

askAiBtn.addEventListener("click", () => {
  const value = userInput.value.trim();
  if (!value) {
    output.textContent = "Please enter a topic or notes first.";
    statusText.textContent = "Ready";
    return;
  }

  sendPrompt(`Explain this topic in simple language:\n\n${value}`);
});

summarizeBtn.addEventListener("click", () => {
  const value = userInput.value.trim();
  if (!value) {
    output.textContent = "Please enter notes first.";
    statusText.textContent = "Ready";
    return;
  }

  sendPrompt(`Summarize the following notes into concise bullet points:\n\n${value}`);
});

quizBtn.addEventListener("click", () => {
  const value = userInput.value.trim();
  if (!value) {
    output.textContent = "Please enter a topic first.";
    statusText.textContent = "Ready";
    return;
  }

  sendPrompt(`Generate five multiple choice questions with answers on:\n\n${value}`);
});

copyBtn.addEventListener("click", async () => {
  const text = output.innerText.trim();
  if (!text) {
    return;
  }

  await navigator.clipboard.writeText(text);
  const originalText = copyBtn.textContent;
  copyBtn.textContent = "Copied";

  setTimeout(() => {
    copyBtn.textContent = originalText;
  }, 1500);
});
