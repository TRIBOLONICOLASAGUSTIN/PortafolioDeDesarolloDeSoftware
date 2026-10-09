import { CONFIG } from './data/config';

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Día, hora y minutos en la zona horaria del local, sin importar dónde esté el visitante o el servidor. */
export function storeNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: CONFIG.timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23', year: 'numeric' }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, hour: +get('hour'), minute: +get('minute'), year: +get('year') };
}

export function openStatus(now = new Date()) {
  const { day, hour, minute } = storeNow(now);
  const h = hour + minute / 60;
  const cur = CONFIG.hours[day].find(([a, b]) => h >= a && h < b);
  if (cur) return { open: true, txt: `Abierto ahora · hasta las ${cur[1]}:00` };
  for (let i = 0; i < 8; i++) {
    const dd = (day + i) % 7;
    for (const [a] of CONFIG.hours[dd]) if (i > 0 || a > h) return { open: false, txt: `Cerrado · abrimos ${i === 0 ? 'hoy' : i === 1 ? 'mañana' : 'el ' + DAYS[dd]} a las ${a}:00` };
  }
  return { open: false, txt: 'Cerrado' };
}

/** "Jue 14:37" para la barra de la notebook del inicio. */
export function clockLabel(now = new Date()) {
  const { day, hour, minute } = storeNow(now);
  return `${SHORT[day]} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function greeting(now = new Date()) {
  const { hour } = storeNow(now);
  return hour < 13 ? '¡Buen día!' : hour < 20 ? '¡Buenas tardes!' : '¡Buenas noches!';
}

/** { ymd: '2026-10-09', hm: '14:37' } en hora del local. La calcula el servidor y la pasa al panel. */
export function storeStamp(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const g = (t: string) => (p.find(x => x.type === t)?.value ?? '').padStart(2, '0');
  return { ymd: `${g('year')}-${g('month')}-${g('day')}`, hm: `${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}` };
}

/** 06/10 · 18:10 en hora del local. */
export function shortDateTime(iso: string) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('es-AR', { timeZone: CONFIG.timeZone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const g = (t: string) => f.find(p => p.type === t)?.value ?? '';
  const two = (t: string) => g(t).padStart(2, '0'); // es-AR a veces da "6" aunque se pida 2 dígitos
  return `${two('day')}/${two('month')} · ${two('hour')}:${two('minute')}`;
}

/** 2027-01-04 → 04/01/2027 (fecha sin hora: no se convierte de zona). */
export const longDate = (ymd: string) => ymd.split('-').reverse().join('/');
