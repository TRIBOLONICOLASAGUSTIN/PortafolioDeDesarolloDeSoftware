// Upstash falso (solo pruebas): cuenta cada llamada y cada comando, y guarda las claves que recibe.
// Lo usan las pruebas de la API (API-22, API-23) y la prueba de carga (scripts/carga.mjs).
import { createServer } from 'node:http';

export function fakeUpstash() {
  const kv = new Map(), cmds = [];
  let llamadas = 0;
  const srv = createServer((req, res) => {
    let b = ''; req.on('data', c => { b += c; }); req.on('end', () => {
      llamadas++;
      const list = JSON.parse(b || '[]');
      const out = list.map(cmd => {
        const [op, key] = cmd;
        cmds.push(cmd);
        if (op === 'INCR') { kv.set(key, (kv.get(key) ?? 0) + 1); return { result: kv.get(key) }; }
        if (op === 'GET') return { result: kv.has(key) ? String(kv.get(key)) : null };
        if (op === 'SET') { if (kv.has(key)) return { result: null }; kv.set(key, 1); return { result: 'OK' }; }
        return { result: 1 };
      });
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(out));
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${srv.address().port}`, cmds, llamadas: () => llamadas, close: () => srv.close() })));
}

// CA de prueba: con ella la configuración de "producción" está completa (la base remota nunca se llega a usar).
export const PEM_PRUEBA = '-----BEGIN CERTIFICATE-----\nMIIBprueba\n-----END CERTIFICATE-----';
