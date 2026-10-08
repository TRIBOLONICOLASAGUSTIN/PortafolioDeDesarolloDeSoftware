// Datos del negocio. DE EJEMPLO hasta que el dueño pase los reales (CLAUDE.md).
export const CONFIG = {
  whatsapp: '5493420000000',
  phone: '+5493420000000',
  email: 'hola@atcomputacion.com',
  address: 'Av. Ejemplo 1234, Santa Fe',
  // Zona horaria del local: el estado "abierto/cerrado" se calcula siempre en hora de Santa Fe.
  timeZone: 'America/Argentina/Cordoba',
  // Horarios por día de la semana (0 = domingo), en horas [desde, hasta).
  hours: { 0: [], 1: [[9, 13], [16, 20]], 2: [[9, 13], [16, 20]], 3: [[9, 13], [16, 20]], 4: [[9, 13], [16, 20]], 5: [[9, 13], [16, 20]], 6: [[9, 13]] } as Record<number, [number, number][]>,
  hoursRows: [
    ['Lunes a viernes', '9 a 13 · 16 a 20 h', [1, 2, 3, 4, 5]],
    ['Sábados', '9 a 13 h', [6]],
    ['Domingos y feriados', 'Cerrado', [0]],
  ] as [string, string, number[]][],
};
