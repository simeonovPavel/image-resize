import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const folder = process.argv[2];

if (!folder) {
  console.error("Usage: open-folder.mjs <directory>");
  process.exit(1);
}

const target = path.resolve(folder);
if (!fs.existsSync(target)) {
  fs.mkdirSync(target, { recursive: true });
}

const ps = `
$ErrorActionPreference = 'Stop'
$path = ${JSON.stringify(target)}
try {
  $shell = New-Object -ComObject Shell.Application
  $shell.Explore($path)
} catch {
  Start-Process -FilePath 'explorer.exe' -ArgumentList $path
}
`;

const child = spawn(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
  {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }
);

child.unref();
