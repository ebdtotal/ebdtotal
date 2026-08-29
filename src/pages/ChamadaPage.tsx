import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Coins,
  GraduationCap,
  NotebookPen,
  Pencil,
  Plus,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AulaDateSelect } from '../components/AulaDateSelect'
import { GhostButton, PrimaryButton, inputClass, roundBtnClass, stepBtnClass } from '../components/ui'
import { perfilDe } from '../lib/perfis'
import { useStore } from '../lib/store'
import { turmasDaEscola } from '../lib/stats'
import { chamadaVazia, pontosDe, type ChamadaAluno, type RelatorioDiario } from '../lib/types'
import { formatDateBR, lastSunday, moneyBR, parseMoneyBR, toISODate, uid } from '../lib/utils'

const CHAMADA_PROFESSORES = '__professores__'
const acoesChamadaClass =
  'fixed inset-x-0 z-20 flex flex-col gap-2 border-t-2 border-gold bg-navy px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] bottom-[calc(3.25rem+max(env(safe-area-inset-bottom),var(--safe-bottom,0px)))] lg:static lg:inset-auto lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none'

export function ChamadaPage() {
  const { state, escolasVisiveis, saveRelatorio, usuario, podeVerTudo, ehProfessor } = useStore()
  const ehSuper = perfilDe(usuario?.papel) === 'superintendente'
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const [data, setData] = useState(toISODate(lastSunday()))
  const [escolaId, setEscolaId] = useState(usuario?.escolaId ?? escolasVisiveis[0]?.id ?? '')
  const turma = ehProfessor
    ? (usuario?.turma ?? '')
    : ehSuper && params.get('modo') === 'professores'
      ? CHAMADA_PROFESSORES
      : params.get('turma') ?? ''
  const [visitantes, setVisitantes] = useState(0)
  const [bibliasClasse, setBibliasClasse] = useState(0)
  const [revistasClasse, setRevistasClasse] = useState(0)
  const [oferta, setOferta] = useState(0)
  const [anotacao, setAnotacao] = useState('')
  const [alunos, setAlunos] = useState<ChamadaAluno[]>([])
  const [carregado, setCarregado] = useState('')
  const [turmaAberta, setTurmaAberta] = useState('')
  const [editando, setEditando] = useState(false)
  const [bibliasProf, setBibliasProf] = useState(0)
  const [revistasProf, setRevistasProf] = useState(0)
  const [ofertaProf, setOfertaProf] = useState(0)

  const chave = `${escolaId}_${data}`
  const modoProfessores = turma === CHAMADA_PROFESSORES && ehSuper
  const daEscola = useMemo(
    () =>
      state.pessoas.filter(
        (p) => p.escolaId === escolaId && p.status === 'Ativo' && (p.tipo === 'Aluno' || p.tipo === 'Professor'),
      ),
    [state.pessoas, escolaId],
  )
  const professores = useMemo(
    () => daEscola.filter((p) => p.tipo === 'Professor').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [daEscola],
  )
  const pessoas = useMemo(
    () => {
      if (ehProfessor) return daEscola.filter((p) => p.tipo === 'Aluno' && (!turma || p.turma === turma))
      if (modoProfessores) return professores
      if (turma) return daEscola.filter((p) => p.tipo === 'Aluno' && p.turma === turma)
      return daEscola
    },
    [daEscola, turma, ehProfessor, modoProfessores, professores],
  )
  const turmas = turmasDaEscola(
    daEscola.filter((p) => p.tipo === 'Aluno'),
    escolaId,
  )

  if (chave !== carregado && escolaId) {
    const existente = state.relatorios.find((r) => r.escolaId === escolaId && r.data === data)
    const mapa = new Map((existente?.alunos ?? []).map((a) => [a.pessoaId, a]))
    const rows = daEscola.map((p) => {
      const prev = mapa.get(p.id)
      return prev
        ? {
            ...chamadaVazia(p.id),
            ...prev,
            participacao: prev.participacao ?? false,
            ofertou: prev.ofertou ?? false,
            pontosParticipacao: prev.pontosParticipacao ?? (prev.participacao ? 1 : 0),
          }
        : chamadaVazia(p.id)
    })
    setAlunos(rows)
    setVisitantes(existente?.visitantes ?? 0)
    setOferta(existente?.oferta ?? 0)
    setAnotacao(existente?.anotacao ?? '')
    setBibliasClasse(existente?.biblias ?? rows.filter((a) => a.biblia).length)
    setRevistasClasse(existente?.revistas ?? rows.filter((a) => a.revista).length)
    setBibliasProf(existente?.bibliasProfessores ?? 0)
    setRevistasProf(existente?.revistasProfessores ?? 0)
    setOfertaProf(existente?.ofertaProfessores ?? 0)
    setCarregado(chave)
    setTurmaAberta('')
    setEditando(false)
  }

  if (turma && turma !== CHAMADA_PROFESSORES && turma !== turmaAberta && chave === carregado) {
    const daTurma = alunos.filter((a) => pessoas.some((p) => p.id === a.pessoaId))
    setBibliasClasse(daTurma.filter((a) => a.biblia).length)
    setRevistasClasse(daTurma.filter((a) => a.revista).length)
    setTurmaAberta(turma)
  }

  const visiveis = alunos.filter((a) => pessoas.some((p) => p.id === a.pessoaId))
  const existente = state.relatorios.find((r) => r.escolaId === escolaId && r.data === data)
  const finalizado = existente?.finalizado ?? false
  const bloqueado = finalizado && !editando
  const escola = state.escolas.find((e) => e.id === escolaId)
  const presentesProf = alunos.filter((a) => professores.some((p) => p.id === a.pessoaId) && a.presente).length

  function abrirProfessores() {
    navigate({ pathname: '/chamada', search: '?modo=professores' })
  }

  function abrirTurma(nome: string) {
    navigate({ pathname: '/chamada', search: `?turma=${encodeURIComponent(nome)}` })
  }

  function voltarHub() {
    setTurmaAberta('')
    navigate({ pathname: '/chamada' })
  }

  function montar(
    lista: ChamadaAluno[],
    extra: { visitantes: number; biblias: number; revistas: number; oferta: number; anotacao: string },
    parcial: { finalizado: boolean },
  ): RelatorioDiario {
    const idsAlunos = new Set(daEscola.filter((p) => p.tipo === 'Aluno').map((p) => p.id))
    const idsTurma = new Set(pessoas.map((p) => p.id))
    const todos = lista.filter((a) => daEscola.some((p) => p.id === a.pessoaId))
    const soAlunos = todos.filter((a) => idsAlunos.has(a.pessoaId))
    const pre = soAlunos.filter((a) => a.presente).length
    const bibliasOutros = todos.filter((a) => idsAlunos.has(a.pessoaId) && !idsTurma.has(a.pessoaId) && a.biblia).length
    const revistasOutros = todos.filter((a) => idsAlunos.has(a.pessoaId) && !idsTurma.has(a.pessoaId) && a.revista).length
    return {
      id: existente?.id ?? uid('rel'),
      escolaId,
      data,
      matriculados: soAlunos.length,
      presentes: pre,
      ausentes: Math.max(0, soAlunos.length - pre),
      visitantes: modoProfessores ? (existente?.visitantes ?? extra.visitantes) : extra.visitantes,
      biblias: modoProfessores ? (existente?.biblias ?? 0) : bibliasOutros + extra.biblias,
      revistas: modoProfessores ? (existente?.revistas ?? 0) : revistasOutros + extra.revistas,
      oferta: modoProfessores ? (existente?.oferta ?? 0) : extra.oferta,
      anotacao: modoProfessores ? (existente?.anotacao ?? '') : extra.anotacao,
      bibliasProfessores: modoProfessores ? extra.biblias : (existente?.bibliasProfessores ?? bibliasProf),
      revistasProfessores: modoProfessores ? extra.revistas : (existente?.revistasProfessores ?? revistasProf),
      ofertaProfessores: modoProfessores ? extra.oferta : (existente?.ofertaProfessores ?? ofertaProf),
      finalizado: parcial.finalizado,
      alunos: todos,
      updatedAt: new Date().toISOString(),
    }
  }

  function extrasAgora() {
    if (modoProfessores) {
      return {
        visitantes: existente?.visitantes ?? visitantes,
        biblias: bibliasProf,
        revistas: revistasProf,
        oferta: ofertaProf,
        anotacao: existente?.anotacao ?? anotacao,
      }
    }
    return { visitantes, biblias: bibliasClasse, revistas: revistasClasse, oferta, anotacao }
  }

  function salvar(lista: ChamadaAluno[], extra = extrasAgora(), finalizar = false) {
    if (bloqueado) return
    saveRelatorio(montar(lista, extra, { finalizado: finalizar || finalizado }))
  }

  function autoSalvar(lista: ChamadaAluno[], extra = extrasAgora()) {
    if (finalizado && !editando) return
    salvar(lista, extra)
  }

  function toggle(pessoaId: string, campo: keyof Omit<ChamadaAluno, 'pessoaId'>) {
    if (bloqueado) return
    let biblias = bibliasClasse
    let revistas = revistasClasse
    const next = alunos.map((a) => {
      if (a.pessoaId !== pessoaId) return a
      const row = { ...a, [campo]: !a[campo] }
      if (campo === 'presente' && !row.presente) {
        if (row.biblia) biblias = Math.max(0, biblias - 1)
        if (row.revista) revistas = Math.max(0, revistas - 1)
        row.biblia = false
        row.revista = false
        row.ofertou = false
        row.participacao = false
        row.pontosParticipacao = 0
      }
      if (campo !== 'presente' && row[campo]) row.presente = true
      if (campo === 'biblia') biblias = Math.max(0, biblias + (row.biblia ? 1 : -1))
      if (campo === 'revista') revistas = Math.max(0, revistas + (row.revista ? 1 : -1))
      return row
    })
    setAlunos(next)
    if (!modoProfessores) {
      setBibliasClasse(biblias)
      setRevistasClasse(revistas)
      autoSalvar(next, { ...extrasAgora(), biblias, revistas })
      return
    }
    autoSalvar(next)
  }

  function setPontosParticipacao(pessoaId: string, pontos: number) {
    if (bloqueado) return
    const n = Math.max(0, Math.round(pontos) || 0)
    const next = alunos.map((a) => {
      if (a.pessoaId !== pessoaId) return a
      return {
        ...a,
        presente: n > 0 ? true : a.presente,
        participacao: n > 0,
        pontosParticipacao: n,
      }
    })
    setAlunos(next)
    autoSalvar(next)
  }

  function setOfertaValor(valor: number) {
    if (bloqueado) return
    const v = Math.max(0, Math.round(valor * 100) / 100)
    if (modoProfessores) {
      setOfertaProf(v)
      autoSalvar(alunos, { ...extrasAgora(), oferta: v })
      return
    }
    setOferta(v)
    autoSalvar(alunos, { ...extrasAgora(), oferta: v })
  }

  function passo(campo: 'visitantes' | 'biblias' | 'revistas' | 'oferta', delta: number) {
    if (bloqueado) return
    if (modoProfessores) {
      const next = {
        visitantes: existente?.visitantes ?? 0,
        biblias: campo === 'biblias' ? Math.max(0, bibliasProf + delta) : bibliasProf,
        revistas: campo === 'revistas' ? Math.max(0, revistasProf + delta) : revistasProf,
        oferta: campo === 'oferta' ? Math.max(0, Math.round((ofertaProf + delta) * 100) / 100) : ofertaProf,
        anotacao: existente?.anotacao ?? '',
      }
      setBibliasProf(next.biblias)
      setRevistasProf(next.revistas)
      setOfertaProf(next.oferta)
      autoSalvar(alunos, next)
      return
    }
    const next = {
      visitantes: campo === 'visitantes' ? Math.max(0, visitantes + delta) : visitantes,
      biblias: campo === 'biblias' ? Math.max(0, bibliasClasse + delta) : bibliasClasse,
      revistas: campo === 'revistas' ? Math.max(0, revistasClasse + delta) : revistasClasse,
      oferta: campo === 'oferta' ? Math.max(0, Math.round((oferta + delta) * 100) / 100) : oferta,
      anotacao,
    }
    setVisitantes(next.visitantes)
    setBibliasClasse(next.biblias)
    setRevistasClasse(next.revistas)
    setOferta(next.oferta)
    autoSalvar(alunos, next)
  }

  if (ehProfessor && !turma) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink">Chamada</h1>
        <p className="text-sm text-muted">Seu usuário não tem turma vinculada. Peça ao superintendente para ajustar o cadastro.</p>
      </div>
    )
  }

  if (!turma || (turma === CHAMADA_PROFESSORES && !ehSuper)) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink">Chamada</h1>
        <p className="mb-4 text-sm text-muted">
          {ehSuper
            ? 'O superintendente lança a chamada de cada classe e a chamada dos professores.'
            : 'Presença das turmas da congregação.'}
        </p>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Data da aula</span>
            <AulaDateSelect value={data} onChange={setData} eventos={state.eventos} licoes={state.licoes} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Escola</span>
            <select
              className={inputClass}
              value={escolaId}
              disabled={!podeVerTudo && escolasVisiveis.length < 2}
              onChange={(e) => {
                setEscolaId(e.target.value)
                setTurmaAberta('')
              }}
            >
              {escolasVisiveis.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </label>
        </div>

        {ehSuper ? (
          <section className="mb-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Professores</h2>
            <button
              type="button"
              onClick={abrirProfessores}
              className="flex w-full items-center justify-between rounded-2xl border-2 border-gold bg-white px-4 py-3.5 text-left text-navy shadow-md"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-navy">
                  <GraduationCap size={20} />
                </span>
                <span>
                  <span className="block font-semibold">Chamada dos professores</span>
                  <span className="text-xs text-navy/65">
                    {presentesProf}/{professores.length} presentes · lista única, sem separar por classe
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-navy">Abrir</span>
            </button>
          </section>
        ) : null}

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Classes</h2>
          <ul className="space-y-2">
            {turmas.map((t) => {
              const daTurma = daEscola.filter((p) => p.turma === t && p.tipo === 'Aluno')
              const ids = new Set(daTurma.map((p) => p.id))
              const presentes = alunos.filter((a) => ids.has(a.pessoaId) && a.presente).length
              return (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => abrirTurma(t)}
                    className="flex w-full items-center justify-between rounded-2xl border-2 border-gold bg-white px-4 py-3.5 text-left text-navy shadow-md"
                  >
                    <span>
                      <span className="block font-semibold">{t}</span>
                      <span className="text-xs text-navy/65">{presentes}/{daTurma.length} presentes</span>
                    </span>
                    <span className="text-sm font-semibold text-navy">Abrir</span>
                  </button>
                </li>
              )
            })}
            {turmas.length === 0 ? (
              <li className="rounded-2xl border-2 border-gold bg-white px-4 py-8 text-center text-sm text-navy/70">Nenhuma turma nesta escola.</li>
            ) : null}
          </ul>
        </section>
      </div>
    )
  }

  if (modoProfessores) {
    return (
      <div className="pb-40 lg:pb-0">
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            className={roundBtnClass}
            aria-label="Voltar"
            onClick={voltarHub}
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-ink">Professores</h1>
            <p className="text-xs text-muted">
              {formatDateBR(data)}
              {escola ? ` · ${escola.nome.replace(/^IADESL 35 /, '')}` : null}
            </p>
          </div>
        </div>
        <div className="mb-4">
          <span className="mb-1 block text-[13px] font-medium">Data da aula</span>
          <AulaDateSelect value={data} onChange={setData} eventos={state.eventos} licoes={state.licoes} />
        </div>

        {finalizado && !editando ? (
          <div className="mb-3 flex flex-col gap-2 rounded-xl bg-emerald-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-emerald-800">Relatório finalizado. Você pode corrigir a chamada.</p>
            <PrimaryButton className="shrink-0" onClick={() => setEditando(true)}>
              <Pencil size={16} /> Editar
            </PrimaryButton>
          </div>
        ) : null}
        {finalizado && editando ? (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Editando chamada finalizada. Salve as alterações quando terminar.
          </p>
        ) : null}

        <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-ink">Chamada de professores</h2>
          <p className="mb-3 text-xs text-muted">
            Clique sobre os nomes dos professores para confirmar a presença. Após enviado, os relatórios poderão ser
            alterados pelos administradores.
          </p>
          <ul className="space-y-2">
            {pessoas.map((p) => {
              const a = visiveis.find((row) => row.pessoaId === p.id) ?? chamadaVazia(p.id)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={bloqueado}
                    onClick={() => toggle(p.id, 'presente')}
                    className={`flex w-full items-center justify-between rounded-2xl border-l-4 px-4 py-3.5 text-left ${
                      a.presente
                        ? 'border-l-emerald-500 bg-emerald-50/70'
                        : 'border-l-transparent bg-page'
                    } disabled:opacity-60`}
                  >
                    <span className="font-medium text-ink">{p.nome.split(' ')[0]}</span>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        a.presente ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-white'
                      }`}
                    >
                      <Check size={15} strokeWidth={3} />
                    </span>
                  </button>
                </li>
              )
            })}
            {pessoas.length === 0 ? (
              <li className="rounded-2xl bg-page px-4 py-8 text-center text-sm text-muted">
                Nenhum professor cadastrado nesta escola.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-ink">Relatório de professores</h2>
          <p className="mb-3 text-xs text-muted">
            Apenas os usuários administradores têm acesso ao relatório de professores. Você pode alterar os dados a
            qualquer momento.
          </p>
          <Stepper
            icon={<BookOpen size={18} className="text-emerald-600" />}
            label="Bíblias"
            value={String(bibliasProf)}
            disabled={bloqueado}
            onMinus={() => passo('biblias', -1)}
            onPlus={() => passo('biblias', 1)}
          />
          <Stepper
            icon={<NotebookPen size={18} className="text-amber-700" />}
            label="Revistas"
            value={String(revistasProf)}
            disabled={bloqueado}
            onMinus={() => passo('revistas', -1)}
            onPlus={() => passo('revistas', 1)}
          />
          <MoneyField
            icon={<Coins size={18} className="text-emerald-600" />}
            label="Oferta"
            value={ofertaProf}
            disabled={bloqueado}
            onChange={setOfertaValor}
            onMinus={() => passo('oferta', -1)}
            onPlus={() => passo('oferta', 1)}
          />
        </section>

        {bloqueado ? (
          <div className={acoesChamadaClass}>
            <PrimaryButton className="w-full" onClick={() => setEditando(true)}>
              <Pencil size={16} /> Editar chamada
            </PrimaryButton>
          </div>
        ) : finalizado ? (
          <div className={acoesChamadaClass}>
            <PrimaryButton
              className="w-full"
              onClick={() => {
                salvar(alunos)
                setEditando(false)
              }}
            >
              Salvar alterações
            </PrimaryButton>
            <GhostButton
              className="w-full"
              onClick={() => {
                setEditando(false)
                setCarregado('')
              }}
            >
              Cancelar
            </GhostButton>
          </div>
        ) : (
          <div className={acoesChamadaClass}>
            <PrimaryButton className="w-full tracking-wide" onClick={() => salvar(alunos)}>
              Enviar relatório
            </PrimaryButton>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pb-40 lg:pb-0">
      <div className="mb-4 flex items-center gap-2">
        {ehProfessor ? null : (
          <button
            type="button"
            className={roundBtnClass}
            aria-label="Voltar às turmas"
            onClick={voltarHub}
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-ink">{turma || 'Chamada'}</h1>
          <p className="text-xs text-muted">
            {formatDateBR(data)}
            {escola ? ` · ${escola.nome.replace(/^IADESL 35 /, '')}` : null}
            {ehProfessor ? ' · só a sua turma' : ehSuper ? ' · chamada da classe' : ' · chamada da congregação'}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <span className="mb-1 block text-[13px] font-medium">Data da aula</span>
        <AulaDateSelect value={data} onChange={setData} eventos={state.eventos} licoes={state.licoes} />
      </div>

      {finalizado && !editando ? (
        <div className="mb-3 flex flex-col gap-2 rounded-xl bg-emerald-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-emerald-800">Relatório finalizado. Você pode corrigir a chamada.</p>
          <PrimaryButton className="shrink-0" onClick={() => setEditando(true)}>
            <Pencil size={16} /> Editar
          </PrimaryButton>
        </div>
      ) : null}
      {finalizado && editando ? (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Editando chamada finalizada. Salve as alterações quando terminar.
        </p>
      ) : null}

      <section className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="px-4 pb-2 pt-4">
          <h2 className="font-semibold text-ink">Chamada dos alunos</h2>
          <p className="text-xs text-muted">Toque no nome para confirmar a presença. Ícones: oferta, revista e bíblia. Pontos de participação o professor digita.</p>
        </div>
        <ul>
          {visiveis.map((a) => {
            const p = pessoas.find((x) => x.id === a.pessoaId)
            if (!p) return null
            const pts = pontosDe(a)
            const primeiro = p.nome.split(' ')[0]
            return (
              <li
                key={a.pessoaId}
                className={`flex items-center gap-1 border-b border-line last:border-0 ${
                  a.presente ? 'border-l-4 border-l-emerald-500 bg-emerald-50/50' : 'border-l-4 border-l-transparent'
                }`}
              >
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => toggle(a.pessoaId, 'presente')}
                  className="min-w-0 flex-1 py-3 pl-3 text-left"
                >
                  <span className="font-medium text-ink">{primeiro}</span>
                  {pts > 0 ? <span className="ml-1.5 text-sm font-bold text-emerald-600">+{pts}</span> : null}
                </button>
                <div className="flex shrink-0 items-center gap-1 pr-2">
                  <PontosStepper
                    value={a.pontosParticipacao ?? 0}
                    disabled={bloqueado || !a.presente}
                    onChange={(n) => setPontosParticipacao(a.pessoaId, n)}
                  />
                  <IconBtn
                    label="Oferta"
                    on={a.ofertou}
                    disabled={bloqueado || !a.presente}
                    onClick={() => toggle(a.pessoaId, 'ofertou')}
                    activeClass="text-emerald-600"
                  >
                    <Coins size={20} />
                  </IconBtn>
                  <IconBtn
                    label="Revista"
                    on={a.revista}
                    disabled={bloqueado || !a.presente}
                    onClick={() => toggle(a.pessoaId, 'revista')}
                    activeClass="text-amber-700"
                  >
                    <NotebookPen size={20} />
                  </IconBtn>
                  <IconBtn
                    label="Bíblia"
                    on={a.biblia}
                    disabled={bloqueado || !a.presente}
                    onClick={() => toggle(a.pessoaId, 'biblia')}
                    activeClass="text-blue-700"
                  >
                    <BookOpen size={20} />
                  </IconBtn>
                </div>
              </li>
            )
          })}
          {visiveis.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted">Nenhum cadastro nesta turma.</li>
          ) : null}
        </ul>
      </section>

      <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-ink">Relatório da classe</h2>
        <p className="mb-3 text-xs text-muted">Use as setas para somar ou subtrair</p>
        <Stepper
          icon={<BookOpen size={18} className="text-blue-700" />}
          label="Bíblias"
          value={String(bibliasClasse)}
          disabled={bloqueado}
          onMinus={() => passo('biblias', -1)}
          onPlus={() => passo('biblias', 1)}
        />
        <Stepper
          icon={<NotebookPen size={18} className="text-amber-700" />}
          label="Revistas"
          value={String(revistasClasse)}
          disabled={bloqueado}
          onMinus={() => passo('revistas', -1)}
          onPlus={() => passo('revistas', 1)}
        />
        <Stepper
          icon={<Users size={18} className="text-navy" />}
          label="Visitantes"
          value={String(visitantes)}
          disabled={bloqueado}
          onMinus={() => passo('visitantes', -1)}
          onPlus={() => passo('visitantes', 1)}
        />
        <MoneyField
          icon={<Coins size={18} className="text-emerald-600" />}
          label="Oferta"
          value={oferta}
          disabled={bloqueado}
          onChange={setOfertaValor}
          onMinus={() => passo('oferta', -1)}
          onPlus={() => passo('oferta', 1)}
        />
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <input
            className={inputClass}
            placeholder="Insira uma anotação"
            disabled={bloqueado}
            value={anotacao}
            onChange={(e) => setAnotacao(e.target.value)}
            onBlur={() => autoSalvar(alunos, { ...extrasAgora(), anotacao })}
          />
          <button
            type="button"
            disabled={bloqueado}
            className={roundBtnClass}
            aria-label="Salvar anotação"
            onClick={() => autoSalvar(alunos)}
          >
            <Plus size={18} />
          </button>
        </div>
      </section>

      <div className={acoesChamadaClass}>
        {bloqueado ? (
          <>
            <span className="text-center text-sm font-medium text-emerald-300 lg:text-emerald-600">Relatório finalizado</span>
            <PrimaryButton className="w-full" onClick={() => setEditando(true)}>
              <Pencil size={16} /> Editar chamada
            </PrimaryButton>
          </>
        ) : finalizado ? (
          <>
            <PrimaryButton
              className="w-full"
              onClick={() => {
                salvar(alunos)
                setEditando(false)
              }}
            >
              Salvar alterações
            </PrimaryButton>
            <GhostButton
              className="w-full"
              onClick={() => {
                setEditando(false)
                setCarregado('')
              }}
            >
              Cancelar
            </GhostButton>
          </>
        ) : (
          <>
            <PrimaryButton className="w-full" onClick={() => salvar(alunos, extrasAgora(), true)}>
              <Check size={16} /> Finalizar
            </PrimaryButton>
            <GhostButton className="w-full" onClick={() => salvar(alunos)}>Salvar</GhostButton>
          </>
        )}
      </div>
    </div>
  )
}

function IconBtn({
  label,
  on,
  disabled,
  onClick,
  activeClass,
  children,
}: {
  label: string
  on: boolean
  disabled?: boolean
  onClick: () => void
  activeClass: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full shadow-sm ${
        on ? `${activeClass} bg-white ring-2 ring-current` : 'bg-navy text-white'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

function MoneyField({
  icon,
  label,
  value,
  disabled,
  onChange,
  onMinus,
  onPlus,
}: {
  icon: ReactNode
  label: string
  value: number
  disabled?: boolean
  onChange: (n: number) => void
  onMinus: () => void
  onPlus: () => void
}) {
  const [texto, setTexto] = useState(() => moneyBR(value))
  const [foco, setFoco] = useState(false)
  useEffect(() => {
    if (!foco) setTexto(moneyBR(value))
  }, [value, foco])
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="flex items-center gap-3 text-sm font-medium">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          aria-label={`Diminuir ${label}`}
          onClick={onMinus}
          className={stepBtnClass}
        >
          <ChevronDown size={18} />
        </button>
        <input
          data-oferta="1"
          className="h-9 w-[7.5rem] rounded-lg border border-line bg-white px-2 text-center text-base font-semibold outline-none focus:border-navy disabled:opacity-40"
          disabled={disabled}
          inputMode="decimal"
          value={texto}
          onFocus={() => {
            setFoco(true)
            setTexto(value ? String(value).replace('.', ',') : '')
          }}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => {
            const n = parseMoneyBR(texto)
            const v = n ?? value
            onChange(v)
            setTexto(moneyBR(v))
            setFoco(false)
          }}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={`Aumentar ${label}`}
          onClick={onPlus}
          className={stepBtnClass}
        >
          <ChevronUp size={18} />
        </button>
      </span>
    </div>
  )
}

function PontosStepper({
  value,
  disabled,
  onChange,
}: {
  value: number
  disabled?: boolean
  onChange: (n: number) => void
}) {
  return (
    <span className="flex items-center">
      <button
        type="button"
        disabled={disabled || value <= 0}
        aria-label="Diminuir pontos"
        title="Pontos de participação"
        onClick={(e) => {
          e.stopPropagation()
          onChange(Math.max(0, value - 1))
        }}
        className={stepBtnClass}
      >
        <ChevronDown size={18} />
      </button>
      <span className="min-w-5 text-center text-base font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        disabled={disabled}
        aria-label="Aumentar pontos"
        title="Pontos de participação"
        onClick={(e) => {
          e.stopPropagation()
          onChange(value + 1)
        }}
        className={stepBtnClass}
      >
        <ChevronUp size={18} />
      </button>
    </span>
  )
}

function Stepper({
  icon,
  label,
  value,
  disabled,
  onMinus,
  onPlus,
}: {
  icon: ReactNode
  label: string
  value: string
  disabled?: boolean
  onMinus: () => void
  onPlus: () => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-3 text-sm font-medium">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          aria-label={`Diminuir ${label}`}
          onClick={onMinus}
          className={stepBtnClass}
        >
          <ChevronDown size={18} />
        </button>
        <span className="min-w-12 text-center text-sm font-semibold">{value}</span>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Aumentar ${label}`}
          onClick={onPlus}
          className={stepBtnClass}
        >
          <ChevronUp size={18} />
        </button>
      </span>
    </div>
  )
}
