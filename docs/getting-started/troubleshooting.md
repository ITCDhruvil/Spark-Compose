# Troubleshooting

Common problems when setting up or running Spark Compose.

## `npm install` fails

**Peer dependency conflicts (React 19):**

```bash
npm install --legacy-peer-deps
```

## `npm run dev` — port 3000 in use

Another process is using the port.

**Windows — find and stop it:**

```powershell
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

Or use another port:

```powershell
$env:PORT=3001; npm run dev
```

## `Cannot find module './147.js'` or weird build errors

The `.next` folder has mixed dev/production artifacts.

**Fix:**

```bash
npm run rebuild
```

Or manually:

```bash
npm run clean
npm run build
```

## AI features return errors or hang

1. Check `.env.local` has a valid `OPENAI_API_KEY`
2. Restart the dev server after changing `.env.local`
3. Confirm the key has credits on your OpenAI account
4. Check the terminal running `npm run dev` for server error messages

## Editor loads but autocomplete / improve does nothing

- Toggle **Autocomplete** in Spark AI dropdown (toolbar)
- Select text before using selection-based features (Improve, Summarize, etc.)
- Ensure the editor has focus (click inside the document)

## Table or chart toolbar not clickable

Hard refresh the browser (`Ctrl+Shift+R`). If you changed toolbar code, restart `npm run dev`.

## Tests fail

Run a single file to isolate:

```bash
npx vitest run path/to/file.test.ts
```

Some tests may depend on mocks; failures in unrelated areas do not always block local development.

## Still stuck?

1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Delete `.next`: `npm run clean`
3. Confirm Node version ≥ 18: `node --version`

## Next step

→ [Documentation index](../README.md)
