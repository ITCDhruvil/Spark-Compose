import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { register } from 'node:module'
import { pathToFileURL } from 'url'

const root = path.resolve('src/lib/editor')

function extractStringArray(src, exportName) {
  const re = new RegExp(`export const ${exportName}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\]`)
  const m = src.match(re)
  if (!m) return null
  const items = []
  const strRe = /'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"/g
  let sm
  while ((sm = strRe.exec(m[1])) !== null) {
    items.push((sm[1] ?? sm[2]).replace(/\\'/g, "'"))
  }
  return items
}

function extractRecordEntries(src, exportName) {
  const re = new RegExp(`export const ${exportName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`)
  const m = src.match(re)
  if (!m) return null
  const entries = []
  const entryRe = /^\s*([A-Za-z0-9_'-]+)\s*:\s*'((?:\\'|[^'])*)'/gm
  let em
  while ((em = entryRe.exec(m[1])) !== null) {
    entries.push({ key: em[1], value: em[2].replace(/\\'/g, "'") })
  }
  return entries
}

const problems = []
const warnings = []

const termsSrc = fs.readFileSync(path.join(root, 'construction-terms.ts'), 'utf8')
const typosSrc = fs.readFileSync(path.join(root, 'common-typos.ts'), 'utf8')
const dictSrc = fs.readFileSync(path.join(root, 'spell-dictionary.ts'), 'utf8')

// Syntax is validated by the functional tsx import below

const terms = extractStringArray(termsSrc, 'CONSTRUCTION_TERMS')
const typos = extractRecordEntries(typosSrc, 'COMMON_TYPOS')
const commonWords = extractStringArray(dictSrc, 'COMMON_WORDS') // may fail — it's const not export

// COMMON_WORDS is not exported — extract differently
const commonMatch = dictSrc.match(/const COMMON_WORDS: string\[\] = \[([\s\S]*?)\n\]/)
const known = []
if (commonMatch) {
  const strRe = /'((?:\\'|[^'])*)'/g
  let sm
  while ((sm = strRe.exec(commonMatch[1])) !== null) known.push(sm[1])
}

if (!terms) problems.push('Could not parse CONSTRUCTION_TERMS')
if (!typos) problems.push('Could not parse COMMON_TYPOS')

if (terms) {
  const lower = terms.map((t) => t.toLowerCase())
  const termSet = new Set(lower)

  const seen = new Map()
  for (const t of lower) seen.set(t, (seen.get(t) || 0) + 1)
  const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([t, n]) => `${t}×${n}`)
  if (dups.length) warnings.push(`Duplicate construction terms: ${dups.join(', ')}`)

  const multi = terms.filter((t) => /\s/.test(t))
  if (multi.length) problems.push(`Multi-word terms (won't match word-level check): ${multi.join(', ')}`)

  const garbage = terms.filter(
    (t) => t.length < 2 || /[^a-zA-Z0-9'/-]/.test(t) || /[A-Z]{2,}[a-z]|[a-z][A-Z]/.test(t) && !/^[A-Z0-9/-]+$/.test(t),
  )
  // Simpler garbage: punctuation junk, camelCase typos like fireA
  const junk = terms.filter((t) => /[^a-zA-Z0-9'/-]/.test(t) || /[a-z][A-Z]/.test(t) || t.length < 2)
  if (junk.length) problems.push(`Invalid construction tokens: ${junk.join(', ')}`)

  console.log(`Construction terms: ${terms.length} entries, ${termSet.size} unique`)
}

if (typos) {
  const keyCounts = new Map()
  for (const { key } of typos) {
    const k = key.toLowerCase()
    keyCounts.set(k, (keyCounts.get(k) || 0) + 1)
  }
  const dupKeys = [...keyCounts.entries()].filter(([, n]) => n > 1)
  if (dupKeys.length) {
    problems.push(`Duplicate typo keys: ${dupKeys.map(([k, n]) => `${k}×${n}`).join(', ')}`)
  }

  const noop = typos.filter(({ key, value }) => key.toLowerCase() === value.toLowerCase())
  if (noop.length) problems.push(`No-op typo entries: ${noop.map((c) => c.key).join(', ')}`)

  const empty = typos.filter(({ value }) => !value.trim())
  if (empty.length) problems.push(`Empty typo values: ${empty.map((c) => c.key).join(', ')}`)

  // Short aggressive keys (2 letters) — high false-positive risk
  const short = typos.filter(({ key }) => key.length <= 2)
  if (short.length) warnings.push(`Very short typo keys: ${short.map((c) => c.key).join(', ')}`)

  // Typo key that is a known English word or construction term
  const knownSet = new Set(known.map((w) => w.toLowerCase()))
  const termSet = new Set((terms || []).map((t) => t.toLowerCase()))
  const conflictsKnown = typos.filter(({ key }) => knownSet.has(key.toLowerCase()))
  const conflictsTerm = typos.filter(({ key }) => termSet.has(key.toLowerCase()))
  // These are harmless (isKnownWord wins) but dead entries
  if (conflictsKnown.length) {
    warnings.push(
      `Typo keys that are known English words (never applied): ${conflictsKnown.map((c) => c.key).join(', ')}`,
    )
  }
  if (conflictsTerm.length) {
    warnings.push(
      `Typo keys that are construction terms (never applied): ${conflictsTerm.map((c) => c.key).join(', ')}`,
    )
  }

  // Dangerous: typo maps a misspelling TO a wrong word, or key is valid word that isn't in known set
  // Flag keys that look like real words (length >= 4, no obvious typo pattern) mapping to different word
  // Skip — too heuristic

  console.log(`Typo map: ${typos.length} entries, ${keyCounts.size} unique keys`)
  console.log(`Known English words: ${known.length}`)
}

// Functional checks via tsx if available
async function runFunctional() {
  try {
    const { execSync } = await import('child_process')
    const out = execSync(
      'npx --yes tsx -e "import { correctFromDictionary, isKnownWord } from \'./src/lib/editor/spell-dictionary.ts\'; const cases=[[\'teh\',\'the\'],[\'thees\',\'these\'],[\'aer\',\'are\'],[\'comomon\',\'common\'],[\'rebar\',null],[\'formwork\',null],[\'concrete\',null],[\'the\',null],[\'column\',null],[\'PPE\',null],[\'concret\',\'concrete\'],[\'saftey\',\'safety\'],[\'slumptest\',null],[\'builderswork\',null],[\'flyjib\',null],[\'madeground\',null],[\'primecost\',null],[\'bitumen\',null],[\'retention\',null],[\'loose\',null],[\'weather\',null],[\'fulfil\',null],[\'dependant\',null],[\'lightening\',null]]; let fail=0; for (const [input,expected] of cases){ const got=correctFromDictionary(input); const ok=got===expected; console.log((ok?\'PASS\':\'FAIL\')+\': \'+JSON.stringify(input)+\' => \'+JSON.stringify(got)+\' (expected \'+JSON.stringify(expected)+\')\'); if(!ok) fail++; } for (const t of [\'rebar\',\'formwork\',\'scaffold\',\'excavation\',\'mep\',\'rams\',\'itp\',\'slumptest\',\'builderswork\']){ if(!isKnownWord(t)){ console.log(\'FAIL: not known: \'+t); fail++; } else console.log(\'PASS: known \'+t); } process.exit(fail?1:0);"',
      { encoding: 'utf8', cwd: process.cwd() },
    )
    console.log(out)
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || e.message || '')
    console.log(out)
    problems.push('Functional checks failed')
  }
}

await runFunctional()

console.log('\n--- WARNINGS ---')
if (!warnings.length) console.log('(none)')
warnings.forEach((w) => console.log('WARN:', w))

console.log('\n--- PROBLEMS ---')
if (!problems.length) console.log('(none)')
problems.forEach((p) => console.log('ERR:', p))

console.log(problems.length ? `\nFAILED with ${problems.length} problem(s)` : '\nALL CHECKS PASSED')
process.exit(problems.length ? 1 : 0)
