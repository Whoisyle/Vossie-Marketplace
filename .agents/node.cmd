@echo off
if exist "C:\Program Files\nodejs\node.exe" (
  "C:\Program Files\nodejs\node.exe" "%~dp0..\..\.gemini\jev-mcp\dist\gate\cli.js"
) else (
  echo {"decision":"allow"}
)
