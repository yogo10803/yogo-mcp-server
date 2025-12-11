module.exports = {
  apps: [
    {
      name: "worklog-mcp",
      script: "main.py",
      interpreter: "python3",
      cwd: "./work-log",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    }
  ]
};
