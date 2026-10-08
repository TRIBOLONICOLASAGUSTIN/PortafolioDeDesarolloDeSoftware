# AT Computación — Guía de diseño y producto (v2)

> La elegancia no viene de acumular adornos. Viene de sacar el ruido para que se vea lo importante.
> Esta v2 parte de la guía original y la ajusta a la realidad del negocio: **un local en Santa Fe que atiende una sola persona, el dueño, que también es el técnico.**
> Las reglas operativas resumidas para trabajar con Claude están en `/CLAUDE.md`. Lo que falta hacer está en `docs/atc/pendientes.md`.

---

## 0. Principios

1. **La verdad antes que el efecto.** Cada frase tiene que poder cumplirse un martes a la tarde con el banco de trabajo lleno.
2. **Cada píxel tiene una razón.** Si un elemento no orienta, informa o convence, se va.
3. **Calma visual.** El sitio no compite por la atención del cliente: lo acompaña.
4. **Una persona, trato directo.** Lo que una cadena no puede ofrecer —que te atienda quien después repara tu equipo— es el corazón de la marca.

---

## 1. Estética

### A. Espacio en blanco
- **Amplitud calculada.** Márgenes, padding y separación entre secciones son decisiones de diseño, no huecos. Escala con base 4: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Padding de sección: `clamp(88px, 11vw, 144px)`.
- **Jerarquía espacial ("galería de exposición").** Los productos que más importan (notebooks, PC armadas, impresoras) tienen más aire y quedan aislados. Los accesorios van en filas más densas.
- **Ancho de lectura.** Los párrafos no pasan de ~65 caracteres; las bajadas, de ~640 px.

### B. Tipografía y contraste sutil
- **Familia:** `-apple-system` (en Mac y iPhone muestra SF Pro) con Inter como respaldo en Windows y Android. SF Pro e Inter son neo-grotescas, no geométricas. **SF Pro no se sirve como fuente web**, porque la licencia de Apple no lo permite.
- **Escala:**

  | Uso | Tamaño | Peso | Tracking |
  |---|---|---|---|
  | Título del inicio | `clamp(46px, 8.6vw, 104px)` | 600 | −0,045 em |
  | Título de sección | `clamp(34px, 5.2vw, 56px)` | 600 | −0,035 em |
  | Bajada | `clamp(19px, 2vw, 21px)` | 400–500 | −0,017 em |
  | Cuerpo | 17 px / 1,47 | 400 | −0,011 em |
  | Chico | 14 px / 1,43 | 400–500 | 0 |
  | Mínimo (solo pie) | 12 px | 400 | 0 |

- **Contraste sin agresividad.** Las secciones se separan con cambios mínimos de fondo (`#fff` ↔ `#f5f5f7`) y bordes muy finos (0,5 px en retina), no con líneas gruesas. Igual, **todo texto cumple WCAG AA (4,5:1)**: lo sutil se logra con los fondos, nunca con texto ilegible.

### C. Materialidad y capas
- **Elevación** con tres niveles de sombra muy difusa:
  - **e1, tarjetas en reposo:** `0 1px 2px rgba(0,0,0,.04), 0 8px 28px rgba(0,0,0,.06)`
  - **e2, hover:** `0 2px 8px rgba(0,0,0,.05), 0 18px 50px rgba(0,0,0,.10)`
  - **e3, ventanas y paneles:** `0 30px 90px rgba(0,0,0,.22)`
  - **En modo oscuro**, la elevación se marca con un borde fino `rgba(255,255,255,.08)`, porque las sombras no se ven sobre negro.
- **Vidrio:** solo la barra de navegación y la barra flotante del cotizador usan `backdrop-filter: saturate(180%) blur(20px)`.
- **Radios armónicos:** 12 para campos y chips grandes, 18 para tarjetas chicas, 24 para tarjetas, 32 para paneles y píldora para botones.
- **Minimalismo funcional:** íconos de trazo de 1,5–1,8 px, una sola familia y sin rellenos decorativos.

### D. Color

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` / `--bg-alt` | `#fff` / `#f5f5f7` | `#000` / `#0f0f10` | Fondos de sección alternados |
| `--tile` / `--tile-alt` | `#fff` / `#f5f5f7` | `#1c1c1e` / `#161617` | Tarjetas según el fondo |
| `--text` | `#1d1d1f` | `#f5f5f7` | Texto principal |
| `--text-2` | `#6e6e73` | `#a1a1a6` | Secundario y texto chico |
| `--text-3` | `#86868b` | `#86868b` | Solo para 18 px o más, o decorativo |
| `--accent` | `#0071e3` (hover `#0062c4`) | `#0071e3` | Botones (texto blanco) |
| `--link` | `#0066cc` | `#2997ff` | Links y textos azules |
| `--wa` | `#157a3e` | `#157a3e` | Botón de WhatsApp con texto |
| `--warn` | `#b64400` | `#ff9f0a` | Solo "Oferta" y "Últimas unidades" |

