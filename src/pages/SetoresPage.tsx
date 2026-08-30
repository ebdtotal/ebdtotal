import {
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Confirmacao, Field, GhostButton, Modal, PrimaryButton, inputClass } from '../components/ui'
import { exportToExcel } from '../lib/excel'
import { useStore } from '../lib/store'
import { nomeEscola } from '../lib/stats'
import type { SetorEbd, TurmaCadastro } from '../lib/types'
import { formatDateBR, lastSunday, matches, moneyBR, pct, shiftDate, toISODate, uid } from '../lib/utils'

type SortKey = 'nome' | 'matriculados' | 'presentes' | 'ausentes' | 'visitantes' | 'biblias' | 'revistas' | 'apr' | 'balanco'

export function SetoresPage() {
  const { state, escolasVisiveis, saveSetorEbd, removeSetorEbd, saveTurma } = useStore()
  const setores = state.setoresEbd ?? []
  const ids = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])
  const turmas = useMemo(() => (state.turmas ?? []).filter((t) => ids.has(t.escolaId)), [state.turmas, ids])

  const [editing, setEditing] = useState<SetorEbd | null>(null)
  const [excluir, setExcluir] = useState<SetorEbd | null>(null)
  const [vincular, setVincular] = useState<SetorEbd | null>(null)
  const [data, setData] = useState(toISODate(lastSunday()))
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState('Todos')
  const [setorFiltro, setSetorFiltro] = useState('')
  const [pagina, setPagina] = useState(1)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'nome', dir: 'asc' })
  const [tick, setTick] = useState(0)
  const dateInputRef = useRef<HTMLInputElement>(null)

  function abrirCalendario() {
    const el = dateInputRef.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      /* nativo */
    }
  }

  function nomeSetor(id?: string) {
    return setores.find((s) => s.id === id)?.nome ?? 'Sem setor'
  }

  const linhas = useMemo(() => {
    void tick
    return turmas
      .filter((t) => !setorFiltro || t.setorId === setorFiltro)
      .map((turma) => {
        const r = state.relatorios.find((x) => x.escolaId === turma.escolaId && x.data === data)
        const alunosTurma = (r?.alunos ?? []).filter((a) => {
          const p = state.pessoas.find((x) => x.id === a.pessoaId)
          return p && p.tipo === 'Aluno' && p.turma === turma.nome && p.escolaId === turma.escolaId
        })
        const matriculados =
          state.pessoas.filter(
            (p) => p.escolaId === turma.escolaId && p.turma === turma.nome && p.tipo === 'Aluno' && p.status === 'Ativo',
          ).length || (r ? alunosTurma.length : 0)
        const presentes = alunosTurma.filter((a) => a.presente).length
        const biblias = alunosTurma.filter((a) => a.biblia).length
        const revistas = alunosTurma.filter((a) => a.revista).length
        const visitantes = 0
        const lancs = state.lancamentos.filter(
          (l) => l.escolaId === turma.escolaId && l.data === data && l.turma === turma.nome,
        )
        const rec = lancs.filter((l) => l.tipo !== 'despesa').reduce((a, l) => a + l.valor, 0)
        const desp = lancs.filter((l) => l.tipo === 'despesa').reduce((a, l) => a + l.valor, 0)
        return {
          turma,
          nome: turma.nome,
          escola: nomeEscola(state.escolas, turma.escolaId),
          setor: nomeSetor(turma.setorId),
          matriculados,
          presentes,
          ausentes: Math.max(0, matriculados - presentes),
          visitantes,
          biblias,
          revistas,
          apr: pct(presentes, matriculados),
          balanco: rec - desp,
          financeiro: rec,
          finalizado: r?.finalizado ?? false,
        }
      })
      .filter((r) => matches(`${r.nome} ${r.escola} ${r.setor}`, busca))
  }, [turmas, state.relatorios, state.pessoas, state.lancamentos, state.escolas, data, busca, tick, setorFiltro, setores])

  const ordenadas = useMemo(() => {
    const copy = [...linhas]
    copy.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const cmp = String(av).localeCompare(String(bv), 'pt-BR', { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [linhas, sort])

  const porPagina = limite === 'Todos' ? ordenadas.length || 1 : Number(limite)
  const totalPag = Math.max(1, Math.ceil(ordenadas.length / porPagina) || 1)
  const pagAtual = Math.min(pagina, totalPag)
  const slice = limite === 'Todos' ? ordenadas : ordenadas.slice((pagAtual - 1) * porPagina, pagAtual * porPagina)
  const de = ordenadas.length === 0 ? 0 : limite === 'Todos' ? 1 : (pagAtual - 1) * porPagina + 1
  const ate = limite === 'Todos' ? ordenadas.length : Math.min(pagAtual * porPagina, ordenadas.length)

  const totais = useMemo(() => {
    const escolasContadas = new Set<string>()
    let vis = 0
    for (const r of linhas) {
      if (escolasContadas.has(r.turma.escolaId)) continue
      escolasContadas.add(r.turma.escolaId)
      vis += state.relatorios.find((x) => x.escolaId === r.turma.escolaId && x.data === data)?.visitantes ?? 0
    }
    return linhas.reduce(
      (acc, r) => {
        acc.mat += r.matriculados
        acc.pre += r.presentes
        acc.bal += r.balanco
        return acc
      },
      { mat: 0, pre: 0, vis, bal: 0 },
    )
  }, [linhas, state.relatorios, data])

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  function exportar() {
    exportToExcel(
      `setores-${data}`,
      slice.map((r) => ({
        Nome: r.nome,
        Setor: r.setor,
        Escola: r.escola,
        Matriculados: r.matriculados,
        Presentes: r.presentes,
        Ausentes: r.ausentes,
        Visitantes: r.visitantes,
        Total: r.presentes + r.visitantes,
        Biblias: r.biblias,
        Revistas: r.revistas,
        Aproveitamento: `${r.apr}%`,
        Balanco: r.balanco,
        Financeiro: r.finalizado ? 'Finalizado' : 'Pendente',
      })),
    )
  }

  function atribuir(turma: TurmaCadastro, setorId: string | undefined) {
    saveTurma({ ...turma, setorId })
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
      value: moneyBR(totais.bal),
      icon: DollarSign,
      accent: 'border-gold',
      iconBg: 'bg-amber-50 text-amber-600',
    },
  ]

  const livres = turmas.filter((t) => !vincular || t.setorId !== vincular.id)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Setores</h1>
          <p className="text-sm text-muted">Cada classe pertence a um único setor. Ao vincular em um, sai do anterior.</p>
        </div>
        <PrimaryButton onClick={() => setEditing({ id: uid('sebd'), nome: '' })}>
          <Plus size={16} /> Novo setor
        </PrimaryButton>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {setores.map((s) => {
          const classes = turmas.filter((t) => t.setorId === s.id)
          return (
            <section key={s.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-semibold">{s.nome}</h2>
                <span>
                  <button type="button" className="mr-2 text-muted hover:text-navy" onClick={() => setEditing(s)}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="text-muted hover:text-red-600" onClick={() => setExcluir(s)}>
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
              {classes.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma classe neste setor.</p>
              ) : (
                <ul className="mb-2 space-y-1 text-sm">
                  {classes.map((t) => (
                    <li key={t.id} className="flex items-center justify-between">
                      <span>
                        {t.nome}
                        <span className="text-muted"> · {nomeEscola(state.escolas, t.escolaId)}</span>
                      </span>
                      <button type="button" className="text-xs text-muted hover:text-red-600" onClick={() => atribuir(t, undefined)}>
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <GhostButton onClick={() => setVincular(s)}>Vincular classe</GhostButton>
            </section>
          )
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Relatório</h2>
        <div className="inline-flex items-center rounded-xl bg-gold text-navy shadow-md">
          <button type="button" className="px-2 py-2 hover:bg-navy/10" aria-label="Dia anterior" onClick={() => setData(shiftDate(data, -1))}>
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
          <button type="button" className="px-2 py-2 hover:bg-navy/10" aria-label="Próximo dia" onClick={() => setData(shiftDate(data, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
        <select className={inputClass + ' w-auto'} value={setorFiltro} onChange={(e) => { setSetorFiltro(e.target.value); setPagina(1) }}>
          <option value="">Todos os setores</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
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
          <h2 className="text-lg font-semibold">Setores</h2>
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
            <select
              className={inputClass + ' w-auto'}
              value={limite}
              onChange={(e) => {
                setLimite(e.target.value)
                setPagina(1)
              }}
            >
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
                    ['nome', 'Nome'],
                    ['matriculados', 'Mat.'],
                    ['presentes', 'Pre.'],
                    ['ausentes', 'Aus.'],
                    ['visitantes', 'Vis.'],
                    ['tot', 'Tot.'],
                    ['biblias', 'Bíb.'],
                    ['revistas', 'Rev.'],
                    ['apr', 'Apr.'],
                    ['balanco', 'Bal.'],
                    ['fin', 'Fin.'],
                  ] as Array<[SortKey | 'tot' | 'fin', string]>
                ).map(([key, label]) => (
                  <th key={label} className="px-3 py-3">
                    <button type="button" className="inline-flex items-center gap-1" onClick={() => key !== 'tot' && key !== 'fin' && toggleSort(key)}>
                      {label} <ArrowDownUp size={12} className="text-muted" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-sm text-muted">
                    Não há nenhum registro
                  </td>
                </tr>
              ) : (
                slice.map((r) => (
                  <tr key={r.turma.id}>
                    <td className="px-3 py-3 font-medium">
                      {r.nome}
                      <div className="text-xs text-muted">
                        {r.setor} · {r.escola}
                      </div>
                    </td>
                    <td className="px-3 py-3">{r.matriculados}</td>
                    <td className="px-3 py-3">{r.presentes}</td>
                    <td className="px-3 py-3">{r.ausentes}</td>
                    <td className="px-3 py-3">{r.visitantes}</td>
                    <td className="px-3 py-3">{r.presentes + r.visitantes}</td>
                    <td className="px-3 py-3">{r.biblias}</td>
                    <td className="px-3 py-3">{r.revistas}</td>
                    <td className="px-3 py-3">{r.apr}%</td>
                    <td className="px-3 py-3">{moneyBR(r.balanco)}</td>
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span>
            Vendo de {de} até {ate} (Total {ordenadas.length} registros)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-line px-3 py-1 disabled:opacity-40"
              disabled={pagAtual <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span className="rounded-lg bg-navy px-3 py-1 text-white">{pagAtual}</span>
            <button
              type="button"
              className="rounded-lg border border-line px-3 py-1 disabled:opacity-40"
              disabled={pagAtual >= totalPag}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próximo
            </button>
          </div>
        </div>
      </section>

      <Modal open={!!editing} title="Setor" onClose={() => setEditing(null)}>
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              saveSetorEbd(editing)
              setEditing(null)
            }}
          >
            <Field label="Nome">
              <input className={inputClass} required value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <GhostButton type="button" onClick={() => setEditing(null)}>
                Cancelar
              </GhostButton>
              <PrimaryButton type="submit">Salvar</PrimaryButton>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal open={!!vincular} title={`Vincular classe a ${vincular?.nome ?? ''}`} onClose={() => setVincular(null)}>
        {vincular ? (
          <div className="space-y-2">
            {livres.length === 0 ? (
              <p className="text-sm text-muted">Todas as classes já estão neste setor.</p>
            ) : (
              livres.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    atribuir(t, vincular.id)
                    setVincular(null)
                  }}
                >
                  <span>
                    {t.nome}
                    <span className="text-muted"> · {nomeEscola(state.escolas, t.escolaId)}</span>
                  </span>
                  <span className="text-xs text-muted">{t.setorId ? nomeSetor(t.setorId) : 'Sem setor'}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </Modal>

      <Confirmacao
        open={!!excluir}
        titulo="Excluir setor"
        texto={`Excluir o setor “${excluir?.nome ?? ''}”? As classes ficam sem setor.`}
        onCancel={() => setExcluir(null)}
        onConfirm={() => {
          if (excluir) removeSetorEbd(excluir.id)
          setExcluir(null)
        }}
      />
    </div>
  )
}
