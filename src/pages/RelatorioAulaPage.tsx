import { ChevronLeft } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { AulaDateSelect } from '../components/AulaDateSelect'
import { Field, inputClass } from '../components/ui'
import { useStore } from '../lib/store'
import type { AppState, Pessoa } from '../lib/types'
import { moneyBR, pct, toISODate, lastSunday } from '../lib/utils'

type Linha = {
  id: string
  nome: string
  matriculados: number
  presentes: number
  ausentes: number
  visitantes: number
  biblias: number
  revistas: number
  oferta: number
}

const ROXO = '#6e2a5c'

function ativosDaEscola(pessoas: Pessoa[], escolaId: string, tipo: Pessoa['tipo']) {
  return pessoas.filter((p) => p.escolaId === escolaId && p.status === 'Ativo' && p.tipo === tipo)
}

function montarLinhas(state: AppState, escolaId: string, data: string, soTurma?: string): { classes: Linha[]; professores: Linha } {
  const rel = state.relatorios.find((r) => r.escolaId === escolaId && r.data === data)
  const alunos = ativosDaEscola(state.pessoas, escolaId, 'Aluno')
  const profs = ativosDaEscola(state.pessoas, escolaId, 'Professor')
  const nomes: string[] = []
  const visto = new Set<string>()
  function incluir(nome: string) {
    const n = nome.trim()
    if (!n || visto.has(n)) return
    if (soTurma && n !== soTurma) return
    visto.add(n)
    nomes.push(n)
  }
  for (const t of state.turmas ?? []) {
    if (t.escolaId === escolaId) incluir(t.nome)
  }
  for (const p of alunos) incluir(p.turma)
  const lista = nomes

  const classes: Linha[] = lista.map((nome) => {
    const daTurma = alunos.filter((p) => p.turma === nome)
    const chamadas = daTurma.map((p) => rel?.alunos.find((a) => a.pessoaId === p.id))
    const presentes = chamadas.filter((a) => a?.presente).length
    const classe = rel?.classes?.find((c) => c.turma === nome)
    const salva = !!classe?.salva
    const matriculados = daTurma.length
    return {
      id: nome,
      nome,
      matriculados,
      presentes,
      ausentes: Math.max(0, matriculados - presentes),
      visitantes: salva ? classe?.visitantes ?? 0 : 0,
      biblias: salva ? classe?.biblias ?? 0 : chamadas.filter((a) => a?.biblia).length,
      revistas: salva ? classe?.revistas ?? 0 : chamadas.filter((a) => a?.revista).length,
      oferta: salva ? classe?.oferta ?? 0 : 0,
    }
  })

  const chamadasProf = profs.map((p) => rel?.alunos.find((a) => a.pessoaId === p.id))
  const presentesProf = chamadasProf.filter((a) => a?.presente).length
  const salvaProf = !!rel?.professoresSalva || !!rel?.professoresFinalizada
  const matriculadosProf = soTurma ? 0 : profs.length
  const professores: Linha = {
    id: 'professores',
    nome: 'Professores',
    matriculados: matriculadosProf,
    presentes: soTurma ? 0 : presentesProf,
    ausentes: soTurma ? 0 : Math.max(0, matriculadosProf - presentesProf),
    visitantes: 0,
    biblias: soTurma ? 0 : salvaProf ? rel?.bibliasProfessores ?? 0 : chamadasProf.filter((a) => a?.biblia).length,
    revistas: soTurma ? 0 : salvaProf ? rel?.revistasProfessores ?? 0 : chamadasProf.filter((a) => a?.revista).length,
    oferta: soTurma ? 0 : salvaProf ? rel?.ofertaProfessores ?? 0 : 0,
  }
  return { classes, professores }
}

function somar(linhas: Linha[]): Linha {
  const base = linhas.reduce(
    (acc, l) => ({
      matriculados: acc.matriculados + l.matriculados,
      presentes: acc.presentes + l.presentes,
      ausentes: acc.ausentes + l.ausentes,
      visitantes: acc.visitantes + l.visitantes,
      biblias: acc.biblias + l.biblias,
      revistas: acc.revistas + l.revistas,
      oferta: Math.round((acc.oferta + l.oferta) * 100) / 100,
    }),
    { matriculados: 0, presentes: 0, ausentes: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0 },
  )
  return { id: 'total', nome: 'Total', ...base }
}

