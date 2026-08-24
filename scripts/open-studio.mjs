import { exec } from "node:child_process";

const url = "http://localhost:3000";
const cmd =
  process.platform === "win32"
    ? `start ${url}`
    : process.platform === "darwin"
      ? `open ${url}`
      : `xdg-open ${url}`;

exec(cmd, (error) => {
  if (error) {
    console.log(`Studio: ${url}`);
    return;
  }
  console.log(`Opened ${url}`);
});
