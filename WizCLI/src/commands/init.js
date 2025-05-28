import inquirer from "inquirer";
import chalk from "chalk";
import { BaseGenerator } from "../generators/base-generator.js";

export default async function init(project, options) {
  console.log(chalk.blue(`\n✨ Starting ${chalk.bold("WizCLI")}...`));

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "language",
      message: "Project language:",
      choices: ["JavaScript", "TypeScript"],
      filter: (input) => input.toLowerCase(),
    },
    {
      type: "list",
      name: "backend",
      message: "Backend framework:",
      choices: ["Express", "Fastify", "None"],
    },
    {
      type: "list",
      name: "database",
      message: "Database:",
      choices: ["None", "MongoDB", "PostgreSQL"],
      when: (answers) => answers.backend !== "None",
    },
    {
      type: "checkbox",
      name: "middleware",
      message: "Select middleware:",
      choices: (answers) => {
        const base = ["helmet"];
        return answers.backend === "Express"
          ? [...base, "morgan", "express-rate-limit"]
          : answers.backend === "Fastify"
          ? [...base, "@fastify/rate-limit", "@fastify/cors"]
          : base;
      },
      when: (answers) => answers.backend !== "None",
    },
    // Updated frontend prompt - always shown
    {
      type: "list",
      name: "frontend",
      message: "Select frontend framework:",
      choices: (answers) => {
        // When backend is "None", require a frontend framework
        if (answers.backend === "None") {
          return ["React", "Vue"];
        }
        // When backend exists, allow no frontend
        return ["None", "React", "Vue"];
      },
      // Always show this prompt
      default: "None",
    },
    // Removed bundler selection - default to Vite only
    {
      type: "list",
      name: "authentication",
      message: "Authentication strategy:",
      // Only show JWT and None options
      choices: ["None", "JWT"],
      when: (answers) => answers.backend !== "None",
      filter: (input) => input.toLowerCase(),
    },
  ]);

  // Always set bundler to Vite
  if (!answers.bundler) {
    answers.bundler = "Vite";
  }

  const generator = new BaseGenerator(project, {
    ...options,
    ...answers,
  });

  await generator.execute();
}