function Caixa({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px]">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function GradeClasse({ linha, comVisitantes }: { linha: Linha; comVisitantes: boolean }) {
  const total = linha.presentes + linha.visitantes
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2">
        <Caixa label="Matriculados" value={String(linha.matriculados)} />
      </div>
      <Caixa label="Presentes" value={String(linha.presentes)} />
      <Caixa label="Ausentes" value={String(linha.ausentes)} />
      {comVisitantes ? (
        <>
          <Caixa label="Visitantes" value={String(linha.visitantes)} />
          <Caixa label="Total" value={String(total)} />
        </>
      ) : null}
      <div className="col-span-2">
        <Caixa label="Presença" value={`${pct(linha.presentes, linha.matriculados)}%`} />
      </div>
      <Caixa label="Bíblias" value={String(linha.biblias)} />
      <Caixa label="Revistas" value={String(linha.revistas)} />
      <div className="col-span-2">
        <Caixa label="Oferta" value={moneyBR(linha.oferta)} />
      </div>
    </div>
  )
}

function Carrossel({ children, vazio }: { children: ReactNode[]; vazio?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)

  function aoRolar() {
    const el = ref.current
    if (!el || el.clientWidth < 1) return
    setIdx(Math.round(el.scrollLeft / el.clientWidth))
  }

  function ir(i: number) {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
    setIdx(i)
  }

  if (children.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{vazio ?? 'Nenhuma turma nesta congregação.'}</p>
  }

  return (
    <div>
      <div
        ref={ref}
        onScroll={aoRolar}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, i) => (
          <div key={i} className="w-full min-w-full shrink-0 snap-center">
            {child}
          </div>
        ))}
      </div>
      {children.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Cartão ${i + 1}`}
              onClick={() => ir(i)}
              className="h-2 w-2 rounded-full"
              style={{ background: i === idx ? ROXO : '#d5dbe3' }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Barra({ nome, texto, valor, max }: { nome: string; texto: string; valor: number; max: number }) {
  const largura = valor > 0 && max > 0 ? Math.max(6, Math.round((valor / max) * 100)) : 0
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between gap-3 text-[15px]">
        <span className="font-semibold">{nome}</span>
        <span className="shrink-0">{texto}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full" style={{ width: `${largura}%`, background: ROXO }} />
      </div>
    </div>
  )
}

function Cartao({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white px-4 py-5 shadow-sm">
      <h2 className="text-center text-lg font-semibold text-ink">{titulo}</h2>
      <p className="mx-auto mt-1 mb-4 max-w-md text-center text-[13px] leading-snug text-muted">{texto}</p>
      {children}
    </section>
  )
}

export function RelatorioAulaPage() {
  const { state, escolasVisiveis, usuario, ehProfessor, podeVerTudo } = useStore()
  const [data, setData] = useState(toISODate(lastSunday()))
  const [escolaId, setEscolaId] = useState(usuario?.escolaId ?? escolasVisiveis[0]?.id ?? '')
  const [tela, setTela] = useState<'aula' | 'final'>('aula')
  const soTurma = ehProfessor ? usuario?.turma || '' : undefined

  const { classes, professores, departamentos, geral, barras } = useMemo(() => {
    const { classes: cls, professores: prof } = montarLinhas(state, escolaId, data, soTurma)
    const setores = state.setoresEbd ?? []
    const grupos = new Map<string, { nome: string; linhas: Linha[] }>()
    for (const linha of cls) {
      const cadastro = (state.turmas ?? []).find((t) => t.escolaId === escolaId && t.nome === linha.nome)
      const setor = setores.find((s) => s.id === cadastro?.setorId)
      const id = setor?.id ?? 'sem'
      const atual = grupos.get(id)
      if (atual) atual.linhas.push(linha)
      else grupos.set(id, { nome: setor?.nome ?? 'Sem departamento', linhas: [linha] })
    }
    const departamentos = [...grupos.values()]
      .map((g) => ({ nome: g.nome.toLocaleUpperCase('pt-BR'), linha: somar(g.linhas) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    const partes = soTurma ? cls : [...cls, prof]
    const geral = somar(partes)
    const barras = soTurma ? cls : [prof, ...cls]
    return { classes: cls, professores: prof, departamentos, geral, barras }
  }, [state, escolaId, data, soTurma])

  const maxOferta = Math.max(0, ...barras.map((l) => l.oferta))
  const maxPresentes = Math.max(0, ...barras.map((l) => l.presentes + l.visitantes))

  return (
    <div className="mx-auto max-w-lg">
      {tela === 'final' ? (
        <button type="button" onClick={() => setTela('aula')} className="mb-3 flex items-center gap-1 text-sm font-medium text-ink">
          <ChevronLeft size={18} /> Resumo da aula
        </button>
      ) : null}
      <h1 className="mb-4 text-center text-xl font-semibold text-ink">{tela === 'final' ? 'Resumo final' : 'Resumo da aula'}</h1>

      {tela === 'aula' ? (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Data">
            <AulaDateSelect value={data} onChange={setData} eventos={state.eventos} licoes={state.licoes} />
          </Field>
          {podeVerTudo && escolasVisiveis.length > 1 ? (
            <Field label="Congregação">
              <select className={inputClass} value={escolaId} onChange={(e) => setEscolaId(e.target.value)}>
                {escolasVisiveis.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
      ) : null}

      {tela === 'aula' ? (
        <div className="space-y-4">
          <Cartao
            titulo="Resumo Final"
            texto="O resumo final exibe o somatório de todos os alunos e professores cadastrados nesta aula. Você pode também visualizar comparativos de desempenho entre as turmas"
          >
            <button
              type="button"
              onClick={() => setTela('final')}
              className="w-full rounded-full bg-navy py-3 text-sm font-semibold tracking-wide text-white"
            >
              VER RESUMO
            </button>
          </Cartao>

          <Cartao
            titulo="Relatórios por classes"
            texto="Aqui você acompanha o relatório das chamadas feitas em cada classe. Arraste para o lado para ver as outras turmas."
          >
            <Carrossel key={`${escolaId}-${data}`}>
              {classes.map((linha) => (
                <div key={linha.id} className="rounded-2xl border border-slate-200 px-3 py-4">
                  <h3 className="mb-3 text-center text-lg font-semibold">{linha.nome}</h3>
                  <GradeClasse linha={linha} comVisitantes />
                </div>
              ))}
            </Carrossel>
          </Cartao>
        </div>
      ) : (
        <div className="space-y-4">
          <Cartao titulo="Relatório Geral" texto="Aqui você acompanha o relatório geral de todos os alunos e professores na aula selecionada">
            <GradeClasse linha={geral} comVisitantes />
          </Cartao>

          <Cartao
            titulo="Aproveitamento"
            texto="O aproveitamento é definido pelo número de alunos/professores presentes baseado na quantidade de matriculados"
          >
            {barras.map((l) => (
              <Barra key={l.id} nome={l.nome} texto={`${pct(l.presentes, l.matriculados)}%`} valor={pct(l.presentes, l.matriculados)} max={100} />
            ))}
          </Cartao>

          <Cartao titulo="Oferta" texto="Valor total ofertado entre as classes. (O percentual é baseado no maior valor ofertado)">
            {barras.map((l) => (
              <Barra key={l.id} nome={l.nome} texto={moneyBR(l.oferta)} valor={l.oferta} max={maxOferta} />
            ))}
          </Cartao>

          <Cartao
            titulo="Presentes"
            texto="Comparativo entre professores e alunos presentes em cada turma. Este número é o resultado da soma dos alunos presentes + visitantes. (O percentual é baseado na turma com maior número de alunos presentes)"
          >
            {barras.map((l) => (
              <Barra key={l.id} nome={l.nome} texto={String(l.presentes + l.visitantes)} valor={l.presentes + l.visitantes} max={maxPresentes} />
            ))}
          </Cartao>

          <Cartao
            titulo="Relatórios por departamentos"
            texto="Aqui você acompanha o relatório das chamadas feitas em cada classe, agrupados por departamento"
          >
            <Carrossel key={`dep-${escolaId}-${data}`} vazio="Nenhum departamento nesta congregação.">
              {departamentos.map((d) => (
                <div key={d.nome} className="rounded-2xl border border-slate-200 px-3 py-4">
                  <h3 className="mb-3 text-center text-base font-semibold tracking-wide">{d.nome}</h3>
                  <GradeClasse linha={d.linha} comVisitantes />
                </div>
              ))}
            </Carrossel>
          </Cartao>

          {soTurma ? null : (
            <Cartao titulo="Relatório de professores" texto="Aqui você acompanha o relatório dos professores na aula selecionada.">
              <GradeClasse linha={professores} comVisitantes={false} />
            </Cartao>
          )}
        </div>
      )}
    </div>
  )
}
