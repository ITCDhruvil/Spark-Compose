# Prerequisites

Before you set up Spark Compose on your computer, you need a few tools installed. Think of these as the basic ingredients before you can cook.

## What you need

### 1. Node.js (version 18 or newer)

Node.js lets your computer run JavaScript outside the browser. Spark Compose is a **Next.js** app, so Node is required.

**How to check if you already have it:**

```bash
node --version
```

You should see something like `v20.x.x` or `v22.x.x`. If the command is not found, install Node from [https://nodejs.org](https://nodejs.org) (choose the **LTS** version).

Installing Node also installs **npm** (the package manager we use to download project libraries).

**Check npm:**

```bash
npm --version
```

### 2. Git

Git is used to clone (download) the repository and track changes.

```bash
git --version
```

If missing, install from [https://git-scm.com](https://git-scm.com).

### 3. A code editor (recommended)

- [Visual Studio Code](https://code.visualstudio.com/) or **Cursor** works well for this project.

### 4. OpenAI API key (for AI features only)

AI features (Draft, Improve, Summarize, etc.) need an API key on the **server**. The app still runs without it, but AI buttons will fail or return errors.

You can get a key from [https://platform.openai.com](https://platform.openai.com).

---

## Operating system

The project is developed on **Windows**, **macOS**, and **Linux**. Commands in this docs use bash-style examples; on Windows PowerShell, most commands work the same (`npm run dev`, etc.).

## Optional

| Tool | Why |
|------|-----|
| **GitHub CLI (`gh`)** | Creating pull requests from the terminal |
| **Another port** | If port 3000 is busy, use `$env:PORT=3001; npm run start` (PowerShell) or `PORT=3001 npm run start` (macOS/Linux) |

## Next step

→ [Installation](./installation.md)
