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
import { Field, GhostButton, Modal, PrimaryButton, inputClass, roundBtnClass, stepBtnClass } from '../components/ui'
import { apiConferirSenha, apiToken } from '../lib/api'
import { EVENTO_SYNC } from '../lib/native'
import { perfilDe } from '../lib/perfis'
import { useStore } from '../lib/store'
import { turmasDaEscola } from '../lib/stats'
import { chamadaVazia, pontosDe, type ChamadaAluno, type ChamadaClasse, type RelatorioDiario } from '../lib/types'
import { formatDateBR, lastSunday, moneyBR, parseMoneyBR, toISODate, uid } from '../lib/utils'

const CHAMADA_PROFESSORES = '__professores__'
const acoesChamadaClass =
  'fixed inset-x-0 z-40 flex flex-row flex-wrap items-stretch gap-1.5 border-t-2 border-gold bg-navy px-2 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] bottom-[calc(3.25rem+max(env(safe-area-inset-bottom),var(--safe-bottom,0px)))] lg:static lg:inset-auto lg:z-auto lg:flex-col lg:gap-2 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none'
const acaoBtnClass = '!w-auto min-w-0 flex-1 basis-0 !px-1.5 !text-[12px] leading-tight lg:!w-full lg:flex-none lg:basis-auto lg:!px-4 lg:!text-sm'

