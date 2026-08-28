import { useMemo, useState } from 'react'
import { Field, inputClass } from '../components/ui'
import { useStore } from '../lib/store'
import { resumoAnual, resumoTrimestre } from '../lib/stats'
import { moneyBR } from '../lib/utils'

export function ResumosPage() {
  const { state, escolasVisiveis } = useStore()
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const ids = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])
  const rels = state.relatorios.filter((r) => ids.has(r.escolaId))

  const anual = resumoAnual(rels, ano)
  const tris = [1, 2, 3, 4].map((tri) => ({ tri, ...resumoTrimestre(rels, ano, tri) }))

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Resumos trimestrais e anuais</h1>
          <p className="text-sm text-muted">Consolidado de presença, visitantes, bíblias e ofertas</p>
        </div>
        <Field label="Ano">
          <select className={inputClass + ' w-28'} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {[anoAtual, anoAtual - 1].map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Aulas', String(anual.aulas)],
          ['Taxa anual', `${anual.taxa}%`],
          ['Visitantes', String(anual.visitantes)],
          ['Ofertas', moneyBR(anual.oferta)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs uppercase text-muted">{l}</div>
            <div className="mt-1 text-xl font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tris.map((t) => (
          <section key={t.tri} className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">{t.tri}º trimestre / {ano}</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted">Aulas</dt><dd>{t.aulas}</dd>
              <dt className="text-muted">Presentes</dt><dd>{t.presentes}</dd>
              <dt className="text-muted">Taxa</dt><dd>{t.taxa}%</dd>
              <dt className="text-muted">Visitantes</dt><dd>{t.visitantes}</dd>
              <dt className="text-muted">Bíblias</dt><dd>{t.biblias}</dd>
              <dt className="text-muted">Ofertas</dt><dd>{moneyBR(t.oferta)}</dd>
            </dl>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-navy" style={{ width: `${t.taxa}%` }} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
