# CLAUDE.md

Este repo es el portfolio de Nicolás (`index.html`, `Estilos/`, etc.; se publica con GitHub Pages desde `main`).
Adentro vive el prototipo de **AT Computación**: `preview/fase-0-inicio.html`, con su documentación en `docs/atc/`.
Las reglas de abajo aplican a todo lo de AT Computación.

## El negocio (la verdad manda sobre el diseño)
- Local de venta de tecnología y servicio técnico en Santa Fe, Argentina. **Lo atiende una sola persona**: el dueño, que también es el técnico.
- Nunca prometer capacidad que una persona no tiene:
  - Sin servicio express ni "envíos en el día".
  - Sin "responde en minutos", sin "especialistas" y sin "nuestro equipo".
  - Envíos y retiros: "a coordinar por WhatsApp".
- Sellos de confianza permitidos: "Garantía escrita de 90 días" y "Te atiende el técnico, sin intermediarios". **Prohibido** "oficial" o "certificado" mientras no haya una prueba.
- Sin cifras ni reseñas inventadas que parezcan reales. Las reseñas de ejemplo van marcadas en el código.
- Datos de ejemplo hasta que el dueño pase los reales: WhatsApp `5493420000000`, dirección, mail, precios, stock y reseñas.
- **No mergear a `main`** mientras haya datos de ejemplo: GitHub Pages lo publicaría. Se trabaja en ramas.
- La compra no cobra online: la bolsa arma un mensaje de WhatsApp (entrega, pago y nombre). Nada de datos de tarjeta.

## Estilo (inspirado en apple.com, calmo, que no canse la vista)
- **Espacio:**
  - Escala de espaciado con base 4: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
  - Secciones con padding `clamp(88px, 11vw, 144px)`.
  - Un producto destacado ocupa más espacio y queda aislado.
- **Tipografía:**
  - `-apple-system, BlinkMacSystemFont, "SF Pro Display/Text", "Inter", system-ui`. Nunca servir SF Pro como fuente web: su licencia no lo permite.
  - Títulos en peso 600, `text-wrap: balance`, tracking −0,02 a −0,035 em según el tamaño.
  - Cuerpo 17/1,47; texto chico 14/1,43; mínimo absoluto 12 px, y solo en el pie.
- **Colores** (todo par texto/fondo cumple AA ≥ 4,5:1; se verifica con el script):
  - Claro:
    - Fondos `#fff` y alterno `#f5f5f7`.
    - Textos `#1d1d1f` y secundario `#6e6e73`.
    - Acento `#0071e3` (hover `#0062c4`) y links `#0066cc`.
  - Oscuro:
    - Fondos `#000` y alterno `#0f0f10`; tarjetas `#1c1c1e` y `#161617`.
    - Textos `#f5f5f7` y secundario `#a1a1a6`.
    - Links y textos azules `#2997ff`.
  - `#86868b` solo para texto de 18 px o más, o decorativo.
  - WhatsApp: botón `#157a3e` con texto blanco (5,4:1); el botón flotante puede usar `#25d366` porque no lleva texto.
  - El naranja (`#b64400` / `#ff9f0a`) solo marca "Oferta" y "Últimas unidades". Las etiquetas de sección usan un solo color.
- **Materialidad:**
  - Radios en escala 12 · 18 · 24 · 32 · píldora.
  - Bordes de 0,5 px en retina (`box-shadow: inset 0 0 0 .5px`).
  - Tres niveles de sombra, siempre difusa y tenue:
    - e1 `0 1px 2px rgba(0,0,0,.04), 0 8px 28px rgba(0,0,0,.06)`
    - e2 (hover) `0 2px 8px rgba(0,0,0,.05), 0 18px 50px rgba(0,0,0,.10)`
    - e3 (modales) `0 30px 90px rgba(0,0,0,.22)`
  - En modo oscuro, en vez de sombra se usa un borde fino `rgba(255,255,255,.08)`.
- Las ilustraciones de producto son SVG propios (`<symbol id="r-*">`). Cuando haya fotos reales, van en fondo blanco liso, y cada producto apunta a una sola imagen.

## Movimiento ("menos es más")
- Easing único `--ease: cubic-bezier(.16,1,.3,1)`. Duraciones de 150 ms (color/hover), 300 ms (UI) y 600 ms (apariciones). Nada pasa de 900 ms.
- Solo se animan `transform` y `opacity` (60 fps). Cada animación ocurre una vez y por una razón: orientar, confirmar o suavizar un cambio de estado.
- Hover de tarjetas: escala 1,015 + sombra e2, dentro de `@media (hover:hover)`.
- **Sin bucles.** Única excepción aprobada: el carrusel de marcas `.mq-track`. Es lento (48 s), se pausa con el mouse y fuera de pantalla, y queda quieto con "reducir movimiento". También se permite el indicador de carga mientras se espera algo.
- Siempre respetar `prefers-reduced-motion`.

## Responsive y accesibilidad
- Matriz de pruebas: 320 · 375 · 390 · 820 · 1024 · 1440 px × claro/oscuro × con y sin "reducir movimiento".
- Sin scroll horizontal en ningún ancho.
- Áreas táctiles de 44 px o más.
- Foco visible.
- Las ventanas cerradas llevan `inert`.
- Las maquetas decorativas llevan `aria-hidden`.
- Los títulos no saltan de nivel.

## Seguridad (prototipo ahora y proyecto real después) — detalle en `docs/atc/guia-de-diseno.md` §6
- **Códigos de seguimiento** aleatorios (Crockford base32, ~40 bits, p. ej. `AT-7KQ2-9M`), nunca secuenciales. Para ver una orden se piden el código y los últimos 3 dígitos del teléfono.
- **Datos personales:** el seguimiento muestra solo lo mínimo (nombre + inicial), de acuerdo con la Ley 25.326.
- **Proyecto real** (Next.js + Supabase):
  - RLS en todas las tablas; el público accede solo por la función RPC `track_order(code, phone_last3)`, que es SECURITY DEFINER.
  - La service_role key nunca llega al navegador.
  - Límite de intentos con un contador compartido (Upstash/KV) + Turnstile.
  - CSP con nonce.

## Forma de trabajar (para no gastar tokens de más)
- **Ediciones puntuales:** reemplazos con verificación de que el texto aparece exactamente una vez (`assert s.count(old)==1`). **Nunca reescribir el HTML completo.** Pesa ~145 KB, y cada lectura o escritura completa cuesta decenas de miles de tokens.
- **Antes de editar,** ubicar con `grep -n` y leer solo las líneas necesarias.
- **Verificar** con `node tests/atc/verificar.mjs` (sin errores, sin desborde, flujos funcionando, contraste AA, sin bucles no aprobados).
- **Capturas** solo de la sección que se tocó.
- **No usar multi-agente ni workflows** salvo que el usuario lo pida explícitamente.
- **Un commit + push por lote,** con mensaje en castellano.
- **Pendientes priorizados** en `docs/atc/pendientes.md`: marcarlos al terminarlos.
- **Para ver el sitio en la Mac:**
  ```bash
  curl -L -o ~/Desktop/fase-0-inicio.html "https://raw.githubusercontent.com/TRIBOLONICOLASAGUSTIN/PortafolioDeDesarolloDeSoftware/<rama>/preview/fase-0-inicio.html" && open ~/Desktop/fase-0-inicio.html
  ```
