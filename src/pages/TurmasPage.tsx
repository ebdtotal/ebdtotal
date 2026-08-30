import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImportacaoExcel } from '../components/ImportacaoExcel'
import { Confirmacao, DateInput, Field, GhostButton, Modal, PrimaryButton, inputClass } from '../components/ui'
import { casarOpcao, celula, lerPlanilha } from '../lib/excel'
import { AreaLinha, BarrasMedias } from '../lib/graficos'
import {
  aplicarPeriodoTurma,
  datasAulasEscola,
  nomeEscola,
  painelTurma,
  rotuloPeriodoTurma,
  type PeriodoTurma,
} from '../lib/stats'
import { useStore } from '../lib/store'
import { FAIXAS_ETARIAS, type FaixaEtaria, type TurmaCadastro } from '../lib/types'
import { formatDateBR, matches, pad2, parseISODate, uid } from '../lib/utils'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function rotuloAula(iso: string) {
  const d = parseISODate(iso)
  return `${pad2(d.getDate())} ${MESES[d.getMonth()]}`
}

function opcoesPeriodo(): { key: string; label: string; periodo: PeriodoTurma | 'custom' }[] {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  let tri = Math.floor(hoje.getMonth() / 3) + 1
  let a = ano
  const itens: { key: string; label: string; periodo: PeriodoTurma | 'custom' }[] = [
    { key: 'u13', label: 'Últimas 13 aulas', periodo: { tipo: 'ultimas', n: 13 } },
  ]
  for (let i = 0; i < 4; i++) {
    itens.push({
      key: `t${a}${tri}`,
      label: `${tri}º trimestre de ${a}`,
      periodo: { tipo: 'trimestre', ano: a, tri },
    })
    tri -= 1
    if (tri < 1) {
      tri = 4
      a -= 1
    }
  }
  itens.push({ key: `y${ano}`, label: String(ano), periodo: { tipo: 'ano', ano } })
  itens.push({ key: 'custom', label: 'Intervalo personalizado', periodo: 'custom' })
  return itens
}

