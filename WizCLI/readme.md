# WizCLI - Full-Stack Project Generator

<!-- ![WizCLI Logo](https://via.placeholder.com/150?text=WizCLI)   -->
*Accelerate your development workflow with a single command*

WizCLI is a powerful command-line tool that helps developers quickly scaffold full-stack JavaScript/TypeScript applications with various backend and frontend options. Generate production-ready project structures in seconds!

## Features

- ⚡ **Instant Project Scaffolding** - Create full-stack projects in seconds
- 🔌 **Multiple Backend Options** - Express, Fastify, or backend-free projects
- 🖥️ **Modern Frontend Support** - React or Vue with Vite
- 🗄️ **Database Integration** - MongoDB or PostgreSQL support
- 🔐 **Authentication Ready** - JWT authentication out-of-the-box
- 📦 **Smart Dependency Management** - Automatic installation of required packages
- ⚙️ **Production-Ready Configuration** - Includes environment setup, TypeScript config, and more

## Installation

Install WizCLI globally using npm:

```bash
npm install -g @harsh2004/wizcli
```

## Usage

### Create a New Project
```bash
wizcli init <project-name>
```

### Command Options
| Option             | Description                          | Default |
|--------------------|--------------------------------------|---------|
| `--git-init`       | Initialize Git repository            | false   |
| `--install-deps`   | Install dependencies automatically   | false   |
| `--language <lang>`| Set project language (js/ts)         | Prompt  |

### Interactive Prompts
When you run `wizcli init`, you'll be guided through an interactive setup:

1. **Project Language**: Choose JavaScript or TypeScript
2. **Backend Framework**: Express, Fastify, or None
3. **Database**: MongoDB, PostgreSQL, or None
4. **Middleware**: Select security and utility middleware
5. **Frontend Framework**: React, Vue, or None
6. **Authentication**: JWT or None

## Project Structures

### Full-Stack Project (Express + React)
```
my-project/
├── client/          # Frontend (React)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── src/             # Backend (Express)
│   ├── config/
│   ├── routes/
│   ├── models/
│   ├── middlewares/
│   └── server.js
├── .env
├── .gitignore
└── package.json
```

### Frontend-Only Project (Vue)
```
my-project/
├── public/
├── src/
├── index.html
├── vite.config.js
└── package.json
```

### Backend-Only Project (Fastify + PostgreSQL)
```
my-project/
├── src/
│   ├── config/
│   ├── routes/
│   ├── models/
│   └── server.js
├── .env
├── .gitignore
└── package.json
```

## Commands After Project Creation

### For Backend Projects
```bash
npm start      # Start JavaScript backend
npm run dev    # Start TypeScript backend in dev mode
npm run build  # Build TypeScript project
```

### For Frontend Projects
```bash
npm install    # Install dependencies
npm run dev    # Start development server
npm run build  # Build for production
```

## Configuration

### Environment Variables (.env)
```env
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/yourdbname

# PostgreSQL Configuration
PG_HOST=localhost
PG_PORT=5432
PG_USER=youruser
PG_PASSWORD=yourpassword
PG_DATABASE=yourdb
```

### TypeScript Config (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

## Custom Templates

WizCLI uses EJS templates for project generation. You can customize these templates by modifying files in the `templates` directory:

```
templates/
├── auth/
│   └── jwt/
│       └── backend/
├── express/
│   └── server.js.ejs
├── fastify/
│   └── server.js.ejs
├── frontend/
│   ├── react/
│   └── vue/
└── shared/
    ├── db/
    └── models/
```

## Contributing

We welcome contributions! Here's how to set up your development environment:

1. **Clone the repository**
   ```bash
   git clone https://github.com/Harsh0369/NPM-Package
   cd wizcli
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Link the package globally**
   ```bash
   npm link
   ```

4. **Run the CLI locally**
   ```bash
   wizcli init test-project
   ```

5. **Run tests**
   ```bash
   npm test
   ```

Please follow our [contribution guidelines](CONTRIBUTING.md) when submitting pull requests.

## Roadmap

- [ ] Add support for Next.js
- [ ] Implement SQLite database option
- [ ] Add Docker configuration
- [ ] Create project update mechanism
- [ ] Develop VS Code extension companion

## Support

For issues, feature requests, or questions, please:

1. Check the [troubleshooting guide](TROUBLESHOOTING.md)
2. Search [existing issues](https://github.com/yourusername/wizcli/issues)
3. [Open a new issue](https://github.com/yourusername/wizcli/issues/new)

## License

WizCLI is [MIT licensed](LICENSE).

---

## FAQ

### Can I use WizCLI for existing projects?
WizCLI is designed for new project generation. For existing projects, you'll need to manually integrate the components you need.

### How do I update dependencies in generated projects?
Currently, you need to update dependencies manually in your project. We're working on an update mechanism for future releases.

### Can I create custom templates?
Yes! You can modify the templates in the `templates` directory to match your preferred project structure.

### Is there support for CSS frameworks?
Not currently, but we're planning to add support for Tailwind CSS and Bootstrap in the next release.

### How do I uninstall WizCLI?
```bash
npm uninstall -g wizcli
```

---

**Happy Coding!** 🚀