Un solo acento azul. El degradé queda reservado para una única palabra del título del inicio.

### E. Ilustraciones y fotos
- Hoy los productos son ilustraciones SVG propias, con luz cenital, aluminio y negro mate, y una sombra de piso.
- Cuando haya fotos: fondo blanco liso, producto centrado ocupando el 70–80 % del cuadro, la misma luz en todas y en WebP/AVIF.

---

## 2. Animación — "menos es más"

- **Función antes que espectáculo.** Cada transición orienta, confirma una acción o suaviza un cambio de estado. Si no hace ninguna de esas tres cosas, no va.
- **Easing único:** `cubic-bezier(.16, 1, .3, 1)` (ease-out expo). Arranca con fluidez y frena con suavidad, como un objeto real.
- **Duraciones:**
  - 150 ms para hover y cambios de color.
  - 300 ms para la interfaz (paneles, selección).
  - 600 ms para las apariciones al hacer scroll.
  - Nunca más de 900 ms.
- **Micro-interacciones:**
  - **Tarjetas:** al pasar el cursor, escala 1,015 + sombra e2. Solo en dispositivos con mouse (`@media (hover:hover)`), para que no quede "pegado" al tocar.
  - **Seguimiento de reparaciones:** las etapas aparecen en secuencia con fade-in + leve deslizamiento (80 ms entre una y otra). Así el cliente lee el estado de su equipo sin ansiedad.
  - **Bolsa:** al agregar un producto, el contador hace un pulso corto y aparece una notificación con "Ver bolsa".
- **Rendimiento:** solo se animan `transform` y `opacity` (los maneja la placa de video, a 60 fps). Nunca `width`, `top` ni `box-shadow` en bucle.
- **Sin bucles.** Excepciones aprobadas:
  1. **El carrusel de marcas.** Es lento (48 s por vuelta), tiene los bordes difuminados, se pausa con el mouse y cuando no está en pantalla, y queda quieto con "reducir movimiento". Lo pidió el cliente y queda como la única decoración continua.
  2. **El indicador de carga,** mientras se espera una respuesta.
- **Accesibilidad:** con `prefers-reduced-motion` todo aparece sin movimiento.

---

## 3. Contenido y tono

- **Voseo rioplatense,** frases cortas y seguras, sin signos de exclamación de más.
- **Honestidad,** que también protege frente a la Ley 24.240 y las reglas de lealtad comercial:

  | ❌ No | ✅ Sí |
  |---|---|
  | "Envíos en el día" | "Envío a coordinar por WhatsApp" |
  | "Responde en minutos" | "Te responde el técnico" / "Te respondemos al abrir" |
  | "Hablá con un especialista" | "Te ayudamos a elegir" |
  | "Garantía oficial", "Soporte certificado" | "Garantía escrita de 90 días" |
  | "+2.500 equipos reparados" (sin datos) | Promesas que se cumplen: "Diagnóstico en 24–48 h hábiles, si la agenda lo permite" |
  | "Stock en tiempo real" | "Stock actualizado por el local" (y "Consultá disponibilidad" si está desactualizado) |

- **El diferencial es la persona:** "El que te asesora es el mismo que después le hace el service a tu equipo."

---

## 4. Piezas del sitio (estado del prototipo)

| Sección | Qué hace | Regla clave |
|---|---|---|
| Barra superior | Logo, secciones, buscador, **tema claro/oscuro junto a la bolsa** | Vidrio translúcido; en el celular, menú a pantalla completa |
| Inicio | Título, bajada, 2 accesos y notebook que se endereza al hacer scroll | La animación sigue al scroll; no corre sola |
| Valores y pagos | 4 promesas honestas + tarjetas de medios de pago | Sin cifras inventadas |
| Marcas | Carrusel lento | Única excepción de movimiento |
| Tienda | Encabezado centrado, categorías, tarjetas deslizables, ficha y bolsa | La compra termina en WhatsApp; no se cobra online |
| ¿Qué notebook es para vos? | 3 perfiles por uso | Recomendar por uso, no por precio |
| Servicio técnico | Celular fijo que cambia con cada paso | Texto legible en el celular |
| Seguimiento | Código + teléfono → estado y novedades | Código aleatorio, datos mínimos |
| Cotizador | Configurador en una pantalla | Rango orientativo; precio final después del diagnóstico |
| Contacto | WhatsApp, llamada, horarios y mapa | Decir quién atiende |
| Pie | Navegación, botón de arrepentimiento, Defensa del Consumidor, Data Fiscal | Obligatorio para vender online en Argentina |

