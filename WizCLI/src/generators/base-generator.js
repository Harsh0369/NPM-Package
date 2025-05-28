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
  fastify: "^4.25.2",
  "@fastify/helmet": "^11.0.0",
  "@fastify/cors": "^8.2.1",
  "@fastify/rate-limit": "^8.0.1",
  "@types/fastify": "^4.25.7",
  mongoose: "^8.0.3",
  sequelize: "^6.37.1",
  pg: "^8.11.3",
  dotenv: "^16.3.1",
  cors: "^2.8.5",
  helmet: "^7.1.0",
  morgan: "^1.10.0",
  "express-rate-limit": "^6.8.1",
  typescript: "^5.2.2",
  "ts-node": "^10.9.1",
  "@types/node": "^20.12.0",
  "@types/passport-google-oauth": "^2.0.12",
  "@types/express": "^4.17.21",
  "@types/mongoose": "^5.11.97",
  "@types/pg": "^8.10.8",
  nodemon: "^3.0.2",
  jsonwebtoken: "^9.0.2",
  bcryptjs: "^2.4.3",
  passport: "^0.7.0",
  "@types/jsonwebtoken": "^9.0.5",
  "@types/bcryptjs": "^2.4.6",
  "@types/passport": "^1.0.15",
  "passport-google-oauth20": "^2.0.0",
  "@types/jsonwebtoken": "^9.0.5",
  "@types/passport": "^1.0.15",
  "@types/bcryptjs": "^2.4.6",
  react: "^18.2.0",
  "react-dom": "^18.2.0",
  "@vitejs/plugin-react": "^4.2.1",
  "@vitejs/plugin-vue": "^5.0.4",
  vue: "^3.4.0",
  vite: "^5.0.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "react-router-dom": "^6.22.3",
  "@vue/tsconfig": "^0.5.1",
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
          title: "Generating frontend",
          task: () => this.generateFrontend(),
          enabled: () =>
            this.options.frontend && this.options.frontend !== "None",
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
        {
          title: "Generating TypeScript config",
          task: () => this.generateTsConfig(),
          enabled: () => this.options.language === "typescript",
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

      // Handle frontend-only projects
      if (this.options.backend === "None") {
        console.log(chalk.cyan("npm install   # Install dependencies"));
        console.log(chalk.cyan("npm run dev   # Start development server"));
      }
      // Handle fullstack projects
      else if (this.options.frontend !== "None") {
        console.log(chalk.cyan("cd client     # Go to frontend directory"));
        console.log(
          chalk.cyan("npm install   # Install frontend dependencies")
        );
        console.log(chalk.cyan("npm run dev   # Start frontend server"));
        console.log(chalk.cyan("\n# In root directory:"));
        console.log(chalk.cyan("npm install   # Install backend dependencies"));

        // Use correct start command based on language
        if (this.options.language === "typescript") {
          console.log(chalk.cyan("npm run dev   # Start backend server"));
        } else {
          console.log(chalk.cyan("npm start     # Start backend server"));
        }
      }
      // Handle backend-only projects
      else {
        if (this.options.language === "typescript") {
          console.log(chalk.cyan("npm run dev   # Start development server"));
          console.log(chalk.cyan("npm run build # Build for production"));
        } else {
          console.log(chalk.cyan("npm start     # Start application"));
        }
      }

      // Only show database warning if database is selected
      if (this.options.database && this.options.database !== "None") {
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

    // Only validate database if backend exists and is not "None"
    if (this.options.backend && this.options.backend !== "None") {
      // Validate that if database is selected, backend is not "None"
      if (this.options.database !== "None" && this.options.backend === "None") {
        throw new Error("Database requires a backend framework");
      }
    }
  }
  async createStructure() {
    const dirs = [];

    // Only create backend directories if backend exists
    if (this.options.backend && this.options.backend !== "None") {
      dirs.push(
        "src",
        "src/config",
        "src/routes",
        "src/middlewares",
        this.options.language === "typescript" ? "types" : ""
      );
    }

    // For fullstack projects, create client directory
    if (this.options.backend !== "None" && this.options.frontend !== "None") {
      dirs.push("client");
    }

    // For frontend-only projects, create public directory in root
    if (this.options.backend === "None" && this.options.frontend !== "None") {
      dirs.push("public");
    }

    await Promise.all(
      dirs
        .filter(Boolean)
        .map((dir) =>
          fs.mkdir(path.join(this.targetDir, dir), { recursive: true })
        )
    );
  }

  async generateCode() {
    // Core files to generate - always included
    const generationTasks = [
      this.generatePackageJson(),
      this.generateGitignore(),
      this.generateFrontend(),
    ];

    // Only include backend-specific tasks if backend exists
    if (this.options.backend && this.options.backend !== "None") {
      generationTasks.push(this.generateEnv(), this.generateServer());

      // Only add authentication if enabled
      if (
        this.options.authentication &&
        this.options.authentication !== "none"
      ) {
        generationTasks.push(this.generateAuthentication());
      }
    }

    // TypeScript config
    if (this.options.language === "typescript") {
      generationTasks.push(this.generateTsConfig());
    }

    // Run all generation tasks in parallel
    await Promise.all(generationTasks);

    // Database config (only if backend exists)
    if (
      this.options.backend &&
      this.options.backend !== "None" &&
      this.options.database &&
      this.options.database !== "None"
    ) {
      await this.generateDbConfig();
    }

    // Middleware files (only if backend exists)
    if (
      this.options.backend &&
      this.options.backend !== "None" &&
      this.options.middleware?.length > 0
    ) {
      await this.generateMiddlewareFiles();
    }
  }

  getTemplateData() {
    return {
      projectName: this.projectName,
      options: this.options,
      authentication: this.options.authentication,
      database: this.options.database
        ? this.options.database.toLowerCase()
        : "none",
      middleware: this.options.middleware || [],
      language: this.options.language,
      scripts: this.getNpmScripts(),
      dependencies: this.getDependencies(),
      devDependencies: this.getDevDependencies(),
      bundler: this.options.bundler || "vite",
    };
  }

  async generateTsConfig() {
    const templatePath = path.join(
      this.templateDir,
      "shared/tsconfig.json.ejs"
    );
    const template = await fs.readFile(templatePath, "utf-8");
    const content = ejs.render(template, this.getTemplateData());

    await fs.writeFile(path.join(this.targetDir, "tsconfig.json"), content);
  }

  async generateAuthentication() {
    if (this.options.authentication === "none") return;
    if (
      !this.options.backend ||
      !this.options.authentication ||
      this.options.authentication === "none"
    )
      return;

    const authType = this.options.authentication;
    const ext = this.fileExtension; // Get .ts or .js based on language
    const templatePath = path.join(
      this.templateDir,
      `auth/${authType}/backend`
    );

    // 1. Generate auth files with proper extensions
    await this.renderTemplates(templatePath, path.join(this.targetDir, "src"), {
      ...this.getTemplateData(),
      ext: ext, // Pass extension to templates
      authImportPath: `./routes/auth.routes${ext === "ts" ? "" : ".js"}`,
    });

    // 2. Update server file with type-safe imports
    await this.integrateAuthRoutes();
  }

  async integrateAuthRoutes() {
    if (!this.options.authentication || this.options.authentication === "none")
      return;

    const serverFile = path.join(
      this.targetDir,
      `src/server.${this.fileExtension}`
    );

    let content = await fs.readFile(serverFile, "utf-8");
    const isTS = this.options.language === "typescript";

    // Import statement template
    const authImport = isTS
      ? "import authRoutes from './routes/auth.routes';"
      : "const authRoutes = require('./routes/auth.routes');";

    // Route mounting template
    const routeMount = "app.use('/api/auth', authRoutes);";

    // Add import if missing
    if (!content.includes("authRoutes")) {
      content = content.replace(/(\/\/ Routes)/, `${authImport}\n$1`);
    }

    // Add route mounting if missing
    if (!content.includes("/api/auth")) {
      content = content.replace(
        /(app\.use\(express\.json\(\)\);)/,
        `$1\n${routeMount}`
      );
    }

    // Clean up any duplicate entries
    content = content
      .replace(/(import.*authRoutes.*;\n){2,}/g, "$1")
      .replace(/(app\.use\('\/api\/auth'.*;\n){2,}/g, "$1");

    await fs.writeFile(serverFile, content);
  }

  async renderTemplates(srcDir, destDir, data) {
    if (!(await this.pathExists(srcDir))) return;
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name.replace(/\.ejs$/, ""));

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.renderTemplates(srcPath, destPath, data);
      } else if (entry.isFile()) {
        if (path.extname(srcPath) === ".ejs") {
          const template = await fs.readFile(srcPath, "utf-8");
          const content = ejs.render(template, data);
          await fs.writeFile(destPath, content);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    }
  }

  // async integrateAuthRoutes() {
  //   const serverFile = path.join(
  //     this.targetDir,
  //     `src/server.${this.fileExtension}`
  //   );

  //   // Read and parse server file
  //   let serverContent = await fs.readFile(serverFile, "utf-8");

  //   // Add auth route import
  //   const authImport =
  //     this.fileExtension === "ts"
  //       ? `import authRoutes from './routes/auth.routes';`
  //       : `const authRoutes = require('./routes/auth.routes');`;

  //   if (!serverContent.includes("authRoutes")) {
  //     serverContent = serverContent.replace(
  //       /\/\/ Routes/,
  //       `${authImport}\n// Routes`
  //     );
  //   }

  //   // Add route mounting
  //   if (!serverContent.includes("/api/auth")) {
  //     serverContent = serverContent.replace(
  //       /app\.use\(express\.json\(\)\);/,
  //       `app.use(express.json());\napp.use('/api/auth', authRoutes);`
  //     );
  //   }

  //   await fs.writeFile(serverFile, serverContent);
  // }
  async generatePackageJson() {
    const template = await fs.readFile(
      path.join(this.templateDir, "shared/package.json.ejs"),
      "utf-8"
    );

    const content = ejs.render(template, this.getTemplateData());

    await fs.writeFile(path.join(this.targetDir, "package.json"), content);
  }

  async generateServer() {
    if (this.options.backend === "None") return;

    const backend = this.options.backend.toLowerCase();
    const templateName = `server.${this.fileExtension}.ejs`;
    const outputFileName = `server.${this.fileExtension}`;

    try {
      // Verify template exists
      const templatePath = path.join(this.templateDir, backend, templateName);
      await fs.access(templatePath, fs.constants.F_OK);

      // Generate server file
      const template = await fs.readFile(templatePath, "utf-8");
      const content = ejs.render(template, this.getTemplateData());

      const outputPath = path.join(this.targetDir, "src", outputFileName);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, content);
    } catch (error) {
      throw new Error(`Failed to generate server: ${error.message}`);
    }
  }

  async generateDbConfig() {
    if (this.options.database === "None") return;

    try {
      const dbType = this.options.database.toLowerCase();
      const ext = this.fileExtension;
      const configDir = path.join(this.targetDir, "src/config");

      // 1. Generate Database Config
      await this.generateFileFromTemplate(
        `shared/db/${dbType}.${ext}.ejs`,
        path.join(configDir, `db.${ext}`)
      );

      // 2. Generate Models for both MongoDB and PostgreSQL
      if (dbType === "mongodb" || dbType === "postgresql") {
        const modelsDir = path.join(this.targetDir, "src/models");

        // Create models directory if it doesn't exist
        await fs.mkdir(modelsDir, { recursive: true });

        // Generate User model
        await this.generateFileFromTemplate(
          `shared/models/User.${ext}.ejs`,
          path.join(modelsDir, `User.${ext}`)
        );
      }
    } catch (error) {
      throw new Error(
        `Database setup failed: ${this.formatErrorMessage(error)}`
      );
    }
  }

  async cleanDirectory(dir, [name, ext]) {
    try {
      // Check if directory exists before trying to read it
      if (!(await this.pathExists(dir))) return;

      const files = await fs.readdir(dir);
      await Promise.all(
        files.map(async (file) => {
          if (file.startsWith(name) && !file.endsWith(`.${ext}`)) {
            await fs.unlink(path.join(dir, file));
          }
        })
      );
    } catch (error) {
      // Ignore "directory not found" errors
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  async generateFileFromTemplate(templatePath, outputPath, data = {}) {
    try {
      // Resolve the full template path
      const fullTemplatePath = path.join(this.templateDir, templatePath);

      // Check if template exists
      if (!(await this.pathExists(fullTemplatePath))) {
        throw new Error(`Missing template: ${path.basename(templatePath)}`);
      }

      const template = await fs.readFile(fullTemplatePath, "utf-8");
      const content = ejs.render(template, {
        ...this.getTemplateData(),
        ...data,
      });

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, content);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`Missing template: ${path.basename(templatePath)}`);
      }
      throw error;
    }
  }

  formatErrorMessage(error) {
    if (error.code === "ENOENT") {
      const missingFile = error.path.split(/[\\/]/).pop();
      return `Missing template file: ${missingFile.replace(".ejs", "")}`;
    }
    return error.message;
  }

  async generateEnv() {
    // Skip .env generation for frontend-only projects
    if (this.options.backend === "None") return;

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

  async generateFrontend() {
    if (!this.options.frontend || this.options.frontend === "None") return;

    const framework = this.options.frontend.toLowerCase();
    const isFrontendOnly = this.options.backend === "None";

    // Determine target directory
    const frontendDir = isFrontendOnly
      ? this.targetDir
      : path.join(this.targetDir, "client");

    try {
      // Create directory if it doesn't exist
      await fs.mkdir(frontendDir, { recursive: true });

      // Get template directory path
      const templatePath = path.join(this.templateDir, `frontend/${framework}`);

      // Only render templates if the directory exists
      if (await this.pathExists(templatePath)) {
        await this.renderTemplates(
          templatePath,
          frontendDir,
          this.getTemplateData()
        );
      }

      // For frontend-only projects, move public directory to root
      if (isFrontendOnly) {
        const srcPublic = path.join(frontendDir, "public");
        const destPublic = path.join(this.targetDir, "public");

        if (await this.pathExists(srcPublic)) {
          await fs.rename(srcPublic, destPublic);
        }
      }

      // Generate package.json
      await this.generateFrontendPackageJson(frontendDir, framework);
    } catch (error) {
      throw new Error(`Frontend setup failed: ${error.message}`);
    }
  }

  async generateFrontendPackageJson(targetDir, framework) {
    const templatePath = path.join(
      this.templateDir,
      `frontend/${framework}/package.json.ejs`
    );

    // Only proceed if template exists
    if (!(await this.pathExists(templatePath))) {
      return;
    }

    try {
      const template = await fs.readFile(templatePath, "utf-8");

      // Create a versions object with all required dependencies
      const versions = {
        react: DEPENDENCY_VERSIONS.react || "^18.2.0",
        "react-dom": DEPENDENCY_VERSIONS["react-dom"] || "^18.2.0",
        vue: DEPENDENCY_VERSIONS.vue || "^3.4.0",
        vite: DEPENDENCY_VERSIONS.vite || "^5.0.0",
        "@vitejs/plugin-react":
          DEPENDENCY_VERSIONS["@vitejs/plugin-react"] || "^4.2.1",
        "@vitejs/plugin-vue":
          DEPENDENCY_VERSIONS["@vitejs/plugin-vue"] || "^5.0.4",
      };

      const content = ejs.render(template, {
        projectName: this.projectName,
        framework: framework,
        isTypeScript: this.options.language === "typescript",
        versions: versions, // Pass the versions object
      });

      await fs.writeFile(path.join(targetDir, "package.json"), content);
    } catch (error) {
      throw new Error(
        `Frontend package.json generation failed: ${error.message}`
      );
    }
  }

  // Add this helper function to your class
  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  // async generateFrontendPackageJson(targetDir, framework) {
  //   const templatePath = path.join(
  //     this.templateDir,
  //     `frontend/${framework}/package.json.ejs`
  //   );

  //   try {
  //     const template = await fs.readFile(templatePath, "utf-8");

  //     // Create version data object with fallbacks
  //     const versionData = {
  //       reactVersion: DEPENDENCY_VERSIONS.react || "^18.2.0",
  //       reactDomVersion: DEPENDENCY_VERSIONS["react-dom"] || "^18.2.0",
  //       viteVersion: DEPENDENCY_VERSIONS.vite || "^5.0.0",
  //       vueVersion: DEPENDENCY_VERSIONS.vue || "^3.4.0",
  //       pluginReactVersion:
  //         DEPENDENCY_VERSIONS["@vitejs/plugin-react"] || "^4.2.1",
  //       pluginVueVersion: DEPENDENCY_VERSIONS["@vitejs/plugin-vue"] || "^5.0.4",
  //     };

  //     const content = ejs.render(template, {
  //       projectName: this.projectName,
  //       framework: framework,
  //       isTypeScript: this.options.language === "typescript",
  //       ...versionData, // Pass version data directly
  //     });

  //     await fs.writeFile(path.join(targetDir, "package.json"), content);
  //   } catch (error) {
  //     throw new Error(
  //       `Frontend package.json generation failed: ${error.message}`
  //     );
  //   }
  // }

  getFrontendDependencies(framework) {
    const deps = {};

    if (framework === "react") {
      deps.react = DEPENDENCY_VERSIONS.react;
      deps["react-dom"] = DEPENDENCY_VERSIONS["react-dom"];
      deps["@vitejs/plugin-react"] =
        DEPENDENCY_VERSIONS["@vitejs/plugin-react"] || "^4.2.1";
    }

    if (framework === "vue") {
      deps.vue = DEPENDENCY_VERSIONS.vue;
      deps["@vitejs/plugin-vue"] =
        DEPENDENCY_VERSIONS["@vitejs/plugin-vue"] || "^5.0.4";
    }

    return deps;
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
    if (this.options.backend && this.options.backend !== "None") {
      deps.dotenv = DEPENDENCY_VERSIONS.dotenv;
    }

    // Backend specific
    if (this.options.backend) {
      switch (this.options.backend) {
        case "Express":
          deps.express = DEPENDENCY_VERSIONS.express;
          (this.options.middleware || []).forEach((mw) => {
            if (mw === "cors") deps.cors = DEPENDENCY_VERSIONS.cors;
            if (mw === "helmet") deps.helmet = DEPENDENCY_VERSIONS.helmet;
            if (mw === "morgan") deps.morgan = DEPENDENCY_VERSIONS.morgan;
            if (mw === "express-rate-limit") {
              deps["express-rate-limit"] =
                DEPENDENCY_VERSIONS["express-rate-limit"];
            }
          });
          break;

        case "Fastify":
          deps.fastify = DEPENDENCY_VERSIONS.fastify;
          (this.options.middleware || []).forEach((mw) => {
            if (mw === "@fastify/helmet") {
              deps["@fastify/helmet"] = DEPENDENCY_VERSIONS["@fastify/helmet"];
            }
            if (mw === "@fastify/cors") {
              deps["@fastify/cors"] = DEPENDENCY_VERSIONS["@fastify/cors"];
            }
            if (mw === "@fastify/rate-limit") {
              deps["@fastify/rate-limit"] =
                DEPENDENCY_VERSIONS["@fastify/rate-limit"];
            }
          });
          break;
      }
    }

    // Database
    if (this.options.database === "MongoDB") {
      deps.mongoose = DEPENDENCY_VERSIONS.mongoose;
    }
    if (this.options.database === "PostgreSQL") {
      deps.sequelize = DEPENDENCY_VERSIONS.sequelize;
      deps.pg = DEPENDENCY_VERSIONS.pg;
    }

    // Authentication - with safeguards
    if (
      this.options.backend &&
      this.options.backend !== "None" &&
      this.options.authentication
    ) {
      if (this.options.authentication === "jwt") {
        deps.jsonwebtoken = "^9.0.2";
        deps.bcryptjs = "^2.4.3";
      }
    }

    // Frontend dependencies only for frontend-only projects
    if (this.options.backend === "None" && this.options.frontend) {
      if (this.options.frontend === "React") {
        deps.react = DEPENDENCY_VERSIONS.react;
        deps["react-dom"] = DEPENDENCY_VERSIONS["react-dom"];
      }
      if (this.options.frontend === "Vue") {
        deps.vue = DEPENDENCY_VERSIONS.vue;
      }
    }

    return Object.fromEntries(
      Object.entries(deps).filter(([_, v]) => v !== undefined)
    );
  }

  getDevDependencies() {
    const devDeps = {
      nodemon: DEPENDENCY_VERSIONS.nodemon,
    };

    if (this.options.language === "typescript") {
      // Core TypeScript tooling
      devDeps.typescript = DEPENDENCY_VERSIONS.typescript;
      devDeps["ts-node"] = DEPENDENCY_VERSIONS["ts-node"];
      devDeps["@types/node"] = DEPENDENCY_VERSIONS["@types/node"];

      // Backend type definitions
      if (this.options.backend === "Express") {
        devDeps["@types/express"] = DEPENDENCY_VERSIONS["@types/express"];
      }
      if (this.options.backend === "Fastify") {
        devDeps["@types/fastify"] = DEPENDENCY_VERSIONS["@types/fastify"];
      }

      // Database type definitions
      if (this.options.database === "PostgreSQL") {
        devDeps["@types/pg"] = DEPENDENCY_VERSIONS["@types/pg"];
      }

      // Authentication type definitions - with safeguards
      if (this.options.authentication === "jwt") {
        devDeps["@types/jsonwebtoken"] =
          DEPENDENCY_VERSIONS["@types/jsonwebtoken"];
        devDeps["@types/bcryptjs"] = DEPENDENCY_VERSIONS["@types/bcryptjs"];
      }
    }

    return Object.fromEntries(
      Object.entries(devDeps).filter(([_, v]) => v !== undefined)
    );
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

    // Ensure no trailing commas in object
    return Object.fromEntries(
      Object.entries(scripts).filter(([_, value]) => value !== undefined)
    );
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