import { ArrowDownUp, CalendarDays, Check, ChevronLeft, ChevronRight, DollarSign, Download, Percent, RefreshCw, Users, UserCheck } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { exportToExcel } from '../lib/excel'
import { useStore } from '../lib/store'
import { formatDateBR, lastSunday, matches, moneyBR, pct, shiftDate, toISODate } from '../lib/utils'
import { GhostButton, PrimaryButton, inputClass } from '../components/ui'

type SortKey = 'igreja' | 'regional' | 'matriculados' | 'presentes' | 'ausentes' | 'visitantes' | 'biblias' | 'revistas' | 'apr' | 'oferta' | 'finalizado'

export function RelatorioPage() {
  const { state, escolasVisiveis } = useStore()
  const navigate = useNavigate()
  const [data, setData] = useState(toISODate(lastSunday()))
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState('Todos')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'igreja', dir: 'asc' })
  const [tick, setTick] = useState(0)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const datasComRelatorio = useMemo(() => {
    const ids = new Set(escolasVisiveis.map((e) => e.id))
    return [...new Set(state.relatorios.filter((r) => ids.has(r.escolaId)).map((r) => r.data))].sort().reverse()
  }, [state.relatorios, escolasVisiveis])

  function abrirCalendario() {
    const el = dateInputRef.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      /* o clique nativo no input type=date já abre o calendário */
    }
  }

  const linhas = useMemo(() => {
    void tick
    return escolasVisiveis
      .map((escola) => {
        const r = state.relatorios.find((x) => x.escolaId === escola.id && x.data === data)
        const matriculados = r?.matriculados ?? 0
        const presentes = r?.presentes ?? 0
        return {
          id: r?.id ?? `vazio-${escola.id}`,
          escolaId: escola.id,
          data,
          matriculados,
          presentes,
          ausentes: r?.ausentes ?? 0,
          visitantes: r?.visitantes ?? 0,
          biblias: r?.biblias ?? 0,
          revistas: r?.revistas ?? 0,
          oferta: r?.oferta ?? 0,
          finalizado: r?.finalizado ?? false,
          alunos: r?.alunos ?? [],
          igreja: escola.nome,
          regional: escola.regional ?? '—',
          apr: pct(presentes, matriculados),
        }
      })
      .filter((r) => matches(`${r.igreja} ${r.regional}`, busca))
  }, [state.relatorios, escolasVisiveis, data, busca, tick])

  const ordenadas = useMemo(() => {
    const copy = [...linhas]
    copy.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const cmp = String(av).localeCompare(String(bv), 'pt-BR', { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return limite === 'Todos' ? copy : copy.slice(0, Number(limite))
  }, [linhas, sort, limite])

  const totais = useMemo(() => {
    return linhas.reduce(
      (acc, r) => {
        acc.mat += r.matriculados
        acc.pre += r.presentes
        acc.vis += r.visitantes
        acc.oferta += r.oferta
        return acc
      },
      { mat: 0, pre: 0, vis: 0, oferta: 0 },
    )
  }, [linhas])

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  function exportar() {
    exportToExcel(`relatorio-ebd-${data}`, ordenadas.map((r) => ({
      Regional: r.regional,
      Igreja: r.igreja,
      Matriculados: r.matriculados,
      Presentes: r.presentes,
      Ausentes: r.ausentes,
      Visitantes: r.visitantes,
      Total: r.presentes + r.visitantes,
      Biblias: r.biblias,
      Revistas: r.revistas,
      Aproveitamento: `${r.apr}%`,
      Balanco: r.oferta,
      Financeiro: r.finalizado ? 'Finalizado' : 'Pendente',
    })))
  }

  const kpis = [
    {
      label: 'Presentes',
      value: `${totais.pre}/${totais.mat}`,
      icon: UserCheck,
      accent: 'border-sky-400',
      iconBg: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Visitantes',
      value: String(totais.vis),
      icon: Users,
      accent: 'border-teal',
      iconBg: 'bg-teal-50 text-teal',
    },
    {
      label: 'Taxa de Presença',
      value: `${pct(totais.pre, totais.mat)}%`,
      icon: Percent,
      accent: 'border-navy',
      iconBg: 'bg-slate-100 text-navy',
      bar: pct(totais.pre, totais.mat),
    },
    {
      label: 'Balanço do Dia',
      value: moneyBR(totais.oferta),
      icon: DollarSign,
      accent: 'border-gold',
      iconBg: 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink">Relatório</h1>
        <div className="inline-flex items-center rounded-xl bg-gold text-navy shadow-md">
          <button
            type="button"
            className="px-2 py-2 hover:bg-navy/10"
            aria-label="Dia anterior"
            onClick={() => setData(shiftDate(data, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="relative min-w-[168px]">
            <div className="pointer-events-none flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium">
              <CalendarDays size={16} />
              {formatDateBR(data)}
            </div>
            <input
              ref={dateInputRef}
              type="date"
              value={data}
              onChange={(e) => {
                if (e.target.value) setData(e.target.value)
              }}
              onClick={abrirCalendario}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Data do relatório"
            />
          </div>
          <button
            type="button"
            className="px-2 py-2 hover:bg-navy/10"
            aria-label="Próximo dia"
            onClick={() => setData(shiftDate(data, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {datasComRelatorio.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setData(d)}
              className={`rounded-full px-2.5 py-1 ${
                d === data ? 'bg-navy text-white' : 'bg-white text-ink hover:bg-slate-100'
              }`}
            >
              {formatDateBR(d)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-xl border-l-4 ${k.accent} bg-white p-4 shadow-sm`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted">{k.label}</div>
                <div className="mt-2 text-2xl font-semibold text-ink">{k.value}</div>
              </div>
              <div className={`rounded-lg p-2 ${k.iconBg}`}>
                <k.icon size={20} />
              </div>
            </div>
            {k.bar != null ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-navy" style={{ width: `${k.bar}%` }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Escolas</h2>
          <div className="flex items-center gap-2">
            <PrimaryButton onClick={exportar}>
              <Download size={16} /> Excel
            </PrimaryButton>
            <GhostButton onClick={() => setTick((n) => n + 1)} aria-label="Atualizar">
              <RefreshCw size={16} />
            </GhostButton>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 text-muted">
            Visualizando
            <select className={inputClass + ' w-auto'} value={limite} onChange={(e) => setLimite(e.target.value)}>
              <option>Todos</option>
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            registros
          </label>
          <label className="flex items-center gap-2">
            Pesquisar:
            <input className={inputClass + ' w-44'} value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
        </div>
        <div className="table-wrap">
          <table className="data w-full min-w-[980px] text-left">
            <thead>
              <tr>
                {(
                  [
                    ['regional', 'Regional'],
                    ['igreja', 'Igreja'],
                    ['matriculados', 'Mat.'],
                    ['presentes', 'Pre.'],
                    ['ausentes', 'Aus.'],
                    ['visitantes', 'Vis.'],
                    ['tot', 'Tot.'],
                    ['biblias', 'Bíb.'],
                    ['revistas', 'Rev.'],
                    ['apr', 'Apr.'],
                    ['oferta', 'Bal.'],
                    ['finalizado', 'Fin.'],
                  ] as Array<[SortKey | 'tot', string]>
                ).map(([key, label]) => (
                  <th key={label} className="px-3 py-3">
                    <button type="button" className="inline-flex items-center gap-1" onClick={() => key !== 'tot' && toggleSort(key)}>
                      {label} <ArrowDownUp size={12} className="text-muted" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenadas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-sm text-muted">
                    Nenhum relatório em {formatDateBR(data)}. Use as setas ou o calendário para outro dia.
                  </td>
                </tr>
              ) : (
                ordenadas.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/relatorio/${r.escolaId}?data=${data}`)}
                >
                  <td className="px-3 py-3">{r.regional === 'Regional 35' ? '—' : r.regional}</td>
                  <td className="px-3 py-3 font-medium">
                    <Link
                      to={`/relatorio/${r.escolaId}?data=${data}`}
                      className="text-navy hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.igreja}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{r.matriculados}</td>
                  <td className="px-3 py-3">{r.presentes}</td>
                  <td className="px-3 py-3">{r.ausentes}</td>
                  <td className="px-3 py-3">{r.visitantes}</td>
                  <td className="px-3 py-3">{r.presentes + r.visitantes}</td>
                  <td className="px-3 py-3">{r.biblias}</td>
                  <td className="px-3 py-3">{r.revistas}</td>
                  <td className="px-3 py-3">{r.apr}%</td>
                  <td className="px-3 py-3">{moneyBR(r.oferta)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                        r.finalizado ? 'bg-emerald-500' : 'bg-amber-400'
                      } text-white`}
                      title={r.finalizado ? 'Finalizado' : 'Pendente'}
                    >
                      <Check size={14} />
                    </span>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
