# Pendientes — AT Computación (prototipo `preview/fase-0-inicio.html`)

Origen: revisión de diseño con 5 revisores independientes (octubre 2026), cada uno con una mirada distinta. Hay 60 hallazgos en total, con este prefijo:
- **V** — fidelidad visual a Apple
- **M** — mobile y responsive
- **T** — textos, confianza y conversión
- **A** — confort visual y accesibilidad
- **K** — terminación y consistencia

El índice está en castellano. El detalle técnico (más abajo) queda en inglés, tal como lo escribieron los revisores.

**Cómo usar este archivo:** trabajá por lote, marcá `[x]` al terminar y anotá el commit. Antes de dar algo por hecho, corré `node tests/atc/verificar.mjs`.

Varios hallazgos repiten el mismo problema visto desde distintos ángulos. En el índice van agrupados en una sola línea, separados con "/".

## Índice por lote

### B1 — La verdad del negocio (textos)
- [x] T1 / T2 / M10 / V6: promesas que una sola persona no puede cumplir.
  - Envío "en el día" (franja de valores, ficha, bolsa y reseña de ejemplo).
  - Retiro a domicilio ("Lo traés. O lo buscamos.").
  - Visitas y "recuperación de datos" con tono de laboratorio.
- [x] T3 / M6 / K7: "Responde en minutos" en el widget de WhatsApp, incluso con el local cerrado.
- [x] T4 / T5: la mejor señal de confianza (te atiende el técnico, que también es el dueño) está escondida.
  - Cambiar "En el día" y "Online" de la franja de valores por señales honestas para una persona sola.
- [x] T6: los tiempos de entrega se contradicen entre secciones y se presentan como garantía.
- [x] T8: "Mensaje del técnico" y "en tiempo real" suenan a empresa con personal. "Especialista" ya se quitó. *("Mensaje del técnico" queda a propósito: el técnico es el dueño.)*
- [x] T9: el botón "Pedir presupuesto exacto" contradice la bajada del cotizador, y el costo del diagnóstico queda escondido.
- [x] T10: los perfiles de notebook mandan a una tienda sin modelos que coincidan, y el mensaje de WhatsApp sale roto.
- [x] T11: Servicio y Preguntas frecuentes terminan sin un camino a WhatsApp, y la FAQ no dice quién repara.
- [x] T7: el inicio no le da una entrada clara a quien viene a reparar.
- [x] T12: el celular de Servicio muestra una barra de app ("Seguimiento / Tienda / Chat") que no existe.
- [x] Sellos de confianza: solo "Garantía escrita de 90 días" y "Te atiende el técnico". Nada de "oficial" ni "certificado" sin prueba.

