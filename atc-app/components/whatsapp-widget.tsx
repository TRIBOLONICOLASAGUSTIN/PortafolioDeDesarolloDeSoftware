'use client';

import { useEffect, useState } from 'react';
import { useUI } from './app-shell';
import { Icon } from './ui';
import { greeting, openStatus } from '@/lib/hours';
import { vars } from '@/lib/format';
import { WA_OPTS, waLink } from '@/lib/whatsapp';

export function WhatsAppWidget() {
  const { waOpen, setWa, layer } = useUI();
  const [greet, setGreet] = useState(false);
  const [sub, setSub] = useState('Te responde el técnico');
  const hideGreet = () => { setGreet(false); try { sessionStorage.setItem('atc-greet', '1'); } catch {} };

  // Un saludo a los 8 s, una vez por sesión, que se va solo a los 8 s. No se anuncia a lectores de pantalla.
  useEffect(() => {
    setSub(openStatus().open ? 'Te responde el técnico' : 'Cerrado · te respondemos al abrir');
    let greeted = false; try { greeted = !!sessionStorage.getItem('atc-greet'); } catch {}
    if (greeted) return;
    let t2: ReturnType<typeof setTimeout>;
    const t1 = setTimeout(() => {
      if (document.body.classList.contains('wa-open') || document.documentElement.classList.contains('lock')) return;
      setGreet(true); t2 = setTimeout(() => setGreet(false), 8000);
    }, 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  useEffect(() => { if (waOpen) hideGreet(); }, [waOpen]);
  useEffect(() => { if (layer) setGreet(false); }, [layer]);

  return (
    <>
      <div className={`wa-greet${greet ? ' show' : ''}`} id="waGreet" onClick={e => { if (!(e.target as HTMLElement).closest('button')) setWa(true); }}>
        <span>¿Te ayudamos? Escribinos 👋</span>
        <button id="waGreetX" aria-label="Cerrar" onClick={hideGreet}><Icon n="x" cls="i sm" /></button>
      </div>
      <div className="wa-panel" id="waPanel" role="dialog" aria-label="Chat de WhatsApp" inert={!waOpen}>
        <div className="wa-head"><span className="mark">AT</span><div><b>AT Computación</b><small id="waSub">{sub}</small></div></div>
        <div className="wa-body" id="waBody">
          {waOpen && <>
            <div className="bubble">{greeting()} 👋 ¿En qué te podemos ayudar?</div>
            {WA_OPTS.map(([ic, t, m], i) => (
              <a key={t} className="wa-opt" href={waLink(m)} target="_blank" rel="noopener" style={vars({ '--d': `${(.08 + i * .06).toFixed(2)}s` })}>
                <Icon n={ic} />{t}<Icon n="chev-r" cls="i sm go" />
              </a>
            ))}
          </>}
        </div>
        <div className="wa-foot">Se abre WhatsApp con tu mensaje listo para enviar</div>
      </div>
      <button className="wa-fab" id="waFab" aria-label="Abrir chat de WhatsApp" aria-expanded={waOpen} onClick={() => setWa(!waOpen)}>
        <Icon n="wa" cls="i w" /><Icon n="x" cls="i x" />
      </button>
    </>
  );
}
