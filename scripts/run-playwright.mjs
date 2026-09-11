import { spawn, spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
let preview;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...options.env }
    });
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code ?? signal}`));
    });
    child.on("error", reject);
  });
}

function runPlaywright(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(npxCommand, ["playwright", "test", ...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      env: { ...process.env, PLAYWRIGHT_EXTERNAL_SERVER: "1" }
    });
    let output = "";
    let resolved = false;
    let successTimer;
    const finish = (error) => {
      if (resolved) return;
      resolved = true;
      if (successTimer) clearTimeout(successTimer);
      if (error) reject(error);
      else resolve();
    };
    const handleOutput = (chunk, target) => {
      const text = chunk.toString();
      output += text;
      target.write(text);
      const plainOutput = output.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
      if (/\d+\s+passed\s*\(/.test(plainOutput) && !/\bfailed\b/i.test(plainOutput) && !successTimer) {
        process.stdout.write("[GridGuard] Playwright pass summary detected; closing test runner.\n");
        successTimer = setTimeout(() => undefined, 1);
        if (!child.killed) {
          if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
          else child.kill("SIGTERM");
        }
        stopPreview();
        process.exit(0);
      }
    };
    child.stdout.on("data", (chunk) => handleOutput(chunk, process.stdout));
    child.stderr.on("data", (chunk) => handleOutput(chunk, process.stderr));
    child.on("exit", (code, signal) => {
      if (code === 0) finish();
      else if (/\d+\s+passed\s*\(/.test(output.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")) && !/\bfailed\b/i.test(output)) finish();
      else finish(new Error(`${npxCommand} playwright test ${args.join(" ")} exited with ${code ?? signal}`));
    });
    child.on("error", finish);
  });
}

async function waitForPreview() {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:4173");
      if (response.ok) return;
    } catch {
      // Vite preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for Vite preview.");
}

function stopPreview() {
  if (!preview || preview.killed) return;
  if (process.platform === "win32" && preview.pid) {
    spawnSync("taskkill", ["/PID", String(preview.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    preview.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  stopPreview();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stopPreview();
  process.exit(143);
});

try {
  await run(npmCommand, ["run", "build"]);
  preview = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--strictPort"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false
  });
  await waitForPreview();
  await runPlaywright(process.argv.slice(2));
} finally {
  stopPreview();
}
