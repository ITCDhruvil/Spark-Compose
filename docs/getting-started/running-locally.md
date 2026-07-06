# Running locally

Once installation is complete, start the development server.

## Development mode (recommended for daily work)

```bash
npm run dev
```

**What happens:**

1. Next.js compiles the app
2. A local server starts (usually on port **3000**)
3. Open [http://localhost:3000](http://localhost:3000) in your browser

You should see **Spark Compose** with the rich text editor. Edits to source files hot-reload automatically.

### Port already in use?

If something else uses port 3000:

**PowerShell:**

```powershell
$env:PORT=3001; npm run dev
```

Then open [http://localhost:3001](http://localhost:3001).

## Production mode (optional)

To test a production build locally:

```bash
npm run rebuild
npm run start
```

`rebuild` deletes `.next`, runs a clean build, and avoids mixed dev/prod cache issues.

## Other useful commands

| Command | Purpose |
|---------|---------|
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests |
| `npm run clean` | Delete `.next` build folder |

## Pages to know

| URL | What it is |
|-----|------------|
| `/` | Main editor (Spark Compose) |
| `/cost` | AI cost & usage dashboard |

## Next step

→ [Running tests](./running-tests.md) or explore [Smart features](../features/smart-features/README.md)
