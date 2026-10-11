// Bloquea el scroll de la página mientras hay una ventana o un menú abierto (html.lock), sin que el contenido salte
// de costado: con barra de scroll visible (Windows), su ancho pasa a padding (--sb, en 02-base.css).
export function bloquearScroll(on: boolean) {
  const html = document.documentElement;
  if (on && !html.classList.contains('lock')) html.style.setProperty('--sb', `${innerWidth - html.clientWidth}px`);
  if (!on) html.style.removeProperty('--sb');
  html.classList.toggle('lock', on);
}
