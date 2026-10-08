// Catálogo DE EJEMPLO (precios y stock inventados). En producción sale de la tabla products de Supabase
// (lectura pública solo de productos activos: seguridad.md §4).
export type Category = { id: string; t: string; r: string };
export type Product = {
  id: string; cat: string; r: string; wall?: string; brand: string; name: string; short: string;
  price: number; stock: number; tag?: string; specs: string[];
};

export const CATS: Category[] = [
  { id: 'todo', t: 'Todo', r: 'all' },
  { id: 'notebooks', t: 'Notebooks', r: 'laptop' },
  { id: 'pc', t: 'PC armadas', r: 'tower' },
  { id: 'impresoras', t: 'Impresoras', r: 'printer' },
  { id: 'insumos', t: 'Insumos', r: 'toner' },
  { id: 'perifericos', t: 'Periféricos', r: 'mouse' },
  { id: 'redes', t: 'Redes y cables', r: 'router' },
  { id: 'componentes', t: 'Componentes', r: 'ssd' },
];

export const PRODUCTS: Product[] = [
  { id: 'nb-ideapad', cat: 'notebooks', r: 'laptop', brand: 'Lenovo', name: 'IdeaPad Slim 3 15"', short: 'Ryzen 5 · 16 GB · SSD 512 GB', price: 849999, stock: 4, tag: 'Más vendido',
    specs: ['Procesador AMD Ryzen 5 7520U', '16 GB de memoria RAM', 'SSD NVMe de 512 GB', 'Pantalla 15,6" Full HD', 'Windows 11 instalado y listo'] },
  { id: 'nb-hp250', cat: 'notebooks', r: 'laptop', wall: 'b', brand: 'HP', name: '250 G10', short: 'Core i5 · 8 GB · SSD 512 GB', price: 729999, stock: 3,
    specs: ['Intel Core i5 de 13.ª generación', '8 GB de RAM, ampliable a 16 GB', 'SSD de 512 GB', 'Pantalla 15,6" HD'] },
  { id: 'pc-office', cat: 'pc', r: 'tower', brand: 'AT Computación', name: 'PC Oficina AT', short: 'Ryzen 5 8600G · 16 GB · SSD 512 GB', price: 699999, stock: 3, tag: 'Armada por nosotros',
    specs: ['AMD Ryzen 5 8600G con gráficos integrados', '16 GB DDR5', 'SSD NVMe de 512 GB', 'Probada 24 h antes de entregarla', 'Garantía de armado de 12 meses'] },
  { id: 'imp-l3250', cat: 'impresoras', r: 'printer', brand: 'Epson', name: 'EcoTank L3250', short: 'Multifunción · Wi-Fi · Sistema continuo', price: 389999, stock: 6, tag: 'Sistema continuo',
    specs: ['Imprime, copia y escanea', 'Wi-Fi y app Epson Smart Panel', 'Tanques de tinta recargables', 'Incluye kit de tintas inicial'] },
  { id: 'ins-105a', cat: 'insumos', r: 'toner', brand: 'HP', name: 'Tóner 105A compatible', short: 'Rinde hasta 1.000 páginas', price: 24999, stock: 18,
    specs: ['Compatible con HP Laser 107 y MFP 135/137', 'Rinde hasta 1.000 páginas al 5%', 'Garantía de calidad de impresión'] },
  { id: 'ins-t544', cat: 'insumos', r: 'ink', brand: 'Epson', name: 'Kit de tintas T544', short: 'Originales · 4 colores', price: 42999, stock: 12,
    specs: ['Tintas originales Epson', 'Cian, magenta, amarillo y negro', 'Para EcoTank L1110, L3110, L3150, L3250'] },
  { id: 'per-g203', cat: 'perifericos', r: 'mouse', brand: 'Logitech', name: 'G203 Lightsync', short: 'Mouse gamer RGB · 8.000 DPI', price: 32999, stock: 2, tag: 'Últimas unidades',
    specs: ['Sensor de hasta 8.000 DPI', 'Iluminación RGB Lightsync', '6 botones programables'] },
  { id: 'per-k552', cat: 'perifericos', r: 'keyboard', brand: 'Redragon', name: 'Kumara K552', short: 'Teclado mecánico · RGB', price: 59999, stock: 7,
    specs: ['Switches mecánicos', 'Formato compacto TKL', 'Retroiluminación RGB'] },
  { id: 'comp-nv2', cat: 'componentes', r: 'ssd', brand: 'Kingston', name: 'SSD NV2 1 TB', short: 'NVMe PCIe 4.0 · M.2', price: 79999, stock: 9, tag: 'Oferta',
    specs: ['Hasta 3.500 MB/s de lectura', 'Formato M.2 2280', 'Te lo instalamos y clonamos tu disco'] },
  { id: 'red-c6', cat: 'redes', r: 'router', brand: 'TP-Link', name: 'Archer C6', short: 'Router Wi-Fi AC1200 doble banda', price: 54999, stock: 0,
    specs: ['Wi-Fi doble banda 2,4 y 5 GHz', '4 antenas externas', 'Puertos Gigabit'] },
  { id: 'red-hdmi', cat: 'redes', r: 'cable', brand: 'Ugreen', name: 'Cable HDMI 2.1', short: '8K 60 Hz · 2 metros', price: 12499, stock: 35,
    specs: ['Soporta 8K a 60 Hz y 4K a 120 Hz', 'Conectores bañados en oro', 'Largo de 2 metros'] },
];

export const byId: Record<string, Product> = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

export const stockInfo = (s: number) =>
  s <= 0 ? { c: 'out', t: 'Sin stock' } : s <= 3 ? { c: 'low', t: `Últimas ${s} unidades` } : { c: 'ok', t: 'En stock' };

export const TIERS = [
  { t: 'Para estudiar', q: 'para estudiar', tl: 'Clases, trabajos prácticos y streaming.', wall: 'b', from: 549999,
    rows: [['cpu', 'Intel Core i3 o AMD Ryzen 3'], ['ram', '8 GB de RAM'], ['db', 'SSD de 256 GB'], ['clock', 'Batería para toda la jornada']] },
  { t: 'Para trabajar', q: 'para trabajar', tl: 'Multitarea, videollamadas y planillas pesadas.', wall: 'a', from: 799999,
    rows: [['cpu', 'Intel Core i5 o AMD Ryzen 5'], ['ram', '16 GB de RAM'], ['db', 'SSD de 512 GB'], ['shield', 'Teclado numérico y lector de huella']] },
  { t: 'Diseño y gaming', q: 'para diseño y gaming', tl: 'Edición, render 3D y juegos actuales.', wall: 'c', from: 1399999,
    rows: [['cpu', 'Ryzen 7 o Core i7 + RTX 4050'], ['ram', '16 GB de RAM, ampliable'], ['db', 'SSD de 1 TB'], ['monitor', 'Pantalla de 144 Hz']] },
] as const;

export const PAGES = [
  { t: 'Tienda', h: '#tienda', ic: 'bag' }, { t: '¿Qué notebook es para vos?', h: '#notebooks', ic: 'laptop' },
  { t: 'Servicio técnico', h: '#servicio', ic: 'wrench' }, { t: 'Seguir mi reparación', h: '#seguimiento', ic: 'scan' },
  { t: 'Calcular presupuesto', h: '#presupuesto', ic: 'zap' }, { t: 'Preguntas frecuentes', h: '#faq', ic: 'msg' },
  { t: 'Contacto y horarios', h: '#contacto', ic: 'pin' },
];
