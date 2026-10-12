'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '../ui';
import { Chips } from './chips';
import { usePanel } from './panel-shell';
import { DemoBanner } from './demo-banner';
import { TransferenciaForm } from './forms';
import { cerrarSesion } from './salir';
import { ESTADO_IDS, ESTADO_PEDIDO, ESTADOS, minutosEntre, total, vence, type EstadoPedido, type Pedido, type Transferencia, type Vista } from '@/lib/panel/pedidos';
import { fraseValida } from '@/lib/cifrado-comprobante';
import { productName, payLabel } from '@/lib/panel/labels';
import { diaLargo, long, short } from '@/lib/panel/dates';
import { storeStamp } from '@/lib/hours';
import { fmt } from '@/lib/format';

const IC: Record<EstadoPedido, string> = { pendiente: 'clock', pagado: 'check-c', retrasado: 'bell', autocancelado: 'refresh', entregado: 'check', cancelado: 'x' };
const AYUDA: Record<Vista, string> = {
  pendiente: 'Sin pagar. El stock queda reservado hasta 48 h; si no se pagan, se cancelan solos y el stock vuelve.',
  pagado: 'Pagados y todavía sin entregar.',
  retrasado: 'Pagados y sin entregar desde hace varios días. Es un aviso para vos: al cliente no se le promete un plazo.',
  autocancelado: 'No se pagaron en 48 h: se cancelaron solos y el stock volvió a estar disponible.',
};
const RETRASOS: [string, string][] = [['2', '2 días'], ['3', '3 días'], ['5', '5 días'], ['7', '7 días']];
const horas = (min: number) => (min < 60 ? `${Math.max(1, Math.round(min))} min` : `${Math.round(min / 60)} h`);
const dias = (min: number) => { const d = Math.floor(min / 1440); return d === 1 ? '1 día' : `${d} días`; };
const resumenItems = (p: Pedido) => p.items.map(i => `${i.qty > 1 ? `${i.qty} × ` : ''}${productName(i.productId)}`).join(', ');

/** Qué tan urgente es (texto de la fila) */
function cuando(p: Pedido, e: EstadoPedido, ahora: string) {
  if (e === 'pendiente') return `Vence en ${horas(minutosEntre(ahora, vence(p)))}`;
  if (e === 'pagado') return `Pagado ${short(p.pagado!.slice(0, 10))}`;
  if (e === 'retrasado') return `Sin entregar hace ${dias(minutosEntre(p.pagado!, ahora))}`;
  if (e === 'autocancelado') return `Venció el ${short(vence(p).slice(0, 10))}`;
  return ESTADO_PEDIDO[e];
}

