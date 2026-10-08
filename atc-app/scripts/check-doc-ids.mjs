// Verifica que docs/atc/seguridad.md y las pruebas citen exactamente los mismos IDs
// (RLS-n, FN-n, TRK-n, GEN-n, RET-n). Sale con 1 si:
//   - un ID documentado no tiene prueba,
//   - una prueba no tiene ID o su ID no está documentado,
//   - dos pruebas usan el mismo ID,
//   - hay pruebas salteadas (skip/todo/only): node:test las da por buenas sin correrlas.
// Correr con: npm run check:docs
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = join(app, '..', 'docs', 'atc', 'seguridad.md');
const TESTS = join(app, 'tests', 'db');
const ID = /\b(?:RLS|FN|TRK|GEN|RET)-\d+\b/g;

const documented = new Set(readFileSync(DOC, 'utf8').match(ID) ?? []);
const tested = new Map(); // ID → archivo de la prueba
const problems = [];

for (const file of readdirSync(TESTS).filter(f => f.endsWith('.test.mjs')).sort()) {
  const src = readFileSync(join(TESTS, file), 'utf8');
  const calls = src.match(/^\s*test\(/gm)?.length ?? 0;
  const ids = [...src.matchAll(/^\s*test\(\s*['"`]((?:RLS|FN|TRK|GEN|RET)-\d+) ·/gm)].map(m => m[1]);
  if (ids.length !== calls) problems.push(`${file}: ${calls - ids.length} prueba(s) sin ID al principio del nombre`);
  if (/\btest\.(?:skip|todo|only)\b|\b(?:skip|todo|only)\s*:\s*true\b/.test(src)) problems.push(`${file}: hay pruebas salteadas (skip/todo/only)`);
  for (const id of ids) {
    if (tested.has(id)) problems.push(`${id}: lo usan dos pruebas (${tested.get(id)} y ${file})`);
    tested.set(id, file);
  }
}

for (const id of documented) if (!tested.has(id)) problems.push(`${id}: está en seguridad.md pero no hay prueba con ese ID`);
for (const id of tested.keys()) if (!documented.has(id)) problems.push(`${id}: tiene prueba pero no está en seguridad.md`);

if (problems.length) {
  console.error(`check:docs: ${problems.length} problema(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check:docs: OK, ${tested.size} IDs documentados y probados.`);