---

## 5. Presentación en Figma — guion de 6 diapositivas

> El conector de Figma no funcionaba en la sesión donde se escribió esta guía. Este guion es la base para armarlas cuando funcione.
> **Capturas:** en cada carpeta `tests/atc/capturas/` que genera el script.

1. **Portada y marca.**
   - **Qué mostrar:** maqueta flotante del inicio en perspectiva sobre fondo `#f5f5f7`, logo "AT", el lema "Tu tecnología. En las mejores manos." y dos sellos honestos (Garantía escrita 90 días · Te atiende el técnico).
   - **En Figma:** Auto Layout, estilos de texto con la escala de §1.B, componente de botón con variantes (primario, fantasma, WhatsApp).
2. **Tienda.**
   - **Qué mostrar:** fila de categorías, tarjetas de producto, ficha y bolsa con entrega y pago.
   - **En Figma:** componente de tarjeta con variantes de stock (En stock / Últimas unidades / Sin stock) y de estado (reposo / hover). **Sin filtros laterales:** con este catálogo alcanzan las categorías y la búsqueda.
3. **Seguimiento de reparaciones.**
   - **Qué mostrar:** el buscador (código + teléfono) y la línea de tiempo con sus 6 etapas.
   - **En Figma:** componentes interactivos (Interactive Components) para cada etapa, con transición "Smart Animate" usando el mismo easing.
4. **Cotizador.**
   - **Qué mostrar:** el configurador de una pantalla (servicio → extras → rango) y el mensaje de WhatsApp que genera.
   - **En Figma:** opciones seleccionables con estado elegido (borde de 2 px azul), resumen fijo al costado y barra flotante en el celular.
5. **Panel para una persona** (pensado para el celular).
   - **Qué mostrar:** lista de órdenes activas, crear orden (genera código y ticket), cambiar estado con una nota, botón "Avisar por WhatsApp" con el mensaje armado, y stock de productos.
   - **En Figma:** filas densas pero limpias y hojas modales. Los gráficos no son prioridad.
6. **Arquitectura y seguridad.**
   - **Qué mostrar:** el diagrama de §7 y la tabla de amenazas de §6.

---

## 6. Seguridad — modelo de amenazas (corregido)

| # | Amenaza | Riesgo concreto | Mitigación |
|---|---|---|---|
| 1 | **IDOR / enumeración de órdenes** | Con códigos secuenciales (`ATC-1042`, `1043`…) se pueden adivinar órdenes ajenas. **La demo todavía los usa: cambiar.** | Código público aleatorio de 8 caracteres Crockford base32 (~40 bits, fácil de dictar, sin O/0 ni I/1), p. ej. `AT-7KQ2-9M`, + los últimos 3 dígitos del teléfono. El ID interno nunca se expone. No se usa UUID porque no se puede dictar ni copiar a mano de un ticket. |
| 2 | **Fuerza bruta en el seguimiento** | Bots que prueban códigos en masa. | Límite de intentos con contador **compartido** (Upstash Redis / Vercel KV; en serverless, uno en memoria no sirve): 5 por minuto por IP y 20 por hora por código. Cloudflare Turnstile después de 3 fallos. La misma respuesta para "no existe" y "teléfono incorrecto". |
| 3 | **Tablas expuestas en Supabase** | La anon key es pública por diseño: una tabla sin RLS queda abierta a cualquiera. | RLS activado en **todas** las tablas. El público no lee ninguna; solo accede a `track_order(code, phone_last3)`, una función SECURITY DEFINER que devuelve los campos mínimos. |
| 4 | **Filtración de la service_role key** | Acceso total a la base. | Solo en variables de entorno del servidor, nunca en código del cliente. Revisar el bundle antes de cada deploy. |
| 5 | **Inyección y XSS** | Contenido del panel (nombres, notas) que se muestra en el sitio. | El cliente de Supabase ya parametriza las consultas. Validación con Zod en el cliente y en el servidor. Escapar todo lo que se renderiza (el prototipo ya usa `esc()`). CSP con nonce. |
| 6 | **Acceso al panel** | Alguien entra a cambiar precios u órdenes. | Supabase Auth con link mágico o passkey solo para el mail del dueño. Un único rol `owner` (no hace falta Admin/Técnico/Cliente: es una persona y los clientes no tienen cuenta). Políticas RLS por `auth.uid()`. |
| 7 | **Archivos subidos** | Imágenes con malware o metadatos (ubicación en el EXIF). | Bucket privado, validación de tipo y tamaño, borrado del EXIF y URLs firmadas. |
| 8 | **Datos personales** (Ley 25.326) | Nombre y teléfono de los clientes. | Recolectar el mínimo. En el seguimiento, mostrar nombre + inicial. Política de privacidad en el pie. Borrar órdenes viejas después de X meses. |
| 9 | **Cabeceras HTTP** | XSS, clickjacking. | HTTPS forzado (HSTS), CSP con nonce, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima. |
| 10 | **Pagos** | — | **Fuera de alcance:** no se cobra online. Se paga en el local, por transferencia o con link de Mercado Pago; el sitio nunca toca datos de tarjeta. |
| 11 | **Backups** | Perder las órdenes. | Backups diarios de Supabase (en el plan pago) o un `pg_dump` semanal programado a un almacenamiento aparte. |

