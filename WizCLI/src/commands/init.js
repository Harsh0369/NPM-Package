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
        const base = ["cors", "helmet"];
        return answers.backend === "Express"
          ? [...base, "morgan", "express-rate-limit"]
          : base;
      },
      when: (answers) => answers.backend !== "None",
    },
  ]);

  const generator = new BaseGenerator(project, {
    ...options,
    ...answers,
  });

  await generator.execute();
}
