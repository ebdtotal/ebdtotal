import { useMemo, useState } from 'react'
import { Field, PrimaryButton, inputClass } from '../components/ui'
import {
  crescimentoPercentual,
  frequenciaAtual,
  metaDaEscola,
  progressoMeta,
  professoresCapacitadosPct,
  visitantesNoMes,
} from '../lib/painel'
import { useStore } from '../lib/store'

export function MetasPage() {
  const { state, escolasVisiveis, saveMeta } = useStore()
  const [escolaId, setEscolaId] = useState(escolasVisiveis[0]?.id ?? '')
  const meta = metaDaEscola(state, escolaId)
  const [form, setForm] = useState(meta)
  if (form.escolaId !== meta.escolaId) setForm(meta)

  const atual = useMemo(() => {
    if (!escolaId) return null
    return {
      frequencia: frequenciaAtual(state, escolaId),
      crescimento: crescimentoPercentual(state, escolaId),
      visitantes: visitantesNoMes(state, escolaId),
      professores: professoresCapacitadosPct(state, escolaId),
    }
  }, [state, escolaId])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Metas da congregação</h1>
      <p className="mb-5 text-sm text-muted">Números viram gestão: frequência, crescimento, visitantes e capacitação</p>

      <div className="mb-5 max-w-md">
        <Field label="Congregação">
          <select className={inputClass} value={escolaId} onChange={(e) => setEscolaId(e.target.value)}>
            {escolasVisiveis.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {atual ? (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Barra
            titulo="Frequência"
            atual={`${atual.frequencia}%`}
            meta={`${meta.frequencia}%`}
            progresso={progressoMeta(atual.frequencia, meta.frequencia)}
          />
          <Barra
            titulo="Crescimento"
            atual={`${atual.crescimento > 0 ? '+' : ''}${atual.crescimento}%`}
            meta={`+${meta.crescimento}%`}
            progresso={progressoMeta(Math.max(0, atual.crescimento), meta.crescimento)}
          />
          <Barra
            titulo="Visitantes no mês"
            atual={String(atual.visitantes)}
            meta={`${meta.visitantesMes}/mês`}
            progresso={progressoMeta(atual.visitantes, meta.visitantesMes)}
          />
          <Barra
            titulo="Professores capacitados"
            atual={`${atual.professores}%`}
            meta={`${meta.professoresCapacitados}%`}
            progresso={progressoMeta(atual.professores, meta.professoresCapacitados)}
          />
        </div>
      ) : null}

      <section className="max-w-xl rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Definir metas</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Meta de frequência (%)">
            <input
              className={inputClass}
              type="number"
              min={0}
              max={100}
              value={form.frequencia}
              onChange={(e) => setForm({ ...form, frequencia: Number(e.target.value) })}
            />
          </Field>
          <Field label="Meta de crescimento (%)">
            <input
              className={inputClass}
              type="number"
              value={form.crescimento}
              onChange={(e) => setForm({ ...form, crescimento: Number(e.target.value) })}
            />
          </Field>
          <Field label="Visitantes / mês">
            <input
              className={inputClass}
              type="number"
              min={0}
              value={form.visitantesMes}
              onChange={(e) => setForm({ ...form, visitantesMes: Number(e.target.value) })}
            />
          </Field>
          <Field label="Professores capacitados (%)">
            <input
              className={inputClass}
              type="number"
              min={0}
              max={100}
              value={form.professoresCapacitados}
              onChange={(e) => setForm({ ...form, professoresCapacitados: Number(e.target.value) })}
            />
          </Field>
        </div>
        <PrimaryButton className="mt-4" onClick={() => saveMeta({ ...form, escolaId })}>
          Salvar metas
        </PrimaryButton>
      </section>
    </div>
  )
}

function Barra({
  titulo,
  atual,
  meta,
  progresso,
}: {
  titulo: string
  atual: string
  meta: string
  progresso: number
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <div className="mt-2 flex justify-between text-sm">
        <span>
          Atual: <b>{atual}</b>
        </span>
        <span className="text-muted">
          Meta: {meta}
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-page">
        <div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(100, progresso)}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted">Progresso: {progresso}%</div>
    </div>
  )
}
