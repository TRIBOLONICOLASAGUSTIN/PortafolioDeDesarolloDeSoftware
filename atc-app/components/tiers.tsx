import { GoCat } from './go-cat';
import { Icon, Render, Wa } from './ui';
import { TIERS } from '@/lib/data/catalog';
import { fmt, vars } from '@/lib/format';

export function Tiers() {
  return (
    <section className="sec" id="notebooks">
      <div className="wrap">
        <div className="head center rv">
          <h2 className="h2">¿Qué notebook es para vos?</h2>
          <p className="lede">Te recomendamos según lo que vas a hacer, no según lo más caro. Estos son los tres perfiles que más armamos.</p>
        </div>
        <div className="tiers" id="tiers">
          {TIERS.map((t, i) => (
            <div key={t.t} className="tier rv" style={vars({ '--d': `${(i * .08).toFixed(2)}s` })}>
              <Render r="laptop" wall={t.wall} />
              <h3>{t.t}</h3><p className="tg">{t.tl}</p>
              <p className="from">Desde {fmt(t.from)}</p>
              <div className="acts">
                <GoCat className="btn btn-sm" cat="notebooks">Ver notebooks</GoCat>
                <Wa className="lnk" style={{ fontSize: 15 }} text={`¡Hola! Busco una notebook ${t.q}. ¿Qué me recomendás?`}>Consultar</Wa>
              </div>
              <dl>{t.rows.map(([ic, txt]) => <div key={txt}><dt><Icon n={ic} /><span className="sr">Característica</span></dt><dd>{txt}</dd></div>)}</dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
