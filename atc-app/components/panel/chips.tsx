'use client';

// Grupo de opciones con radios nativos (flechas del teclado y estado "elegido" sin ARIA extra).
// variant "chip": píldoras sueltas (período). "seg": control segmentado (métrica).
export function Chips<T extends string>({ name, legend, value, options, onChange, variant = 'chip' }: {
  name: string; legend: string; value: T; options: [T, string][]; onChange: (v: T) => void; variant?: 'chip' | 'seg';
}) {
  return (
    <fieldset className={`pn-${variant}s`}>
      <legend className="sr">{legend}</legend>
      {options.map(([id, t]) => (
        <label key={id} className={`pn-${variant}`}>
          <input type="radio" className="sr" name={name} value={id} checked={value === id} onChange={() => onChange(id)} />
          <span>{t}</span>
        </label>
      ))}
    </fieldset>
  );
}
