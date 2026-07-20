import { Container, getContainer } from "@cloudflare/containers";

export class EduAIContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "10m";
  envVars = {
    NODE_ENV: "production",
    PORT: "8080"
  };

  onStart() {
    console.log("EduAI container started");
  }

  onStop() {
    console.log("EduAI container stopped");
  }

  onError(error) {
    console.error("EduAI container error:", error);
    throw error;
  }
}

export default {
  async fetch(request, env) {
    const container = getContainer(env.EDUAI_CONTAINER, "main");
    return container.fetch(request);
  }
};
