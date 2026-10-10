// Íconos (i-*) e ilustraciones de producto (r-*): SVG propios, copiados tal cual del prototipo.
// Contenido estático y de confianza: se inserta como HTML en el servidor (no depende de datos del usuario).
const SPRITES = `<defs>
<linearGradient id="g-alu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f2f4"/><stop offset=".55" stop-color="#d3d5da"/><stop offset="1" stop-color="#a6a9b0"/></linearGradient>
<linearGradient id="g-black" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--kg0,#3a3b40)"/><stop offset="1" style="stop-color:var(--kg1,#111215)"/></linearGradient>
<linearGradient id="g-wall-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d8bff"/><stop offset=".55" stop-color="#5e5ce6"/><stop offset="1" stop-color="#c06bf5"/></linearGradient>
<linearGradient id="g-wall-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#0a84ff"/></linearGradient>
<linearGradient id="g-wall-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb340"/><stop offset="1" stop-color="#ff375f"/></linearGradient>
<linearGradient id="g-wall-d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#64d2ff"/><stop offset="1" stop-color="#5e5ce6"/></linearGradient>
<linearGradient id="g-rgb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff375f"/><stop offset=".33" stop-color="#ffd60a"/><stop offset=".66" stop-color="#30d158"/><stop offset="1" stop-color="#0a84ff"/></linearGradient>
<linearGradient id="g-paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6e8ec"/></linearGradient>
<linearGradient id="g-label" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient>
<radialGradient id="g-sh"><stop offset="0" style="stop-color:#000;stop-opacity:var(--sh-o,.22)"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<pattern id="p-keys" width="11" height="11" patternUnits="userSpaceOnUse"><rect x=".8" y=".8" width="9.4" height="9.4" rx="2" style="fill:var(--k3,#2c2e34)"/></pattern>

<!-- Product renders -->
<symbol id="r-laptop" viewBox="0 0 200 150">
  <ellipse cx="100" cy="132" rx="94" ry="7" fill="url(#g-sh)"/>
  <rect x="30" y="12" width="140" height="98" rx="7" style="fill:var(--k2,#1c1d20)"/>
  <rect x="31.5" y="13.5" width="137" height="95" rx="6" style="fill:var(--k0,#050506)"/>
  <rect x="36" y="19" width="128" height="82" rx="2" style="fill:var(--wall,url(#g-wall-a))"/>
  <rect x="60" y="35" width="80" height="50" rx="4" fill="#fff" opacity=".92"/>
  <rect x="60" y="35" width="80" height="8" rx="3" fill="#ececf1"/>
  <circle cx="65" cy="39" r="1.3" fill="#ff5f57"/><circle cx="69.5" cy="39" r="1.3" fill="#febc2e"/><circle cx="74" cy="39" r="1.3" fill="#28c840"/>
  <rect x="66" y="50" width="34" height="4" rx="2" opacity=".8" style="fill:var(--k2,#1d1d1f)"/>
  <rect x="66" y="58" width="58" height="3" rx="1.5" fill="#c7c7cc"/>
  <rect x="66" y="64" width="46" height="3" rx="1.5" fill="#c7c7cc"/>
  <rect x="66" y="73" width="22" height="6" rx="3" fill="#0071e3"/>
  <circle cx="100" cy="16.3" r=".9" style="fill:var(--k3,#2a2b30)"/>
  <path d="M17 110h166l10.5 9.6c1.7 1.6.6 4.4-1.7 4.4H8.2c-2.3 0-3.4-2.8-1.7-4.4z" fill="url(#g-alu)"/>
  <path d="M84 110h32v1.4a2.2 2.2 0 0 1-2.2 2.2H86.2A2.2 2.2 0 0 1 84 111.4z" fill="#9ea1a8"/>
  <rect x="8" y="122.6" width="184" height="1.4" rx=".7" fill="#7e8188" opacity=".55"/>
</symbol>
<symbol id="r-printer" viewBox="0 0 200 150">
  <ellipse cx="100" cy="134" rx="84" ry="7" fill="url(#g-sh)"/>
  <path d="M60 14h80v42H60z" fill="url(#g-paper)" stroke="#d5d8de" stroke-width=".8"/>
  <rect x="68" y="22" width="44" height="2.6" rx="1.3" fill="#c3c7ce"/><rect x="68" y="29" width="62" height="2" rx="1" fill="#d5d8de"/><rect x="68" y="34" width="54" height="2" rx="1" fill="#d5d8de"/>
  <rect x="32" y="44" width="136" height="22" rx="9" style="fill:var(--k3,#2a2b30)"/>
  <rect x="26" y="56" width="148" height="72" rx="13" fill="url(#g-black)"/>
  <rect x="30" y="58" width="140" height="3" rx="1.5" fill="#fff" opacity=".06"/>
  <rect x="46" y="82" width="108" height="6" rx="3" style="fill:var(--k0,#050506)"/>
  <path d="M50 88h100l7 11H43z" style="fill:var(--k4,#3a3b41)"/>
  <rect x="132" y="100" width="32" height="22" rx="3.5" style="fill:var(--k1,#141518)"/>
  <rect x="135.5" y="105" width="5" height="14" rx="1.5" fill="#22c3ee"/><rect x="142.5" y="107" width="5" height="12" rx="1.5" fill="#e5307b"/><rect x="149.5" y="104" width="5" height="15" rx="1.5" fill="#f6c90e"/><rect x="156.5" y="108" width="5" height="11" rx="1.5" fill="#55575e"/>
  <circle cx="44" cy="112" r="2.2" fill="#30d158"/>
  <rect x="52" y="110" width="22" height="4" rx="2" style="fill:var(--k3,#2e2f35)"/>
</symbol>
<symbol id="r-toner" viewBox="0 0 200 150">
  <ellipse cx="100" cy="120" rx="92" ry="7" fill="url(#g-sh)"/>
  <rect x="14" y="50" width="172" height="54" rx="15" fill="url(#g-black)"/>
  <rect x="14" y="50" width="32" height="54" rx="13" style="fill:var(--k3,#26272c)"/>
  <path d="M23 63v28M30 63v28M37 63v28" stroke-width="2.4" stroke-linecap="round" style="stroke:var(--k4,#3b3c42)"/>
  <rect x="156" y="57" width="24" height="40" rx="8" style="fill:var(--k2,#1a1b1f)"/>
  <rect x="52" y="98" width="100" height="7" rx="3.5" fill="#2f8f6b"/>
  <rect x="64" y="61" width="80" height="26" rx="4" fill="#f5f5f7"/>
  <rect x="71" y="67" width="36" height="4" rx="2" fill="#0a84ff"/>
  <rect x="71" y="75" width="58" height="2.6" rx="1.3" fill="#b7bac1"/>
  <rect x="71" y="80" width="40" height="2.6" rx="1.3" fill="#d1d3d8"/>
  <rect x="18" y="52" width="164" height="4" rx="2" fill="#fff" opacity=".07"/>
</symbol>
<symbol id="r-mouse" viewBox="0 0 200 150">
  <ellipse cx="100" cy="140" rx="46" ry="6" fill="url(#g-sh)"/>
  <rect x="68" y="10" width="64" height="126" rx="32" fill="url(#g-black)"/>
  <path d="M100 12v44" stroke-opacity=".55" stroke-width="1.4" style="stroke:var(--k0,#000)"/>
  <path d="M70 57c10 3 50 3 60 0" stroke-opacity=".35" stroke-width="1.2" fill="none" style="stroke:var(--k0,#000)"/>
  <rect x="96" y="24" width="8" height="18" rx="4" fill="#5b5d64"/>
  <rect x="97.5" y="27" width="5" height="2" rx="1" fill="#7c7f87"/><rect x="97.5" y="32" width="5" height="2" rx="1" fill="#7c7f87"/><rect x="97.5" y="37" width="5" height="2" rx="1" fill="#7c7f87"/>
  <path d="M75 114c9 15 41 15 50 0" stroke="url(#g-rgb)" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <circle cx="100" cy="88" r="6" fill="none" stroke="#55575e" stroke-width="1.6"/>
  <path d="M78 22c4-7 10-10 18-11" stroke="#fff" stroke-opacity=".12" stroke-width="3" fill="none" stroke-linecap="round"/>
</symbol>
<symbol id="r-keyboard" viewBox="0 0 200 150">
  <ellipse cx="100" cy="116" rx="96" ry="7" fill="url(#g-sh)"/>
  <rect x="10" y="100" width="180" height="9" rx="4.5" fill="url(#g-rgb)" opacity=".5"/>
  <rect x="8" y="38" width="184" height="68" rx="10" style="fill:var(--k1,#141518)"/>
  <rect x="17.5" y="45" width="165" height="44" fill="url(#p-keys)"/>
  <rect x="17.5" y="45" width="165" height="54" fill="url(#g-rgb)" opacity=".16"/>
  <rect x="18.3" y="90.8" width="20" height="7.6" rx="2" style="fill:var(--k3,#2c2e34)"/>
  <rect x="40.3" y="90.8" width="20" height="7.6" rx="2" style="fill:var(--k3,#2c2e34)"/>
  <rect x="62.3" y="90.8" width="72" height="7.6" rx="2" style="fill:var(--k4,#34363d)"/>
  <rect x="136.3" y="90.8" width="20" height="7.6" rx="2" style="fill:var(--k3,#2c2e34)"/>
  <rect x="158.3" y="90.8" width="23.4" height="7.6" rx="2" style="fill:var(--k3,#2c2e34)"/>
  <rect x="12" y="40" width="176" height="3" rx="1.5" fill="#fff" opacity=".06"/>
</symbol>
<symbol id="r-router" viewBox="0 0 200 150">
  <ellipse cx="100" cy="126" rx="90" ry="7" fill="url(#g-sh)"/>
  <rect x="40" y="16" width="8" height="70" rx="4" transform="rotate(-14 44 86)" style="fill:var(--k2,#1d1e22)"/>
  <rect x="74" y="10" width="8" height="76" rx="4" transform="rotate(-5 78 86)" style="fill:var(--k2,#1d1e22)"/>
  <rect x="118" y="10" width="8" height="76" rx="4" transform="rotate(5 122 86)" style="fill:var(--k2,#1d1e22)"/>
  <rect x="152" y="16" width="8" height="70" rx="4" transform="rotate(14 156 86)" style="fill:var(--k2,#1d1e22)"/>
  <rect x="20" y="78" width="160" height="40" rx="12" fill="url(#g-black)"/>
  <rect x="26" y="80" width="148" height="5" rx="2.5" fill="#fff" opacity=".07"/>
  <circle cx="64" cy="104" r="2" fill="#30d158"/><circle cx="78" cy="104" r="2" fill="#30d158"/><circle cx="92" cy="104" r="2" fill="#30d158"/><circle cx="106" cy="104" r="2" fill="#30d158"/><circle cx="120" cy="104" r="2" fill="#5b5d64"/><circle cx="134" cy="104" r="2" fill="#30d158"/>
</symbol>
<symbol id="r-ssd" viewBox="0 0 200 150">
  <ellipse cx="100" cy="106" rx="94" ry="6" fill="url(#g-sh)"/>
  <rect x="176" y="56" width="14" height="40" rx="1.5" style="fill:var(--k1,#0d0e10)"/>
  <g fill="#d4a63a"><rect x="179" y="59" width="9" height="3" rx=".6"/><rect x="179" y="64" width="9" height="3" rx=".6"/><rect x="179" y="69" width="9" height="3" rx=".6"/><rect x="179" y="80" width="9" height="3" rx=".6"/><rect x="179" y="85" width="9" height="3" rx=".6"/><rect x="179" y="90" width="9" height="3" rx=".6"/></g>
  <rect x="10" y="56" width="168" height="40" rx="3" style="fill:var(--k1,#121316)"/>
  <rect x="24" y="59" width="142" height="34" rx="2.5" fill="url(#g-label)"/>
  <text x="38" y="80.5" font-family="-apple-system,Inter,Arial,sans-serif" font-size="12.5" font-weight="700" fill="#fff" letter-spacing=".5">NVMe · 1 TB</text>
  <rect x="38" y="85" width="40" height="2.2" rx="1.1" fill="#fff" opacity=".45"/>
  <circle cx="15" cy="76" r="3.4" style="fill:var(--k3,#2a2b30)"/>
</symbol>
<symbol id="r-tower" viewBox="0 0 200 150">
  <ellipse cx="100" cy="141" rx="64" ry="6" fill="url(#g-sh)"/>
  <rect x="56" y="6" width="88" height="132" rx="7" fill="url(#g-black)"/>
  <rect x="62" y="12" width="76" height="120" rx="4" style="fill:var(--k0,#07080a)"/>
  <g fill="none" stroke="url(#g-rgb)" stroke-width="3"><circle cx="100" cy="37" r="14"/><circle cx="100" cy="72" r="14"/><circle cx="100" cy="107" r="14"/></g>
  <g style="fill:var(--k1,#15161a)"><circle cx="100" cy="37" r="9.5"/><circle cx="100" cy="72" r="9.5"/><circle cx="100" cy="107" r="9.5"/></g>
  <g style="fill:var(--k3,#2a2b30)"><circle cx="100" cy="37" r="3"/><circle cx="100" cy="72" r="3"/><circle cx="100" cy="107" r="3"/></g>
  <path d="M64 14h22L64 74z" fill="#fff" opacity=".05"/>
  <rect x="62" y="136" width="14" height="4" rx="2" style="fill:var(--k2,#1a1b1f)"/><rect x="124" y="136" width="14" height="4" rx="2" style="fill:var(--k2,#1a1b1f)"/>
</symbol>
<symbol id="r-cable" viewBox="0 0 200 150">
  <ellipse cx="100" cy="140" rx="70" ry="5" fill="url(#g-sh)"/>
  <path d="M46 102c0-58 38-70 58-50s46 30 50-22" fill="none" stroke-width="7" stroke-linecap="round" style="stroke:var(--k2,#1c1d21)"/>
  <g transform="translate(46 102)"><rect x="-10" y="0" width="20" height="24" rx="4" fill="url(#g-black)"/><rect x="-8.5" y="22" width="17" height="11" rx="1.5" fill="url(#g-alu)"/><rect x="-5.5" y="25" width="11" height="4" rx=".8" fill="#5b5d64"/></g>
  <g transform="translate(154 30) rotate(180)"><rect x="-10" y="0" width="20" height="24" rx="4" fill="url(#g-black)"/><rect x="-8.5" y="22" width="17" height="11" rx="1.5" fill="url(#g-alu)"/><rect x="-5.5" y="25" width="11" height="4" rx=".8" fill="#5b5d64"/></g>
</symbol>
<symbol id="r-ink" viewBox="0 0 200 150">
  <ellipse cx="100" cy="134" rx="86" ry="6" fill="url(#g-sh)"/>
  <g transform="translate(25 0)"><rect x="8" y="20" width="14" height="16" rx="3" style="fill:var(--k2,#1d1d1f)"/><rect x="0" y="34" width="30" height="96" rx="7" fill="#00a0d8"/><rect x="0" y="66" width="30" height="34" fill="#fff" opacity=".93"/><rect x="6" y="76" width="18" height="3.4" rx="1.7" fill="#00a0d8"/><rect x="4" y="38" width="4" height="86" rx="2" fill="#fff" opacity=".25"/></g>
  <g transform="translate(65 0)"><rect x="8" y="20" width="14" height="16" rx="3" style="fill:var(--k2,#1d1d1f)"/><rect x="0" y="34" width="30" height="96" rx="7" fill="#e0218a"/><rect x="0" y="66" width="30" height="34" fill="#fff" opacity=".93"/><rect x="6" y="76" width="18" height="3.4" rx="1.7" fill="#e0218a"/><rect x="4" y="38" width="4" height="86" rx="2" fill="#fff" opacity=".25"/></g>
  <g transform="translate(105 0)"><rect x="8" y="20" width="14" height="16" rx="3" style="fill:var(--k2,#1d1d1f)"/><rect x="0" y="34" width="30" height="96" rx="7" fill="#f6c600"/><rect x="0" y="66" width="30" height="34" fill="#fff" opacity=".93"/><rect x="6" y="76" width="18" height="3.4" rx="1.7" fill="#d9a900"/><rect x="4" y="38" width="4" height="86" rx="2" fill="#fff" opacity=".3"/></g>
  <g transform="translate(145 0)"><rect x="8" y="20" width="14" height="16" rx="3" style="fill:var(--k2,#1d1d1f)"/><rect x="0" y="34" width="30" height="96" rx="7" style="fill:var(--k3,#2b2b2e)"/><rect x="0" y="66" width="30" height="34" fill="#fff" opacity=".93"/><rect x="6" y="76" width="18" height="3.4" rx="1.7" style="fill:var(--k3,#2b2b2e)"/><rect x="4" y="38" width="4" height="86" rx="2" fill="#fff" opacity=".15"/></g>
</symbol>
<symbol id="r-all" viewBox="0 0 200 150">
  <rect x="46" y="14" width="50" height="50" rx="14" fill="currentColor"/>
  <rect x="104" y="14" width="50" height="50" rx="14" fill="currentColor" opacity=".55"/>
  <rect x="46" y="72" width="50" height="50" rx="14" fill="currentColor" opacity=".55"/>
  <rect x="104" y="72" width="50" height="50" rx="14" fill="currentColor" opacity=".3"/>
</symbol>

<!-- UI icons -->
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></symbol>
<symbol id="i-bag" viewBox="0 0 24 24"><path d="M5 8h14l-1.1 11.2A2 2 0 0 1 15.9 21H8.1a2 2 0 0 1-2-1.8z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
<symbol id="i-moon" viewBox="0 0 24 24"><path d="M20.5 13.4A8.5 8.5 0 1 1 10.6 3.5a6.6 6.6 0 0 0 9.9 9.9z"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 8h16M4 16h16"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>
<symbol id="i-check-c" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></symbol>
<symbol id="i-chev-l" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
<symbol id="i-chev-r" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
<symbol id="i-wa" viewBox="0 0 24 24"><path d="M3 21l1.65-4.6A8.9 8.9 0 1 1 7.7 19.6z"/><path fill="currentColor" stroke="none" d="M9.2 7.6c.2-.4.5-.4.8-.4h.5c.2 0 .4.1.5.4l.8 1.8c.1.2 0 .5-.1.7l-.6.7c-.1.2-.1.4 0 .6.7 1.1 1.6 2 2.7 2.7.2.1.4.1.6 0l.7-.6c.2-.2.5-.2.7-.1l1.8.8c.3.1.4.3.4.5v.5c0 .3-.1.6-.4.8-.7.6-1.7.8-2.6.5-3.2-.9-5.6-3.3-6.5-6.5-.3-.9 0-1.9.5-2.6z"/></symbol>
<symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></symbol>
<symbol id="i-truck" viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></symbol>
<symbol id="i-store" viewBox="0 0 24 24"><path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5 11.5V20h14v-8.5M10 20v-5h4v5"/></symbol>
<symbol id="i-scan" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></symbol>
<symbol id="i-package" viewBox="0 0 24 24"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/></symbol>
<symbol id="i-msg" viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z"/></symbol>
<symbol id="i-wrench" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></symbol>
<symbol id="i-laptop" viewBox="0 0 24 24"><rect x="4" y="4.5" width="16" height="11" rx="2"/><path d="M2 19h20"/></symbol>
<symbol id="i-monitor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></symbol>
<symbol id="i-printer" viewBox="0 0 24 24"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></symbol>
<symbol id="i-refresh" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/></symbol>
<symbol id="i-pencil" viewBox="0 0 24 24"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-4-4L4 16z"/><path d="m14 6 4 4"/></symbol>
<symbol id="i-pause" viewBox="0 0 24 24"><rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5a.8.8 0 0 0-1.2.7z"/></symbol>
<symbol id="i-sparkles" viewBox="0 0 24 24"><path d="M11 3l1.7 4.8L17.5 9.5l-4.8 1.7L11 16l-1.7-4.8L4.5 9.5l4.8-1.7z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></symbol>
<symbol id="i-cpu" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></symbol>
<symbol id="i-ram" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="9" rx="1.5"/><path d="M6 10v3M10 10v3M14 10v3M18 10v3M4 16v2M20 16v2"/></symbol>
<symbol id="i-db" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></symbol>
<symbol id="i-wifi" viewBox="0 0 24 24"><path d="M2 8.8a15 15 0 0 1 20 0"/><path d="M5 12.4a10 10 0 0 1 14 0"/><path d="M8.5 15.9a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/></symbol>
<symbol id="i-zap" viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></symbol>
<symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></symbol>
<symbol id="i-card" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/></symbol>
<symbol id="i-cash" viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/></symbol>
<symbol id="i-transfer" viewBox="0 0 24 24"><path d="M4 8h14l-3-3M20 16H6l3 3"/></symbol>
<symbol id="i-instagram" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></symbol>
<symbol id="i-facebook" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></symbol>
<!-- Más íconos -->
<symbol id="i-trend-up" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></symbol>
<symbol id="i-trend-down" viewBox="0 0 24 24"><path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/></symbol>
<symbol id="i-more" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/></symbol>
<symbol id="i-receipt" viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></symbol>
<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></symbol>
</defs>`;

export function Sprites() {
  return <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: SPRITES }} />;
}
