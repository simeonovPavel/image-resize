import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";

const API_PORT = 3001;
const WEB_PORT = 5173;
const HOST = "127.0.0.1";

function isPortOpen(port, host = HOST) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

function startProcess(name, commandLine) {
  const child = spawn(commandLine, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
    windowsHide: false,
    env: process.env,
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed to start:`, error.message);
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${name}] stopped (${signal})`);
      return;
    }
    if (code !== null && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
}

async function main() {
  const children = [];

  const apiRunning = await isPortOpen(API_PORT);
  if (apiRunning) {
    console.log(`[start] API already running at http://localhost:${API_PORT}`);
  } else {
    console.log(`[start] Starting API at http://localhost:${API_PORT}`);
    children.push(startProcess("api", "node server.mjs"));
  }

  const webRunning = await isPortOpen(WEB_PORT);
  if (webRunning) {
    console.log(`[start] Web already running at http://localhost:${WEB_PORT}`);
  } else {
    console.log(`[start] Starting web at http://localhost:${WEB_PORT}`);
    children.push(
      startProcess(
        "web",
        `npx vite --host ${HOST} --port ${WEB_PORT} --strictPort`
      )
    );
  }

  if (children.length === 0) {
    console.log("[start] Application is already running.");
    console.log(`[start] Open http://localhost:${WEB_PORT}`);
    return;
  }

  const shutdown = () => {
    for (const child of children) {
      if (!child.killed) {
        child.kill();
      }
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`[start] Open http://localhost:${WEB_PORT}`);
}

main().catch((error) => {
  console.error("[start] Failed to launch app:", error);
  process.exit(1);
});
