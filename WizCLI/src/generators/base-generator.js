import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import { Listr } from "listr2";
import chalk from "chalk";
import ejs from "ejs";
import { execa } from "execa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Version constants for better maintainability
const DEPENDENCY_VERSIONS = {
  express: "^4.18.2",
  mongoose: "^8.0.3",
  sequelize: "^6.37.1",
  pg: "^8.11.3",
  dotenv: "^16.3.1",
  cors: "^2.8.5",
  helmet: "^7.1.0",
  morgan: "^1.10.0",
  "express-rate-limit": "^6.8.1",
  typescript: "^5.2.2",
  "@types/express": "^4.17.21",
  "@types/mongoose": "^5.11.97",
  "@types/pg": "^8.10.8",
  nodemon: "^3.0.2"
};

export class BaseGenerator {
  constructor(projectName, options) {
    this.projectName = projectName;
    this.options = options;
    this.targetDir = path.resolve(process.cwd(), projectName);
    this.templateDir = path.join(__dirname, "../templates");
    this.fileExtension = this.options.language === "typescript" ? "ts" : "js";
    this.envVariables = [];
  }

  async execute() {
    const tasks = new Listr(
      [
        {
          title: "Validating project configuration",
          task: () => this.validate(),
        },
        {
          title: "Creating directory structure",
          task: () => this.createStructure(),
        },
        {
          title: "Generating project files",
          task: () => this.generateCode(),
        },
        {
          title: "Initializing version control",
          task: () => this.initializeGit(),
          enabled: () => this.options.gitInit,
        },
        {
          title: "Installing dependencies",
          task: () => this.installDependencies(),
          enabled: () => this.options.installDeps,
        },
      ],
      {
        exitOnError: false,
        rendererOptions: { collapse: false },
      }
    );

    try {
      await tasks.run();
      console.log(chalk.green.bold("\n🚀 Project ready! Next steps:"));
      console.log(chalk.cyan(`cd ${this.projectName}`));

      if (this.options.language === "typescript") {
        console.log(chalk.cyan("npm run dev   # Start development server"));
        console.log(chalk.cyan("npm run build # Build for production"));
      } else {
        console.log(chalk.cyan("npm start     # Start application"));
      }

      if (this.options.database !== "None") {
        console.log(
          chalk.yellow(
            "\n⚠️ Remember to configure your database connection in .env"
          )
        );
      }
    } catch (error) {
      console.error(chalk.red.bold("\n💥 Generation failed:"));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  }

  validate() {
    // Validate project name
    if (
      !/^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
        this.projectName
      )
    ) {
      throw new Error("Invalid project name (follow npm package naming rules)");
    }

    // Validate database selection consistency
    if (this.options.database !== "None" && this.options.backend === "None") {
      throw new Error("Database requires a backend framework");
    }
  }

  async createStructure() {
    const dirs = [
      "src",
      "src/config",
      "src/routes",
      "src/middlewares",
      this.options.language === "typescript" ? "types" : "",
      this.options.frontend !== "None" ? "public" : "",
    ].filter(Boolean);

    await Promise.all(
      dirs.map((dir) =>
        fs.mkdir(path.join(this.targetDir, dir), { recursive: true })
      )
    );
  }

  async generateCode() {
    // Core files to generate
    const generationTasks = [
      this.generatePackageJson(),
      this.generateEnv(),
      this.generateServer(),
      this.generateGitignore(),
    ];

    // Add TypeScript config only if needed
    if (this.options.language === "typescript") {
      generationTasks.push(this.generateTsConfig());
    }

    await Promise.all(generationTasks);

    // Generate database config if needed
    if (this.options.database !== "None") {
      await this.generateDbConfig();
    }

    // Generate middleware files
    if (this.options.middleware?.length > 0) {
      await this.generateMiddlewareFiles();
    }
  }

  async generatePackageJson() {
    const template = await fs.readFile(
      path.join(this.templateDir, "shared/package.json.ejs"),
      "utf-8"
    );

    const content = ejs.render(template, {
      projectName: this.projectName,
      language: this.options.language,
      dependencies: this.getDependencies(),
      devDependencies: this.getDevDependencies(),
      scripts: this.getNpmScripts(),
    });

    await fs.writeFile(path.join(this.targetDir, "package.json"), content);
  }

  async generateServer() {
    if (this.options.backend === "None") return;

    const templatePath = path.join(
      this.templateDir,
      `${this.options.backend.toLowerCase()}/server.${this.fileExtension}.ejs`
    );

    try {
      const template = await fs.readFile(templatePath, "utf-8");
      const content = ejs.render(template, {
        database: this.options.database,
        middleware: this.options.middleware,
        projectName: this.projectName,
      });

      await fs.writeFile(
        path.join(this.targetDir, `src/server.${this.fileExtension}`),
        content
      );
    } catch (error) {
      throw new Error(`Failed to generate server: ${error.message}`);
    }
  }