export function ChamadaPage() {
  const { state, escolasVisiveis, saveRelatorio, usuario, podeVerTudo, ehProfessor, bloqueiaChamadaEFinanceiro: planoTravado } = useStore()
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
  const hoje = toISODate(new Date())
  const [dataLiberada, setDataLiberada] = useState(hoje)
  const [dataPendente, setDataPendente] = useState<string | null>(null)
  const [pedirSenha, setPedirSenha] = useState(false)
  const [senhaDesfazer, setSenhaDesfazer] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [conferindo, setConferindo] = useState(false)

  useEffect(() => {
    if (data !== hoje && data !== dataLiberada) setDataPendente(data)
  }, [data, hoje, dataLiberada])

  useEffect(() => {
    window.dispatchEvent(new Event(EVENTO_SYNC))
  }, [])

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

  const existente = state.relatorios.find((r) => r.escolaId === escolaId && r.data === data)
  const classeAberta = turma && turma !== CHAMADA_PROFESSORES ? existente?.classes?.find((c) => c.turma === turma) : undefined

  if (chave !== carregado && escolaId) {
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
    const daTurmaRows =
      turma && turma !== CHAMADA_PROFESSORES
        ? rows.filter((a) => daEscola.some((p) => p.id === a.pessoaId && p.tipo === 'Aluno' && p.turma === turma))
        : rows
    setAlunos(rows)
    setVisitantes(classeAberta ? classeAberta.visitantes : turma && turma !== CHAMADA_PROFESSORES ? 0 : (existente?.visitantes ?? 0))
    setOferta(classeAberta ? classeAberta.oferta : turma && turma !== CHAMADA_PROFESSORES ? 0 : (existente?.oferta ?? 0))
    setAnotacao(classeAberta ? (classeAberta.anotacao ?? '') : turma && turma !== CHAMADA_PROFESSORES ? '' : (existente?.anotacao ?? ''))
    setBibliasClasse(classeAberta?.biblias ?? daTurmaRows.filter((a) => a.biblia).length)
    setRevistasClasse(classeAberta?.revistas ?? daTurmaRows.filter((a) => a.revista).length)
    setBibliasProf(existente?.bibliasProfessores ?? 0)
    setRevistasProf(existente?.revistasProfessores ?? 0)
    setOfertaProf(existente?.ofertaProfessores ?? 0)
    setCarregado(chave)
    setTurmaAberta(turma)
    setEditando(false)
  }

  if (chave === carregado && turma !== turmaAberta) {
    if (turma && turma !== CHAMADA_PROFESSORES) {
      const daTurma = alunos.filter((a) => daEscola.some((p) => p.id === a.pessoaId && p.tipo === 'Aluno' && p.turma === turma))
      setOferta(classeAberta?.oferta ?? 0)
      setVisitantes(classeAberta?.visitantes ?? 0)
      setAnotacao(classeAberta?.anotacao ?? '')
      setBibliasClasse(classeAberta?.biblias ?? daTurma.filter((a) => a.biblia).length)
      setRevistasClasse(classeAberta?.revistas ?? daTurma.filter((a) => a.revista).length)
    }
    if (turma === CHAMADA_PROFESSORES) {
      setBibliasProf(existente?.bibliasProfessores ?? 0)
      setRevistasProf(existente?.revistasProfessores ?? 0)
      setOfertaProf(existente?.ofertaProfessores ?? 0)
    }
    setTurmaAberta(turma)
    setEditando(false)
  }

  const visiveis = alunos
    .filter((a) => pessoas.some((p) => p.id === a.pessoaId))
    .sort((a, b) => {
      const na = pessoas.find((p) => p.id === a.pessoaId)?.nome ?? ''
      const nb = pessoas.find((p) => p.id === b.pessoaId)?.nome ?? ''
      return na.localeCompare(nb, 'pt-BR')
    })
  const finalizado = modoProfessores ? !!existente?.professoresFinalizada : !!classeAberta?.finalizada
  const classeSalva = modoProfessores ? !!existente?.professoresSalva : !!classeAberta?.salva
  const bloqueado = planoTravado || (finalizado && !editando)
  const avisoConsulta = planoTravado ? (
    <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      Plano vencido: a chamada está só para consulta. Relatórios já lançados continuam visíveis.
    </p>
  ) : null
  const acoesConsulta = planoTravado ? (
    <p className="text-center text-sm font-medium text-amber-100 lg:text-amber-800">
      Só consulta — renove o plano para lançar presença.
    </p>
  ) : null
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

  function mesclarClasses(
    extra: { visitantes: number; biblias: number; revistas: number; oferta: number; anotacao: string },
    opts?: { salvarClasse?: boolean; finalizarClasse?: boolean; desfazer?: boolean },
  ): ChamadaClasse[] {
    const prev = existente?.classes ?? []
    if (modoProfessores || !turma) return prev
    if (opts?.desfazer) return prev.filter((c) => c.turma !== turma)
    const anterior = prev.find((c) => c.turma === turma)
    const atual: ChamadaClasse = {
      turma,
      oferta: extra.oferta,
      visitantes: extra.visitantes,
      biblias: extra.biblias,
      revistas: extra.revistas,
      anotacao: extra.anotacao,
      salva: !!(opts?.salvarClasse || opts?.finalizarClasse || anterior?.salva),
      finalizada: opts?.finalizarClasse ? true : !!anterior?.finalizada,
    }
    return [...prev.filter((c) => c.turma !== turma), atual]
  }

  function montar(
    lista: ChamadaAluno[],
    extra: { visitantes: number; biblias: number; revistas: number; oferta: number; anotacao: string },
    opts?: { salvarClasse?: boolean; finalizarClasse?: boolean; desfazer?: boolean },
  ): RelatorioDiario {
    const classes = mesclarClasses(extra, opts)
    const nomesTurmas = [...new Set(daEscola.filter((p) => p.tipo === 'Aluno' && p.turma).map((p) => p.turma))]
    const salvas = new Set(classes.filter((c) => c.salva).map((c) => c.turma))
    const idsSalvos = new Set(
      daEscola.filter((p) => p.tipo === 'Aluno' && p.turma && salvas.has(p.turma)).map((p) => p.id),
    )
    const todos = lista.filter((a) => daEscola.some((p) => p.id === a.pessoaId))
    const considerados = todos.filter((a) => idsSalvos.has(a.pessoaId))
    const temSalva = classes.some((c) => c.salva)
    const pre = considerados.filter((a) => a.presente).length
    const manterLegado = !opts?.desfazer && !temSalva && !opts?.salvarClasse && !opts?.finalizarClasse && !!existente
    const diaFinalizado = nomesTurmas.length > 0 && nomesTurmas.every((nome) => salvas.has(nome))
    const anotacoes = classes.map((c) => c.anotacao?.trim()).filter(Boolean).join(' · ')
    return {
      id: existente?.id ?? uid('rel'),
      escolaId,
      data,
      matriculados: manterLegado ? existente.matriculados : considerados.length,
      presentes: manterLegado ? existente.presentes : pre,
      ausentes: manterLegado ? existente.ausentes : Math.max(0, considerados.length - pre),
      visitantes: modoProfessores
        ? (existente?.visitantes ?? 0)
        : manterLegado
          ? existente.visitantes
          : classes.filter((c) => c.salva).reduce((s, c) => s + c.visitantes, 0),
      biblias: modoProfessores
        ? (existente?.biblias ?? 0)
        : manterLegado
          ? existente.biblias
          : classes.filter((c) => c.salva).reduce((s, c) => s + c.biblias, 0),
      revistas: modoProfessores
        ? (existente?.revistas ?? 0)
        : manterLegado
          ? existente.revistas
          : classes.filter((c) => c.salva).reduce((s, c) => s + c.revistas, 0),
      oferta: modoProfessores
        ? (existente?.oferta ?? 0)
        : manterLegado
          ? existente.oferta
          : classes.filter((c) => c.salva).reduce((s, c) => s + c.oferta, 0),
      anotacao: modoProfessores ? (existente?.anotacao ?? '') : anotacoes,
      bibliasProfessores: modoProfessores ? extra.biblias : (existente?.bibliasProfessores ?? bibliasProf),
      revistasProfessores: modoProfessores ? extra.revistas : (existente?.revistasProfessores ?? revistasProf),
      ofertaProfessores: modoProfessores ? extra.oferta : (existente?.ofertaProfessores ?? ofertaProf),
      finalizado: diaFinalizado,
      professoresSalva: modoProfessores
        ? opts?.desfazer
          ? false
          : !!(opts?.salvarClasse || opts?.finalizarClasse || existente?.professoresSalva)
        : !!existente?.professoresSalva,
      professoresFinalizada: modoProfessores
        ? opts?.desfazer
          ? false
          : opts?.finalizarClasse
            ? true
            : !!existente?.professoresFinalizada
        : !!existente?.professoresFinalizada,
      classes,
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

  function salvar(
    lista: ChamadaAluno[],
    extra = extrasAgora(),
    opts?: { salvarClasse?: boolean; finalizarClasse?: boolean; desfazer?: boolean },
  ) {
    if (planoTravado || (finalizado && !editando && !opts?.desfazer)) return
    saveRelatorio(montar(lista, extra, opts), {
      turma: modoProfessores ? 'Professores' : turma || undefined,
    })
  }

  function autoSalvar(lista: ChamadaAluno[], extra = extrasAgora()) {
    if (finalizado && !editando) return
    salvar(lista, extra)
  }

  function toggle(pessoaId: string, campo: keyof Omit<ChamadaAluno, 'pessoaId'>) {
    if (bloqueado) return
    let biblias = modoProfessores ? bibliasProf : bibliasClasse
    let revistas = modoProfessores ? revistasProf : revistasClasse
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
    if (modoProfessores) {
      setBibliasProf(biblias)
      setRevistasProf(revistas)
    } else {
      setBibliasClasse(biblias)
      setRevistasClasse(revistas)
    }
    autoSalvar(next, { ...extrasAgora(), biblias, revistas })
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

  function escolherData(iso: string) {
    if (iso === hoje || iso === dataLiberada) {
      setDataPendente(null)
      setData(iso)
      return
    }
    setDataPendente(iso)
  }

  function aceitarData() {
    if (!dataPendente) return
    setDataLiberada(dataPendente)
    setData(dataPendente)
    setDataPendente(null)
  }

  function recusarData() {
    setDataPendente(null)
    if (data !== hoje) setData(hoje)
  }

  function desfazerChamada() {
    const ids = new Set(pessoas.map((p) => p.id))
    const lista = alunos.map((a) => (ids.has(a.pessoaId) ? chamadaVazia(a.pessoaId) : a))
    setAlunos(lista)
    setEditando(false)
    if (modoProfessores) {
      setBibliasProf(0)
      setRevistasProf(0)
      setOfertaProf(0)
      salvar(lista, {
        visitantes: existente?.visitantes ?? 0,
        biblias: 0,
        revistas: 0,
        oferta: 0,
        anotacao: existente?.anotacao ?? '',
      }, { desfazer: true })
      return
    }
    setVisitantes(0)
    setBibliasClasse(0)
    setRevistasClasse(0)
    setOferta(0)
    setAnotacao('')
    salvar(lista, { visitantes: 0, biblias: 0, revistas: 0, oferta: 0, anotacao: '' }, { desfazer: true })
  }

  async function confirmarDesfazer() {
    const senha = senhaDesfazer.trim()
    if (!senha) {
      setErroSenha('Informe a senha de acesso.')
      return
    }
    setConferindo(true)
    setErroSenha('')
    try {
      if (apiToken()) {
        try {
          await apiConferirSenha(senha)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Senha incorreta.'
          const localOk = !!usuario && !usuario.senha.startsWith('$2') && usuario.senha === senha
          if (!localOk || !/conex/i.test(msg)) {
            setErroSenha(localOk ? 'Senha incorreta.' : msg)
            return
          }
        }
      } else if (!usuario || usuario.senha.startsWith('$2') || usuario.senha !== senha) {
        setErroSenha('Senha incorreta.')
        return
      }
      desfazerChamada()
      setPedirSenha(false)
      setSenhaDesfazer('')
    } finally {
      setConferindo(false)
    }
  }

  const btnDesfazer = planoTravado ? null : (
    <GhostButton
      className={acaoBtnClass}
      onClick={() => {
        setSenhaDesfazer('')
        setErroSenha('')
        setPedirSenha(true)
      }}
    >
      Desfazer
    </GhostButton>
  )

  const avisos = (
    <>
      <Modal open={!!dataPendente} title="Data diferente de hoje" onClose={recusarData}>
        <p className="text-sm leading-6 text-ink">
          A chamada selecionada é de <b>{dataPendente ? formatDateBR(dataPendente) : ''}</b>, e hoje é <b>{formatDateBR(hoje)}</b>.
          Tem certeza que quer lançar nesta data?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <GhostButton onClick={recusarData}>Cancelar</GhostButton>
          <PrimaryButton onClick={aceitarData}>Tenho certeza</PrimaryButton>
        </div>
      </Modal>
      <Modal
        open={pedirSenha}
        title="Desfazer chamada"
        onClose={() => {
          if (conferindo) return
          setPedirSenha(false)
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void confirmarDesfazer()
          }}
        >
          <p className="mb-3 text-sm leading-6 text-ink">
            A presença, a oferta e o relatório desta chamada voltam ao início, como se não tivessem sido lançados.
            Confirme com a senha de acesso.
          </p>
          <Field label="Senha de acesso">
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              value={senhaDesfazer}
              onChange={(e) => setSenhaDesfazer(e.target.value)}
            />
          </Field>
          {erroSenha ? <p className="mt-2 text-sm text-red-600">{erroSenha}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setPedirSenha(false)} disabled={conferindo}>Cancelar</GhostButton>
            <PrimaryButton type="submit" disabled={conferindo}>Desfazer</PrimaryButton>
          </div>
        </form>
      </Modal>
    </>
  )

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
            ? 'Cada classe tem a própria chamada e a própria oferta. Salvar uma classe deixa as outras pendentes.'
            : 'Presença das turmas da congregação. Cada classe é salva à parte.'}
        </p>
        {avisoConsulta}
        {avisos}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Data da aula</span>
            <AulaDateSelect value={data} onChange={escolherData} eventos={state.eventos} licoes={state.licoes} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Congregação</span>
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
                    {existente?.professoresSalva ? 'Salva' : 'Pendente'} · {presentesProf}/{professores.length} presentes
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
              const classe = existente?.classes?.find((c) => c.turma === t)
              const salva = !!classe?.salva
              return (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => abrirTurma(t)}
                    className="flex w-full items-center justify-between rounded-2xl border-2 border-gold bg-white px-4 py-3.5 text-left text-navy shadow-md"
                  >
                    <span>
                      <span className="block font-semibold">{t}</span>
                      <span className={`text-xs ${salva ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {salva ? 'Salva' : 'Pendente'} · {presentes}/{daTurma.length} presentes
                        {salva ? ` · oferta ${moneyBR(classe?.oferta ?? 0)}` : ''}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-navy">{salva ? 'Abrir' : 'Fazer chamada'}</span>
                  </button>
                </li>
              )
            })}
            {turmas.length === 0 ? (
              <li className="rounded-2xl border-2 border-gold bg-white px-4 py-8 text-center text-sm text-navy/70">Nenhuma turma nesta congregação.</li>
            ) : null}
          </ul>
        </section>
      </div>
    )
  }

  if (modoProfessores) {
    return (
      <div className="pb-24 lg:pb-0">
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
          <AulaDateSelect value={data} onChange={escolherData} eventos={state.eventos} licoes={state.licoes} />
        </div>

        {avisoConsulta}
        {avisos}
        {planoTravado ? null : classeSalva && !finalizado ? (
          <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Relatório dos professores enviado.
          </p>
        ) : null}
        {planoTravado ? null : finalizado && !editando ? (
          <div className="mb-3 flex flex-col gap-2 rounded-xl bg-emerald-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-emerald-800">Chamada dos professores finalizada. Você pode corrigir.</p>
            <PrimaryButton className="shrink-0" onClick={() => setEditando(true)}>
              <Pencil size={16} /> Editar
            </PrimaryButton>
          </div>
        ) : null}
        {finalizado && editando ? (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Editando chamada finalizada dos professores. Salve as alterações quando terminar.
          </p>
        ) : null}

        <section className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="px-4 pb-2 pt-4">
            <h2 className="font-semibold text-ink">Chamada de professores</h2>
            <p className="text-xs text-muted">Toque no nome para confirmar a presença. Ícones: oferta, revista e bíblia.</p>
          </div>
          <ul>
            {pessoas.map((p) => {
              const a = visiveis.find((row) => row.pessoaId === p.id) ?? chamadaVazia(p.id)
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-1 border-b border-line last:border-b-0 ${
                    a.presente ? 'bg-emerald-50 shadow-[inset_4px_0_0_0_#10b981]' : ''
                  }`}
                >
                  <button
                    type="button"
                    disabled={bloqueado}
                    onClick={() => toggle(p.id, 'presente')}
                    className="min-w-0 flex-1 py-3 pl-3 text-left"
                  >
                    <span className="break-words font-medium leading-snug text-ink">{p.nome}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1 pr-2">
                    <IconBtn
                      label="Oferta"
                      on={a.ofertou}
                      disabled={bloqueado || !a.presente}
                      onClick={() => toggle(p.id, 'ofertou')}
                      activeClass="text-emerald-600"
                    >
                      <Coins size={20} />
                    </IconBtn>
                    <IconBtn
                      label="Revista"
                      on={a.revista}
                      disabled={bloqueado || !a.presente}
                      onClick={() => toggle(p.id, 'revista')}
                      activeClass="text-amber-700"
                    >
                      <NotebookPen size={20} />
                    </IconBtn>
                    <IconBtn
                      label="Bíblia"
                      on={a.biblia}
                      disabled={bloqueado || !a.presente}
                      onClick={() => toggle(p.id, 'biblia')}
                      activeClass="text-blue-700"
                    >
                      <BookOpen size={20} />
                    </IconBtn>
                  </div>
                </li>
              )
            })}
            {pessoas.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted">Nenhum professor cadastrado nesta congregação.</li>
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

        {planoTravado ? (
          <div className={acoesChamadaClass}>{acoesConsulta}</div>
        ) : bloqueado ? (
          <div className={acoesChamadaClass}>
            <PrimaryButton className={acaoBtnClass} onClick={() => setEditando(true)}>
              <Pencil size={16} /> Editar chamada
            </PrimaryButton>
            {btnDesfazer}
          </div>
        ) : finalizado ? (
          <div className={acoesChamadaClass}>
            <PrimaryButton
              className={acaoBtnClass}
              onClick={() => {
                salvar(alunos, extrasAgora(), { salvarClasse: true, finalizarClasse: true })
                setEditando(false)
              }}
            >
              Salvar alterações
            </PrimaryButton>
            <GhostButton
              className={acaoBtnClass}
              onClick={() => {
                setEditando(false)
                setCarregado('')
              }}
            >
              Cancelar
            </GhostButton>
            {btnDesfazer}
          </div>
        ) : (
          <div className={acoesChamadaClass}>
            <PrimaryButton className={`${acaoBtnClass} tracking-wide`} onClick={() => salvar(alunos, extrasAgora(), { salvarClasse: true })}>
              {classeSalva ? (
                <>
                  <Check size={16} /> Relatório enviado
                </>
              ) : (
                'Enviar relatório'
              )}
            </PrimaryButton>
            {btnDesfazer}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pb-24 lg:pb-0">
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
        <AulaDateSelect value={data} onChange={escolherData} eventos={state.eventos} licoes={state.licoes} />
      </div>

      {avisoConsulta}
      {avisos}
      {planoTravado ? null : classeSalva && !finalizado ? (
        <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Chamada desta classe salva. As outras classes do dia continuam pendentes até serem abertas e salvas.
        </p>
      ) : null}
      {planoTravado ? null : finalizado && !editando ? (
        <div className="mb-3 flex flex-col gap-2 rounded-xl bg-emerald-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-emerald-800">Chamada desta classe finalizada. As outras classes não são alteradas.</p>
          <PrimaryButton className="shrink-0" onClick={() => setEditando(true)}>
            <Pencil size={16} /> Editar
          </PrimaryButton>
        </div>
      ) : null}
      {finalizado && editando ? (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Editando chamada finalizada desta classe. Salve as alterações quando terminar.
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
            return (
              <li
                key={a.pessoaId}
                className={`flex items-center gap-1 border-b border-line last:border-b-0 ${
                  a.presente ? 'bg-emerald-50 shadow-[inset_4px_0_0_0_#10b981]' : ''
                }`}
              >
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => toggle(a.pessoaId, 'presente')}
                  className="min-w-0 flex-1 py-3 pl-3 text-left"
                >
                  <span className="break-words font-medium leading-snug text-ink">{p.nome}</span>
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
        {planoTravado ? (
          acoesConsulta
        ) : bloqueado ? (
          <>
            <span className="basis-full text-center text-sm font-medium text-emerald-300 lg:text-emerald-600">Chamada desta classe finalizada</span>
            <PrimaryButton className={acaoBtnClass} onClick={() => setEditando(true)}>
              <Pencil size={16} /> Editar chamada
            </PrimaryButton>
          </>
        ) : finalizado ? (
          <>
            <PrimaryButton
              className={acaoBtnClass}
              onClick={() => {
                salvar(alunos, extrasAgora(), { salvarClasse: true, finalizarClasse: true })
                setEditando(false)
              }}
            >
              Salvar alterações
            </PrimaryButton>
            <GhostButton
              className={acaoBtnClass}
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
            <PrimaryButton className={acaoBtnClass} onClick={() => salvar(alunos, extrasAgora(), { salvarClasse: true, finalizarClasse: true })}>
              <Check size={16} /> Finalizar
            </PrimaryButton>
            <GhostButton className={acaoBtnClass} onClick={() => salvar(alunos, extrasAgora(), { salvarClasse: true })}>Salvar</GhostButton>
          </>
        )}
        {btnDesfazer}
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
