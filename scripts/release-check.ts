const commands = [
  ["bun", "run", "lint"],
  ["bun", "run", "typecheck"],
  ["bun", "run", "test:coverage"],
  ["bun", "run", "build"],
  ["bun", "run", "audit"],
  ["bun", "run", "package:check"],
  ["bun", "run", "plugin:check"],
];

for (const command of commands) {
  console.log(`\n> ${command.join(" ")}`);
  const child = Bun.spawn(command, { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  const exitCode = await child.exited;
  if (exitCode !== 0) globalThis.process.exit(exitCode);
}