---

## 7. Arquitectura del proyecto real (Fase 1)

```
Navegador ──► Next.js (App Router, en Vercel/Netlify/Cloudflare)
               ├─ Páginas públicas (tienda, servicio, seguimiento) — generadas estáticas + revalidación
               ├─ Ruta /api/seguimiento ──► límite de intentos (Upstash) + Turnstile ──► RPC track_order
               └─ /panel (solo el dueño) ──► Supabase Auth
                                              │
Supabase ◄────────────────────────────────────┘
  ├─ Postgres: products · orders · order_events · settings  (RLS en todas)
  ├─ Storage: fotos de productos (bucket privado + URLs firmadas)
  └─ Auth: link mágico / passkey del dueño
WhatsApp: enlaces wa.me con el mensaje prellenado (gratis; sin la API de pago de Meta)
```

- **Avisos por WhatsApp:** automatizarlos requiere la WhatsApp Business API (paga por conversación y pide verificación de Meta). Para una persona sola alcanza con que el panel arme el mensaje y lo mande con un toque.
- **Costos que hay que decidir:**
  - **Vercel Hobby es para uso no comercial.** Para el local: Vercel Pro (~US$20/mes), o Netlify o Cloudflare Pages.
  - **Supabase gratis pausa el proyecto tras ~1 semana sin actividad,** y el seguimiento dejaría de andar. Hace falta Pro (~US$25/mes) o tráfico/ping regular.
- **Repositorio:** el proyecto real debería vivir en su propio repo (`atcomputacion`), no dentro del portfolio.

---

## 8. Qué cambió respecto de la guía original

| Guía original | v2 | Por qué |
|---|---|---|
| Sellos "Garantía oficial / Soporte certificado" | "Garantía escrita 90 días / Te atiende el técnico" | No hay credenciales comprobables. Usarlos sería publicidad engañosa. |
| "Stock en tiempo real" | Stock que actualiza el panel + "Consultá disponibilidad" | Una persona no actualiza en tiempo real. |
| Filtros laterales | Categorías + búsqueda | Catálogo chico: los filtros serían ruido. |
| Cotizador por pasos | Configurador en una pantalla | 3 decisiones: menos pasos, más presupuestos pedidos. |
| Roles Admin / Técnico / Cliente | Un rol `owner` | Es una sola persona, y los clientes no necesitan cuenta. |
| "Sin animaciones continuas" absoluto | Con 2 excepciones definidas | El carrusel de marcas lo pidió el cliente. |
| "Fuentes geométricas SF Pro / Inter" | Neo-grotescas, `-apple-system` + Inter | Precisión, y la licencia de SF Pro. |
| UUID v4 para el seguimiento | Código Crockford de 8 caracteres + teléfono + límite de intentos | Se puede dictar, y mantiene la entropía suficiente. |
| "ORM contra inyección SQL" | RLS + service_role protegida + Zod + CSP | Son los riesgos reales con Supabase. |
| "5 consultas/min en middleware" | Contador compartido (Upstash/KV) + Turnstile | En serverless, uno en memoria no funciona. |
| (No estaba) | Ley 25.326, backups, archivos subidos, costos de hosting | Riesgos reales para un comercio chico. |
