import { Download, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Field, GhostButton, Modal, PrimaryButton, DateInput, Confirmacao, inputClass } from '../components/ui'
import { TelaImpressao } from '../components/TelaImpressao'
import { exportToExcel } from '../lib/excel'
import { Barras, Pizza, barrasHtml, pizzaHtml, corGrafico, type FatiaGrafico } from '../lib/graficos'
import { htmlDocumentoPdf, tabelaHtml, tentarImprimirHtml } from '../lib/imprimir'
import { trimestreDe as trimestreNumero } from '../lib/pedagogia'
import { useStore } from '../lib/store'
import { nomeEscola } from '../lib/stats'
import {
  NATUREZAS_FINANCEIRAS,
  type CategoriaFinanceira,
  type LancamentoFinanceiro,
  type NaturezaFinanceira,
  type Pessoa,
  type RevistaControle,
  type TipoLancamento,
} from '../lib/types'
import { formatDateBR, moneyBR, toISODate, uid } from '../lib/utils'

function ehReceita(tipo: TipoLancamento) {
  return tipo !== 'despesa'
}

function rotuloTipo(tipo: TipoLancamento) {
  return ehReceita(tipo) ? 'Receita' : 'Despesa'
}

function tipoDaNatureza(natureza: NaturezaFinanceira, atual: TipoLancamento): TipoLancamento {
  if (natureza === 'despesa') return 'despesa'
  return atual === 'despesa' ? 'outro' : atual
}

function opcoesCategoria(categorias: CategoriaFinanceira[], tipo: TipoLancamento, atual?: string) {
  const natureza = ehReceita(tipo) ? 'receita' : 'despesa'
  const lista = categorias.filter((c) => c.natureza === natureza)
  const extra = atual ? categorias.find((c) => c.id === atual) : undefined
  if (extra && !lista.some((c) => c.id === extra.id)) return [extra, ...lista]
  return lista
}

type AbaFin = 'lancamentos' | 'categorias' | 'relatorios' | 'revistas'

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

export function FinanceiroPage() {
  const [aba, setAba] = useState<AbaFin>('lancamentos')
  const abas: { id: AbaFin; label: string }[] = [
    { id: 'lancamentos', label: 'Lançamentos' },
    { id: 'categorias', label: 'Categorias' },
    { id: 'relatorios', label: 'Relatórios' },
    { id: 'revistas', label: 'Revistas' },
  ]

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-ink">Financeiro</h1>
        <p className="text-sm text-muted">Lançamentos, categorias, relatórios e revistas da EBD</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${aba === a.id ? 'bg-navy text-white' : 'bg-white text-ink shadow-sm'}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {aba === 'lancamentos' ? <AbaLancamentos /> : null}
      {aba === 'categorias' ? <AbaCategorias /> : null}
      {aba === 'relatorios' ? <AbaRelatorios /> : null}
      {aba === 'revistas' ? <AbaRevistas /> : null}
    </div>
  )
}