  async generateDbConfig() {
    const dbType = this.options.database.toLowerCase();
    const templatePath = path.resolve(
      this.templateDir,
      `shared/db/${dbType}.${this.fileExtension}.ejs`
    );

    try {
      await fs.access(templatePath);
      const template = await fs.readFile(templatePath, "utf-8");
      const content = ejs.render(template, {
        projectName: this.projectName,
      });

      await fs.writeFile(
        path.join(this.targetDir, `src/config/db.${this.fileExtension}`),
        content
      );
    } catch (error) {
      throw new Error(`Database template not found for ${dbType}`);
    }
  }

  async generateEnv() {
    let content = `PORT=3000\nNODE_ENV=development\n`;

    if (this.options.database === "MongoDB") {
      content += "MONGO_URI=mongodb://localhost:27017/yourdbname\n";
    }

    if (this.options.database === "PostgreSQL") {
      content += "PG_HOST=localhost\n";
      content += "PG_PORT=5432\n";
      content += "PG_USER=youruser\n";
      content += "PG_PASSWORD=yourpassword\n";
      content += "PG_DATABASE=yourdb\n";
    }

    await fs.writeFile(path.join(this.targetDir, ".env"), content);

    // Create example env file
    await fs.writeFile(
      path.join(this.targetDir, ".env.example"),
      content.replace(/=.*$/gm, "=")
    );
  }

  async generateGitignore() {
    const content = [
      "node_modules",
      ".env",
      "dist",
      "coverage",
      ".DS_Store",
    ].join("\n");

    await fs.writeFile(path.join(this.targetDir, ".gitignore"), content);
  }

  getDependencies() {
    const deps = {};

    // Core dependencies
    if (this.options.backend !== "None") {
      deps.dotenv = DEPENDENCY_VERSIONS.dotenv;
    }

    // Backend specific
    if (this.options.backend === "Express") {
      deps.express = DEPENDENCY_VERSIONS.express;
      this.options.middleware?.forEach((mw) => {
        if (mw === "cors") deps.cors = DEPENDENCY_VERSIONS.cors;
        if (mw === "helmet") deps.helmet = DEPENDENCY_VERSIONS.helmet;
        if (mw === "morgan") deps.morgan = DEPENDENCY_VERSIONS.morgan;
        if (mw === "express-rate-limit") {
          deps["express-rate-limit"] =
            DEPENDENCY_VERSIONS["express-rate-limit"];
        }
      });
    }

    // Database
    if (this.options.database === "MongoDB") {
      deps.mongoose = DEPENDENCY_VERSIONS.mongoose;
    }
    if (this.options.database === "PostgreSQL") {
      deps.sequelize = DEPENDENCY_VERSIONS.sequelize;
      deps.pg = DEPENDENCY_VERSIONS.pg;
    }

    return deps;
  }

  getDevDependencies() {
    const devDeps = {
      nodemon: DEPENDENCY_VERSIONS.nodemon,
    };

    if (this.options.language === "typescript") {
      devDeps.typescript = DEPENDENCY_VERSIONS.typescript;

      if (this.options.backend === "Express") {
        devDeps["@types/express"] = DEPENDENCY_VERSIONS["@types/express"];
      }

      if (this.options.database === "MongoDB") {
        devDeps["@types/mongoose"] = DEPENDENCY_VERSIONS["@types/mongoose"];
      }

      if (this.options.database === "PostgreSQL") {
        devDeps["@types/pg"] = DEPENDENCY_VERSIONS["@types/pg"];
      }
    }

    return devDeps;
  }

  getNpmScripts() {
    const scripts = {
      start: "node src/server.js",
      dev: "nodemon src/server.js",
    };

    if (this.options.language === "typescript") {
      scripts.build = "tsc";
      scripts.start = "node dist/server.js";
      scripts.dev = "nodemon src/server.ts";
      scripts["start:prod"] = "npm run build && npm start";
    }

    return scripts;
  }

  async initializeGit() {
    try {
      await execa("git", ["init"], { cwd: this.targetDir });
      console.log(chalk.green("\n✅ Git repository initialized"));
    } catch (error) {
      console.error(chalk.red("\n⚠️ Failed to initialize Git repository"));
    }
  }

  async installDependencies() {
    try {
      await execa("npm", ["install", "--quiet"], {
        cwd: this.targetDir,
        stdio: "inherit",
      });
    } catch (error) {
      throw new Error(
        "Dependency installation failed. Run 'npm install' manually."
      );
    }
  }
}