### B2 — Legibilidad y contraste (WCAG AA)
- [x] A2: el texto blanco sobre el verde de WhatsApp (#1a8d4c) y sobre el azul hover (#0077ed) no llega a AA. Pasan a #157a3e y #0062c4.
- [x] A3 / A7: `--text-3` (#86868b) no llega a AA en texto chico, y hay mucho texto de menos de 13 px.
- [x] A5: las etiquetas de estado y de stock (texto de color sobre fondo teñido) no llegan a AA.
- [x] A6: el modo oscuro usa #0071e3 en textos, etiquetas y anillo de foco. Debe usar #2997ff.
- [x] A10: los bordes de los campos son muy tenues, y en oscuro los campos parecen agujeros negros.
- [x] A4 / K8: brillo excesivo en oscuro, con maquetas casi blancas y la notificación en blanco. *(Parcial: la notificación ya es gris en oscuro; las maquetas siguen claras.)*
- [x] V12: el verde saturado de WhatsApp es lo más fuerte de cada pantalla, incluso en el inicio. *(Parcial: el botón con texto ya es más sobrio, #157a3e; el botón flotante sigue en #25d366.)*

### B3 — Movimiento (guía v2)
- [ ] Token `--ease: cubic-bezier(.16,1,.3,1)` y duraciones de 150/300/600 ms.
- [ ] Un solo hover para todas las tarjetas: escala 1,015 + sombra nivel 2.
- [ ] Quitar la animación decorativa sobrante: los puntos de "escribiendo" y el "pop" del widget.
- [ ] Carrusel de marcas: **única excepción aprobada** a "sin bucles".
- [ ] M5: el hover queda "pegado" después de tocar en pantallas táctiles. Encerrar los hover en `@media (hover:hover)`.

### B4 — Sistema visual
- [ ] V2: títulos en peso 600 con tracking más neutro.
- [ ] V4 / K10: los encabezados de sección no siguen un solo sistema, y el naranja tiene 4 significados. Queda solo para "Oferta / Últimas unidades".
- [ ] K11: radios a la escala 12/18/24/32 y paddings unificados.
- [ ] V5: las tarjetas de la tienda tienen espacio muerto, la ilustración es chica, compiten 4 colores y el "¡Quedan 3!" presiona de más.
- [ ] V10 / K6 / M12: el precio del cotizador se ve partido en "$ / a / $". Pasa a una sola línea, y los dígitos no deben saltar.
- [ ] V9 / K9: Contacto tiene dos títulos de 56 px y un hueco. Usar ese espacio para decir quién atiende.
- [ ] V3 / V8 / A9: en modo claro, la barra de arriba queda gris sucio sobre la sección negra. En oscuro se pierde el ritmo entre secciones y el negro puro cansa.
- [ ] V1: en la compu, el producto del inicio queda debajo del borde de la pantalla.
- [ ] V7: el degradé del título del inicio repite el violeta del fondo de pantalla.
- [ ] K4: las píldoras de pago de la bolsa dejan una sola en la última línea, y hay dos estilos distintos de "seleccionado".
- [ ] K12: bordes sin terminar.
  - Línea suelta en la bolsa vacía.
  - Sombra cortada.
  - Divisor sobrante al principio del pie.

### B5 — Errores de funcionamiento y responsive
- [ ] A1: las ventanas cerradas (ficha, bolsa, búsqueda, WhatsApp) siguen recibiendo foco y los lectores de pantalla las anuncian. Usar `inert`.
- [ ] K1: al abrir el menú del celular o una ventana, desaparece la barra superior con su botón de cerrar.
- [ ] M2: en iPad mini y en iPad vertical, el botón "Agregar a la bolsa" de la ficha queda cortado.
- [ ] M4: las tablets de 735–1068 px reciben el diseño de celular (celular chico, perfiles cortados y menú de hamburguesa).
- [ ] M1 / K3 / V11 / A8: el celular fijo de Servicio técnico tiene problemas.
  - Su pantalla queda medio vacía.
  - En el celular, el texto de cada paso queda apretado en el tercio de abajo.
  - Los pasos inactivos casi no se ven.
- [ ] M7: en el celular, los perfiles de notebook parecen contenido desbordado.
- [ ] M8: la bolsa abre como panel lateral y la ficha como hoja desde abajo. Unificar el comportamiento y usar `dvh`.
- [ ] M9: en el celular, el texto de la pantalla de la notebook del inicio queda en 5–7 px.
- [ ] M11: el buscador del celular muestra la tecla "Esc", no tiene botón "Cancelar" y su texto de ayuda queda cortado.
- [ ] K2: en el formulario de seguimiento, los estilos de las etiquetas se cuelan en los campos, los dígitos parecen texto de ayuda y el estado "cargando" se ve mal.
- [ ] A11 / A12: lectores de pantalla.
  - No se anuncian los resultados de búsqueda ni los campos de la bolsa.
  - Se lee en voz alta el texto de las maquetas.
  - Los títulos saltan de nivel.
  - Las estrellas no tienen etiqueta.

### B6 — Seguridad aplicada en la demo (ver `docs/atc/guia-de-diseno.md`, sección 6)
- [ ] Códigos de seguimiento con formato aleatorio (Crockford base32, p. ej. `AT-7KQ2-9M`) en lugar de `ATC-1042` secuencial (riesgo IDOR).
- [ ] El seguimiento muestra solo nombre + inicial (minimizar datos personales, Ley 25.326).
- [ ] Texto de privacidad: "Tus datos están protegidos: se necesita el código y tu teléfono".

---

# Detalle de los 60 hallazgos

## V — Fidelidad visual a Apple

### V1 · Hero: the product sits below the fold under an oversized headline

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Hero. `.hero h1{font-size:clamp(46px,8.6vw,104px);letter-spacing:-.048em}` (l.154), `.hero-sub{font-size:clamp(19px,2.3vw,24px);font-weight:500;max-width:680px}` (l.156), `.stage{margin:clamp(48px,7vw,80px) auto 0}` (l.160), `.laptop{transform:rotateX(calc((1 - var(--p)) * 26deg)) scale(calc(.86 + var(--p) * .14)) translateY(...24px)}` (l.161), sub copy l.951
- **Problema:** At 1440×900 on load, the first screen shows only the ribbon, a two-line 104px headline and a three-line subhead that ends on the orphan "tu equipo.". Below that is about 210px of blank space. The laptop starts at y≈845, so only the edge of its bezel shows. On apple.com the product always appears in the first screen. Here the hero reads as a text landing page, and the 26° tilt plus scale .86 adds even more empty space above the device.
- **Arreglo propuesto:** `.hero{padding-top:clamp(40px,5vw,64px)}` `.hero h1{font-size:clamp(44px,6.4vw,80px);line-height:1.05;letter-spacing:-.03em}` `.hero-sub{font-size:clamp(19px,1.8vw,24px);font-weight:400;max-width:720px;margin-top:18px;text-wrap:balance}` `.ctas{margin-top:28px}` `.stage{margin-top:clamp(32px,3.5vw,48px)}` `.laptop{transform:rotateX(calc((1 - var(--p)) * 14deg)) scale(calc(.92 + var(--p) * .08))}`. Shorten the subhead to: "Notebooks, impresoras, insumos y accesorios. Servicio técnico con diagnóstico en 24–48 h y seguimiento online." I tested this in headless Chromium at 1440×900: the subhead fits on 2 lines and the laptop top moves from y≈845 to y≈640, so about 260px of the screen UI shows in the first viewport. The scroll-straightening effect still works.
- **Evidencia:** desktop-light--state-hero-top.png (laptop only at bottom edge), desktop-light--01-inicio.png, desktop-dark--01-inicio.png; computed .hero h1 = 104px/700/-4.99px; re-render with fix: scratchpad/vd/hero-fix2.png

### V2 · Headlines are 700 weight with tight tracking; Apple uses 600 with near-neutral tracking

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Global type. `h1,h2,h3,h4{font-weight:700;letter-spacing:-.03em}` (l.61), `.h2{letter-spacing:-.035em}` (l.80), `.hero h1{-.048em}` (l.154), `.val b{font-weight:700;letter-spacing:-.04em}` (l.237), `.summary .range{font-weight:700;letter-spacing:-.04em}` (l.425), `.c-main h3{letter-spacing:-.04em}` (l.456). Also `.faq details p` measure = 832px (`.faq{max-width:880px}` l.447, padding-right 48px l.453)
- **Problema:** Apple sets every headline in SF Pro Display Semibold (600), with tracking around -0.015em at 80px and about -0.005em at 48–56px. Here the headlines are 700 at -0.035 to -0.048em in Inter. Letters crowd together ("Tu", "tecnología", "Tienda.", "¿Hablamos?"), giving the heavy, compressed look of a Framer or Webflow template, and this shows in every section header. FAQ answers also run about 105 characters per line, well past the 65–75 characters Apple uses for body copy.
- **Arreglo propuesto:** `h1,h2,h3,h4{font-weight:600;letter-spacing:-.022em}` `.h2{letter-spacing:-.025em;line-height:1.08;text-wrap:balance}` `.hero h1{letter-spacing:-.03em}` `.val b,.summary .range,.c-main h3{font-weight:600;letter-spacing:-.025em}` `.stx h3{letter-spacing:-.025em}`. Inter 600 is already loaded, so 700 can be dropped from the Google Fonts URL (`wght@400;500;600`). FAQ: `.faq details p{max-width:66ch;padding:0 0 26px}`.
- **Evidencia:** Computed: .hero h1 104px/700/-4.992px, #tienda .h2 56px/700/-1.96px, .c-main h3 56px/700/-2.24px, .faq details p width 880px. Visible in desktop-light--01, --03, --08, --10; FAQ measure in desktop-light--09-faq.png

### V3 · In light mode the nav turns into a flat grey bar over the black story section

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Nav + Service story. `.nav{background:var(--nav)}` with light `--nav:rgba(251,251,253,.8)` (l.30, l.116) over `.story{background:#000}` (l.295)
- **Problema:** While you scroll the roughly 3,500px black service story in light theme, the translucent nav blends with the black into a flat rgb(201,201,202) bar with dark text. It looks like a disabled toolbar sitting over the most premium section of the page. apple.com switches its nav to the dark material over dark sections.
- **Arreglo propuesto:** CSS: `.nav.on-dark{--nav:rgba(22,22,23,.8);--text:#f5f5f7;--fill-2:rgba(255,255,255,.1);--bg:#3a3a3c;--line-2:rgba(255,255,255,.08);color:var(--text)}` `.nav.on-dark .mark{color:#111;background:linear-gradient(180deg,#fff,#c7c7cc)}`. JS, right after `const nav = $('#nav')` (l.1416): `new IntersectionObserver(([e]) => nav.classList.toggle('on-dark', e.isIntersecting), { rootMargin: '0px 0px -94% 0px' }).observe($('.story'));`. Tested: the nav turns dark exactly while over #servicio and goes back to light at #seguimiento.
- **Evidencia:** desktop-light--state-story.png (nav pixel sampled = rgb(201,201,202)); fix render scratchpad/vd/nav-dark.png

### V4 · Section headers follow no single system: eyebrow colors, sizes and alignment keep changing

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** `.kicker{color:var(--warn)}` (l.86) used in #seguimiento "Seguimiento online" (l.1075) and #presupuesto "Presupuesto" (l.1109) in orange #b64400 / #ff9f0a. #servicio uses inline `style="color:#2997ff"` (l.1048). The other 7 sections have no eyebrow. Story h2 has a forced `<br>` inside `.muted` (l.1049). `.svc-head .h2` has inline `style="font-size:clamp(30px,4vw,44px)"` (l.1062), a third headline size. In #seguimiento the 56px `.h2` sits in a 468px column (`.track{grid-template-columns:.9fr 1.1fr}` l.346).
- **Problema:** Headers switch between an orange eyebrow, a blue eyebrow and none, between left and center, and between 56px and 44px. Apple keeps one rhythm. The orange eyebrow is Apple's "New" product flag, so as a section label it reads like a promo tag. In Seguimiento, "¿Cómo va tu reparación? Miralo ahora." breaks into 4 lines of 56px, the heaviest block on the page, leaving about 160px of empty space under the form card.
- **Arreglo propuesto:** Delete the three `<span class="kicker">` elements, since each h2 already names its section. If any are kept, use `.kicker{color:var(--text-2)}` everywhere, never orange or blue. Every h2 uses the two-tone `.h2` pattern "Frase. <span class=muted>complemento.</span>". Center only the statement sections (#notebooks, #servicio, #presupuesto, #faq). Left-align the shelf-style sections (#tienda, #opiniones, #contacto, .svc-head) with the link on the right. Replace the inline 44px with `.h2.sm{font-size:clamp(28px,3.4vw,40px)}`. Remove the `<br>` at l.1049 and rely on `text-wrap:balance`. Add `.track .h2{font-size:clamp(34px,4vw,48px)}` so the Seguimiento headline fits on 2 lines plus the grey line.
- **Evidencia:** desktop-light--05-servicio.png (blue eyebrow), desktop-light--06-seguimiento.png and desktop-light--07-presupuesto.png (orange eyebrows, 4-line h2), scratchpad/vd/svcs-light.png (44px h2), desktop-light--03/--08/--09 (no eyebrows)

### V5 · Shelf cards: dead space, a small render, four competing colors and a scarcity nag

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Tienda shelf. `.pcard{min-height:470px;padding:26px 26px 24px}` (l.258), `.p-img{height:190px}` (l.262), `.p-foot{margin-top:auto;padding-top:22px}` (l.268), `.stock.ok{color:var(--ok)} .stock.low{color:var(--warn)}` (l.271), `stockInfo` → `` `¡Quedan ${s}!` `` (l.1374)
- **Problema:** Each card has a dead band of about 60px between the spec line (y≈776) and the price (y≈860), and the render fills only about 40% of the card. A single card can show four colors: orange tag, orange "¡Quedan 3!", green "En stock" and a blue pill. Two of the first three cards shout "¡Quedan 3!", which reads as fake scarcity, and the same nag appears in Spotlight ("¡Quedan 2!"). Apple's shelf ("Lo último") shows a big render, the name and the price, with no stock pressure.
- **Arreglo propuesto:** `.pcard{min-height:0;padding:28px 28px 26px}` (cards still match heights because the flex row stretches them) `.p-img{height:220px;margin:4px 0 22px}` `.p-foot{padding-top:20px}` `.stock.ok{color:var(--text-3)}` `.stock.low{color:var(--text-2)}`. Keep `.stock.out{color:var(--danger)}`. JS: `const stockInfo = s => s <= 0 ? { c: 'out', t: 'Sin stock' } : s <= 2 ? { c: 'low', t: s === 1 ? 'Última unidad' : 'Últimas 2 unidades' } : { c: 'ok', t: 'Disponible' };`. Keep the orange `.p-tag` as the single Apple-orange accent on each card.
- **Evidencia:** desktop-light--03-tienda.png, desktop-dark--03-tienda.png, desktop-light--state-search.png ("$ 32.999 · ¡Quedan 2!")

### V6 · Copy promises capacity one person can't deliver (same-day shipping, a specialist, instant replies)

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Values tile `<b>En el día</b><p>envíos dentro de la ciudad.</p>` with the truck icon (l.992). Quick view `.qv-note` "recibilo en el día dentro de la ciudad" (l.1585). Bag `Envío a domicilio<small>En el día · a coordinar</small>` (l.1642). Tienda link "Hablá con un especialista" (l.1017). WhatsApp panel `<small>Responde en minutos</small>` (l.1245). Story step 1 "Lo traés. O lo buscamos." / "coordinamos el retiro a domicilio" (l.1333).
- **Problema:** A 52px headline stat promises same-day delivery, which implies a courier, and "especialista" and "Responde en minutos" imply staff and an always-on chat. The owner is the only technician, so these promises break the first time he is busy at the bench. The values row is where a visitor reads them first, and it also looks like a generic four-stats template.
- **Arreglo propuesto:** Change the values tile to the `i-user` icon with `<b>1 a 1</b><p>te atiende el mismo técnico que repara tu equipo.</p>`, which turns the one-person fact into the selling point. qv-note: "Retiralo en el local o coordinamos el envío por WhatsApp." Bag small text: "A coordinar". Tienda link: "Preguntale al técnico". WhatsApp small text: "Te respondemos en el horario del local". Story step 1: h3 "Lo traés al local.", p "Te damos un comprobante con tu <b>código de orden</b>. Si no podés venir, lo coordinamos por WhatsApp."
- **Evidencia:** desktop-light--02-sec.png ("En el día" tile), desktop-light--state-quickview.png (qv-note), desktop-light--state-bag.png ("En el día · a coordinar"), desktop-light--03-tienda.png ("Hablá con un especialista"), desktop-light--05-servicio.png (step 1)

### V7 · The hero gradient headline repeats the violet wallpaper and breaks the page's two-tone system

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Hero. `.hl{background:var(--hl);background-clip:text;color:transparent}` (l.155) with `--hl:linear-gradient(90deg,#0071e3 0%,#5e5ce6 55%,#a64fd8 100%)` (l.33, dark l.49) on "En las mejores manos." (l.950). The same blue-to-violet palette appears just below in `.screen` radial wallpaper (l.172), the dark `.floor` glow (l.168) and the `.phone` glow `rgba(80,110,255,.12)` (l.299).
- **Problema:** A gradient about 1,030px wide at 104px is the loudest element on the page, and the laptop wallpaper right under it repeats the same palette. Together they give the hero the generic AI-startup look and tire the eyes. Every other section uses calm ink plus grey two-tone headlines ("Tienda. La forma más simple…"), so the hero doesn't belong to the same system. Apple keeps the headline in ink and lets the product carry the color.
- **Arreglo propuesto:** `.hl{background:none;-webkit-background-clip:border-box;background-clip:border-box;color:var(--text-2)}` and delete the `--hl` tokens. The hero then reads "Tu tecnología." in ink and "En las mejores manos." in grey, matching the rest of the page (rendered in scratchpad/vd/hero-fix2.png). If some color must stay, use only `--hl:linear-gradient(90deg,#0071e3,#5e5ce6)` on "mejores manos".
- **Evidencia:** desktop-light--01-inicio.png, desktop-dark--01-inicio.png; test render scratchpad/vd/hero-fix2.png

### V8 · Dark mode loses section rhythm and the signature dark section blends into its neighbors

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Dark tokens: `--bg-alt:#0f0f10` vs `--bg:#000` (l.42). `.story{background:#000}` (l.295). `.svc{background:#1c1c1e}` and `.svc:hover{background:#232325}` hardcoded (l.337–338). Mobile `.story-media{background:linear-gradient(#000 82%,rgba(0,0,0,0))}` (l.653).
- **Problema:** In dark mode the alternating bands are nearly invisible (alt sampled at rgb(15,15,16) vs 0,0,0). #notebooks, #servicio and #seguimiento are three consecutive #000 sections, so the dark product-feature section, which is the most Apple-like moment in light mode, blends into the sections around it. The whole 13,800px page becomes one black slab with no chaptering.
- **Arreglo propuesto:** `:root[data-theme="dark"]{--bg-alt:#161617;--tile:#242426}`. `.story{--story-bg:#000;background:var(--story-bg)}` and `:root[data-theme="dark"] .story{--story-bg:#161617;--card:#242426}`. `.svc{background:var(--card)}` `.svc:hover{background:color-mix(in srgb,var(--card) 90%,#fff)}`. In the ≤900px media query: `.story-media{background:linear-gradient(var(--story-bg) 82%,transparent)}`. Dark mode then alternates cleanly: tienda (grey) / notebooks (black) / story (grey) / seguimiento (black) / presupuesto (grey) / opiniones (black) / faq (grey) / contacto (black) / footer (grey).
- **Evidencia:** desktop-dark--04-notebooks.png, desktop-dark--05-servicio.png, desktop-dark--06-seguimiento.png (all pure black, sampled 0,0,0); desktop-dark--03-tienda.png alt bg sampled 15,15,16

### V9 · Contact: two 56px headlines stacked, with an empty hole in the main card

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Contacto. `.h2` "Contacto. Estamos cerca." (l.1172, 56px) directly followed by `.c-main h3` "¿Hablamos?" (l.1176), where `.c-main h3{font-size:clamp(36px,4.6vw,56px)}` computes to 56px (l.456). `.c-main{justify-content:space-between;gap:40px}` (l.455).
- **Problema:** Two headlines of the same size compete one after the other. Because the card is stretched to the height of the right column, space-between leaves about 190px of empty grey between the lede and the WhatsApp/Llamar buttons, so the main contact card looks half-finished.
- **Arreglo propuesto:** `.c-main h3{font-size:clamp(28px,3vw,40px);letter-spacing:-.025em}` `.c-main{justify-content:flex-start;gap:32px}` `.c-main .lede{margin-top:12px}`. Alternatively, drop the h3 and open the card with the lede at 21px weight 600 in var(--text): "Escribinos por WhatsApp y te responde directamente el dueño del local."
- **Evidencia:** desktop-light--10-contacto.png, desktop-dark--10-contacto.png; computed .c-main h3 = 56px/700

### V10 · Estimator: the stacked "$ / a / $" price looks broken, and step headers look like a generic form

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Presupuesto. `.summary .range span{display:block}` + `.range .a` (l.426–427), markup `<span id="eMin">…<span class="a">a</span><span id="eMax">` (l.1122). `.cstep small{display:block;font-size:15px;margin-top:2px}` (l.406), markup l.1115 and l.1117.
- **Problema:** The summary card shows "$ 35.000", then a lone grey "a" on its own line, then "$ 90.000" at 44px. The lone "a" looks like a layout bug, and the two huge numbers look shouty in a 347px column. The step titles with a 15px subtitle glued 2px below look like a stock form, unlike Apple's buy flow, which uses one-line two-tone step headers ("Modelo. ¿Cuál es el ideal para vos?").
- **Arreglo propuesto:** Markup: `<div class="range"><span id="eMin">$ 0</span><span class="a"> – </span><span id="eMax">$ 0</span></div>`. CSS: `.summary .range{font-size:clamp(28px,2.4vw,32px);white-space:nowrap}` `.summary .range span{display:inline}` `.summary .range .a{font:inherit;color:var(--text-3);margin:0}`. I measured it: at 34px it exactly fills the 347px column, so keep it capped at 32px. Steps: `.cstep{font-size:24px;letter-spacing:-.02em}` `.cstep small{display:inline;font-size:inherit;font-weight:inherit;letter-spacing:inherit;color:var(--text-2);margin:0}`, with copy `Servicio. <small>¿Qué necesitás?</small>` and `Extras. <small>Sumalos si los necesitás.</small>`.
- **Evidencia:** desktop-light--07-presupuesto.png, desktop-dark--07-presupuesto.png; headless measure range scrollWidth 347 vs 347 available at 34px

### V11 · Story phone screen is more than half empty, so the device mock looks unfinished

- **Impacto:** Medio · **Esfuerzo:** medio
- **Dónde:** Service story phone. `.ps` screens built in JS (l.1734–1744): each step renders only `h4` + one `.pc` card + an optional `.bub`, inside `.phone{height:min(640px,calc(100vh - 150px))}` (l.299).
- **Problema:** In every step except "Listo", the lower ~55% of the phone screen is blank #f2f2f7. Next to Apple's device shots, which always have full screens, it reads as a placeholder, and a large white rectangle in a black section adds glare.
- **Arreglo propuesto:** Give each non-done step a running history. In the STORY map callback `(s, i)` add: `const T=['02/10 · 10:14','02/10 · 16:40','03/10 · 09:05','03/10 · 11:30']; const hist = STORY.slice(0, i + 1).map((x, k) => `<li${k === i ? ' class="now"' : ''}><b>${x.scr.t}</b><span>${T[k]}</span></li>`).reverse().join('');` then `body += `<p class="ptl-h">Historial</p><ul class="ptl">${hist}</ul>`;`. CSS: `.ptl-h{margin:6cqw 0 2.4cqw;font-size:3.6cqw;font-weight:600;color:#86868b}` `.ptl{list-style:none;margin:0;padding:0 0 0 4.4cqw;border-left:.4cqw solid #d1d1d6;display:grid;gap:3.4cqw}` `.ptl li{position:relative;display:flex;justify-content:space-between;gap:2cqw;font-size:3.8cqw}` `.ptl li::before{content:'';position:absolute;left:-6.1cqw;top:1.2cqw;width:2.8cqw;height:2.8cqw;border-radius:50%;background:#c7c7cc;box-shadow:0 0 0 .8cqw #f2f2f7}` `.ptl li.now::before{background:#0071e3}` `.ptl span{color:#86868b}`. The screen then fills step by step (1 to 4 entries) as you scroll, which reinforces "seguís cada paso".
- **Evidencia:** desktop-light--05-servicio.png, desktop-light--state-story.png, desktop-dark--05-servicio.png

### V12 · The saturated green WhatsApp button is the loudest element on every screen, including the hero

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Global. `.wa-fab{width:56px;height:56px;background:var(--wa-fab)}` where `--wa-fab:#25d366` (l.29, l.505), always visible from page load. `.wa-greet` pops up after 8s with "👋" (l.1243, l.1915).
- **Problema:** A bright #25d366 disc with a drop shadow floats over the hero laptop and the 4th shelf card's "Comprar" button. It outweighs the blue primary CTA in both themes and works against the calm Apple look the client asked for. apple.com has no floating button over the hero.
- **Arreglo propuesto:** Calmer material: `.wa-fab{width:52px;height:52px;background:var(--wa);box-shadow:0 6px 20px rgba(0,0,0,.16)}` (#1a8d4c, the same green as `.btn-wa`). Show it only after the hero: add `.wa-fab{opacity:0;transform:scale(.9);pointer-events:none;transition:opacity .4s,transform .4s var(--ease)}` and `body.past-hero .wa-fab{opacity:1;transform:none;pointer-events:auto}`, and in `onScroll()` (l.1446) add `document.body.classList.toggle('past-hero', scrollY > innerHeight * .6);`. Keep the greeting but start its timer only once `past-hero` is set.
- **Evidencia:** desktop-light--01-inicio.png and desktop-dark--01-inicio.png (FAB over the laptop), desktop-light--state-hero-top.png, desktop-light--state-quickview.png (FAB over the shelf card's Comprar)


## M — Mobile y responsive

### M1 · On mobile, the sticky-phone story takes 20% of the page, and the step text is squeezed into the bottom third under the WhatsApp button

- **Impacto:** Alto · **Esfuerzo:** medio
- **Dónde:** #servicio story. CSS line 654 `.phone{height:min(50vh,430px)}`, line 655 `.steps-txt .stx{min-height:62vh;padding-top:8vh}`, line 305 `.ps{font-size:4.4cqw}`. JS line 1756 mobile rootMargin `'-62% 0px -18% 0px'`
- **Problema:** I measured the page at 390px. `.story-grid` is 3,076px tall out of 14,945px, and most of that scroll is empty black (see mobile-light--05-servicio.png). The sticky phone fills from 52px down to 512px of an 844px screen, so each step's text only becomes active in the 62–82% band. That puts the explanation at the very bottom of the screen, cut off by the fold, with the green FAB on its last line (mobile-dark--state-story.png, mob/m-story-2.png, mob/m-story-4.png). Text inside the phone renders at about 7.9px (`.pc small` 6.7px, `.bub small` 6.1px), and the bottom 45% of the phone screen is always blank.
- **Arreglo propuesto:** Keep the sticky phone but crop it at ≤734px. In the bigger phone the text grows to about 10px and the blank lower half is hidden:
@media (max-width:734px){
 .story-media{height:340px;overflow:hidden;align-items:start;padding:12px 0 0;background:linear-gradient(#000 88%,rgba(0,0,0,0))}
 .phone{height:auto;width:min(64vw,250px);-webkit-mask-image:linear-gradient(#000 52%,transparent 60%);mask-image:linear-gradient(#000 52%,transparent 60%)}
 .steps-txt .stx{min-height:46vh;padding-top:3vh}
}
In bindStory, change the mobile rootMargin to `'-50% 0px -20% 0px'` so the active step sits just under the cropped phone. The story drops from about 2,600px of scroll to about 1,950px, and every step is read fully on screen.
- **Evidencia:** mobile-light--05-servicio.png, mobile-dark--05-servicio.png (long empty black gaps between steps); mobile-dark--state-story.png (Paso 4 text at y≈700–844, FAB over it); mob/m-story-2.png, mob/m-story-4.png; measured storyGrid=3076px, pageH=14945px, psFs=7.9px at 390. Source lines 298–299, 305, 329, 652–656, 1751–1760

### M2 · On iPad mini and iPad portrait, the quick view's "Agregar a la bolsa" button is clipped

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Quick view (#qv), 735–~860px wide. Line 538 `.qv{grid-template-columns:1.05fr 1fr}`, line 542 `.qv-info{padding:48px 40px 36px}`, lines 549–550 `.qv-buy{display:flex} .qv-buy .btn{flex:1}`, plus line 89 `.btn{white-space:nowrap}`
- **Problema:** The info column is about 271–340px of content. The quantity pill (102px), gap (12px) and a no-wrap button (191px) need about 315px. At 744px the button's right edge is at 726px while the modal ends at 720px, so the main buy button is cut off by the modal's `overflow:hidden`. At 768px it runs into the 40px padding and ends 6px from the edge. This hits iPad mini, iPad 10.2" and iPad Air in portrait.
- **Arreglo propuesto:** .qv-buy{flex-wrap:wrap}
.qv-buy .btn{flex:1 1 180px;min-width:0}
@media (max-width:1068px){
 .qv{grid-template-columns:.8fr 1fr}
 .qv-info{padding:44px 32px 32px}
 .qv-img{padding:28px}
 .qv-img .r{height:240px}
}
This gives the info column about 323px of content at 744px. If anything is still too narrow, the wrap moves the button to its own full-width row instead of clipping it.
- **Evidencia:** mob/qv-744.png (button cut at the right edge), mob/qv-768.png (button 6px from the modal edge); measured btnRight 726 > modal right 720 at 744px. Source lines 89, 538, 542, 549–550

### M3 · Almost every headline on mobile ends with a one-word orphan

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Global type. Line 61 `h1,h2,h3,h4{…}` and line 82 `.lede` have no text-wrap. Examples: hero h1 (line 950), #notebooks h2 (1035), #seguimiento h2 (1076), #opiniones h2 (1138), #contacto h2 (1172), STORY step 5 h3
- **Problema:** At 390px the big headlines break greedily and leave one word alone on the last line: "En las mejores / manos.", "¿Qué notebook es para / vos?", "Miralo / ahora.", "Lo que dicen nuestros / clientes.", "Estamos / cerca.", "Listo. Con garantía / escrita." At 32–44px, that ragged shape is what most separates this from Apple's typesetting.
- **Arreglo propuesto:** h1,h2,h3,.hero-sub,.lede,.stx p{text-wrap:balance}
p,dd,blockquote,.faq details p{text-wrap:pretty}
This is supported in Safari 17.5+ and Chrome 114+. Older browsers keep today's wrapping, so there's no risk.
- **Evidencia:** mobile-light--01-inicio.png ("manos."), mobile-light--04-notebooks.png ("vos?"), mobile-light--06-seguimiento.png ("ahora."), mobile-light--08-opiniones.png ("clientes."), mobile-light--10-contacto.png ("cerca."), mob/m-story-4.png ("escrita.")

### M4 · Tablets (735–1068px) get the phone layout: a tiny centered phone, a cut-off tier carousel, and a hamburger menu at 1024px

- **Impacto:** Alto · **Esfuerzo:** medio
- **Dónde:** Line 631 `@media (max-width:1068px){.links{display:none}.menu-btn{display:grid}…}`. Lines 649–656 inside `@media (max-width:900px)` (tiers become a carousel, story becomes one column with `.phone{height:min(50vh,430px)}`). Line 329 `.steps-txt .stx{min-height:78vh}`. JS lines 1754 and 1760 `matchMedia('(max-width:900px)')`
- **Problema:** At 820×1180 (iPad Air) the story phone is 201×430px in the middle of a 776px-wide black column. Phone text is 5.6–7.3px, and the step text slides under the phone (mob/tab-story.png). The #servicio section is 5,314px tall (6,569px at 1024×1366 because of the 78vh steps). The tiers become a swipe carousel showing 2.4 columns with "Diseñ…" cut off, even though three columns fit. At 1024px landscape the nav switches to a hamburger, but I measured links 572px + brand 172px + actions 126px = 910px, which fits the 980px wrap.
- **Arreglo propuesto:** 1) Move the one-column story rules (lines 652–656) and both JS `matchMedia('(max-width:900px)')` calls in bindStory to `734px`. Then add:
@media (min-width:735px) and (max-width:900px){.story-grid{grid-template-columns:.85fr 1fr;gap:32px}.phone{height:min(560px,calc(100vh - 160px))}}
2) Cap step height everywhere: `.steps-txt .stx{min-height:min(78vh,640px)}`.
3) Move the tier carousel rules (lines 649–651) to the 734px query, and add `@media (min-width:735px) and (max-width:900px){.tier h3{font-size:24px}.tiers{gap:20px}}`.
4) Change the nav breakpoint from 1068px to `@media (max-width:1000px)` for `.links/.menu-btn/.actions` only, and set `.links{gap:clamp(18px,2.4vw,30px)}`.
- **Evidencia:** mob/tab-story.png (820px: tiny phone, text under it, tiers cut at "Diseñ"); measured servicio=5314px at 820×1180 and 6569px at 1024×1366; nav fit test at 1024 = 910px of 980px. Source lines 329, 631–634, 649–656, 1754, 1760

### M5 · Many tap targets are 34–38px or smaller, and hover effects stick after a tap

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Line 99 `.btn-sm{min-height:34px}` (product "Comprar", tier "Ver modelos"). Line 662 `.duo .ib{34px}` (theme toggle and bag). Line 663 `.ib{38px}` (search, menu). Line 274 `.round{38px}` (shelf arrows). Line 366 `.hint button{min-height:34px}`. Lines 556–557 `.qty.sm button{32×34}`. Line 574 `.rm` "Eliminar" (47×19). Line 1209 "Abrir en Maps" (110×22). Hover rules at 106, 259, 338, 409, 506
- **Problema:** At 390px every primary small action is under the 44px touch minimum. The theme toggle and bag, the two most-used nav buttons, are 34×34. In the bag sheet, "Eliminar" is 19px tall right under the 34px ± stepper, so mis-taps are likely. On iOS, `:hover` stays on after a tap: a product card stays scaled up with a shadow after the quick view closes (`.pcard:hover{transform:scale(1.012)}`), the FAB stays at `scale(1.06)`, and the menu button keeps a gray disc (mob/m-menu.png). The shelf's ‹ › arrows take a row on touch screens where swiping is the natural gesture.
- **Arreglo propuesto:** @media (pointer:coarse){
 .btn-sm{min-height:44px;padding:0 18px;font-size:15px}
 .ib{width:44px;height:44px}
 .duo{padding:2px}.duo .ib{width:42px;height:42px}
 .hint button{min-height:40px}
 .qty.sm{height:40px}.qty.sm button{width:40px;height:40px}
 .rm{display:inline-block;padding:10px 0;margin:-6px 0}
 .c-row .lnk{padding:11px 0}
 .shelf-nav{display:none}
}
Wrap every `:hover` rule (`.ib`, `.pcard`, `.pcard .p-img .r`, `.btn`, `.btn-ghost`, `.btn-gray`, `.svc`, `.opt`, `.wa-fab`, `.wa-opt`, `.round`, `.lnk`) in `@media (hover:hover){…}`.
- **Evidencia:** Measured at 390: pcBtn 89×34, duoIb 34×34, ib 38×38, round 38×38, hintBtn 118×34, tierBtn 114×34, bag qtySm 32×34, rm 47×19, mapsLnk 110×22. mob/m-menu.png (gray hover disc stuck on the X button). mobile-light--03-tienda.png (arrows row)

### M6 · The bright green WhatsApp button covers content, a bubble pops up uninvited, and the panel promises replies "en minutos"

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Lines 505 and 704 `.wa-fab` (54px, #25d366, always visible). Line 524 `.wa-greet` auto-shown by JS line 1915 after 8s. HTML line 1245 `<small>Responde en minutos</small>`
- **Problema:** The most saturated element on the page floats over content in every mobile state: the hero laptop's "Garantía escrita 90 días" card (mobile-dark--state-hero-top.png), the last line of each story step (mobile-dark--state-story.png, mob/m-story-4.png), and the estimator summary (mob/m-estbar.png). A chat bubble also slides in after 8s. That is the opposite of the calm Apple feel. The panel header promises replies in minutes, which one person who is also at the repair bench can't keep.
- **Arreglo propuesto:** 1) At ≤734px make it smaller and quieter: `.wa-fab{width:50px;height:50px;right:14px;bottom:max(14px,env(safe-area-inset-bottom));box-shadow:0 6px 18px rgba(0,0,0,.18)}`.
2) Hide it where it covers reading content: `new IntersectionObserver(([e])=>document.body.classList.toggle('fab-off',e.isIntersecting)).observe($('.story-grid'))` plus `.fab-off .wa-fab{opacity:0;transform:scale(.6);pointer-events:none}`.
3) Skip the auto greet on phones: `if (!greeted && matchMedia('(min-width:735px)').matches) setTimeout(…)`.
4) Copy: `<small>Te responde el dueño, en horario del local</small>`.
- **Evidencia:** mobile-dark--state-hero-top.png, mobile-dark--state-story.png, mob/m-story-2.png, mob/m-story-4.png, mob/m-estbar.png; FAB measured at x=320,y=770,54px on 390×844. Source lines 505, 524, 704–707, 1245, 1914–1915

### M7 · The mobile notebook tiers look like overflow: borderless 707px columns with stray words peeking in

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** #notebooks. Lines 649–651 `.tiers{display:flex;overflow-x:auto}` and `.tier{flex:0 0 min(320px,78vw)}`. Lines 282–290 `.tier` has no background, `.tier .tg{min-height:50px}`, and `.tier dl` lists the 4 specs as stacked centered rows
- **Problema:** Each tier is 304×707px with no card behind it. The next tier peeks in only as clipped text ("Mul", "Te"), which reads as a layout bug rather than a swipe hint. The 4 specs stack vertically and take 308px, so one tier is almost a full screen of mostly icons.
- **Arreglo propuesto:** @media (max-width:734px){
 .tier{flex-basis:84vw;padding:28px 20px 24px;border-radius:24px;background:var(--card)}
 .tier .r{height:130px}
 .tier .tg{min-height:0}
 .tier dl{grid-template-columns:1fr 1fr;gap:18px 12px;margin-top:22px;padding-top:20px}
 .tier dd{font-size:14px}
}
The peek becomes a clear card edge, and each tier drops from 707px to about 520px.
- **Evidencia:** mobile-light--04-notebooks.png and mobile-dark--04-notebooks.png ("Mul"/"Te" fragments at the right edge, tall stacked spec list); measured tier 304×707, dl 308px. Source lines 282–290, 649–651, 685

### M8 · On a phone the bag is a full-screen side drawer while the quick view is a bottom sheet, and both size with vh

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Line 561 `.bag{top:0;right:0;bottom:0;transform:translateX(104%)}` and line 700 `.bag{width:100vw}`, versus line 695 `.qv{…bottom:0;border-radius:26px 26px 0 0;max-height:92vh;transform:translateY(100%)}`
- **Problema:** On the same phone, "Ver detalles" slides a rounded sheet up from the bottom, but the bag slides in from the right as a square-cornered full-screen page (mobile-dark--state-bag.png vs mobile-dark--state-quickview.png). Neither has a grabber handle. On iOS Safari with the toolbar showing, `92vh` (large viewport) can be taller than the visible area, which can push the top of the sheet and its close button under the URL bar.
- **Arreglo propuesto:** @media (max-width:734px){
 .bag{top:auto;left:0;right:0;width:100%;height:auto;max-height:calc(100dvh - 40px);border-radius:26px 26px 0 0;transform:translateY(104%)}
 .bag.open{transform:none;box-shadow:0 -20px 60px rgba(0,0,0,.25)}
 .bag-b{flex:1 1 auto;min-height:0}
 .qv{max-height:calc(100dvh - 40px)}
 .qv::before,.bag::before{content:'';position:absolute;z-index:4;top:7px;left:50%;width:36px;height:5px;border-radius:3px;background:var(--line);translate:-50% 0}
}
- **Evidencia:** mobile-dark--state-bag.png (full-bleed 390×844 drawer, no radius), mobile-dark--state-quickview.png (bottom sheet, top at y=68); measured bag 390×844. Source lines 561–562, 695–700

### M9 · On a phone, the text on the hero laptop screen is 5–7px and reads like a blurry thumbnail

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Hero `.screen` container query at lines 214–231: `.win{font-size:2.15cqw}`, `.prog{font-size:1.7cqw}`, `.kv small{font-size:1.7cqw}`, `.pill{font-size:1.9cqw}`
- **Problema:** At 390px the screen is 318px wide, so the progress labels and "Presupuesto aprobado" are 5.4px, the status pill 6.0px, and the technician message 6.8px. It's the first product image people see, and at 1× it's a smudge of gray lines (mobile-light--01-inicio.png). The FAB also sits on its bottom-right card.
- **Arreglo propuesto:** Show fewer, larger elements inside `@container (max-width:560px)`:
.win{left:4%;right:4%;top:11%;bottom:4%;font-size:2.9cqw}
.mh b{font-size:5.6cqw}
.mh span{font-size:2.6cqw}
.pill{font-size:2.6cqw;padding:1cqw 2.2cqw}
.prog span{font-size:0}
.prog span::before{width:4cqw;height:4cqw}
.prog::before,.prog::after{top:1.8cqw;height:.45cqw}
.msg b{font-size:2.9cqw}
.kv{display:none}
Message text goes to about 9px and the title to about 18px. I estimate the content at about 144px of the 169px window height, so it fits.
- **Evidencia:** mobile-light--01-inicio.png, mobile-dark--state-hero-top.png, mob/m-screen-2x.png (2× crop); measured at 390: winFs 6.8, progFs 5.4, kvSmall 5.4, pillFs 6.0px. Source lines 214–231

### M10 · Mobile surfaces promise same-day delivery and a team the one-person shop can't back up

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Values tile, line 992: `<b>En el día</b><p>envíos dentro de la ciudad.</p>`. Quick view note, JS line 1585: "recibilo en el día dentro de la ciudad." Bag segment, JS line 1642: `<small>En el día · a coordinar</small>`. Shop header, line 1017: "Hablá con un especialista"
- **Problema:** On a phone these are the lines people read right before committing: the 2×2 value grid on the first scroll, the quick view sheet just above "Agregar a la bolsa", and the delivery choice in the bag. "En el día" is a guarantee one person can't keep on days he's alone at the counter. "Un especialista" suggests staff. The site's honest line elsewhere ("te responde directamente el dueño") contradicts both.
- **Arreglo propuesto:** Line 992: `<b>Envíos</b><p>a domicilio en la ciudad, coordinados con vos.</p>`.
Line 1585: `Retiralo en el local o coordinamos el envío dentro de la ciudad.`
Line 1642: `<small>A coordinar</small>`.
Line 1017: `Pedí una recomendación`.
- **Evidencia:** mobile-light--02-sec.png ("En el día / envíos dentro de la ciudad"), mobile-dark--state-quickview.png (bottom note), mobile-dark--state-bag.png ("En el día · a coordinar"), mobile-light--03-tienda.png ("Hablá con un especialista")

### M11 · The phone search shows an "Esc" key, has no Cancel button, and its placeholder is cut off

- **Impacto:** Bajo · **Esfuerzo:** chico
- **Dónde:** Spotlight. HTML line 1269 `<input … placeholder="Buscar productos, servicios o secciones">…<kbd>Esc</kbd>`. Line 598 `.spot-in input{font-size:21px}`
- **Problema:** On a touch screen the only visible control is a keyboard hint that does nothing, and the only way out is tapping the blurred scrim. The placeholder is cut to "Buscar productos, servic" (mob/m-search-empty.png). iOS users expect a blue "Cancelar" text button here.
- **Arreglo propuesto:** Add `<button class="spot-cancel" type="button" data-close>Cancelar</button>` after the `<kbd>` (it is in the HTML at load, so the existing `[data-close]` binding covers it). CSS: `.spot-cancel{display:none;font-size:17px;color:var(--link);padding:10px 0 10px 4px}` and `@media (pointer:coarse){.spot-in kbd{display:none}.spot-cancel{display:block}.spot-in input{font-size:17px}}`. JS: `if (matchMedia('(max-width:734px)').matches) sIn.placeholder = 'Buscar productos y más';`.
- **Evidencia:** mobile-dark--state-search.png ("Esc" chip on mobile), mob/m-search-empty.png (cut-off placeholder, no cancel). Source lines 596–599, 1269

### M12 · On mobile the estimator stacks the price on three lines and shows the extras as three heavy cards

- **Impacto:** Bajo · **Esfuerzo:** chico
- **Dónde:** #presupuesto. Line 426 `.summary .range span{display:block}` ("$ 35.000 / a / $ 90.000"). Line 679 `.extras{grid-template-columns:1fr}` with line 416 `.ex` as separate 75px bordered cards
- **Problema:** On a 390px screen the configurator, extras and summary take about 1,000px. The price reads as two separate numbers stacked over three lines (100px), and the three extras are three outlined boxes that look the same weight as the main service choice. That adds another chunky stretch to an already long page.
- **Arreglo propuesto:** @media (max-width:734px){
 .summary .range{font-size:28px}
 .summary .range span{display:inline}
 .summary .range .a{display:inline;margin:0 6px;font-size:17px}
 .extras{gap:0;border-radius:16px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--line);background:var(--card)}
 .ex{border-radius:0;box-shadow:none;padding:14px 52px 14px 16px;border-top:1px solid var(--line-2)}
 .ex:first-child{border-top:0}
 .ex[aria-pressed="true"]{box-shadow:none}
 .ex .ck{top:50%;translate:0 -50%}
}
This makes the extras an iOS-style grouped list (249px → about 150px) and puts the range on one line.
- **Evidencia:** mobile-light--07-presupuesto.png, mobile-dark--07-presupuesto.png, mob/m-estbar.png; measured extras 249px, range 100px, opts 365px at 390. Source lines 415–427, 679


## T — Textos, confianza y conversión

### T1 · Same-day delivery is promised in 4 places, but one person can't leave the shop to deliver

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Values row line 992 `<b>En el día</b><p>envíos dentro de la ciudad.</p>`; Quick view JS line 1585 `.qv-note` "Retiralo en el local o recibilo en el día dentro de la ciudad."; Bag segmented control line 1642 `Envío a domicilio<small>En el día · a coordinar</small>`; bagMessage() line 1619 'Envío a domicilio'; example review line 1144 "…Responden enseguida por WhatsApp y entregan en el día."
- **Problema:** The owner is also the only technician and the only person at the counter. Delivering the same day means closing the shop or dropping a repair. Customers read "en el día" as a guarantee, so the first late order turns into a complaint. The promise also shows up at the moment of purchase (quick view and bag), which makes it the most likely one to be held against him.
- **Arreglo propuesto:** Line 1585: `${ico('store','i sm')}Retiralo en el local o te lo enviamos por cadete. Lo coordinamos por WhatsApp.`
Line 1642: `<button data-ent="envio" …>Envío por cadete<small>Costo según zona</small></button>`
Line 1619: change 'Envío a domicilio' to 'Envío por cadete'.
Line 1651 .bag-note: "Te confirmamos stock, costo de envío y total por WhatsApp. No se cobra nada online."
Line 1144 sample copy (the real reviews will be modelled on it): "Los tóners de la oficina los compramos siempre acá. Atención clara y sin vueltas."
Values card: replace it as described in the values-row finding.
- **Evidencia:** desktop-light--state-bag.png ('Envío a domicilio · En el día · a coordinar'); desktop-light--state-quickview.png (note under the CTA); desktop-light--02-sec.png and mobile-light--02-sec.png (truck card 'En el día'); desktop-light--08-opiniones.png; source lines 992, 1144, 1585, 1619, 1642, 1651

### T2 · Home pickup, on-site visits and lab-grade data recovery all promise capacity he doesn't have

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** STORY[0] line 1333: h 'Lo traés. O lo buscamos.', p '…Si no podés venir, coordinamos el retiro a domicilio.'; EXTRAS line 1845 `{ id:'del', t:'Retiro y entrega', v:8000 }`; SVCS line 1840 Redes time 'Coordinamos la visita'; SERVICES line 1352 'Cableado, routers y repetidores para casa u oficina.'; SERVICES line 1353 'Discos dañados, archivos borrados y backups.'
- **Problema:** Step 1 of the service story is the biggest headline in the section, and 'O lo buscamos' tells customers a pickup service exists. Each pickup or network visit closes the shop, while the hero status still says 'Abierto ahora'. 'Discos dañados' suggests physical data recovery, which needs a lab. If the job gets outsourced or fails, it reads as broken trust.
- **Arreglo propuesto:** STORY[0]: h 'Lo traés al local.', p 'Lo revisamos juntos en el mostrador y te llevás un comprobante con tu <b>código de orden</b>. Con eso seguís todo desde acá.'
EXTRAS: `{ id:'del', t:'Retiro por cadete', v:8000 }`, or drop it.
SVCS red: time 'Visita con turno, fuera del horario del local'.
SERVICES wifi: 'Routers, repetidores y cableado. Visitas con turno.'
SERVICES db: 'Archivos borrados y discos que no inician. Si hace falta laboratorio, te avisamos antes.'
- **Evidencia:** desktop-dark--05-servicio.png and mobile-light--05-servicio.png (Paso 1 'Lo traés. O lo buscamos.'); desktop-light--07-presupuesto.png (extra 'Retiro y entrega + $ 8.000'); lines 1333, 1840, 1845, 1352-1353

### T3 · WhatsApp widget says 'Responde en minutos' even when the shop is closed

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** WA panel header line 1245 `<small>Responde en minutos</small>`; auto greet line 1243 '¿Te ayudamos? Escribinos 👋' shown after 8 s (line 1915), at any hour; bubble line 1907 '¿En qué te podemos ayudar?'
- **Problema:** This is a reply-time promise that someone working at the bench can't keep. It's also shown at night and on Sundays: the screenshots were taken at 1:39 with the hero saying 'Cerrado · abrimos hoy a las 9:00', so the page contradicts itself. A greeting that pops up on a timer, emoji included, feels like a chatbot or call center, which is the opposite of the premium, personal tone the client wants.
- **Arreglo propuesto:** Line 1245: `<small id="waSub"></small>`. In setWa(open), before building the body: `const s = openStatus(); $('#waSub').textContent = s.open ? 'Te responde [Nombre], el técnico' : 'Fuera de horario · respondemos al abrir';`
Bubble: `${hi} Contanos qué necesitás. ${s.open ? 'Te respondemos en el día.' : 'Te respondemos apenas abrimos.'}`
Greet text (line 1243): 'Consultas y presupuestos por WhatsApp' (no emoji). Only show it during opening hours: `if (!greeted && openStatus().open) setTimeout(…)`.
- **Evidencia:** Lines 1243-1247, 1907, 1915; desktop-light--01-inicio.png and mobile-dark--state-hero-top.png ('Cerrado · abrimos hoy a las 9:00')

### T4 · The best trust signal (one owner who is also the technician) is anonymous and buried at the bottom of Contacto

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** #contacto lines 1172-1177: H2 'Contacto. Estamos cerca.' followed directly by H3 '¿Hablamos?' and lede 'Escribinos por WhatsApp y te responde directamente el dueño del local…'. The .c-main card uses `justify-content:space-between`, which leaves a ~190px empty gap between the lede and the buttons on desktop.
- **Problema:** 'El dueño del local' is the only place the page says a real, named person does the work. It has no name, no face and no track record, and it's gray body text in the last section. The two headings repeat each other ('Estamos cerca' / '¿Hablamos?'). Meanwhile the card has a large empty area that could carry a signature.
- **Arreglo propuesto:** H2: `Contacto. <span class="muted">Sin intermediarios.</span>`
H3: `Te atiende [Nombre].`
Lede: 'Técnico y dueño de AT Computación. La misma persona que te recibe, revisa tu equipo y te lo entrega. Escribile para consultas, presupuestos o el estado de tu reparación.'
After the lede, add: `<div class="owner"><span class="ava">[XX]</span><div><b>[Nombre Apellido]</b><small>Técnico · Reparando en Santa Fe desde [año]</small></div></div>`
CSS: `.owner{display:flex;align-items:center;gap:14px;margin-top:28px;font-size:15px}.owner .ava{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-size:18px;font-weight:600;background:var(--fill);color:var(--text)}.owner small{display:block;color:var(--text-2);font-size:13px}`. A real photo can replace the initials later.
- **Evidencia:** desktop-light--10-contacto.png (empty gap in the left card, two stacked headings); mobile-light--10-contacto.png; lines 1172-1177, 455

### T5 · Values row: swap 'En el día' and 'Online' for honest one-person trust signals

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Section 'Por qué AT Computación', .values lines 990-993: cards '90 días', '24–48 h', 'En el día' (truck), 'Online' (scan: 'seguís tu reparación paso a paso.')
- **Problema:** Card 3 is the delivery overpromise. Card 4 is the fourth pitch for the tracker on the page, after the hero laptop mock, the sticky phone story and the Seguimiento section. Meanwhile nothing above the fold says how long the shop has been around or who does the work, which are the two things a one-person shop can say most credibly.
- **Arreglo propuesto:** Card 3: `<div class="val rv" style="--d:.16s"><svg class="i"><use href="#i-wrench"/></svg><b>+[20] años</b><p>reparando equipos en Santa Fe.</p></div>`
Card 4: `<div class="val rv" style="--d:.24s"><svg class="i"><use href="#i-user"/></svg><b>Directo</b><p>con quien repara tu equipo. Sin intermediarios.</p></div>`
Card 2 copy: see the turnaround-time finding.
- **Evidencia:** desktop-light--02-sec.png, mobile-light--02-sec.png; lines 990-993; tracker also pitched at lines 957-981, 1045-1060, 1072-1101

### T6 · Turnaround times contradict each other and are stated as flat guarantees

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** meta description line 7 and hero-sub line 951 'diagnóstico en 24–48 h'; values line 991 '24–48 h para diagnosticar tu equipo.'; STORY[1].h line 1335 'Diagnóstico en 24–48 h.'; FAQ line 1157 'diagnóstico 24 y 48 h hábiles… listas en 2 a 5 días'; estimator SVCS line 1835 nb time '48 a 72 h hábiles' (also the default at line 1123), Limpieza '24 a 48 h hábiles'
- **Problema:** The FAQ adds up to 3–7 days for a notebook repair. The estimator shows '48 a 72 h hábiles' for the same notebook, right under the price, as if that were the whole repair. A customer who quotes the estimator will feel misled. '24–48 h' appears five times with no 'en general', and one person can't hold that during a busy week or a sick day.
- **Arreglo propuesto:** Use one canonical wording.
Values card: `<b>48 h</b><p>hábiles para tu diagnóstico, en la mayoría de los casos.</p>`
STORY[1].h: 'Diagnóstico claro, en hasta 48 h.'
Meta: '…Servicio técnico con diagnóstico en hasta 48 h hábiles y seguimiento online.'
FAQ: 'El diagnóstico lleva hasta 48 h hábiles. Con el presupuesto aprobado, la mayoría de las reparaciones se terminan en 2 a 4 días hábiles más. Si lo necesitás para una fecha puntual, avisanos al dejarlo y te decimos con sinceridad si llegamos.'
Estimator: in updateEst, `$('#eTime').textContent = 'Tiempo total estimado: ' + s.time;` with times nb/pc '3 a 6 días hábiles', imp '3 a 6 días hábiles', mant '1 a 2 días hábiles', arm '3 a 5 días hábiles, según repuestos', red 'Visita con turno'. Update line 1123 to match.
- **Evidencia:** desktop-light--07-presupuesto.png ('48 a 72 h hábiles' under the notebook range); desktop-light--09-faq.png (open FAQ '24 y 48 h… 2 a 5 días'); desktop-light--01-inicio.png hero sub; lines 7, 951, 991, 1123, 1157, 1335, 1835-1840

### T7 · Hero gives a new repair customer no way in

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Hero .ctas lines 952-955: `<a class="btn" href="#tienda">Ver la tienda</a><a class="lnk" href="#seguimiento">Seguir mi reparación</a>`; hero-sub line 951
- **Problema:** Someone with a broken notebook, the main repair lead, gets only two options: a shop button, and a link that works only if they already have an order code. Order tracking is already in the nav, the value card and its own section, so this hero slot is spent on existing customers. The sub is also a list of products with a time guarantee in the middle; it says nothing about who does the work.
- **Arreglo propuesto:** CTAs: `<a class="btn" href="#tienda">Ver la tienda</a><a class="lnk" data-wa="¡Hola! Quiero consultar por una reparación. Mi equipo es: " target="_blank" rel="noopener">Consultar una reparación</a>` (bindWa() already sets the href). Keep 'Seguir mi reparación' in the nav and the ribbon.
Hero-sub: 'Notebooks, impresoras, insumos y accesorios. Y un técnico que te atiende de principio a fin, en Santa Fe.'
- **Evidencia:** desktop-light--01-inicio.png, mobile-light--01-inicio.png, mobile-dark--state-hero-top.png; lines 951-955

### T8 · 'Hablá con un especialista', 'Mensaje del técnico' and 'en tiempo real' sound like a company with staff

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Tienda head lines 1016-1017 '¿Necesitás ayuda para elegir?' / `Hablá con un especialista`; hero laptop line 972 'Mensaje del técnico' with avatar 'AT'; story bubble author line 1741 `<small>AT Computación</small>`; tracker .feat line 1079 '<b>En tiempo real.</b> Cuando el técnico actualiza, lo ves al instante.'; STORY[3].p line 1339 'Seguís cada avance <b>en tiempo real</b>.'
- **Problema:** 'Especialista' and 'el técnico' are call-center words: the customer pictures someone on a support rota, then reaches the owner. 'En tiempo real / al instante' suggests constant live updates, but in practice updates happen when the only technician puts the screwdriver down. Naming the person costs nothing, is more premium, and is true.
- **Arreglo propuesto:** Line 1016: '¿No sabés cuál elegir?'; line 1017 link text: 'Preguntale a [Nombre]'.
Line 972: `<b>Mensaje de [Nombre]</b>` and set .av to the owner's initials.
Line 1741: `<small>[Nombre] · AT Computación</small>`.
Line 1079: `<b>Siempre al día.</b> Cada avance que carga [Nombre], lo ves acá.`
Line 1080: `<b>Notas de [Nombre]</b> en cada etapa, en palabras simples.`
STORY[3].p: 'Y lo probamos a fondo antes de entregarlo. Seguís cada avance <b>desde tu celular</b>.'
- **Evidencia:** desktop-light--03-tienda.png (link 'Hablá con un especialista' top right); desktop-light--06-seguimiento.png ('En tiempo real… al instante'); desktop-light--01-inicio.png ('Mensaje del técnico'); lines 972, 1016-1017, 1079-1080, 1339, 1741

### T9 · Estimator CTA 'Pedir presupuesto exacto' contradicts its own lede, and the diagnosis fee is hidden

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Summary button line 1125 `Pedir presupuesto exacto`; est-bar line 1252 'Pedir presupuesto'; WA text line 1859; lede line 1111 'El precio final lo confirmamos con el diagnóstico.'; FAQ line 1158 'tiene un costo mínimo que te informamos al ingresar el equipo.'
- **Problema:** An exact price can't be given over chat, so the first WhatsApp reply has to be 'traelo', and the button reads as bait. The actual next step, bringing the device in on a day that suits the one-person schedule, isn't offered. 'Un costo mínimo que te informamos al ingresar' sounds like a hidden fee, which hurts trust in a section that promises 'sin sorpresas'.
- **Arreglo propuesto:** Button: `${ico('wa')}Coordinar diagnóstico`. Est-bar: 'Coordinar'.
WA text: `¡Hola! Quiero coordinar un diagnóstico.\nServicio: ${s.d} — ${s.t}.${exT ? `\nExtras: ${exT}.` : ''}\nEstimado en la web: ${fmt(to.min)} a ${fmt(to.max)}.\n¿Cuándo lo puedo llevar?`
Note (line 1126): 'Estimación orientativa. El precio final te lo confirmamos con el diagnóstico, antes de tocar nada.'
FAQ: 'Si aprobás la reparación, no se cobra. Si decidís no reparar, cuesta $ [X.XXX] y te lo decimos antes de dejar el equipo.'
- **Evidencia:** desktop-light--07-presupuesto.png (green 'Pedir presupuesto exacto' under the lede that says the price is confirmed later); lines 1111, 1125-1126, 1158, 1252, 1859

### T10 · Notebook tiers send people to a shelf with no matching models, and the WhatsApp text is broken

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** #notebooks TIERS render line 1525: primary `<a class="btn btn-sm" href="#tienda" data-go-cat="notebooks">Ver modelos</a>`, secondary lnk 'Consultar' with message `¡Hola! Busco una notebook ${t.t.toLowerCase()}. ¿Qué me recomiendan?`; lede line 1036 '…los tres perfiles que más armamos.'
- **Problema:** The shop lists only 2 notebooks (Ryzen 5 at $849.999, Core i5 at $729.999). 'Para estudiar desde $549.999' and 'Diseño y gaming desde $1.399.999' therefore lead to nothing that matches. A small shop that orders on demand should make 'te la consigo' the main action. The template also produces 'Busco una notebook diseño y gaming', which is ungrammatical and is the first thing the owner reads. 'Armamos' is the wrong verb, since notebooks aren't assembled.
- **Arreglo propuesto:** Add `q:` to each tier ('para estudiar', 'para trabajar', 'para diseño y gaming').
Buttons: `<a class="btn btn-sm" href="${waLink(`¡Hola! Busco una notebook ${t.q}. ¿Qué me recomendás?`)}" target="_blank" rel="noopener">Pedir recomendación</a><a class="lnk" style="font-size:15px" href="#tienda" data-go-cat="notebooks">Ver en la tienda</a>`.
Lede: 'Te recomendamos según lo que vas a hacer, no según lo más caro. Si no está en la tienda, te la conseguimos.'
- **Evidencia:** desktop-light--04-notebooks.png (three 'Ver modelos' buttons, 'que más armamos'); desktop-light--03-tienda.png (only 2 notebooks on the shelf); lines 1036, 1298-1301, 1323-1330, 1525

### T11 · Servicio and FAQ end without a WhatsApp path; FAQ never answers 'who repairs my device?'

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Servicio .svc-head lines 1061-1064: H2 'Todo lo que reparamos.' with only `<a class="lnk" href="#presupuesto">Calculá tu presupuesto</a>`; .svc tiles (line 1746) are static divs; FAQ block ends at line 1163 with no follow-up
- **Problema:** These are the two moments of highest repair intent: someone who just saw their problem listed, and someone whose question wasn't answered. Both leave the visitor with only the floating FAB. 'Todo lo que reparamos' also covers non-repairs (Windows install, PC builds, toner refills). For a one-person shop, the question customers most want answered ('¿quién toca mi equipo?') is missing.
- **Arreglo propuesto:** svc-head: H2 'Todo lo que hacemos.' Below it: `<div style="display:flex;gap:10px 28px;flex-wrap:wrap"><a class="lnk" href="#presupuesto">Calculá tu presupuesto</a><a class="lnk" data-wa="¡Hola! Quiero consultar por: " target="_blank" rel="noopener">Consultá tu caso</a></div>`.
Add a FAQ item as the 2nd entry: `<details name="faq"><summary>¿Quién va a reparar mi equipo?<svg class="i"><use href="#i-plus"/></svg></summary><p>[Nombre], técnico y dueño de AT Computación. Es la misma persona que te recibe, hace el diagnóstico y te entrega el equipo. Si algún trabajo necesita un laboratorio externo, te lo decimos antes.</p></details>`.
After .faq: `<p style="text-align:center;margin-top:36px;color:var(--text-2);font-size:15px">¿Te quedó otra duda? <a class="lnk" style="font-size:15px" data-wa="¡Hola! Tengo una pregunta: " target="_blank" rel="noopener">Escribinos por WhatsApp</a></p>`.
- **Evidencia:** desktop-light--09-faq.png (list ends with no CTA); lines 1061-1065, 1153-1165, 1346-1354

### T12 · Story phone shows an app tab bar ('Seguimiento / Tienda / Chat') that doesn't exist

- **Impacto:** Bajo · **Esfuerzo:** chico
- **Dónde:** Sticky phone line 1055: `<div class="tabbar" aria-hidden="true"><span class="on">…Seguimiento</span><span>…Tienda</span><span>…Chat</span></div>` (CSS .tabbar line 324)
- **Problema:** A native-app tab bar suggests there's an AT Computación app to download. 'Chat' suggests a live chat with someone on standby. Both project a company size that doesn't exist. Customers who look for the app won't find it, and the real flow (the website, then WhatsApp) is never shown.
- **Arreglo propuesto:** Replace it with a Safari-style address bar so it reads as this website: `<div class="tabbar urlbar" aria-hidden="true"><span>atcomputacion.com.ar</span></div>`. CSS: `.urlbar{display:flex;padding:3cqw 6cqw 9cqw}.urlbar span{flex:1;text-align:center;padding:2.4cqw 0;border-radius:4cqw;background:#e9e9ee;color:#3a3a3c;font-size:3.1cqw;font-weight:500}`. Keep the `.app` label 'Seguimiento'.
- **Evidencia:** desktop-light--state-story.png and desktop-dark--05-servicio.png (bottom tab bar with Seguimiento/Tienda/Chat); mobile-light--05-servicio.png; lines 324, 1055


## A — Confort visual y accesibilidad

### A1 · Closed dialogs stay focusable and visible to screen readers (quick view, bag, search, WhatsApp panel)

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Layers CSS: .qv (l.538), .bag (l.561), .spot (l.594), .wa-panel (l.512), .wa-greet (l.524). Closed state is only `opacity:0;pointer-events:none` or `transform:translateX(104%)`, with no visibility:hidden or inert. Markup l.1243-1271: #qv, #bag and #spot carry role="dialog" aria-modal="true" permanently.
- **Problema:** Pressing Tab past the footer lands on invisible elements: the hidden 'Cerrar' buttons of #qv, #bag and #wa-greet, the off-screen bag contents (qty buttons, inputs, the 'Finalizar pedido' link), the #sIn search input, and the 4 .wa-opt links left behind after the chat is opened once. The focus ring is invisible because the elements are at opacity 0. Focusing inside .bag can also scroll the overflow:hidden .layers box, so the drawer slides half into view with no scrim. With VoiceOver on iOS/Safari, three dialogs that are aria-modal and always rendered can be treated as the active modal, which traps the user inside an empty 'Buscar' or 'Tu bolsa' dialog and cuts them off from the page.
- **Arreglo propuesto:** Add visibility to every closed layer and delay it only when closing:
.qv,.spot{visibility:hidden;transition:transform .4s var(--ease),opacity .3s,visibility 0s linear .4s}
.bag{visibility:hidden;transition:transform .5s var(--ease),box-shadow .5s,visibility 0s linear .5s}
.wa-panel{visibility:hidden;transition:transform .35s var(--ease),opacity .25s,visibility 0s linear .35s}
.qv.open,.spot.open,.bag.open,.wa-open .wa-panel{visibility:visible;transition-delay:0s}
.wa-greet{visibility:hidden}.wa-greet.show{visibility:visible}
Belt and braces in JS: put `inert` on #qv, #bag, #spot in the HTML. In openLayer() run `el.inert=false` before focusing, and in closeLayer() run `openEl.inert=true`.
- **Evidencia:** Source l.512, 524, 538-539, 561-562, 594-595, 1243-1271, openLayer/closeLayer l.1535-1550. desktop-light--state-bag.png / state-quickview.png show the open states that are otherwise only opacity-hidden.

### A2 · White text on the WhatsApp green and on the blue hover state fails AA, including the checkout button

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Tokens l.29 `--wa:#1a8d4c` (also l.45 dark), .btn-wa l.97-98, .wa-fab l.505 `background:var(--wa-fab)` (#25d366), .btn:hover l.90 with `--accent-h:#0077ed` (l.28) / `#0a7cf0` (l.44)
- **Problema:** #fff on #1a8d4c is 4.24:1. Every WhatsApp CTA is normal-size text (17px/500, or 14px for .btn-sm), so it fails AA (4.5:1) on 'Finalizar pedido por WhatsApp', 'Escribir por WhatsApp', 'Pedir presupuesto exacto', 'Aprobar presupuesto' and 'Consultar'. The floating button's white glyph on #25d366 is 1.98:1, below the 3:1 non-text minimum. It is also the most saturated element on every screen, which works against the calm look the client wants. The blue buttons get lighter on hover, and white on #0077ed is 4.32:1 (light) and 4.07:1 on #0a7cf0 (dark), so 'Comprar' and 'Ver la tienda' fail exactly when the cursor is on them.
- **Arreglo propuesto:** :root{--wa:#15803d} (5.02:1) and the same in dark; .btn-wa:hover{background:#116b35} (6.61:1); .wa-fab{background:var(--wa);box-shadow:0 6px 20px rgba(0,0,0,.18)} (glyph 5.02:1, calmer green). Make hover darker instead of lighter in both themes: --accent-h:#0062cc (5.80:1).
- **Evidencia:** Computed: #fff/#1a8d4c 4.24, #fff/#25d366 1.98, #fff/#0077ed 4.32, #fff/#0a7cf0 4.07. Visible in desktop-light--state-bag.png (checkout), desktop-dark--07-presupuesto.png, desktop-dark--10-contacto.png, and the FAB in every mobile-*.png.

### A3 · --text-3 (#86868b) fails AA in light mode on all small meta text

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** :root l.27 `--text-3:#86868b`. Used at 12-13px for .p-brand (l.265), .tl time (l.395), .tres-top small (l.373), .ts (l.381), .summary .note / .range .a (l.427, 430), .qv-note (l.560), .bag-note (l.589), .sg (l.601), .spot-in kbd (l.599), footer .f-note (l.488), .wa-foot (l.523) and input placeholders (l.364). .brands span (l.245) adds `opacity:.75` on top.
- **Problema:** 3.62:1 on #fff and 3.33:1 on #f5f5f7 (--bg-alt and light cards), both under 4.5:1, and all on 12-13px text where low contrast hurts most. The brand row (HP, Lenovo, Epson…) at text-3 with .75 opacity is 2.48:1 and looks washed out. Examples: 'Lenovo' above the product name, 'Retiralo en el local…' in the quick view, the footer disclaimer.
- **Arreglo propuesto:** Light only: --text-3:#6e6e73 (5.07:1 on #fff, 4.66:1 on #f5f5f7, 4.5:1 on the kbd's fill-2). The hierarchy still reads through size and weight. If a visible step between secondary and tertiary is wanted, also set --text-2:#5e5e63 (5.92:1). Dark --text-3 stays as is (4.70-5.80:1). .brands span{color:var(--text-2);opacity:1} (5.07:1 light, 8.16:1 dark).
- **Evidencia:** Computed ratios above. desktop-light--03-tienda.png (gray 'Lenovo', 'HP' brand labels), desktop-light--state-quickview.png (qv-note), desktop-light--11-FOOTER.png (f-note line), desktop-light--state-search.png (Esc kbd, 'Productos').

### A4 · Dark mode glare: large near-white mockups and an inverted white toast on a black page

- **Impacto:** Alto · **Esfuerzo:** medio
- **Dónde:** Hero mock .win l.176 `background:#fbfbfd`, .side l.177 #efeff3, .msg/.kv l.200/211. Story phone .phone-scr l.300 `background:#f2f2f7`, .pc/.bub l.309/316 #fff, .tabbar l.324. Toast l.612 `color:var(--bg);background:var(--text)`.
- **Problema:** In dark mode the brightest things on the page are an ~800x490px white app window in the hero and a white phone screen whose lower half is empty, both on #000. The eye adapts to dark, and these blocks glare. The story phone is always light on an always-black section, so it glares in light mode too. Toasts flip to a #f5f5f7 pill on black; its green check is #30d158 on #f5f5f7 (1.86:1). The toast with the 'Ver bolsa' action also disappears after 3.2s, which is too short for keyboard and screen-reader users to reach the button.
- **Arreglo propuesto:** :root[data-theme=dark] .win{background:#1c1c1e;color:#f5f5f7;box-shadow:0 2.6cqw 6cqw rgba(0,0,0,.5),0 0 0 .08cqw rgba(255,255,255,.08)}
:root[data-theme=dark] .side{background:#232325;border-color:#2c2c2e}
:root[data-theme=dark] .msg,:root[data-theme=dark] .kv div{background:#2c2c2e}
:root[data-theme=dark] .msg p,:root[data-theme=dark] .mh span{color:#a1a1a6}
:root[data-theme=dark] .hist li{border-color:#2c2c2e}
:root[data-theme=dark] .prog::before{background:#3a3a3c}
:root[data-theme=dark] .prog span::before{background:#1c1c1e;border-color:#48484a}
:root[data-theme=dark] .lit .prog span{color:#f5f5f7}
:root[data-theme=dark] .pill{color:#30d158;background:rgba(48,209,88,.16)}
Phone (always, since .story is always dark): .phone-scr{background:#0b0b0c} .ps,.sbar{color:#f5f5f7} .sbar i b,.tabbar::after{background:#f5f5f7} .pc,.bub{background:#1c1c1e;box-shadow:none} .pbar,.pbtns span{background:#2c2c2e} .tabbar{background:rgba(28,28,30,.94);border-color:#2c2c2e} .st-pill{background:color-mix(in srgb,var(--c) 22%,#1c1c1e)}
Toast: :root[data-theme=dark] .toast{background:#2c2c2e;color:#f5f5f7;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 12px 40px rgba(0,0,0,.6)} :root[data-theme=dark] .toast button{background:#3a3a3c;color:#f5f5f7}. In toast(), set the timeout to 5000 when an action is present, and pause it on mouseenter/focusin.
- **Evidencia:** desktop-dark--01-inicio.png (white window dominates the black hero), mobile-dark--state-hero-top.png, desktop-dark--05-servicio.png and mobile-dark--state-story.png (phone with empty white lower half), desktop-light--state-story.png. Source l.176-213, 300-328, 612-616, toast() l.1381-1389.

### A5 · Repair status badges and stock labels: colored text on a tint fails AA

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** .sbadge l.376 `color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent)` with STEPS colors l.1766-1771 (text-2, hard-coded #5e5ce6, warn, accent, ok). Phone .st-pill l.313 with STORY pills l.1334-1342. .stock.ok l.271 uses --ok #248a3d at 12px.
- **Problema:** The order status ('Listo para retirar', 'En reparación', 'Diagnóstico'…) is the key information in the tracker, and it is 14px/600 text at 3.45:1 (ok), 3.63:1 (accent), 3.93:1 (indigo) and 3.96:1 (Ingresado) on the light card. In dark, the indigo is 3.19:1 and the accent 3.43:1. The phone pills drop to 2.84:1 ('Ingresado'). 'En stock' is #248a3d on the white product card and quick view at 4.40:1 at 12px.
- **Arreglo propuesto:** Keep the hue in the dot and make the words neutral, which is also more restrained: .sbadge{color:var(--text);background:var(--fill-2)} .sbadge i{background:var(--c)} (13.9:1 in both themes). Apply the same pattern to .st-pill: color:#1d1d1f, plus a 1.6cqw ::before dot in var(--c). Light --ok:#1f7a35 (5.39:1 on #fff, 4.95:1 on #f5f5f7). Dark --ok stays #30d158.
- **Evidencia:** Computed ratios above. desktop-light--03-tienda.png / desktop-light--state-quickview.png ('En stock' small green), desktop-light--state-story.png ('Esperando tu OK' pill), mobile-dark--state-story.png ('En curso' pill). Source l.271, 313, 376-377, 1766-1771.

### A6 · Dark mode uses the light-mode blue #0071e3 for text, pills and the focus ring

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** :focus-visible l.69 `outline:2px solid var(--accent)`; .pays button[aria-pressed] l.583 `color:var(--accent)`; .hours li.today ::after 'Hoy' l.470 `color:var(--accent);background:rgba(0,113,227,.12)`; .opt[aria-pressed] .i l.414; .si-img .i l.606. Dark --accent stays #0071e3 (l.44).
- **Problema:** #0071e3 is tuned for white. On dark surfaces, 'Transferencia' (selected payment) is 4.47:1 on #000, the 'Hoy' pill is 3.48:1 (and 3.68:1 in light), and the keyboard focus ring is 3.62:1 on #1c1c1e tiles, the bare minimum, so it is hard to see on dark cards. The page already has the right token: --link (#0066cc light, #2997ff dark).
- **Arreglo propuesto:** :focus-visible{outline:2px solid var(--link);outline-offset:3px} (5.64:1 on dark tiles, 5.57:1 on white). .pays button[aria-pressed="true"]{box-shadow:inset 0 0 0 2px var(--link);color:var(--link)} (6.96:1 dark). .opt[aria-pressed="true"] .i,.si-img .i{color:var(--link)}. 'Hoy' pill: color:#fff;background:var(--accent) (4.70:1 both themes) instead of the 12% tint.
- **Evidencia:** mobile-dark--state-bag.png (dim blue 'Transferencia'), desktop-dark--10-contacto.png (barely legible 'Hoy' pill next to 'Lunes a viernes'). Computed: #0071e3/#000 4.47, 'Hoy' 3.48 dark / 3.68 light, focus on #1c1c1e 3.62.

### A7 · Too much text under 13px, including the whole footer and the legal links

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** footer l.487 `font-size:12px` (incl. .f-cols h5 l.490 12px and the legal row with 'Botón de arrepentimiento'); .p-tag l.261, .p-brand l.265 and .stock l.270 at 12px; .seg button small l.578 12px; .bag-note l.589 12px; .sg l.601 12px; .est-bar small l.433 12px; .tres-top small l.373 12px; .ts l.381 12px (mobile .ts.cur l.687 11px); 'Hoy' pill l.470 11px; .spot-in kbd l.599 12px
- **Problema:** 12px gray text in Inter fallback is tiring and blurry on non-Retina Windows screens. Most of these items are also --text-3 (finding 3), so the problems stack. The footer holds the address, hours, email and the legally required 'Botón de arrepentimiento', all at 12px. On mobile, the current repair step label is 11px.
- **Arreglo propuesto:** footer{font-size:13px;line-height:1.55} .f-cols h5{font-size:13px}. .p-tag,.p-brand,.stock{font-size:13px} (.p-tag min-height 18px→20px). .seg button small,.bag-note,.sg,.est-bar small,.spot-in kbd{font-size:13px}. .tres-top small{font-size:12.5px;letter-spacing:.05em}. .ts{font-size:13px}, and at ≤734px .ts.cur{font-size:12.5px}. .hours li.today span:first-child::after{font-size:12px;padding:2px 9px}.
- **Evidencia:** desktop-light--11-FOOTER.png (whole footer at 12px), desktop-light--03-tienda.png (12px brand and stock lines), desktop-light--state-bag.png (12px bag-note and 'Sin costo'). Source lines listed.

### A8 · Inactive story steps are nearly invisible, and on mobile the reading area is a small band under the phone

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** .steps-txt .stx l.329 `opacity:.25`; mobile l.653-655: .story-media sticky top:52px, .phone `height:min(50vh,430px)`, .stx `min-height:62vh`
- **Problema:** At .25 opacity the next step's heading is 1.94:1 and its paragraph 1.43:1, effectively unreadable until it hits a narrow trigger band, so the user reads text that keeps lighting up and dimming. On a 390x844 phone the sticky phone mock covers 52-512px (61% of the screen), so step text can only be read in the bottom ~330px, and the WhatsApp FAB covers the right side of that band. The mock's own text is ~8px there.
- **Arreglo propuesto:** .steps-txt .stx{opacity:.55} (heading 5.85:1, paragraph 3.0:1, still clearly dimmed). In @media (prefers-reduced-motion:reduce) set .steps-txt .stx{opacity:1}. Mobile (≤900px): .phone{height:min(40vh,340px)}, .steps-txt .stx{min-height:54vh;padding-top:4vh}. Hide the FAB while the story is on screen: an IntersectionObserver on #servicio toggles body.in-story, and .in-story .wa-fab{opacity:0;pointer-events:none}.
- **Evidencia:** desktop-dark--05-servicio.png (Paso 2 almost gone), mobile-dark--05-servicio.png (Paso 2/3/4 at very low contrast down a long black scroll), mobile-dark--state-story.png (FAB over 'Y lo probamos a fondo…', phone fills the top 60%).

### A9 · Harsh pure black, plus a ~5-screen black band in light mode with a muddy nav over it

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Dark tokens l.42-43 `--bg:#000000; --text:#f5f5f7`; .story l.295 `background:#000` (in both themes); .stx l.329 `min-height:78vh` × 5 steps; light --nav l.30 `rgba(251,251,253,.8)`
- **Problema:** #f5f5f7 on #000 is 19.3:1. Long reading (FAQ, bag, tracker) at that contrast causes halation for astigmatic eyes, and it is where 'tires the eyes' comes from. In light mode the page jumps from white to an #000 section about 5 viewports tall (5 × 78vh plus heading and services grid) and back. That is the largest luminance swing on the site. Over that section the 80%-white translucent nav turns a dirty #c9c9ca gray.
- **Arreglo propuesto:** Dark: --bg:#0b0b0c; --text:#ececf0 (16.1:1, still crisp); --text-2 #a1a1a6 stays (7.65:1). Use .story{background:#0b0b0c} and .story-media mobile gradient #0b0b0c 82%. Shorten the band: .steps-txt .stx{min-height:64vh}. Light nav: --nav:rgba(251,251,253,.92), which stays near-white (#e7e7e9) over the dark section.
- **Evidencia:** desktop-light--state-story.png (gray nav band over black, full-black viewport in light theme), desktop-dark--01-inicio.png / desktop-dark--06-seguimiento.png (pure-black background). Computed 19.29:1 vs 16.11:1.

### A10 · Input borders and the unchecked checkbox ring are too faint; dark inputs look like black holes

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** .inp l.358 `border:1px solid var(--line)` (#d2d2d7 light / #3a3a3c dark); l.359 `.sec.alt .inp,.card .inp{background:var(--bg)}` → #000 inside the #161617 card in dark; focus halo l.360 `rgba(0,113,227,.16)`; extras check ring .ex .ck l.419 `inset 0 0 0 1.5px var(--line)`
- **Problema:** WCAG 1.4.11 asks for 3:1 on control boundaries. The tracker and bag fields are 1.51:1 in light (#d2d2d7 on #fff) and 1.85:1 in dark. In dark the fields are #000 wells in a #161617 card (1.16:1), which read as holes rather than inputs. The unchecked circle on 'Windows + drivers / Backup / Retiro' is 1.5:1, so it barely shows that the tile can be selected. The 16% focus halo is faint.
- **Arreglo propuesto:** New tokens: light --field-line:#8e8e93 (3.26:1), dark --field-line:#6e6e73 (3.36:1 on #1c1c1e). .inp{border-color:var(--field-line)} .ex .ck{box-shadow:inset 0 0 0 1.5px var(--field-line)}. Dark: :root[data-theme=dark] .inp,:root[data-theme=dark] .card .inp{background:#1c1c1e}. Focus: .inp:focus-within{border-color:var(--link);box-shadow:0 0 0 3px color-mix(in srgb,var(--link) 30%,transparent)}.
- **Evidencia:** desktop-dark--06-seguimiento.png (black input wells in the gray card), desktop-light--06-seguimiento.png (pale borders), desktop-dark--07-presupuesto.png (faint empty circles on the Extras tiles). Source l.358-364, 419.

### A11 · Search results and bag fields are not announced properly to screen readers

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Spotlight markup l.1269-1270 `<input id="sIn" placeholder=… aria-controls="sList">` + `<ul role="listbox">`; drawSpot() l.1699-1700 renders `<li class="si" role="option">` with no id; selSpot() l.1703-1707 only toggles aria-selected. Bag drawBag() l.1644 `<input id="bDir" placeholder="Dirección o barrio">` and l.1647-1648 visible 'Tu nombre' is a `<p class="bl">` not tied to #bName.
- **Problema:** The search input has no accessible name or combobox role, and arrow-key highlighting is never announced because there is no aria-activedescendant. A blind user types 'mouse' and hears nothing about the results. In the bag, the address and name fields are named only by their placeholders, which some screen readers skip and which disappear once the user starts typing.
- **Arreglo propuesto:** <input id="sIn" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="sList" aria-label="Buscar productos y secciones" …> and <ul … role="listbox" aria-label="Resultados">. In drawSpot add id="si-${i}" to each .si. At the end of drawSpot and selSpot call sIn.setAttribute('aria-activedescendant', sItems.length ? 'si-' + sSel : ''). Bag: <input id="bDir" aria-label="Dirección de entrega" …>, and change the name label to <label class="bl" for="bName" style="display:block">Tu nombre <span class="muted" style="font-weight:400">(opcional)</span></label>.
- **Evidencia:** desktop-light--state-search.png / mobile-dark--state-search.png (highlighted result row with no programmatic link), desktop-light--state-bag.png ('Tu nombre (opcional)' label visually above the field but not associated). Source l.1269-1270, 1644-1648, 1699-1707.

### A12 · Screen-reader noise: mock phone text is read aloud, headings skip levels, star ratings are unlabeled

- **Impacto:** Bajo · **Esfuerzo:** chico
- **Dónde:** Story phone: l.1743 renders each .ps with aria-hidden toggled false for the active one (setStory l.1749). Services grid l.1746 uses <h4> under the h2 'Todo lo que reparamos.' Footer l.490/1226 uses <h5> with no h2-h4 above. Stars l.1378 put aria-label on a plain <span>. Quick-view qty l.1581 is `<div class="qty" aria-label="Cantidad">`. WhatsApp greeting l.1243 has role="status", and the panel header l.1245 says 'Responde en minutos'.
- **Problema:** Between each real step a screen reader also reads the mock UI ('Seguimiento, Recibimos tu equipo, ATC-1042, Ingresado, Lenovo IdeaPad 3…'), which duplicates and confuses the story. The h2→h4 and footer h5 jumps break heading navigation. aria-label on a generic span is ignored, so '5 de 5 estrellas' is never read, and the same applies to the qty div. role=status on the greeting means that 8 seconds after page load every screen-reader user hears an unprompted '¿Te ayudamos? Escribinos, mano saludando'. 'Responde en minutos' also promises a reply speed a one-person shop cannot guarantee.
- **Arreglo propuesto:** <div class="story-media" aria-hidden="true">, and remove the aria-hidden toggling of .ps in the template and in setStory. In SERVICES render use <h3> instead of <h4> (style .svc h3 like .svc h4). Footer: <h2 class="f-h"> with .f-h{font-size:13px;font-weight:600;color:var(--text);margin:0 0 10px}. Stars: also call s.setAttribute('role','img'). Qty: <div class="qty" role="group" aria-label="Cantidad"> and <span aria-live="polite">. Greeting: drop role="status" and add aria-hidden="true" (the FAB is the accessible entry point). Change the header subtitle to 'Te responde el dueño en horario de atención'.
- **Evidencia:** Source l.1243-1245, 1378, 1581, 1743-1749, 1746, 1226. Visual context: desktop-dark--05-servicio.png (mock phone next to step text), desktop-light--11-FOOTER.png (footer column headings).


## K — Terminación y consistencia

### K1 · Opening the mobile menu or any overlay makes the sticky nav disappear, along with the menu's close button

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** Base CSS line 60 `body.lock{overflow:hidden}` combined with line 58 `html{overflow-x:clip}`. JS setMenu() and openLayer() add `body.lock`.
- **Problema:** `html` has overflow-x:clip, so body's overflow:hidden does not pass up to the viewport. Body becomes its own scroll container, and the sticky `.nav` now sticks to body, which sits at scrollTop 0, instead of the viewport. When the page is scrolled, opening the mobile menu moves the nav off-screen. Measured: navTop goes from 0 to -3000 at scrollY 3000. The phone menu then shows no logo and no X, and page text shows through the 52px strip above the links. A phone has no Esc key, so the only way out is tapping a link. On desktop the nav also vanishes behind the bag and quick-view scrims, so the blurred background jumps.
- **Arreglo propuesto:** Lock the root element instead of body. Replace line 60 with `html:has(body.lock){overflow:hidden}`, and add `scrollbar-gutter:stable` to the `html` rule so desktop doesn't shift 15px when the scrollbar hides. No JS change is needed. I tested this: with the page scrolled to 3000, navTop stays 0 and scroll position is kept after closing.
- **Evidencia:** scratchpad/mine/m-menu-open.png (menu open at scrollY 3000: no nav, stray 'los tres perfiles…' text at the top); measured {before navTop:0, after navTop:-3000}; critique/desktop-light--state-bag.png and desktop-light--state-quickview.png (no nav bar visible behind the blur); fix tested with an injected style: navTop 0.

### K2 · Tracker form: label styles leak into the inputs, typed digits look like placeholders, and the loading state washes out

- **Impacto:** Alto · **Esfuerzo:** chico
- **Dónde:** #seguimiento .card. CSS line 357 `.field>span{font-size:13px;font-weight:500;color:var(--text-2)}` also matches `<span class="inp">`, the direct child of label.field. Line 361 `.inp .pre`. Line 92 `.btn[disabled]{opacity:.35}`, which applies to #tBtn while JS line 1814 runs `tBtn.disabled=true`. Line 359 `.card .inp{background:var(--bg)}`. JS line 1823 live event time.
- **Problema:** (1) The `.inp` wrapper inherits 13px, weight 500 and color #6e6e73. Input text uses `color:inherit`, so typed digits ('1043', '548') render in text-2 grey, almost the same as the #86868b placeholder. You can't tell a filled field from an empty one. Computed values: .inp 13px, input rgb(110,110,115). (2) The 'ATC-' prefix renders at 13px bold next to 17px digits, so its baseline sits off. (3) While searching, the Rastrear button drops to 35% opacity: a pale-blue pill with a white spinner and 'Buscando…' at about 1.6:1 contrast, which looks broken. (4) In dark mode the inputs are pure #000 wells inside the #161617 card. (5) The ATC-1044 'live' update is stamped with the visitor's real clock, so it showed '07/10 · 02:00'. That reads as the owner updating an order at 2 AM.
- **Arreglo propuesto:** Line 357: change the selector to `.field>span:not(.inp){…}`. Add `.inp .pre{font-size:17px;font-weight:500;color:var(--text-3)}` and `.inp input{color:var(--text)}`. Add `#tBtn[disabled]{opacity:1;cursor:progress}` so the button stays solid blue and only the label changes to the spinner. Add `:root[data-theme="dark"] .card .inp{background:var(--fill-2);border-color:var(--line-2)}`. JS line 1823: replace `new Date().toTimeString().slice(0,5)` with the fixed string `'11:20'`.
- **Evidencia:** scratchpad/mine/dl-tracker-err.png and mine/dl-busy.png (grey '9999'/'1042', small 'ATC-', faded 'Buscando…' button); critique/desktop-light--06-seguimiento.png and mobile-light--06 (13px 'ATC-' beside 17px placeholder); critique/mobile-dark--06-seguimiento.png (black wells); mine/dl-tracker-live-toast.png ('07/10 · 02:00').

### K3 · Service story phone: half the screen is empty on every step, and on mobile the active caption hides under the phone

- **Impacto:** Alto · **Esfuerzo:** medio
- **Dónde:** #servicio. JS STORY render, lines 1734–1744 (each `.ps` has only a title, card and bubble). Mobile CSS lines 652–655 (`.phone{height:min(50vh,430px)}`, `.steps-txt .stx{min-height:62vh;padding-top:8vh}`). JS line 1756 rootMargin `'-62% 0px -18% 0px'`.
- **Problema:** On desktop and mobile, the lower 45–55% of the phone screen is a blank #f2f2f7 field under the bubble. The signature section looks unfinished. On mobile I measured the active step while scrolling. For about half of each step's active range, its h3 sits behind the sticky phone (h3top below phoneBottom 490). When it is visible it sits at y 714–764 of 844, under the WhatsApp FAB. The phone says 'Diagnóstico' while its caption is hidden.
- **Arreglo propuesto:** (a) Fill the phone with a progress list. In the STORY map, for non-done steps append: ``const PT=['Ingresado','Diagnóstico','Presupuesto','En reparación','Listo para retirar']; body += `<ol class="ptl">${PT.map((t,j)=>`<li class="${j<=i?'d':''}${j===i?' c':''}">${t}</li>`).join('')}</ol>`;``. CSS: `.ptl{list-style:none;margin:5cqw 0 0;padding:4.4cqw 5cqw;border-radius:5cqw;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06);display:grid;gap:3.4cqw;font-size:3.8cqw;color:#8e8e93}.ptl li{display:flex;align-items:center;gap:2.6cqw}.ptl li::before{content:'';flex:none;width:2.8cqw;height:2.8cqw;border-radius:50%;box-shadow:inset 0 0 0 .5cqw #d1d1d6}.ptl li.d{color:#1d1d1f}.ptl li.d::before{background:#0071e3;box-shadow:none}.ptl li.c{font-weight:600}`. (b) On mobile, show the caption inside the sticky block. Add `<div class="story-cap" id="storyCap" aria-hidden="true"></div>` after `.phone` in `.story-media`. In setStory(i) add `$('#storyCap').innerHTML=$(`.stx[data-st="${i}"]`).innerHTML;`. CSS: `.story-cap{display:none}` and inside @media(max-width:900px): `.story-cap{display:block;width:100%;min-height:9.5em;padding-top:14px}.story-cap .n{font-size:15px;font-weight:600;color:#2997ff}.story-cap h3{font-size:26px;margin:4px 0 6px}.story-cap p{font-size:16px;color:#a1a1a6}.story-cap p b{color:#f5f5f7}.phone{height:min(42vh,360px)}.steps-txt .stx{min-height:50vh;opacity:0!important}`. The .stx blocks stay as scroll spacers and screen-reader text. Both parts tested.
- **Evidencia:** critique/desktop-light--state-story.png and desktop-light--05-servicio.png (phone screen empty below y≈410/720); critique/mobile-dark--state-story.png (caption at the bottom edge, 'calidad.' under the FAB); mine/fix-ml-story.png (caption behind the phone); scroll measurement h3top<phoneBottom in 12 of 24 samples; fixes rendered in mine/fix-dl-story.png and mine/cap-9.png.

### K4 · Bag drawer: payment pills wrap with an orphan, and selected states use two different visual styles

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Bag drawer. JS line 1646 `<div class="pays" role="group">`. CSS lines 581–583 (`.pays` flex-wrap pills; selected = 2px blue ring and blue text). Compare line 576–580 `.seg` (selected = raised white pill).
- **Problema:** At 440px the four pills wrap 3 + 1, leaving 'Tarjeta' alone on the second row. At 390px they wrap 2 + 2 with uneven widths. Directly above, '¿Cómo lo recibís?' uses an iOS segmented control. So two consecutive single-choice questions show 'selected' two ways, and the blue-outline pill is a third style next to the estimator's 2px ring. The drawer looks assembled rather than designed.
- **Arreglo propuesto:** Reuse the segmented control. In drawBag() change `<div class="pays" role="group"` to `<div class="seg" role="group"`. JS only queries `[data-pay]`, so nothing else changes, and you get a 2×2 grid that matches Entrega in both themes, including the existing dark override at line 580. Delete the `.pays` rules at lines 581–583. Rendered and checked at 1440 and 390.
- **Evidencia:** critique/desktop-light--state-bag.png (Tarjeta orphan); critique/mobile-dark--state-bag.png (2+2 ragged); mine/dl-bag-envio.png; fixed version mine/fix-dl-bag.png and mine/fix-ml-bag.png.

### K5 · Widow words in headlines and short paragraphs across the page

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** CSS line 61 `h1,h2,h3,h4{…}` has no text-wrap. Affected: .hero h1, .h2, .hero-sub, .val p, .feat li, .lede, #bagSub.
- **Problema:** Single words end up alone on the last line all over the page. Mobile hero 'En las mejores / manos.'; '¿Qué notebook es para / vos?'; 'Contacto. Estamos / cerca.'; 'Lo que dicen nuestros / clientes.'; '¿Cómo va tu reparación? Miralo / ahora.'. Desktop hero-sub ends on 'tu equipo.'. Values have 'paso a / paso.' and 'reparación.'. Tracker features have 'lo ves al / instante.'. The contact lede ends on 'equipo.', and the bag subtitle ends on 'online.'. Apple's big confident type depends on balanced lines.
- **Arreglo propuesto:** Add `text-wrap:balance` to line 61 (`h1,h2,h3,h4{…;text-wrap:balance}`). Add `.hero-sub,.lede,.head.center .lede{text-wrap:balance}` and `p,li,blockquote,figcaption{text-wrap:pretty}`. Browsers without support ignore it. Rendered: 'Clases, trabajos prácticos / y streaming.' and balanced h2s.
- **Evidencia:** critique/mobile-light--01-inicio.png, mobile-light--04-notebooks.png, mobile-light--06-seguimiento.png, mobile-light--08-opiniones.png, mobile-light--10-contacto.png; critique/desktop-light--01-inicio.png, desktop-light--02-sec.png, desktop-light--06-seguimiento.png, desktop-light--10-contacto.png; mobile-dark--state-bag.png ('sin pagar / online.').

### K6 · Estimator total: a lone 'a' between two stacked prices, and the digits jitter while counting

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** #presupuesto .summary. Markup line 1122 `<div class="range"><span id="eMin">…</span><span class="a">a</span><span id="eMax">…</span></div>`. CSS lines 425–427 (`.range span{display:block}`, `.a` 17px text-3).
- **Problema:** The key number in the estimator reads '$ 35.000' / tiny grey 'a' / '$ 90.000' over three lines. The 17px 'a' floating between two 44px figures looks like a leftover, and the card spends about 120px of height on it. The figures also animate (updateEst) without tabular numerals, so their width wobbles on every frame.
- **Arreglo propuesto:** Markup: `<div class="range"><div><small>Desde</small><span id="eMin">$ 0</span></div><div><small>Hasta</small><span id="eMax">$ 0</span></div></div>`. CSS: replace lines 425–427 with `.summary .range{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12px;font-family:var(--font-d);font-size:clamp(24px,2.4vw,32px);font-weight:700;letter-spacing:-.035em;line-height:1.1;font-variant-numeric:tabular-nums}.summary .range span{display:block}.summary .range small{display:block;font-family:var(--font);font-size:13px;font-weight:500;letter-spacing:0;color:var(--text-3);margin-bottom:4px}`. Also add `font-variant-numeric:tabular-nums` to `.est-bar b`, `.p-price` and `.tot b`. JS keeps working because the ids are unchanged. Rendered cleanly at 1440, 1100 and 390.
- **Evidencia:** critique/desktop-light--07-presupuesto.png, desktop-dark--07-presupuesto.png, mobile-light--07-presupuesto.png (stacked 'a'); mine/dl-estimator.png; fixed in mine/fix-dl-summary.png, mine/fix-dm-summary.png, mine/fix-ml-summary.png.

### K7 · WhatsApp widget: off-palette greens and teal, a 'Responde en minutos' promise, and a FAB that stacks on the mobile price bar

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** Tokens line 29 `--wa-fab:#25d366`. Line 505 `.wa-fab{background:var(--wa-fab)}`. Line 514 `.wa-head{background:#075e54}`. Line 520 `.wa-opt:hover` ring #25d366. Line 98 `.btn-wa:hover{#167a41}`. Markup line 1245 `<small>Responde en minutos</small>`. Lines 511/707 `.has-bar .wa-fab{bottom:92px/90px}`.
- **Problema:** The page uses four greens: neon #25d366 on the FAB, #1a8d4c on buttons, #167a41 on hover, and the WhatsApp-teal #075e54 header. The neon FAB is the most saturated object on every screen, against an otherwise restrained Apple-style palette. 'Responde en minutos' is a promise one person working the counter and the bench can't keep. On mobile, when the estimate bar is showing, the FAB moves up and sits on top of the selected 'Windows + drivers' extra. That puts two WhatsApp CTAs on top of each other, and the toast overlaps the FAB.
- **Arreglo propuesto:** `.wa-fab{background:var(--wa);box-shadow:0 6px 20px rgba(0,0,0,.18)}` and delete `--wa-fab`. `.wa-opt:hover{box-shadow:inset 0 0 0 1.5px var(--wa)}`. `.wa-head{background:var(--bg-alt);color:var(--text);border-bottom:1px solid var(--line-2)}` and `.wa-head .mark{color:#fff;background:linear-gradient(180deg,#48484d,#111113)}` (the nav logo style). Copy, line 1245: `<small>Te responde el dueño, en horario de atención</small>`. Collisions: replace lines 511/707 with `.has-bar .wa-fab,.has-bar .wa-greet{opacity:0;transform:scale(.8);pointer-events:none}`. The bar's 'Pedir presupuesto' button already opens WhatsApp.
- **Evidencia:** scratchpad/mine/dl-wa-panel.png and mine/md-wa-panel.png (teal header, 'Responde en minutos'); mine/md-estimator.png (FAB on the selected extra above the est-bar); mine/md-tracker-live-toast.png (toast over the FAB); neon FAB in every critique/*.png.

### K8 · Dark-mode toast is a bright white pill on a black page

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** CSS line 612 `.toast{color:var(--bg);background:var(--text)}` and line 615 `.toast button{color:var(--text);background:var(--bg)}`.
- **Problema:** The colors are inverted from the theme. In dark mode the toast becomes #f5f5f7 with black text, the brightest thing on screen and a glare flash every time something is added to the bag or an order updates. The green check (#30d158) on near-white is hard to see, and the 'Ver bolsa' button turns into a black blob inside the white pill. That is the 'tires the eyes' effect the client wants to avoid.
- **Arreglo propuesto:** Add `:root[data-theme="dark"] .toast{background:rgba(44,44,46,.94);color:#f5f5f7;-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);box-shadow:0 0 0 1px rgba(255,255,255,.08),0 16px 40px rgba(0,0,0,.6)}` and `:root[data-theme="dark"] .toast button{background:rgba(255,255,255,.14);color:#fff}`. Keep the light-mode dark pill as it is.
- **Evidencia:** scratchpad/mine/md-toast-add.png ('IdeaPad Slim 3 15" se agregó a tu bolsa' white pill on black); mine/md-tracker-live-toast.png.

### K9 · Contact card has a ~190px dead band, which is the right place to say who answers

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** #contacto. CSS line 455 `.c-main{display:flex;flex-direction:column;justify-content:space-between}`. Markup lines 1174–1189.
- **Problema:** At desktop the left card stretches to the height of the hours and map column. space-between pushes the buttons to the bottom, leaving an empty grey gap of about 190px between the lede and 'Escribir por WhatsApp'. It looks like something failed to load. Meanwhile the strongest trust signal for a one-person shop, that the owner answers and repairs personally, is buried mid-sentence in the lede.
- **Arreglo propuesto:** CSS: `.c-main{justify-content:flex-start}` and `.c-main>div:last-child{margin-top:auto}`. Add `.owner{display:flex;align-items:center;gap:14px;margin-top:28px;padding-top:24px;border-top:1px solid var(--line-2);font-size:15px}.owner .ava{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:14px;font-weight:600;background:var(--fill)}.owner small{display:block;color:var(--text-2);font-size:13px}`. Markup, inside the first `<div>` after the lede: `<div class="owner"><span class="ava">AT</span><div><b>Te atiende el dueño</b><small>Él mismo diagnostica y repara cada equipo.</small></div></div>`. Rendered: the gap is gone and the card reads as intentional.
- **Evidencia:** critique/desktop-light--10-contacto.png and desktop-dark--10-contacto.png (empty band y≈470–650); fixed render in scratchpad/mine/fix-dl-contact.png.

### K10 · Orange carries four meanings, and the section kickers aren't consistent

- **Impacto:** Medio · **Esfuerzo:** chico
- **Dónde:** CSS line 86 `.kicker{color:var(--warn)}`. Markup line 1048 `<span class="kicker" style="color:#2997ff">`. Line 261 `.p-tag{color:var(--warn)}`. Line 271 `.stock.low{color:var(--warn)}`. JS line 1374 `t:`¡Quedan ${s}!``. Line 1768 STEPS aprobación `var(--warn)`.
- **Problema:** The same #b64400 (dark mode #ff9f0a) is used for section eyebrows ('Seguimiento online', 'Presupuesto'), merchandising tags ('Más vendido'), urgency ('¡Quedan 3!') and a status ('Esperando aprobación'). Two orange labels end up on the same product card, top and bottom, and in dark mode the bright #ff9f0a eyebrows shout on black. The story eyebrow is hard-coded blue inline, so eyebrows also differ by section. '¡Quedan 3!' reads like a pushy marketplace, not a calm Apple-style shop.
- **Arreglo propuesto:** Make eyebrows neutral and consistent: `.kicker{color:var(--text-2)}` and remove `style="color:#2997ff"` at line 1048. In the story, --text-2 is already #a1a1a6. Keep orange only for `.p-tag`. Set `.stock.low{color:var(--text-2)}` and change stockInfo to `{ c:'low', t:`Últimas ${s} unidades` }`. The STEPS 'aprobación' badge can stay --warn, because there it is a real status.
- **Evidencia:** critique/desktop-light--03-tienda.png ('Más vendido' and '¡Quedan 3!' both orange in one card); critique/desktop-light--06-seguimiento.png and 07-presupuesto.png (orange eyebrows) vs desktop-light--05-servicio.png (blue eyebrow); critique/desktop-dark--06/07 (bright #ff9f0a).

### K11 · Card system: peer cards use five radii and six paddings, and notebook tiers have no card on mobile

- **Impacto:** Medio · **Esfuerzo:** medio
- **Dónde:** Radii: .pcard 22 (line 258), .svc 22 (337), .rev 24 (440), .card/.summary/.c-main/.c-tile 28 (351/423/455/463), .p-empty 22, .cat 18, .map 18, .opt/.ex 16, .spot 20, .est-bar 20, .wa-panel 24, .qv 30, .inp/.seg 14, .si-img/.tmeta 12. Paddings: 26/26/24, 26/24, 32, clamp(24–36), 32, clamp(32–52), 28. Mobile tiers: lines 649–651 turn `.tiers` into a scroll-snap row but `.tier` has no background.
- **Problema:** Cards that sit side by side or follow each other (product cards 22px, reviews 24px, tracker, estimator and contact 28px, category tile 18px, option tiles 16px) all have slightly different corners and insets, which reads as approximate rather than engineered. On mobile, the notebook comparison becomes a horizontal carousel of loose content: the peeking neighbor shows clipped text ('Mul', 'Te') and floating divider lines instead of a card edge, so it looks like overflow, not a swipeable set.
- **Arreglo propuesto:** Add tokens on :root: `--r-card:24px;--r-tile:16px;--r-ctl:12px;--pad-card:clamp(24px,3vw,32px)`. Use --r-card and --pad-card on .pcard, .svc, .rev, .card, .summary, .c-main, .c-tile, .p-empty and .wa-panel, keeping .qv at 28px. Use --r-tile on .opt, .ex, .cat, .map, .bi-img and .est-bar. Use --r-ctl on .inp, .seg (inner buttons 8px), .si, .si-img and .tmeta span. For mobile tiers, inside @media(max-width:900px) add `.tier{background:var(--card);border-radius:var(--r-card);padding:32px 22px 28px}`. In the white section --card is #f5f5f7, so the peeking neighbor shows as a clean card edge. Rendered and checked.
- **Evidencia:** critique/desktop-light--03-tienda.png (22px cards next to the 18px tile), desktop-light--06 (28px card), desktop-light--08-opiniones.png (24px); critique/mobile-light--04-notebooks.png (clipped 'Mul'/'Te' and divider); fixed tiers in scratchpad/mine/fix-ml-tiers.png.

### K12 · Unfinished edges: stray hairline in the empty bag, clipped tile shadow, a leading divider in the footer, and an 'Esc' key on touch

- **Impacto:** Bajo · **Esfuerzo:** chico
- **Dónde:** (a) CSS line 585 `.bag-f` with border-top and padding, while drawBag() sets it to '' when the bag is empty. (b) Line 250 `.cats{padding:4px 2px 6px;overflow-x:auto}` vs line 255 `.cat[aria-pressed=true]{box-shadow:var(--shadow)}` with a 28px blur. (c) Lines 496–498 `.legal>*{border-left:1px solid var(--line);padding:2px 10px}`. (d) Markup line 1269 `<kbd>Esc</kbd>`, with no close control in #spot.
- **Problema:** (a) The empty bag shows a full-width line and a 40px empty footer at the bottom, under 'Tu bolsa está vacía'. (b) The selected category tile's soft shadow is cut off by the scroller into a square-cornered grey halo, left and bottom. (c) On mobile the legal row wraps, and the second line starts with an indented divider ('| Defensa del Consumidor'). (d) On phones the spotlight shows an 'Esc' keycap that can't be tapped and no Cancel button, so the only exit is tapping the blurred scrim.
- **Arreglo propuesto:** (a) `.bag-f:empty{display:none}`. (b) `.cat[aria-pressed="true"]{background:var(--card);box-shadow:0 0 0 1px var(--line-2)}`: no blur, so nothing to clip. (c) Inside @media(max-width:734px): `.legal{flex-direction:column;align-items:flex-start;gap:8px}.legal>*{border-left:0;padding:0}`. (d) Add `<button class="spot-x" type="button" data-close>Cancelar</button>` after the kbd, with `.spot-x{display:none;font-size:15px;color:var(--link)}@media (hover:none){.spot-in kbd{display:none}.spot-x{display:block}}`. The existing `$$('[data-close]')` binding picks it up.
- **Evidencia:** scratchpad/mine/md-bag-empty.png (hairline at y≈803); mine/dl-cat-zoom.png and mine/dl-shelf-redes.png (square halo around 'Todo'/'Redes y cables'); critique/mobile-light--11-FOOTER.png ('| Defensa del Consumidor'); critique/mobile-dark--state-search.png and mine/md-spot-default.png ('Esc' on phone).