function AbaLancamentos() {
  const { state, escolasVisiveis, saveLancamento, removeLancamento, usuario } = useStore()
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [tipo, setTipo] = useState('')
  const [editing, setEditing] = useState<LancamentoFinanceiro | null>(null)
  const [excluirLanc, setExcluirLanc] = useState<LancamentoFinanceiro | null>(null)
  const ids = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])
  const categorias = state.categoriasFinanceiras ?? []

  const lista = state.lancamentos
    .filter((l) => {
      if (!ids.has(l.escolaId) || !l.data.startsWith(String(ano))) return false
      if (tipo === 'receita') return ehReceita(l.tipo)
      if (tipo === 'despesa') return !ehReceita(l.tipo)
      return true
    })
    .sort((a, b) => b.data.localeCompare(a.data))

  const receitas = lista.filter((l) => ehReceita(l.tipo)).reduce((a, l) => a + l.valor, 0)
  const despesas = lista.filter((l) => !ehReceita(l.tipo)).reduce((a, l) => a + l.valor, 0)
  const turmasDaEscola = (state.turmas ?? []).filter((t) => t.escolaId === editing?.escolaId)

  function nomeCat(id?: string) {
    return categorias.find((c) => c.id === id)?.nome ?? '—'
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <PrimaryButton
          onClick={() =>
            setEditing({
              id: uid('fin'),
              escolaId: escolasVisiveis[0]?.id ?? '',
              data: toISODate(new Date()),
              tipo: 'outro',
              descricao: '',
              valor: 0,
            })
          }
        >
          <Plus size={16} /> Lançamento
        </PrimaryButton>
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border-l-4 border-emerald-400 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-muted">Receitas</div>
          <div className="mt-1 text-2xl font-semibold">{moneyBR(receitas)}</div>
        </div>
        <div className="rounded-xl border-l-4 border-red-400 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-muted">Despesas</div>
          <div className="mt-1 text-2xl font-semibold">{moneyBR(despesas)}</div>
        </div>
        <div className="rounded-xl border-l-4 border-gold bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-muted">Saldo</div>
          <div className="mt-1 text-2xl font-semibold">{moneyBR(receitas - despesas)}</div>
        </div>
      </div>
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <select className={inputClass + ' w-28'} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
              {[anoAtual, anoAtual - 1, anoAtual - 2].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <select className={inputClass + ' w-36'} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data w-full min-w-[800px] text-left">
            <thead>
              <tr>
                {['Data', 'Escola', 'Turma', 'Tipo', 'Categoria', 'Descrição', 'Valor', ''].map((h) => (
                  <th key={h || 'a'} className="px-3 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted">
                    Nenhum lançamento neste filtro.
                  </td>
                </tr>
              ) : (
                lista.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-3">{formatDateBR(l.data)}</td>
                    <td className="px-3 py-3">{nomeEscola(state.escolas, l.escolaId)}</td>
                    <td className="px-3 py-3">{l.turma || '—'}</td>
                    <td className="px-3 py-3">{rotuloTipo(l.tipo)}</td>
                    <td className="px-3 py-3">{nomeCat(l.categoriaId)}</td>
                    <td className="px-3 py-3">{l.descricao}</td>
                    <td className={`px-3 py-3 font-medium ${ehReceita(l.tipo) ? 'text-emerald-700' : 'text-red-600'}`}>
                      {ehReceita(l.tipo) ? '+' : '−'}
                      {moneyBR(l.valor)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" className="mr-2 text-muted hover:text-navy" onClick={() => setEditing(l)}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="text-muted hover:text-red-600" onClick={() => setExcluirLanc(l)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <Modal open={!!editing} title="Lançamento financeiro" onClose={() => setEditing(null)}>
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              saveLancamento(editing)
              setEditing(null)
            }}
          >
            <Field label="Data">
              <DateInput value={editing.data} onChange={(data) => setEditing({ ...editing, data })} />
            </Field>
            <Field label="Escola">
              <select
                className={inputClass}
                value={editing.escolaId}
                disabled={usuario?.papel === 'professor'}
                onChange={(e) => setEditing({ ...editing, escolaId: e.target.value, turma: '' })}
              >
                {escolasVisiveis.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Turma (opcional)">
              <select
                className={inputClass}
                value={editing.turma ?? ''}
                onChange={(e) => setEditing({ ...editing, turma: e.target.value || undefined })}
              >
                <option value="">Toda a escola</option>
                {turmasDaEscola.map((t) => (
                  <option key={t.id} value={t.nome}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo">
              <select
                className={inputClass}
                value={ehReceita(editing.tipo) ? 'receita' : 'despesa'}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    tipo: tipoDaNatureza(e.target.value as NaturezaFinanceira, editing.tipo),
                    categoriaId: undefined,
                  })
                }
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </Field>
            <Field label="Categoria">
              <select
                className={inputClass}
                value={editing.categoriaId ?? ''}
                onChange={(e) => setEditing({ ...editing, categoriaId: e.target.value || undefined })}
              >
                <option value="">Sem categoria</option>
                {opcoesCategoria(categorias, editing.tipo, editing.categoriaId).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descrição">
              <input
                className={inputClass}
                required
                value={editing.descricao}
                onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
              />
            </Field>
            <Field label="Valor (R$)">
              <input
                className={inputClass}
                type="number"
                min={0}
                step="0.01"
                value={editing.valor}
                onChange={(e) => setEditing({ ...editing, valor: Number(e.target.value) })}
              />
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
      <Confirmacao
        open={!!excluirLanc}
        titulo="Excluir lançamento"
        texto={`Excluir o lançamento “${excluirLanc?.descricao ?? ''}”?`}
        onCancel={() => setExcluirLanc(null)}
        onConfirm={() => {
          if (excluirLanc) removeLancamento(excluirLanc.id)
          setExcluirLanc(null)
        }}
      />
    </div>
  )
}

function AbaCategorias() {
  const { state, saveCategoriaFinanceira, removeCategoriaFinanceira } = useStore()
  const [editing, setEditing] = useState<CategoriaFinanceira | null>(null)
  const [excluir, setExcluir] = useState<CategoriaFinanceira | null>(null)
  const lista = state.categoriasFinanceiras ?? []
  const receitas = lista.filter((c) => c.natureza === 'receita')
  const despesas = lista.filter((c) => c.natureza === 'despesa')

  function coluna(titulo: string, natureza: NaturezaFinanceira, itens: CategoriaFinanceira[]) {
    return (
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{titulo}</h2>
          <PrimaryButton
            onClick={() => setEditing({ id: uid('cat'), nome: '', natureza })}
          >
            <Plus size={16} /> Nova
          </PrimaryButton>
        </div>
        {itens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhuma categoria ainda.</p>
        ) : (
          <ul className="divide-y divide-line">
            {itens.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>{c.nome}</span>
                <span>
                  <button type="button" className="mr-2 text-muted hover:text-navy" onClick={() => setEditing(c)}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="text-muted hover:text-red-600" onClick={() => setExcluir(c)}>
                    <Trash2 size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {coluna('Receitas', 'receita', receitas)}
      {coluna('Despesas', 'despesa', despesas)}
      <Modal open={!!editing} title="Categoria financeira" onClose={() => setEditing(null)}>
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              saveCategoriaFinanceira(editing)
              setEditing(null)
            }}
          >
            <Field label="Nome">
              <input
                className={inputClass}
                required
                value={editing.nome}
                onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
              />
            </Field>
            <Field label="Natureza">
              <select
                className={inputClass}
                value={editing.natureza}
                onChange={(e) => setEditing({ ...editing, natureza: e.target.value as NaturezaFinanceira })}
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
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
      <Confirmacao
        open={!!excluir}
        titulo="Excluir categoria"
        texto={`Excluir a categoria “${excluir?.nome ?? ''}”?`}
        onCancel={() => setExcluir(null)}
        onConfirm={() => {
          if (excluir) removeCategoriaFinanceira(excluir.id)
          setExcluir(null)
        }}
      />
    </div>
  )
}

function AbaRelatorios() {
  const { state, escolasVisiveis, saveLancamento, removeLancamento } = useStore()
  const hoje = toISODate(new Date())
  const [de, setDe] = useState(`${new Date().getFullYear()}-01-01`)
  const [ate, setAte] = useState(hoje)
  const [naturezas, setNaturezas] = useState<NaturezaFinanceira[]>([])
  const [todasCats, setTodasCats] = useState(true)
  const [cats, setCats] = useState<string[]>([])
  const [todasEscolas, setTodasEscolas] = useState(true)
  const [escolaIds, setEscolaIds] = useState<string[]>([])
  const [todasTurmas, setTodasTurmas] = useState(true)
  const [turmasSel, setTurmasSel] = useState<string[]>([])
  const [editing, setEditing] = useState<LancamentoFinanceiro | null>(null)
  const [excluirLanc, setExcluirLanc] = useState<LancamentoFinanceiro | null>(null)
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)

  const visiveis = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])
  const categorias = state.categoriasFinanceiras ?? []
  const escolasFiltro = todasEscolas || escolaIds.length === 0 ? [...visiveis] : escolaIds.filter((id) => visiveis.has(id))
  const setEscolasFiltro = new Set(escolasFiltro)
  const turmasOpcoes = (state.turmas ?? []).filter((t) => setEscolasFiltro.has(t.escolaId))
  const setTurmasFiltro = todasTurmas || turmasSel.length === 0 ? null : new Set(turmasSel)

  const lista = useMemo(() => {
    return state.lancamentos
      .filter((l) => {
        if (!setEscolasFiltro.has(l.escolaId)) return false
        if (l.data < de || l.data > ate) return false
        if (naturezas.length === 1) {
          if (naturezas[0] === 'receita' && !ehReceita(l.tipo)) return false
          if (naturezas[0] === 'despesa' && ehReceita(l.tipo)) return false
        }
        if (!todasCats && cats.length && (!l.categoriaId || !cats.includes(l.categoriaId))) return false
        if (setTurmasFiltro) {
          if (!l.turma || !setTurmasFiltro.has(`${l.escolaId}|${l.turma}`)) return false
        }
        return true
      })
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [state.lancamentos, de, ate, naturezas, todasCats, cats, setEscolasFiltro, setTurmasFiltro])

  const receitas = lista.filter((l) => ehReceita(l.tipo)).reduce((a, l) => a + l.valor, 0)
  const despesas = lista.filter((l) => !ehReceita(l.tipo)).reduce((a, l) => a + l.valor, 0)

  const porCat: FatiaGrafico[] = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of lista) {
      const nome = categorias.find((c) => c.id === l.categoriaId)?.nome ?? (ehReceita(l.tipo) ? 'Sem categoria (receita)' : 'Sem categoria (despesa)')
      const sinal = ehReceita(l.tipo) ? 1 : 1
      map.set(nome, (map.get(nome) ?? 0) + l.valor * sinal)
    }
    return [...map.entries()].map(([label, valor], i) => ({ label, valor, cor: corGrafico(i) }))
  }, [lista, categorias])

  const porEscola: FatiaGrafico[] = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of lista) {
      const nome = nomeEscola(state.escolas, l.escolaId)
      map.set(nome, (map.get(nome) ?? 0) + (ehReceita(l.tipo) ? l.valor : -l.valor))
    }
    return [...map.entries()].map(([label, valor], i) => ({
      label,
      valor: Math.abs(valor),
      cor: corGrafico(i),
    }))
  }, [lista, state.escolas])

  const resumoBarras: FatiaGrafico[] = [
    { label: 'Receitas', valor: receitas, cor: '#059669' },
    { label: 'Despesas', valor: despesas, cor: '#dc2626' },
    { label: 'Saldo', valor: Math.abs(receitas - despesas), cor: '#c9a227' },
  ]

  function nomeCat(id?: string) {
    return categorias.find((c) => c.id === id)?.nome ?? '—'
  }

  function subtituloFiltro() {
    const esc = todasEscolas || escolaIds.length === 0 ? 'Todas as escolas' : escolasVisiveis.filter((e) => escolaIds.includes(e.id)).map((e) => e.nome).join(', ')
    const tps = naturezas.length === 1 ? (naturezas[0] === 'receita' ? 'Receitas' : 'Despesas') : 'Receitas e despesas'
    const cts = todasCats || cats.length === 0 ? 'Todas as categorias' : cats.map((id) => nomeCat(id)).join(', ')
    const trm = setTurmasFiltro ? turmasSel.map((k) => k.split('|')[1]).join(', ') : 'Todas as classes'
    return `${formatDateBR(de)} a ${formatDateBR(ate)} · ${esc} · ${trm} · ${tps} · ${cts}`
  }

  function exportarExcel() {
    exportToExcel(
      `financeiro-${de}-${ate}`,
      lista.map((l) => ({
        Data: formatDateBR(l.data),
        Escola: nomeEscola(state.escolas, l.escolaId),
        Turma: l.turma || '',
        Tipo: rotuloTipo(l.tipo),
        Categoria: nomeCat(l.categoriaId),
        Descricao: l.descricao,
        Valor: l.valor,
      })),
    )
  }

  function exportarPdf() {
    const kpis = `<div class="kpis">
      <div class="kpi"><span>Receitas</span><strong>${moneyBR(receitas)}</strong></div>
      <div class="kpi"><span>Despesas</span><strong>${moneyBR(despesas)}</strong></div>
      <div class="kpi"><span>Saldo</span><strong>${moneyBR(receitas - despesas)}</strong></div>
    </div>`
    const graficos = `<div class="graficos">
      <div class="graf"><h2>Receitas, despesas e saldo</h2>${barrasHtml(resumoBarras)}</div>
      <div class="graf"><h2>Por categoria</h2>${porCat.length ? pizzaHtml(porCat) : '<p>Sem dados</p>'}</div>
      <div class="graf"><h2>Por escola</h2>${porEscola.length ? barrasHtml(porEscola) : '<p>Sem dados</p>'}</div>
    </div>`
    const tabela = tabelaHtml(
      ['Data', 'Escola', 'Turma', 'Tipo', 'Categoria', 'Descrição', 'Valor'],
      lista.map((l) => [
        formatDateBR(l.data),
        nomeEscola(state.escolas, l.escolaId),
        l.turma || '—',
        rotuloTipo(l.tipo),
        nomeCat(l.categoriaId),
        l.descricao,
        `${ehReceita(l.tipo) ? '+' : '−'}${moneyBR(l.valor)}`,
      ]),
    )
    const html = htmlDocumentoPdf('Relatório financeiro', `${kpis}${graficos}${tabela}`, subtituloFiltro())
    if (!tentarImprimirHtml(html)) setPreviewPdf(html)
  }

  return (
    <div>
      {previewPdf ? <TelaImpressao html={previewPdf} onClose={() => setPreviewPdf(null)} /> : null}
      <section className="mb-5 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Filtros</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Field label="De">
            <DateInput value={de} onChange={setDe} />
          </Field>
          <Field label="Até">
            <DateInput value={ate} onChange={setAte} />
          </Field>
          <div>
            <span className="mb-1 block text-[13px] font-medium text-ink">Tipos</span>
            <div className="flex flex-wrap gap-3 pt-1">
              {NATUREZAS_FINANCEIRAS.map((n) => (
                <label key={n} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={naturezas.includes(n)} onChange={() => setNaturezas(toggleId(naturezas, n) as NaturezaFinanceira[])} />
                  {n === 'receita' ? 'Receitas' : 'Despesas'}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[13px] font-medium text-ink">Categorias</span>
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={todasCats}
                onChange={(e) => {
                  setTodasCats(e.target.checked)
                  if (e.target.checked) setCats([])
                }}
              />
              Todas
            </label>
            {!todasCats ? (
              <div className="flex max-h-32 flex-col gap-1 overflow-auto rounded-lg border border-line p-2">
                {categorias.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={cats.includes(c.id)} onChange={() => setCats(toggleId(cats, c.id))} />
                    {c.nome}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Escolas">
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={todasEscolas}
                onChange={(e) => {
                  setTodasEscolas(e.target.checked)
                  if (e.target.checked) setEscolaIds([])
                }}
              />
              Todas
            </label>
            {!todasEscolas ? (
              <div className="flex max-h-32 flex-col gap-1 overflow-auto rounded-lg border border-line p-2">
                {escolasVisiveis.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={escolaIds.includes(e.id)} onChange={() => setEscolaIds(toggleId(escolaIds, e.id))} />
                    {e.nome}
                  </label>
                ))}
              </div>
            ) : null}
          </Field>
          <Field label="Classes">
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={todasTurmas}
                onChange={(e) => {
                  setTodasTurmas(e.target.checked)
                  if (e.target.checked) setTurmasSel([])
                }}
              />
              Todas
            </label>
            {!todasTurmas ? (
              <div className="flex max-h-32 flex-col gap-1 overflow-auto rounded-lg border border-line p-2">
                {turmasOpcoes.map((t) => {
                  const k = `${t.escolaId}|${t.nome}`
                  return (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={turmasSel.includes(k)} onChange={() => setTurmasSel(toggleId(turmasSel, k))} />
                      {t.nome}
                      {escolasVisiveis.length > 1 ? ` · ${nomeEscola(state.escolas, t.escolaId)}` : ''}
                    </label>
                  )
                })}
              </div>
            ) : null}
          </Field>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border-l-4 border-emerald-400 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-muted">Receitas</div>
          <div className="mt-1 text-2xl font-semibold">{moneyBR(receitas)}</div>
        </div>
        <div className="rounded-xl border-l-4 border-red-400 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-muted">Despesas</div>
          <div className="mt-1 text-2xl font-semibold">{moneyBR(despesas)}</div>
        </div>
        <div className="rounded-xl border-l-4 border-gold bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-muted">Saldo</div>
          <div className="mt-1 text-2xl font-semibold">{moneyBR(receitas - despesas)}</div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Receitas, despesas e saldo</h2>
          <Barras itens={resumoBarras} />
        </section>
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Por categoria</h2>
          {porCat.length ? <Pizza itens={porCat} /> : <p className="text-sm text-muted">Sem dados no filtro.</p>}
        </section>
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Por escola</h2>
          {porEscola.length ? <Barras itens={porEscola} /> : <p className="text-sm text-muted">Sem dados no filtro.</p>}
        </section>
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Lançamentos do filtro</h2>
          <div className="flex gap-2">
            <PrimaryButton onClick={exportarExcel}>
              <Download size={16} /> Excel
            </PrimaryButton>
            <GhostButton onClick={exportarPdf}>
              <FileText size={16} /> PDF
            </GhostButton>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data w-full min-w-[800px] text-left">
            <thead>
              <tr>
                {['Data', 'Escola', 'Turma', 'Tipo', 'Categoria', 'Descrição', 'Valor', ''].map((h) => (
                  <th key={h || 'a'} className="px-3 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted">
                    Não há nenhum registro
                  </td>
                </tr>
              ) : (
                lista.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-3">{formatDateBR(l.data)}</td>
                    <td className="px-3 py-3">{nomeEscola(state.escolas, l.escolaId)}</td>
                    <td className="px-3 py-3">{l.turma || '—'}</td>
                    <td className="px-3 py-3">{rotuloTipo(l.tipo)}</td>
                    <td className="px-3 py-3">{nomeCat(l.categoriaId)}</td>
                    <td className="px-3 py-3">{l.descricao}</td>
                    <td className={`px-3 py-3 font-medium ${ehReceita(l.tipo) ? 'text-emerald-700' : 'text-red-600'}`}>
                      {ehReceita(l.tipo) ? '+' : '−'}
                      {moneyBR(l.valor)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" className="mr-2 text-muted hover:text-navy" onClick={() => setEditing(l)}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="text-muted hover:text-red-600" onClick={() => setExcluirLanc(l)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <Modal open={!!editing} title="Editar lançamento" onClose={() => setEditing(null)}>
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              saveLancamento(editing)
              setEditing(null)
            }}
          >
            <Field label="Descrição">
              <input className={inputClass} required value={editing.descricao} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
            </Field>
            <Field label="Valor (R$)">
              <input className={inputClass} type="number" min={0} step="0.01" value={editing.valor} onChange={(e) => setEditing({ ...editing, valor: Number(e.target.value) })} />
            </Field>
            <Field label="Tipo">
              <select
                className={inputClass}
                value={ehReceita(editing.tipo) ? 'receita' : 'despesa'}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    tipo: tipoDaNatureza(e.target.value as NaturezaFinanceira, editing.tipo),
                    categoriaId: undefined,
                  })
                }
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </Field>
            <Field label="Categoria">
              <select
                className={inputClass}
                value={editing.categoriaId ?? ''}
                onChange={(e) => setEditing({ ...editing, categoriaId: e.target.value || undefined })}
              >
                <option value="">Sem categoria</option>
                {opcoesCategoria(categorias, editing.tipo, editing.categoriaId).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Field>
              <GhostButton type="button" onClick={() => setEditing(null)}>
                Cancelar
              </GhostButton>
              <PrimaryButton type="submit">Salvar</PrimaryButton>
            </div>
          </form>
        ) : null}
      </Modal>
      <Confirmacao
        open={!!excluirLanc}
        titulo="Excluir lançamento"
        texto={`Excluir o lançamento “${excluirLanc?.descricao ?? ''}”?`}
        onCancel={() => setExcluirLanc(null)}
        onConfirm={() => {
          if (excluirLanc) removeLancamento(excluirLanc.id)
          setExcluirLanc(null)
        }}
      />
    </div>
  )
}

function AbaRevistas() {
  const { state, escolasVisiveis, pessoasVisiveis, saveRevista } = useStore()
  const agora = new Date()
  const [ano, setAno] = useState(agora.getFullYear())
  const [tri, setTri] = useState(trimestreNumero(agora))
  const [todasEscolas, setTodasEscolas] = useState(true)
  const [escolaIds, setEscolaIds] = useState<string[]>([])
  const [todasTurmas, setTodasTurmas] = useState(true)
  const [turmasSel, setTurmasSel] = useState<string[]>([])
  const [soInad, setSoInad] = useState(false)
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)

  const visiveis = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])
  const escolasFiltro = todasEscolas || escolaIds.length === 0 ? [...visiveis] : escolaIds.filter((id) => visiveis.has(id))
  const setEsc = new Set(escolasFiltro)
  const turmasOpcoes = (state.turmas ?? []).filter((t) => setEsc.has(t.escolaId))
  const setTurmas = todasTurmas || turmasSel.length === 0 ? null : new Set(turmasSel)

  const pessoas = pessoasVisiveis.filter((p) => {
    if (p.status !== 'Ativo') return false
    if (p.tipo !== 'Aluno' && p.tipo !== 'Professor') return false
    if (!setEsc.has(p.escolaId)) return false
    if (setTurmas && !setTurmas.has(`${p.escolaId}|${p.turma}`)) return false
    return true
  })

  function registroDe(p: Pessoa): RevistaControle {
    const atual = (state.revistas ?? []).find(
      (r) => r.pessoaId === p.id && r.ano === ano && r.trimestre === tri,
    )
    return (
      atual ?? {
        id: `rev_${p.id}_${ano}_${tri}`,
        pessoaId: p.id,
        escolaId: p.escolaId,
        turma: p.turma,
        ano,
        trimestre: tri,
        pediu: false,
        recebeu: false,
        pagou: false,
        valor: 0,
      }
    )
  }

  function inadimplente(r: RevistaControle) {
    return (r.pediu || r.recebeu) && !r.pagou
  }

  const linhas = pessoas
    .map((p) => ({ p, r: registroDe(p) }))
    .filter((x) => !soInad || inadimplente(x.r))
    .sort((a, b) => a.p.nome.localeCompare(b.p.nome, 'pt-BR'))

  const totais = linhas.reduce(
    (acc, { r }) => {
      if (r.pediu) acc.pediu += 1
      if (r.recebeu) acc.recebeu += 1
      if (r.pagou) acc.pagou += 1
      if (inadimplente(r)) {
        acc.inad += 1
        acc.aberto += r.valor
      }
      return acc
    },
    { pediu: 0, recebeu: 0, pagou: 0, inad: 0, aberto: 0 },
  )

  function patch(p: Pessoa, atual: RevistaControle, extra: Partial<RevistaControle>) {
    const next: RevistaControle = { ...atual, ...extra, pessoaId: p.id, escolaId: p.escolaId, turma: p.turma, ano, trimestre: tri }
    if (extra.pagou === true && !next.dataPagamento) next.dataPagamento = toISODate(new Date())
    if (extra.pagou === false) next.dataPagamento = undefined
    saveRevista(next)
  }

  function exportarExcel() {
    exportToExcel(
      `revistas-${ano}-t${tri}`,
      linhas.map(({ p, r }) => ({
        Nome: p.nome,
        Tipo: p.tipo,
        Escola: nomeEscola(state.escolas, p.escolaId),
        Turma: p.turma,
        Pediu: r.pediu ? 'Sim' : 'Não',
        Recebeu: r.recebeu ? 'Sim' : 'Não',
        Pagou: r.pagou ? 'Sim' : 'Não',
        Valor: r.valor,
        DataPagamento: r.dataPagamento ? formatDateBR(r.dataPagamento) : '',
        Situacao: r.pagou ? 'Pago' : inadimplente(r) ? 'Inadimplente' : '—',
      })),
    )
  }

  function exportarPdf() {
    const html = htmlDocumentoPdf(
      `Revistas — ${tri}º trimestre ${ano}`,
      `${tabelaHtml(
        ['Nome', 'Tipo', 'Escola', 'Turma', 'Pediu', 'Recebeu', 'Pagou', 'Valor', 'Data pagamento', 'Situação'],
        linhas.map(({ p, r }) => [
          p.nome,
          p.tipo,
          nomeEscola(state.escolas, p.escolaId),
          p.turma,
          r.pediu ? 'Sim' : 'Não',
          r.recebeu ? 'Sim' : 'Não',
          r.pagou ? 'Sim' : 'Não',
          moneyBR(r.valor),
          r.dataPagamento ? formatDateBR(r.dataPagamento) : '—',
          r.pagou ? 'Pago' : inadimplente(r) ? 'Inadimplente' : '—',
        ]),
      )}`,
      `Pediu ${totais.pediu} · Recebeu ${totais.recebeu} · Pagou ${totais.pagou} · Inadimplentes ${totais.inad} · Em aberto ${moneyBR(totais.aberto)}`,
    )
    if (!tentarImprimirHtml(html)) setPreviewPdf(html)
  }

  return (
    <div>
      {previewPdf ? <TelaImpressao html={previewPdf} onClose={() => setPreviewPdf(null)} /> : null}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiMini label="Pediu" value={String(totais.pediu)} />
        <KpiMini label="Recebeu" value={String(totais.recebeu)} />
        <KpiMini label="Pagou" value={String(totais.pagou)} />
        <KpiMini label="Inadimplentes" value={String(totais.inad)} />
        <KpiMini label="Em aberto" value={moneyBR(totais.aberto)} />
      </div>
      <section className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ano">
            <select className={inputClass + ' w-28'} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
              {[agora.getFullYear(), agora.getFullYear() - 1].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Trimestre">
            <select className={inputClass + ' w-28'} value={tri} onChange={(e) => setTri(Number(e.target.value))}>
              {[1, 2, 3, 4].map((t) => (
                <option key={t} value={t}>
                  {t}º
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={todasEscolas} onChange={(e) => { setTodasEscolas(e.target.checked); if (e.target.checked) setEscolaIds([]) }} />
            Todas as escolas
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={todasTurmas} onChange={(e) => { setTodasTurmas(e.target.checked); if (e.target.checked) setTurmasSel([]) }} />
            Todas as classes
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={soInad} onChange={(e) => setSoInad(e.target.checked)} />
            Só inadimplentes
          </label>
          <div className="ml-auto flex gap-2 pb-1">
            <PrimaryButton onClick={exportarExcel}>
              <Download size={16} /> Excel
            </PrimaryButton>
            <GhostButton onClick={exportarPdf}>
              <FileText size={16} /> PDF
            </GhostButton>
          </div>
        </div>
        {!todasEscolas ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {escolasVisiveis.map((e) => (
              <label key={e.id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={escolaIds.includes(e.id)} onChange={() => setEscolaIds(toggleId(escolaIds, e.id))} />
                {e.nome}
              </label>
            ))}
          </div>
        ) : null}
        {!todasTurmas ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {turmasOpcoes.map((t) => {
              const k = `${t.escolaId}|${t.nome}`
              return (
                <label key={t.id} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={turmasSel.includes(k)} onChange={() => setTurmasSel(toggleId(turmasSel, k))} />
                  {t.nome}
                </label>
              )
            })}
          </div>
        ) : null}
      </section>
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="table-wrap">
          <table className="data w-full min-w-[1100px] text-left">
            <thead>
              <tr>
                {['Nome', 'Tipo', 'Turma', 'Pediu', 'Recebeu', 'Pagou', 'Valor', 'Data de pagamento', 'Situação'].map((h) => (
                  <th key={h} className="px-3 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-sm text-muted">
                    Não há nenhum registro
                  </td>
                </tr>
              ) : (
                linhas.map(({ p, r }) => (
                  <tr key={p.id} className={inadimplente(r) ? 'bg-amber-50' : undefined}>
                    <td className="px-3 py-3 font-medium">{p.nome}</td>
                    <td className="px-3 py-3">{p.tipo}</td>
                    <td className="px-3 py-3">{p.turma}</td>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={r.pediu}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => patch(p, r, { pediu: !r.pediu })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={r.recebeu}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => patch(p, r, { recebeu: !r.recebeu })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={r.pagou}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => patch(p, r, { pagou: !r.pagou })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className={inputClass + ' w-24'}
                        type="number"
                        min={0}
                        step="0.01"
                        value={r.valor}
                        onChange={(e) => patch(p, r, { valor: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <DateInput
                        className="w-36"
                        value={r.dataPagamento ?? ''}
                        allowEmpty
                        onChange={(iso) => {
                          if (iso) patch(p, r, { dataPagamento: iso, pagou: true })
                          else patch(p, r, { dataPagamento: undefined })
                        }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      {r.pagou ? (
                        <span className="text-emerald-700">Pago</span>
                      ) : inadimplente(r) ? (
                        <span className="font-medium text-amber-700">Inadimplente</span>
                      ) : (
                        '—'
                      )}
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

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-l-4 border-navy bg-white p-3 shadow-sm">
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}
