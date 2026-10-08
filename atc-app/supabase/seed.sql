-- =====================================================================
-- Datos de EJEMPLO (los mismos de la demo preview/fase-0-inicio.html).
-- No usar en producción: precios, stock, nombres y teléfonos son ficticios.
-- =====================================================================
insert into public.products (slug, category, brand, name, short, specs, price_ars, stock, tag) values
  ('nb-ideapad', 'notebooks', 'Lenovo', 'IdeaPad Slim 3 15"', 'Ryzen 5 · 16 GB · SSD 512 GB',
   '["Procesador AMD Ryzen 5 7520U","16 GB de memoria RAM","SSD NVMe de 512 GB","Pantalla 15,6\" Full HD","Windows 11 instalado y listo"]', 849999, 4, 'Más vendido'),
  ('nb-hp250', 'notebooks', 'HP', '250 G10', 'Core i5 · 8 GB · SSD 512 GB',
   '["Intel Core i5 de 13.ª generación","8 GB de RAM, ampliable a 16 GB","SSD de 512 GB","Pantalla 15,6\" HD"]', 729999, 3, null),
  ('pc-office', 'pc', 'AT Computación', 'PC Oficina AT', 'Ryzen 5 8600G · 16 GB · SSD 512 GB',
   '["AMD Ryzen 5 8600G con gráficos integrados","16 GB DDR5","SSD NVMe de 512 GB","Probada 24 h antes de entregarla","Garantía de armado de 12 meses"]', 699999, 3, 'Armada por nosotros'),
  ('imp-l3250', 'impresoras', 'Epson', 'EcoTank L3250', 'Multifunción · Wi-Fi · Sistema continuo',
   '["Imprime, copia y escanea","Wi-Fi y app Epson Smart Panel","Tanques de tinta recargables","Incluye kit de tintas inicial"]', 389999, 6, 'Sistema continuo'),
  ('ins-105a', 'insumos', 'HP', 'Tóner 105A compatible', 'Rinde hasta 1.000 páginas',
   '["Compatible con HP Laser 107 y MFP 135/137","Rinde hasta 1.000 páginas al 5%","Garantía de calidad de impresión"]', 24999, 18, null),
  ('ins-t544', 'insumos', 'Epson', 'Kit de tintas T544', 'Originales · 4 colores',
   '["Tintas originales Epson","Cian, magenta, amarillo y negro","Para EcoTank L1110, L3110, L3150, L3250"]', 42999, 12, null),
  ('per-g203', 'perifericos', 'Logitech', 'G203 Lightsync', 'Mouse gamer RGB · 8.000 DPI',
   '["Sensor de hasta 8.000 DPI","Iluminación RGB Lightsync","6 botones programables"]', 32999, 2, 'Últimas unidades'),
  ('per-k552', 'perifericos', 'Redragon', 'Kumara K552', 'Teclado mecánico · RGB',
   '["Switches mecánicos","Formato compacto TKL","Retroiluminación RGB"]', 59999, 7, null),
  ('comp-nv2', 'componentes', 'Kingston', 'SSD NV2 1 TB', 'NVMe PCIe 4.0 · M.2',
   '["Hasta 3.500 MB/s de lectura","Formato M.2 2280","Te lo instalamos y clonamos tu disco"]', 79999, 9, 'Oferta'),
  ('red-c6', 'redes', 'TP-Link', 'Archer C6', 'Router Wi-Fi AC1200 doble banda',
   '["Wi-Fi doble banda 2,4 y 5 GHz","4 antenas externas","Puertos Gigabit"]', 54999, 0, null),
  ('red-hdmi', 'redes', 'Ugreen', 'Cable HDMI 2.1', '8K 60 Hz · 2 metros',
   '["Soporta 8K a 60 Hz y 4K a 120 Hz","Conectores bañados en oro","Largo de 2 metros"]', 12499, 35, null);

-- Órdenes de la demo (códigos fijos para poder probarlas; en producción
-- el código lo genera gen_public_code()).
insert into public.orders (public_code, customer_first_name, customer_last_initial, customer_phone, device, problem, budget_ars, warranty_until, created_at) values
  ('AT-7KQ2-9M', 'Nicolás', 'T', '3424000321', 'Notebook Lenovo IdeaPad 3', 'No carga: el conector DC no hace contacto.', 45000, '2027-01-04', '2026-10-02 10:14-03'),
  ('AT-3FJ8-WX', 'María',   'G', '3424000548', 'Impresora Epson L3250',     'Imprime con rayas en el negro.',             38500, null,         '2026-10-05 11:02-03'),
  ('AT-9TR4-6P', 'Diego',   'R', '3424000777', 'PC de escritorio',          'Se apaga sola al jugar.',                    null,  null,         '2026-10-07 09:30-03');

insert into public.order_events (order_id, status, note_public, created_at)
select o.id, e.status::public.order_status, e.note, e.at::timestamptz
  from (values
    ('AT-7KQ2-9M', 'ingresado',   'Recibimos el equipo con su cargador. Sin golpes visibles.',           '2026-10-02 10:14-03'),
    ('AT-7KQ2-9M', 'diagnostico', 'El conector de carga (DC jack) está dañado y no hace contacto.',      '2026-10-02 16:40-03'),
    ('AT-7KQ2-9M', 'aprobacion',  'Te enviamos el presupuesto por WhatsApp: $45.000.',                   '2026-10-03 09:05-03'),
    ('AT-7KQ2-9M', 'reparacion',  'Presupuesto aprobado. Reemplazamos el conector y revisamos la placa.', '2026-10-03 11:30-03'),
    ('AT-7KQ2-9M', 'listo',       '¡Listo! Lo probamos 24 h con carga y batería. Podés retirarlo.',      '2026-10-06 18:10-03'),
    ('AT-3FJ8-WX', 'ingresado',   'Ingresó la impresora sin cables.',                                    '2026-10-05 11:02-03'),
    ('AT-3FJ8-WX', 'diagnostico', 'Cabezal obstruido en el color negro. Recomendamos reemplazarlo.',     '2026-10-06 10:20-03'),
    ('AT-3FJ8-WX', 'aprobacion',  'Presupuesto enviado: $38.500. Esperamos tu confirmación.',            '2026-10-06 12:45-03'),
    ('AT-9TR4-6P', 'ingresado',   'Ingresó la PC. El cliente indica que se apaga sola al jugar.',        '2026-10-07 09:30-03'),
    ('AT-9TR4-6P', 'diagnostico', 'Estamos haciendo pruebas de temperatura y de la fuente.',             '2026-10-07 10:05-03')
  ) as e(code, status, note, at)
  join public.orders o on o.public_code = e.code
 order by e.at;