// Pedidos de la tienda (los arma la bolsa y llegan por WhatsApp; de ejemplo hasta conectar la base). Pestañas por estado
// (también por ?estado=, que valida el servidor), del más urgente al menos urgente. Cada fila abre el detalle.
export function Pedidos({ estado: inicial }: { estado: Vista }) {
  const { pedidos, estadoPedido, reglas, setRetraso, openSheet, ahoraS } = usePanel();
  // El estado vive en la dirección (?estado=): lo cambian las pestañas y el menú, y "Atrás" lo respeta.
  const q = useSearchParams().get('estado');
  const estado: Vista = (ESTADO_IDS as string[]).includes(q ?? '') ? (q as Vista) : inicial;
  const n = Object.fromEntries(ESTADOS.map(([e]) => [e, pedidos.filter(p => estadoPedido(p) === e).length])) as Record<Vista, number>;
  const lista = pedidos.filter(p => estadoPedido(p) === estado).sort((a, b) => {
    const k = (p: Pedido) => (estado === 'pendiente' ? vence(p) : estado === 'autocancelado' ? `~${vence(p)}` : p.pagado ?? p.creado);
    return estado === 'autocancelado' ? (k(a) < k(b) ? 1 : -1) : k(a) < k(b) ? -1 : 1;
  });
  const elegir = (v: Vista) => history.replaceState(null, '', `/panel/pedidos?estado=${v}`);
  return (
    <>
    <h1 className="pn-t" tabIndex={-1}>Pedidos</h1>
    <DemoBanner />
    <div className="pn-movl pn-peds" data-estado={estado}>
      <Chips name="pn-ped" legend="Estado" value={estado} onChange={elegir} options={ESTADOS.map(([e, t]) => [e, `${t} · ${n[e]}`])} />
      <p className="pn-hint">{AYUDA[estado]}</p>
      {estado === 'retrasado' && (
        <div className="pn-fld pn-retraso">
          <span className="pn-lab" aria-hidden="true">Avisar si pasan</span>
          <Chips name="pn-retraso" legend="Avisar si pasan" value={String(reglas.retrasoD)} onChange={v => setRetraso(+v)} options={RETRASOS} />
        </div>
      )}
      <p className="pn-count" role="status">{lista.length === 1 ? '1 pedido' : `${lista.length} pedidos`}</p>
      {lista.length > 0 && (
        <ul className="pn-card pn-movs pn-pedl">
          {lista.map(p => (
            <li key={p.codigo}>
              <button type="button" className="pn-inv pn-ped" data-codigo={p.codigo} data-estado={estado} onClick={() => openSheet({ t: 'pedido', codigo: p.codigo })}>
                <span className={`pn-ic pn-ped-ic ${estado}`}><Icon n={IC[estado]} /></span>
                <span className="pn-rt"><b>{p.cliente}<span className="pn-g-out"> · <span className="pn-nw">{p.codigo}</span></span></b><small><span className="pn-g-in pn-nw">{p.codigo} · </span>{resumenItems(p)}</small></span>
                <span className="pn-mamt"><b className="pn-num">{fmt(total(p))}</b><small className={`pn-pst ${estado}`}>{cuando(p, estado, ahoraS)}</small></span>
                <Icon n="chev-r" cls="i sm pn-chev" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!lista.length && <p className="pn-empty">No hay pedidos {ESTADOS.find(([e]) => e === estado)![1].toLowerCase()}.</p>}
    </div>
    </>
  );
}

/** Hora del local ahora (si cambió el día, hay que recargar: lo cargado lleva la fecha de hoy) */
function hmAhora(hoy: string, toast: (m: string) => void) {
  const now = storeStamp();
  if (now.ymd !== hoy) { toast('Cambió el día: recargá el panel.'); return null; }
  return now.hm;
}

/* ---------- Comprobante: frase y visor ----------
   El comprobante está cifrado con la llave del dueño. Para verlo, el panel le pide su frase una vez por visita: con ella
   desbloquea la llave EN ESTE NAVEGADOR (la frase nunca viaja al servidor) y lo abre acá mismo, sin abrir otra pestaña. */
function FraseComprobantes({ onListo, onVolver }: { onListo: () => void; onVolver: () => void }) {
  const { llave } = usePanel();
  const [frase, setFrase] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (abriendo) return;
    if (!fraseValida(frase)) { setError('La frase tiene 20 letras y números, en 5 grupos de 4 (por ejemplo, K7QM-2VXP-…).'); return; }
    setAbriendo(true);
    const ok = await llave.desbloquear(frase);
    setAbriendo(false);
    if (ok) { setFrase(''); onListo(); } else setError('Esa no es la frase. Revisala en tu gestor de contraseñas.');
  };
  return (
    <form className="pn-form pn-frase" noValidate onSubmit={enviar} aria-label="Desbloquear los comprobantes" aria-busy={abriendo}>
      <span className="pn-frase-ic" aria-hidden="true"><Icon n="lock" /></span>
      <h2 id="pn-sh-h" className="pn-sh-t">Tu frase de comprobantes</h2>
      <p className="pn-hint">Los comprobantes están cifrados con tu llave. Escribí tu frase para abrirlos en este navegador: nunca se manda al servidor y queda abierta hasta que cierres o recargues el panel.</p>
      <div className="pn-fld">
        <label htmlFor="f-frase">Frase</label>
        <div className="pn-frase-in">
          <input id="f-frase" className="pn-in" type={ver ? 'text' : 'password'} value={frase} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" maxLength={40} data-autofocus aria-invalid={error ? true : undefined} aria-describedby={error ? 'f-frase-e' : undefined}
            onChange={e => { setFrase(e.target.value); setError(''); }} />
          <button type="button" className="pn-frase-ver" aria-pressed={ver} onClick={() => setVer(v => !v)}>{ver ? 'Ocultar' : 'Mostrar'}</button>
        </div>
        {error && <p className="pn-err" id="f-frase-e" role="alert">{error}</p>}
      </div>
      <div className="pn-foot pn-pdet-acts">
        <button className="btn btn-full" type="submit" data-act="abrir-comp" disabled={abriendo}><Icon n="lock" />{abriendo ? 'Abriendo…' : 'Abrir comprobante'}</button>
        <button className="btn btn-gray btn-full" type="button" onClick={onVolver}>Volver al pedido</button>
      </div>
    </form>
  );
}

const pesoLegible = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`);
function VisorComprobante({ t, codigo, onVolver }: { t: Transferencia; codigo: string; onVolver: () => void }) {
  const { llave } = usePanel();
  const c = t.comprobante!;
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const volver = useRef<HTMLButtonElement>(null);
  // Se abre en memoria y se libera al cerrar el visor: el archivo abierto no queda en ningún lado.
  useEffect(() => {
    let vivo = true, u: string | null = null;
    llave.abrir(c).then(plano => {
      if (!vivo) return;
      if (!plano) { setFallo(true); return; }
      u = URL.createObjectURL(new Blob([plano], { type: c.tipo }));
      setUrl(u);
    });
    return () => { vivo = false; if (u) URL.revokeObjectURL(u); };
  }, [llave, c]);
  const pdf = c.tipo === 'application/pdf', ext = pdf ? 'pdf' : c.tipo === 'image/png' ? 'png' : 'jpg';
  return (
    <div className="pn-visor">
      <h2 id="pn-sh-h" className="pn-sh-t">Comprobante de {t.pagador}</h2>
      <p className="pn-hint"><span className="pn-num">{fmt(t.monto)}</span> · {pdf ? 'PDF' : 'Foto'} de {pesoLegible(c.peso)} · abierto solo en este navegador</p>
      <div className="pn-visor-marco" aria-busy={!url && !fallo}>
        {fallo ? <p className="pn-err" role="alert">No se pudo abrir: la llave cambió o el comprobante está dañado.</p>
          : !url ? <p className="pn-hint" role="status">Abriendo…</p>
          : pdf ? <p className="pn-visor-pdf"><Icon n="receipt" /><span>Los PDF se abren descargándolos.</span></p>
          : <img className="pn-visor-img" src={url} alt={`Comprobante de la transferencia de ${t.pagador}`} />}
      </div>
      <div className="pn-foot pn-pdet-acts">
        {url && <a className="btn btn-full" href={url} download={`comprobante-${codigo}.${ext}`} data-act="descargar-comp"><Icon n="download" />{pdf ? 'Descargar PDF' : 'Descargar'}</a>}
        <button ref={volver} className="btn btn-gray btn-full" type="button" data-act="volver-pedido" data-autofocus onClick={onVolver}>Volver al pedido</button>
        <button className="pn-visor-bloq" type="button" data-act="bloquear-comp" onClick={() => { llave.bloquear(); onVolver(); }}><Icon n="lock" cls="i sm" />Cerrar con llave</button>
      </div>
    </div>
  );
}

// Detalle de un pedido, con lo que se puede hacer según su estado.
export function PedidoDetalle({ codigo }: { codigo: string }) {
  const { pedidos, estadoPedido, ahoraS, hoy, toast, closeSheet, pagarPedido, entregarPedido, cancelarPedido, borrarComprobante, reciente, llave } = usePanel();
  const [confirmar, setConfirmar] = useState(false);
  const [transferir, setTransferir] = useState(false);
  // Ver el comprobante pide la frase (una vez por visita); borrarlo, haber ingresado hace menos de 15 minutos (lo exige el
  // servidor; acá se avisa antes).
  const [vista, setVista] = useState<'detalle' | 'frase' | 'visor'>('detalle');
  const [reingresar, setReingresar] = useState(false);
  const [borrar, setBorrar] = useState(false);
  // Al cambiar de vista dentro de la hoja, el foco va a lo principal de la nueva (si no, quedaría en un botón que ya no está).
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.pn-sheet.open [data-autofocus]')?.focus());
  }, [vista, transferir]);
  const p = pedidos.find(x => x.codigo === codigo);
  if (!p) return <h2 id="pn-sh-h" className="pn-sh-t">No encontramos ese pedido</h2>;
  const e = estadoPedido(p);
  if (transferir && e === 'pendiente') return (
    <div className="pn-det pn-pdet" data-codigo={p.codigo}>
      <h2 id="pn-sh-h" className="pn-sh-t">Transferencia del pedido {p.codigo}</h2>
      <TransferenciaForm pedido={p} total={total(p)} onVolver={() => setTransferir(false)} />
    </div>
  );
  const t = p.transferencia;
  if (t?.comprobante && vista !== 'detalle') return (
    <div className="pn-det pn-pdet" data-codigo={p.codigo} data-vista={vista}>
      {vista === 'frase' || !llave.abierta
        ? <FraseComprobantes onListo={() => setVista('visor')} onVolver={() => setVista('detalle')} />
        : <VisorComprobante t={t} codigo={p.codigo} onVolver={() => setVista('detalle')} />}
    </div>
  );
  const accion = (fn: (c: string, hm: string) => void, msg: string) => () => {
    const hm = hmAhora(hoy, toast);
    if (!hm) return;
    fn(codigo, hm); toast(`${msg} Maqueta: no se guardó.`); closeSheet();
  };
  const fecha = (s: string) => long(s.slice(0, 10), s.slice(11, 16));
  return (
    <div className="pn-det pn-pdet" data-codigo={p.codigo} data-estado={e}>
      <h2 id="pn-sh-h" className="pn-sh-t">Pedido {p.codigo}</h2>
      <p className="pn-det-amt pn-num">{fmt(total(p))}</p>
      <p><span className={`pn-pst-pill ${e}`}>{ESTADO_PEDIDO[e]}</span></p>
      {e === 'retrasado' && <p className="pn-hint pn-pdet-aviso">Pagado hace {dias(minutosEntre(p.pagado!, ahoraS))} y todavía sin entregar. Coordiná la entrega con {p.cliente} por WhatsApp.</p>}
      {e === 'pendiente' && <p className="pn-hint pn-pdet-aviso">Si no se paga, se cancela solo el {diaLargo(vence(p).slice(0, 10)).toLowerCase()} a las {vence(p).slice(11, 16)} y el stock vuelve.</p>}
      <ol className="pn-step" aria-label="Productos del pedido">
        {p.items.map(i => <li key={i.productId}><b>{productName(i.productId)}</b><span>{i.qty} × {fmt(i.unit)} · {fmt(i.qty * i.unit)}</span></li>)}
      </ol>
      <dl className="pn-dl">
        <div><dt>Cliente</dt><dd>{p.cliente}</dd></div>
        <div><dt>Entrega</dt><dd>{p.entrega === 'retiro' ? 'Retira en el local' : 'Envío a coordinar por WhatsApp'}</dd></div>
        <div><dt>Pago elegido</dt><dd>{payLabel(p.pago)}</dd></div>
        <div><dt>Pedido</dt><dd>{fecha(p.creado)}</dd></div>
        {p.pagado && <div><dt>Pagado</dt><dd>{fecha(p.pagado)}</dd></div>}
        {t && <div><dt>Transferencia</dt><dd>{t.pagador} · <span className="pn-num">{fmt(t.monto)}</span></dd></div>}
        {t && <div><dt>Comprobante</dt><dd>{t.comprobante
          ? <><button type="button" className="lnk pn-vercomp" data-act="ver-comp" onClick={() => setVista(llave.abierta ? 'visor' : 'frase')}>
            <Icon n={llave.abierta ? 'receipt' : 'lock'} cls="i sm" />Ver comprobante</button> <small>(cifrado: lo abrís solo vos)</small></>
          : 'Borrado (quedan el nombre y el monto)'}</dd></div>}
        {p.entregado && <div><dt>Entregado</dt><dd>{fecha(p.entregado)}</dd></div>}
        {e === 'autocancelado' && <div><dt>Se canceló solo</dt><dd>{fecha(vence(p))} · el stock volvió</dd></div>}
        {p.cancelado && <div><dt>Cancelado</dt><dd>{fecha(p.cancelado)} · el stock volvió</dd></div>}
      </dl>
      {reingresar && <div className="pn-hint pn-pdet-aviso pn-reing" role="status">
        <p>Por seguridad, para borrar el comprobante volvé a ingresar: pasaron más de 15 minutos desde que entraste. Maqueta: lo que cargaste en esta visita se pierde al volver a ingresar.</p>
        <button type="button" className="btn btn-full" data-act="reingresar" onClick={() => cerrarSesion('/ingresar', toast)}>Volver a ingresar</button>
      </div>}
      <div className="pn-foot pn-pdet-acts">
        {e === 'pendiente' && p.pago === 'transferencia' && <button type="button" className="btn btn-full" data-act="transferencia" data-autofocus onClick={() => setTransferir(true)}><Icon n="receipt" />Registrar transferencia</button>}
        {e === 'pendiente' && <button type="button" className={`btn btn-full${p.pago === 'transferencia' ? ' btn-gray' : ''}`} data-act="pagar" data-autofocus={p.pago !== 'transferencia' || undefined} onClick={accion(pagarPedido, `Pedido ${codigo} pagado: la venta entró en Ganancias.`)}><Icon n="check" />Marcar como pagado</button>}
        {e === 'pendiente' && p.pago !== 'transferencia' && <button type="button" className="btn btn-gray btn-full" data-act="transferencia" onClick={() => setTransferir(true)}><Icon n="receipt" />Registrar transferencia</button>}
        {e === 'pendiente' && !confirmar && <button type="button" className="btn btn-gray btn-full" data-act="cancelar" onClick={() => setConfirmar(true)}>Cancelar pedido</button>}
        {e === 'pendiente' && confirmar && <button type="button" className="btn btn-gray btn-full pn-danger" data-act="cancelar-ok" autoFocus onClick={accion(cancelarPedido, `Pedido ${codigo} cancelado: el stock volvió.`)}>Sí, cancelar y devolver el stock</button>}
        {(e === 'pagado' || e === 'retrasado') && <button type="button" className="btn btn-full" data-act="entregar" data-autofocus onClick={accion(entregarPedido, `Pedido ${codigo} entregado.`)}><Icon n="check" />Marcar como entregado</button>}
        {t?.comprobante && !borrar && <button type="button" className="btn btn-gray btn-full" data-act="borrar-comp" onClick={() => (reciente() ? setBorrar(true) : setReingresar(true))}>Ya lo revisé: borrar comprobante</button>}
        {t?.comprobante && borrar && <button type="button" className="btn btn-gray btn-full pn-danger" data-act="borrar-comp-ok" autoFocus onClick={() => {
          if (!reciente()) { setBorrar(false); setReingresar(true); return; }
          borrarComprobante(codigo); setBorrar(false); toast('Comprobante borrado: quedan el nombre de quien pagó y el monto. Maqueta: no se guardó.');
        }}>Sí, borrar el comprobante</button>}
      </div>
    </div>
  );
}
