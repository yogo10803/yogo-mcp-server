// start-all.js
const { spawn } = require("child_process");

const servers = [
  { name: "playwright", command: "npx", args: ["@playwright/mcp@latest"] },
  { name: "context7", command: "npx", args: ["@upstash/context7-mcp"] }
];

servers.forEach(s => {
  const proc = spawn(s.command, s.args, { stdio: "inherit" });
  proc.on("exit", code => console.log(`${s.name} exited with code ${code}`));
});

