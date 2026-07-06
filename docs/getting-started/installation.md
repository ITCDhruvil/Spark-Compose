# Installation

This guide walks you through getting the project on your machine from zero to a running folder.

## Step 1 — Get the code

If you already have the folder, skip to Step 2.

```bash
git clone <your-repository-url>
cd rich-editor
```

Replace `<your-repository-url>` with the actual Git remote for this project.

## Step 2 — Install dependencies

Inside the project folder, run:

```bash
npm install
```

**What this does:** Downloads all libraries listed in `package.json` into a `node_modules` folder. This can take a few minutes the first time.

**If you see peer dependency warnings:** The project uses React 19 RC with some packages that expect React 18. The app is configured to work with `--legacy-peer-deps` if needed:

```bash
npm install --legacy-peer-deps
```

Only use that if a plain `npm install` fails.

## Step 3 — Create your local environment file

The app needs secrets and config that must **not** be committed to Git.

1. In the project root, find `.env.example`.
2. Copy it to a new file named `.env.local`:

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env.local
```

**macOS / Linux:**

```bash
cp .env.example .env.local
```

3. Open `.env.local` in your editor.
4. Set your OpenAI key:

```
OPENAI_API_KEY=sk-your-real-key-here
```

Save the file. `.env.local` is gitignored — your key stays on your machine only.

Details: [Environment variables](./environment-variables.md)

## Step 4 — Verify installation

```bash
npm run build
```

A successful build ends with `Compiled successfully` and a route list. The first build may take 1–2 minutes.

## You are done with installation

→ [Running locally](./running-locally.md)
