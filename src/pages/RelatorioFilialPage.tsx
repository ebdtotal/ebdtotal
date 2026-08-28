import { DollarSign, Percent, UserCheck, Users } from 'lucide-react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { BarPercentChart, DonutChart } from '../components/Charts'
import { licaoDaData } from '../lib/acompanhamento'
import { relatorioFilial } from '../lib/stats'
import { useStore } from '../lib/store'
import { lastSunday, moneyBR, toISODate } from '../lib/utils'

export function RelatorioFilialPage() {
  const { escolaId = '' } = useParams()
  const [params] = useSearchParams()
  const { state, escolasVisiveis } = useStore()
  const data = params.get('data') || toISODate(lastSunday())
  const visivel = escolasVisiveis.some((e) => e.id === escolaId)
  const d = relatorioFilial(state, escolaId, data)
  const licao = licaoDaData(state.licoes, state.eventos, data)

  if (!visivel || !d.escola) return <Navigate to="/relatorio" replace />

  const titulo = licao ? `${d.escola.nome} - Lição ${licao.numero}` : d.escola.nome
  const kpis = [
    {
      label: 'Presentes',
      value: `${d.presentes}/${d.matriculados}`,
      icon: UserCheck,
      accent: 'border-slate-400',
      iconClass: 'text-slate-400',
    },
    {
      label: 'Visitantes',
      value: String(d.visitantes),
      icon: Users,
      accent: 'border-emerald-500',
      iconClass: 'text-slate-400',
    },
    {
      label: 'Taxa de Presença',
      value: `${d.taxa}%`,
      icon: Percent,
      accent: 'border-teal',
      iconClass: 'text-slate-400',
      bar: d.taxa,
    },
    {
      label: 'Balanço',
      value: moneyBR(d.oferta),
      icon: DollarSign,
      accent: 'border-gold',
      iconClass: 'text-slate-400',
    },
  ]

  return (
    <div>
      <Link to={`/relatorio`} className="text-sm text-navy hover:underline">
        ← Relatório
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">{titulo}</h1>
      {!d.relatorio ? (
        <p className="mt-2 text-sm text-muted">Ainda não há relatório lançado nesta data.</p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-xl border-l-4 ${k.accent} bg-white p-4 shadow-sm`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k.label}</div>
                <div className="mt-2 text-2xl font-semibold text-ink">{k.value}</div>
              </div>
              <k.icon size={22} className={k.iconClass} />
            </div>
            {k.bar != null ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-teal" style={{ width: `${k.bar}%` }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-2 text-lg font-semibold text-ink">Presença por turma</h2>
          <BarPercentChart items={d.turmas.map((t) => ({ label: t.turma, value: t.taxa }))} />
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-ink">Resumo da aula</h2>
          <DonutChart
            slices={[
              { label: 'Presentes', value: d.presentes, color: '#152238' },
              { label: 'Ausentes', value: d.ausentes, color: '#7ec8d4' },
              { label: 'Visitantes', value: d.visitantes, color: '#2aa7a0' },
            ]}
          />
        </section>
      </div>
    </div>
  )
}