function mesmoPeriodo(a: PeriodoTurma, b: PeriodoTurma) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function mediaTxt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export function TurmasPage() {
  const { state, escolasVisiveis, saveTurma, importarTurmas, removeTurma, podeVerTudo, usuario, ehProfessor } = useStore()
  const podeCadastrar =
    usuario?.papel === 'admin' || usuario?.papel === 'sede' || usuario?.papel === 'superintendente'
  const [editing, setEditing] = useState<TurmaCadastro | null>(null)
  const [excluirTurma, setExcluirTurma] = useState<TurmaCadastro | null>(null)
  const [selId, setSelId] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<PeriodoTurma>({ tipo: 'ultimas', n: 13 })
  const [abrirPeriodo, setAbrirPeriodo] = useState(false)
  const [deCustom, setDeCustom] = useState(`${new Date().getFullYear()}-01-01`)
  const [ateIso, setAteIso] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  })

  const turmas = useMemo(() => {
    const ids = new Set(escolasVisiveis.map((e) => e.id))
    let lista = (state.turmas ?? []).filter((t) => ids.has(t.escolaId))
    if (ehProfessor && usuario?.turma) lista = lista.filter((t) => t.nome === usuario.turma)
    if (lista.length === 0) {
      const vistas = new Set<string>()
      for (const p of state.pessoas) {
        if (!ids.has(p.escolaId) || !p.turma) continue
        if (ehProfessor && usuario?.turma && p.turma !== usuario.turma) continue
        const k = `${p.escolaId}|${p.turma}`
        if (vistas.has(k)) continue
        vistas.add(k)
        lista.push({
          id: `virt-${k}`,
          nome: p.turma,
          escolaId: p.escolaId,
          faixaEtaria: p.faixaEtaria,
        })
      }
    }
    return lista
  }, [state.turmas, state.pessoas, escolasVisiveis, ehProfessor, usuario?.turma])

  const selecionada = turmas.find((t) => t.id === selId) ?? turmas[0] ?? null

  const painel = useMemo(() => {
    if (!selecionada) return null
    const datas = aplicarPeriodoTurma(datasAulasEscola(state, selecionada.escolaId), periodo)
    return painelTurma(state, selecionada.escolaId, selecionada.nome, datas)
  }, [state, selecionada, periodo])

  const cards = useMemo(() => {
    return turmas.map((t) => {
      const datas = aplicarPeriodoTurma(datasAulasEscola(state, t.escolaId), periodo)
      const p = painelTurma(state, t.escolaId, t.nome, datas)
      return { turma: t, painel: p }
    })
  }, [turmas, state, periodo])

  const labelPeriodo =
    periodo.tipo === 'intervalo'
      ? `${formatDateBR(periodo.de)} – ${formatDateBR(periodo.ate)}`
      : rotuloPeriodoTurma(periodo)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Turmas</h1>
          <p className="text-sm text-muted">
            {podeCadastrar
              ? 'Acompanhe presença e ranking de cada classe. Cadastre novas turmas quando precisar.'
              : 'Presença, gráficos e ranking da classe no período escolhido.'}
          </p>
        </div>
        {podeCadastrar && (podeVerTudo || escolasVisiveis.length > 0) ? (
          <PrimaryButton
            aria-label="Nova turma"
            onClick={() =>
              setEditing({
                id: uid('t'),
                nome: '',
                escolaId: escolasVisiveis[0]?.id ?? '',
                faixaEtaria: 'Adultos',
              })
            }
          >
            <Plus size={16} />
          </PrimaryButton>
        ) : null}
      </div>

      {cards.length === 0 ? (
        <p className="mb-6 rounded-xl bg-white px-4 py-8 text-center text-sm text-muted shadow-sm">
          Nenhuma turma cadastrada ainda.
        </p>
      ) : (
        <div className="mb-6 flex gap-3 overflow-x-auto pb-1">
          {cards.map(({ turma, painel: p }) => {
            const ativa = selecionada?.id === turma.id
            return (
              <button
                key={turma.id}
                type="button"
                onClick={() => setSelId(turma.id)}
                className={`min-w-[200px] shrink-0 rounded-xl border bg-white p-3 text-left shadow-sm transition ${
                  ativa ? 'border-navy ring-2 ring-navy/15' : 'border-line hover:border-navy/40'
                }`}
              >
                <div className="font-semibold text-ink">{turma.nome}</div>
                <div className="text-xs text-muted">{turma.faixaEtaria}</div>
                {escolasVisiveis.length > 1 ? (
                  <div className="truncate text-[11px] text-muted">{nomeEscola(state.escolas, turma.escolaId)}</div>
                ) : null}
                <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <div className="text-[10px] uppercase text-muted">Presença</div>
                    <div className="text-sm font-semibold">{p.aproveitamento}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted">Alunos</div>
                    <div className="text-sm font-semibold">{p.alunos}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted">Média</div>
                    <div className="text-sm font-semibold">{mediaTxt(p.mediaPre)}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selecionada && painel ? (
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">{selecionada.nome}</h2>
            <button
              type="button"
              onClick={() => setAbrirPeriodo(true)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#6b3fa0]"
            >
              {labelPeriodo}
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted">Presentes por aula</div>
                  <div className="text-3xl font-semibold text-ink">{painel.presentesUltima}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted">Aproveitamento</div>
                  <div className="text-3xl font-semibold text-ink">{painel.aproveitamento}%</div>
                </div>
              </div>
              {painel.aulas.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">Sem aulas neste período.</p>
              ) : (
                <AreaLinha
                  pontos={painel.aulas.map((a) => a.presentes)}
                  rotulos={painel.aulas.map((a) => rotuloAula(a.data))}
                />
              )}
            </section>
            <section className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-ink">Média no intervalo</h3>
              <BarrasMedias
                itens={[
                  { label: 'Pre.', valor: painel.mediaPre, cor: '#22c55e' },
                  { label: 'Aus.', valor: painel.mediaAus, cor: '#ef4444' },
                  { label: 'Vis.', valor: painel.mediaVis, cor: '#7dd3fc' },
                ]}
              />
              <ul className="mt-1 flex justify-center gap-4 text-xs text-muted">
                <li className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Pre.</li>
                <li className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-500" /> Aus.</li>
                <li className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sky-300" /> Vis.</li>
              </ul>
            </section>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankingLista
              titulo="Ranking de presença"
              sub="A frequência é exibida de acordo com o intervalo selecionado"
              itens={painel.rankingPresenca.map((r) => ({
                id: r.pessoa.id,
                nome: r.pessoa.nome,
                valor: String(r.presentes),
              }))}
            />
            <RankingLista
              titulo="Ranking de pontuação"
              sub="A pontuação é exibida de acordo com o intervalo selecionado"
              itens={painel.rankingPontos.map((r) => ({
                id: r.pessoa.id,
                nome: r.pessoa.nome,
                valor: String(r.pontos),
              }))}
            />
          </div>
        </div>
      ) : null}

      {podeCadastrar ? (
        <ImportacaoExcel
          arquivoModelo="modelo-turmas-ebd"
          colunas={['Nome', 'Congregação', 'Faixa etária']}
          exemplo={{
            Nome: 'Ex.: Primários A',
            Congregação: escolasVisiveis[0]?.nome ?? 'Nome da igreja',
            'Faixa etária': 'Primários',
          }}
          onImportar={async (file) => {
            const rows = await lerPlanilha(file)
            const novas: TurmaCadastro[] = []
            const erros: string[] = []
            rows.forEach((row, i) => {
              const linha = i + 2
              const nome = celula(row, 'nome', 'turma')
              if (!nome || /^ex\.?:/i.test(nome)) return
              const congregacao = celula(row, 'congregacao', 'igreja', 'escola')
              const escola =
                escolasVisiveis.find((e) => matches(e.nome, congregacao)) ??
                (congregacao ? undefined : escolasVisiveis[0])
              if (!escola) {
                erros.push(`Linha ${linha}: congregação "${congregacao || '(vazia)'}" não encontrada`)
                return
              }
              const ja = (state.turmas ?? []).some(
                (t) => t.escolaId === escola.id && t.nome.toLowerCase() === nome.toLowerCase(),
              ) || novas.some((t) => t.escolaId === escola.id && t.nome.toLowerCase() === nome.toLowerCase())
              if (ja) {
                erros.push(`Linha ${linha}: turma "${nome}" já existe nesta congregação`)
                return
              }
              novas.push({
                id: uid('t'),
                nome,
                escolaId: escola.id,
                faixaEtaria: casarOpcao(celula(row, 'faixaetaria', 'faixa'), FAIXAS_ETARIAS, 'Adultos'),
              })
            })
            importarTurmas(novas)
            return { ok: novas.length, erros }
          }}
        />
      ) : null}

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-ink">Cadastro das classes</h2>
        {turmas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Nenhuma turma cadastrada ainda.</p>
        ) : (
          <div className="table-wrap">
            <table className="data w-full min-w-[640px] text-left">
              <thead>
                <tr>
                  {['Turma', 'Escola', 'Faixa etária', 'Setor', ''].map((h) => (
                    <th key={h || 'a'} className="px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {turmas.filter((t) => !t.id.startsWith('virt-')).map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-3 font-medium">{t.nome}</td>
                    <td className="px-3 py-3">{escolasVisiveis.find((e) => e.id === t.escolaId)?.nome ?? t.escolaId}</td>
                    <td className="px-3 py-3">{t.faixaEtaria}</td>
                    <td className="px-3 py-3">{(state.setoresEbd ?? []).find((s) => s.id === t.setorId)?.nome ?? '—'}</td>
                    <td className="px-3 py-3 text-right">
                      {podeCadastrar ? (
                        <>
                          <button type="button" className="mr-2 text-muted hover:text-navy" onClick={() => setEditing(t)}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="text-muted hover:text-red-600" onClick={() => setExcluirTurma(t)}>
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={abrirPeriodo} title="Selecione o período" onClose={() => setAbrirPeriodo(false)}>
        <p className="mb-4 text-sm text-muted">Selecione o período para realizar o filtro</p>
        <div className="flex flex-col gap-2">
          {opcoesPeriodo().map((o) => {
            const ativo = o.periodo === 'custom' ? periodo.tipo === 'intervalo' : mesmoPeriodo(periodo, o.periodo)
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  if (o.periodo === 'custom') {
                    setPeriodo({ tipo: 'intervalo', de: deCustom, ate: ateIso })
                    return
                  }
                  setPeriodo(o.periodo)
                  setAbrirPeriodo(false)
                }}
                className={`rounded-full px-4 py-2.5 text-sm font-medium ${
                  ativo ? 'bg-navy text-white' : 'border border-line bg-white text-ink hover:bg-slate-50'
                }`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
        {periodo.tipo === 'intervalo' ? (
          <div className="mt-4 space-y-3">
            <Field label="De">
              <DateInput value={deCustom} onChange={setDeCustom} />
            </Field>
            <Field label="Até">
              <DateInput value={ateIso} onChange={setAteIso} />
            </Field>
            <PrimaryButton
              onClick={() => {
                setPeriodo({ tipo: 'intervalo', de: deCustom, ate: ateIso })
                setAbrirPeriodo(false)
              }}
            >
              Aplicar intervalo
            </PrimaryButton>
          </div>
        ) : null}
      </Modal>

      {podeCadastrar ? (
      <Modal open={!!editing} title={editing ? 'Turma' : ''} onClose={() => setEditing(null)}>
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              saveTurma(editing)
              setEditing(null)
            }}
          >
            <Field label="Nome da turma">
              <input className={inputClass} required value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
            </Field>
            <Field label="Escola">
              <select className={inputClass} value={editing.escolaId} onChange={(e) => setEditing({ ...editing, escolaId: e.target.value })}>
                {escolasVisiveis.map((esc) => (
                  <option key={esc.id} value={esc.id}>{esc.nome}</option>
                ))}
              </select>
            </Field>
            <Field label="Faixa etária">
              <select
                className={inputClass}
                value={editing.faixaEtaria}
                onChange={(e) => setEditing({ ...editing, faixaEtaria: e.target.value as FaixaEtaria })}
              >
                {FAIXAS_ETARIAS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Field label="Setor">
              <select
                className={inputClass}
                value={editing.setorId ?? ''}
                onChange={(e) => setEditing({ ...editing, setorId: e.target.value || undefined })}
              >
                <option value="">Sem setor</option>
                {(state.setoresEbd ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setEditing(null)}>Cancelar</GhostButton>
              <PrimaryButton type="submit">Salvar</PrimaryButton>
            </div>
          </form>
        ) : null}
      </Modal>
      ) : null}
      <Confirmacao
        open={!!excluirTurma}
        titulo="Excluir turma"
        texto={`Excluir a turma “${excluirTurma?.nome ?? ''}”? Ela some da lista e não volta na sincronização.`}
        onCancel={() => setExcluirTurma(null)}
        onConfirm={() => {
          if (excluirTurma) removeTurma(excluirTurma.id)
          setExcluirTurma(null)
        }}
      />
    </div>
  )
}

function RankingLista({
  titulo,
  sub,
  itens,
}: {
  titulo: string
  sub: string
  itens: { id: string; nome: string; valor: string }[]
}) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-ink">{titulo}</h3>
      <p className="mb-3 text-xs text-muted">{sub}</p>
      {itens.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nenhum aluno nesta classe.</p>
      ) : (
        <ol className="space-y-2">
          {itens.map((item, i) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-8 shrink-0 text-muted">{i + 1}º</span>
                <Link to={`/alunos/${item.id}`} className="truncate font-medium hover:underline">
                  {item.nome}
                </Link>
              </span>
              <span className="shrink-0 font-semibold text-ink">{item.valor}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
