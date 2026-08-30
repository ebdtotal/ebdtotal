import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createEmptyIgrejaState, createSeedState } from './seed'
import {
  apiAlterarSenha,
  apiGetState,
  apiLogin,
  apiLogout,
  apiSaveState,
  apiToken,
  setApiToken,
} from './api'
import { acharVarianteTurma, catalogoDeLicao, chaveAula, deduplicarLicoes, ehLicaoGeral, idCatalogoPadrao } from './acompanhamento'
import { ehAppNativo, EVENTO_SYNC } from './native'
import {
  CAT_OFERTA_EBD_ID,
  CAT_REVISTAS_VENDIDAS_ID,
  garantirCategorias,
  idLancOfertaClasse,
  idLancRevista,
  revistaGeraReceita,
} from './ebdSetores'
import { catalogoCresceu, hidratarEstado } from './pedagogia'
import type {
  AppState,
  Avaliacao,
  Aviso,
  Certificado,
  CategoriaFinanceira,
  CursoProfessor,
  Escola,
  EventoCalendario,
  LancamentoFinanceiro,
  Licao,
  MetaEscola,
  ModeloCertificado,
  Pessoa,
  RelatorioDiario,
  RevistaControle,
  SetorAcesso,
  SetorEbd,
  TurmaCadastro,
  Usuario,
} from './types'
import { formatDateBR, senhaGerada, toISODate, uid, usernameFromNome, whatsappSuporte } from './utils'

const STORAGE_KEY = 'portal-ebd-v7'

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeedState()
    const parsed = JSON.parse(raw) as AppState
    if (!parsed.usuarios) return createSeedState()
    const seed = createEmptyIgrejaState()
    return hidratarEstado({
      ...seed,
      ...parsed,
      turmas: parsed.turmas ?? seed.turmas,
      lancamentos: parsed.lancamentos ?? seed.lancamentos,
      licoes: parsed.licoes ?? seed.licoes,
      eventos: parsed.eventos ?? seed.eventos,
      avaliacoes: parsed.avaliacoes ?? seed.avaliacoes,
      metas: parsed.metas?.length ? parsed.metas : seed.metas,
      avisos: parsed.avisos ?? seed.avisos,
      desafios: parsed.desafios ?? seed.desafios,
      certificados: parsed.certificados ?? seed.certificados,
      modeloCertificado: parsed.modeloCertificado ?? seed.modeloCertificado,
      licoesRemovidas: parsed.licoesRemovidas ?? seed.licoesRemovidas,
      avaliacoesRemovidas: parsed.avaliacoesRemovidas ?? seed.avaliacoesRemovidas,
      certificadosRemovidos: parsed.certificadosRemovidos ?? seed.certificadosRemovidos,
      pessoasRemovidas: parsed.pessoasRemovidas ?? seed.pessoasRemovidas,
      escolasRemovidas: parsed.escolasRemovidas ?? seed.escolasRemovidas,
      turmasRemovidas: parsed.turmasRemovidas ?? seed.turmasRemovidas,
      usuariosRemovidos: parsed.usuariosRemovidos ?? seed.usuariosRemovidos,
      lancamentosRemovidos: parsed.lancamentosRemovidos ?? seed.lancamentosRemovidos,
      avisosRemovidos: parsed.avisosRemovidos ?? seed.avisosRemovidos,
      eventosRemovidos: parsed.eventosRemovidos ?? seed.eventosRemovidos,
      setoresRemovidos: parsed.setoresRemovidos ?? seed.setoresRemovidos,
      cursosRemovidos: parsed.cursosRemovidos ?? seed.cursosRemovidos,
      categoriasFinanceiras: parsed.categoriasFinanceiras ?? seed.categoriasFinanceiras,
      setoresEbd: parsed.setoresEbd ?? seed.setoresEbd,
      revistas: parsed.revistas ?? seed.revistas,
      categoriasRemovidas: parsed.categoriasRemovidas ?? seed.categoriasRemovidas,
      setoresEbdRemovidos: parsed.setoresEbdRemovidos ?? seed.setoresEbdRemovidos,
      revistasRemovidas: parsed.revistasRemovidas ?? seed.revistasRemovidas,
      cursos: parsed.cursos?.length ? parsed.cursos : seed.cursos,
      progressos: parsed.progressos ?? seed.progressos,
      rankingCompetitivo: parsed.rankingCompetitivo ?? false,
      whatsapp: whatsappSuporte(parsed.whatsapp),
      sessaoId: parsed.sessaoId ?? null,
    })
  } catch {
    return createSeedState()
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let savePending = 0
let saveRetries = 0
let lastRemoteAt = ''
let syncGeracao = 0
let latestToSave: AppState | null = null
let canalSync: BroadcastChannel | null = null
try {
  canalSync = new BroadcastChannel('ebd-sync')
} catch {
  canalSync = null
}

function agoraIso() {
  return new Date().toISOString()
}

function cacheLocal(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota do WebView */
  }
}

function persist(state: AppState, imediato = false) {
  latestToSave = state
  cacheLocal(state)
  if (!apiToken()) return
  if (saveTimer) clearTimeout(saveTimer)
  const enviar = () => {
    saveTimer = null
    const payload = latestToSave
    if (!payload) return
    savePending += 1
    syncGeracao += 1
    void apiSaveState(payload)
      .then((res) => {
        saveRetries = 0
        if (res.updatedAt) lastRemoteAt = res.updatedAt
        try {
          canalSync?.postMessage('saved')
        } catch {
          /* */
        }
      })
      .catch(() => {
        saveRetries += 1
        const retry = latestToSave
        if (saveRetries <= 3 && retry && apiToken()) {
          window.setTimeout(() => persist(retry, true), 1500)
        }
      })
      .finally(() => {
        savePending = Math.max(0, savePending - 1)
        if (savePending === 0 && saveRetries === 0) window.dispatchEvent(new Event(EVENTO_SYNC))
      })
  }
  if (imediato) {
    enviar()
    return
  }
  saveTimer = setTimeout(enviar, 200)
}

export type AcessoApp = { username: string; senha: string; email?: string }

const SUFIXO_PAPEL = { professor: 'prof', aluno: 'aluno', superintendente: 'super', secretario: 'sec' } as const

function usernameUnico(usuarios: Usuario[], base: string, exceptId?: string): string {
  let username = base
  let n = 1
  while (usuarios.some((u) => u.id !== exceptId && u.username.toLowerCase() === username.toLowerCase())) {
    n += 1
    username = `${base}${n}`
  }
  return username
}

export function sugestaoUsername(nome: string, papel: keyof typeof SUFIXO_PAPEL, usuarios: Usuario[], exceptId?: string) {
  const base = `${usernameFromNome(nome)}.${SUFIXO_PAPEL[papel]}`
  return usernameUnico(usuarios, base, exceptId)
}

function papelDaPessoa(tipo: Pessoa['tipo']): 'professor' | 'aluno' | 'superintendente' | 'secretario' | null {
  if (tipo === 'Professor') return 'professor'
  if (tipo === 'Aluno') return 'aluno'
  if (tipo === 'Superintendente') return 'superintendente'
  if (tipo === 'Secretário') return 'secretario'
  return null
}

function garantirLogin(
  usuarios: Usuario[],
  pessoa: Pessoa,
  papel: 'professor' | 'aluno' | 'superintendente' | 'secretario',
  acesso?: AcessoApp | null,
): Usuario[] {
  const daPessoa = usuarios.filter((u) => u.pessoaId === pessoa.id)
  const existente = daPessoa.find((u) => u.papel === papel) ?? daPessoa[0]
  const usernameInformado = (acesso?.username ?? '').trim().toLowerCase()
  const senhaInformada = (acesso?.senha ?? '').trim()
  const email = (acesso?.email ?? pessoa.email ?? existente?.email ?? '').trim().toLowerCase()
  if (existente) {
    const username = usernameInformado
      ? usernameUnico(usuarios, usernameInformado, existente.id)
      : existente.username
    return usuarios
      .filter((u) => u.pessoaId !== pessoa.id || u.id === existente.id)
      .map((u) =>
        u.id === existente.id
          ? {
              ...u,
              nome: pessoa.nome,
              escolaId: pessoa.escolaId,
              turma: pessoa.turma,
              papel,
              username,
              senha: senhaInformada || u.senha,
              email,
            }
          : u,
      )
  }
  const username = usernameInformado
    ? usernameUnico(usuarios, usernameInformado)
    : sugestaoUsername(pessoa.nome, papel, usuarios)
  return [
    ...usuarios,
    {
      id: uid('u'),
      nome: pessoa.nome,
      username,
      senha: senhaInformada || senhaGerada(),
      papel,
      escolaId: pessoa.escolaId,
      pessoaId: pessoa.id,
      turma: pessoa.turma,
      email,
    },
  ]
}

function garantirTurma(turmas: TurmaCadastro[], pessoa: Pessoa): TurmaCadastro[] {
  const nome = pessoa.turma.trim()
  if (!nome) return turmas
  if (turmas.some((t) => t.escolaId === pessoa.escolaId && t.nome.toLowerCase() === nome.toLowerCase())) return turmas
  return [
    ...turmas,
    { id: uid('t'), nome, escolaId: pessoa.escolaId, faixaEtaria: pessoa.faixaEtaria },
  ]
}

function bump(escola: Escola, status: Pessoa['status'], delta: number): Escola {
  if (status === 'Ativo') return { ...escola, ativos: Math.max(0, escola.ativos + delta) }
  return { ...escola, inativos: Math.max(0, escola.inativos + delta) }
}

function marcarRemovidos(lista: string[] | undefined, ids: string[]): string[] {
  return [...new Set([...(lista ?? []), ...ids.filter(Boolean)])]
}

function tirarRemovido(lista: string[] | undefined, id: string): string[] {
  return (lista ?? []).filter((x) => x !== id)
}

function aplicarPessoaNoEstado(prev: AppState, pessoa: Pessoa, acesso?: AcessoApp | null): AppState {
  const agora = agoraIso()
  const gravar: Pessoa = { ...pessoa, updatedAt: agora }
  const atual = prev.pessoas.find((p) => p.id === gravar.id)
  const pessoas = atual
    ? prev.pessoas.map((p) => (p.id === gravar.id ? gravar : p))
    : [...prev.pessoas, gravar]
  let escolas = prev.escolas
  if (!atual) {
    escolas = escolas.map((e) => (e.id === gravar.escolaId ? bump(e, gravar.status, 1) : e))
  } else if (atual.escolaId !== gravar.escolaId || atual.status !== gravar.status) {
    escolas = escolas.map((e) => {
      let next = e
      if (e.id === atual.escolaId) next = bump(next, atual.status, -1)
      if (e.id === gravar.escolaId) next = bump(next, gravar.status, 1)
      return next
    })
  }
  let usuarios = prev.usuarios
  const papel = papelDaPessoa(gravar.tipo)
  if (papel && gravar.status === 'Ativo') {
    usuarios = garantirLogin(usuarios, gravar, papel, acesso).map((u) =>
      u.pessoaId === gravar.id ? { ...u, updatedAt: agora } : u,
    )
  }
  const turmas = garantirTurma(prev.turmas ?? [], gravar)
  return {
    ...prev,
    pessoas,
    escolas,
    usuarios,
    turmas,
    pessoasRemovidas: tirarRemovido(prev.pessoasRemovidas, gravar.id),
    usuariosRemovidos: (prev.usuariosRemovidos ?? []).filter((id) => !usuarios.some((u) => u.id === id && u.pessoaId === gravar.id)),
  }
}

type StoreValue = {
  state: AppState
  usuario: Usuario | null
  login: (username: string, senha: string) => Promise<string | null>
  logout: () => void
  alterarSenha: (atual: string, nova: string) => Promise<string | null>
  savePessoa: (pessoa: Pessoa, acesso?: AcessoApp | null) => void
  importarPessoas: (itens: { pessoa: Pessoa; acesso?: AcessoApp | null }[]) => void
  removePessoa: (id: string) => void
  saveEscola: (escola: Escola) => void
  importarEscolas: (escolas: Escola[]) => void
  removeEscola: (id: string) => void
  saveTurma: (turma: TurmaCadastro) => void
  importarTurmas: (turmas: TurmaCadastro[]) => void
  removeTurma: (id: string) => void
  saveRelatorio: (relatorio: RelatorioDiario, ctx?: { turma?: string }) => void
  saveLancamento: (lancamento: LancamentoFinanceiro) => void
  removeLancamento: (id: string) => void
  saveCategoriaFinanceira: (categoria: CategoriaFinanceira) => void
  removeCategoriaFinanceira: (id: string) => void
  saveSetorEbd: (setor: SetorEbd) => void
  removeSetorEbd: (id: string) => void
  saveRevista: (revista: RevistaControle) => void
  removeRevista: (id: string) => void
  setWhatsapp: (numero: string) => void
  addSetor: (nome: string) => void
  renameSetor: (id: string, nome: string) => void
  removeSetor: (id: string) => void
  addUsuarioAoSetor: (setorId: string, usuarioId: string) => void
  removeUsuarioDoSetor: (setorId: string, usuarioId: string) => void
  saveUsuario: (usuario: Usuario) => void
  saveEvento: (evento: EventoCalendario) => void
  removeEvento: (id: string) => void
  saveLicao: (licao: Licao, data?: string) => void
  removeLicao: (id: string) => void
  saveAviso: (aviso: Aviso) => void
  removeAviso: (id: string) => void
  saveCertificado: (certificado: Certificado) => void
  removeCertificado: (id: string) => void
  saveModeloCertificado: (modelo: ModeloCertificado) => void
  saveAvaliacao: (avaliacao: Avaliacao) => void
  removeAvaliacao: (id: string) => void
  responderAvaliacao: (avaliacaoId: string, pessoaId: string, alternativa: number) => void
  saveCurso: (curso: CursoProfessor) => void
  removeCurso: (id: string) => void
  saveMeta: (meta: MetaEscola) => void
  setRankingCompetitivo: (on: boolean) => void
  concluirAulaCurso: (usuarioId: string, cursoId: string, aula: number) => void
  resetDemo: () => void
  escolasVisiveis: Escola[]
  pessoasVisiveis: Pessoa[]
  podeVerTudo: boolean
  podeEditarLicoes: boolean
  podeEditarConteudoLicao: boolean
  podePublicarAvisos: boolean
  podeEmitirCertificado: boolean
  ehProfessor: boolean
  ehAluno: boolean
  ehSecretario: boolean
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    function aplicarRemoto(remote: Awaited<ReturnType<typeof apiGetState>>) {
      if (saveTimer || savePending) return
      if (remote.updatedAt && lastRemoteAt && remote.updatedAt <= lastRemoteAt) return
      if (remote.updatedAt) lastRemoteAt = remote.updatedAt
      const raw = {
        ...createEmptyIgrejaState(),
        ...((remote.state as AppState | null) ?? {}),
      }
      const hydrated = hidratarEstado({ ...raw, sessaoId: remote.usuarioId })
      if (catalogoCresceu(raw, hydrated)) persist(hydrated, true)
      setState((prev) => {
        const next = { ...hydrated, sessaoId: prev.sessaoId ?? remote.usuarioId }
        cacheLocal(next)
        return next
      })
    }
    function puxar() {
      if (!apiToken() || saveTimer || savePending) return
      const geracao = syncGeracao
      void apiGetState()
        .then((remote) => {
          if (geracao !== syncGeracao) return
          aplicarRemoto(remote)
        })
        .catch(() => {})
    }
    function aoVisivel() {
      if (document.visibilityState === 'visible') puxar()
    }
    function aoCanal(ev: MessageEvent) {
      if (ev.data === 'saved') puxar()
    }
    puxar()
    const t = window.setInterval(puxar, 2000)
    window.addEventListener(EVENTO_SYNC, puxar)
    document.addEventListener('visibilitychange', aoVisivel)
    canalSync?.addEventListener('message', aoCanal)
    return () => {
      window.clearInterval(t)
      window.removeEventListener(EVENTO_SYNC, puxar)
      document.removeEventListener('visibilitychange', aoVisivel)
      canalSync?.removeEventListener('message', aoCanal)
    }
  }, [])

  const commit = useCallback((updater: (prev: AppState) => AppState, imediato = false) => {
    setState((prev) => {
      const next = updater(prev)
      persist(next, imediato)
      return next
    })
  }, [])

  const usuario = useMemo(
    () => state.usuarios.find((u) => u.id === state.sessaoId) ?? null,
    [state.usuarios, state.sessaoId],
  )

  const podeVerTudo =
    usuario?.papel === 'admin' ||
    usuario?.papel === 'sede' ||
    (usuario?.papel === 'superintendente' && !usuario.escolaId)
  const ehProfessor = usuario?.papel === 'professor'
  const ehAluno = usuario?.papel === 'aluno'
  const ehSecretario = usuario?.papel === 'escola' || usuario?.papel === 'secretario'
  const podeEditarLicoes =
    usuario?.papel === 'admin' || usuario?.papel === 'sede' || usuario?.papel === 'superintendente'
  const podeEditarConteudoLicao = podeEditarLicoes || ehProfessor
  const podePublicarAvisos = podeEditarLicoes || ehProfessor
  const podeEmitirCertificado = podePublicarAvisos

  const escolasVisiveis = useMemo(() => {
    if (!usuario) return []
    if (podeVerTudo) return state.escolas
    return state.escolas.filter((e) => e.id === usuario.escolaId)
  }, [usuario, podeVerTudo, state.escolas])

  const pessoasVisiveis = useMemo(() => {
    const ids = new Set(escolasVisiveis.map((e) => e.id))
    return state.pessoas.filter((p) => {
      if (!ids.has(p.escolaId)) return false
      if (ehProfessor && usuario?.turma) return p.turma === usuario.turma
      if (ehAluno && usuario?.pessoaId) return p.id === usuario.pessoaId
      return true
    })
  }, [state.pessoas, escolasVisiveis, ehProfessor, ehAluno, usuario])

  const login = useCallback(async (username: string, senha: string) => {
    try {
      const res = await apiLogin(username, senha)
      if (!res?.token || !res.usuario?.id) return 'Falha na conexão com o servidor.'
      setApiToken(res.token)
      const remote = await apiGetState()
      let next = hidratarEstado({
        ...createEmptyIgrejaState(),
        ...((remote.state as AppState | null) ?? {}),
      })
      const u: Usuario = {
        id: res.usuario.id,
        nome: res.usuario.nome,
        username: res.usuario.username,
        senha,
        papel: res.usuario.papel as Usuario['papel'],
        escolaId: res.usuario.escolaId ?? undefined,
        pessoaId: res.usuario.pessoaId ?? undefined,
        turma: res.usuario.turma ?? undefined,
      }
      const idx = next.usuarios.findIndex(
        (x) => x.id === u.id || x.username.toLowerCase() === u.username.toLowerCase() || (!!u.pessoaId && x.pessoaId === u.pessoaId),
      )
      const base = idx >= 0 ? next.usuarios[idx] : null
      const usuarios = base
        ? next.usuarios
            .filter((x) => x.id === base.id || !u.pessoaId || x.pessoaId !== u.pessoaId)
            .map((x) => (x.id === base.id ? { ...x, ...u } : x))
        : [...next.usuarios.filter((x) => !u.pessoaId || x.pessoaId !== u.pessoaId), u]
      next = hidratarEstado({ ...next, usuarios, sessaoId: u.id })
      persist(next)
      setState(next)
      return null
    } catch (err) {
      if (ehAppNativo()) {
        return err instanceof Error ? err.message : 'Não foi possível conectar. Verifique a internet.'
      }
      const found = state.usuarios.find(
        (x) => x.username.toLowerCase() === username.trim().toLowerCase() && x.senha === senha,
      )
      if (!found) return err instanceof Error ? err.message : 'Usuário ou senha inválidos.'
      commit((prev) => ({ ...prev, sessaoId: found.id }))
      return null
    }
  }, [state.usuarios, commit])

  const logout = useCallback(() => {
    void apiLogout()
    commit((prev) => ({ ...prev, sessaoId: null }))
  }, [commit])

  const alterarSenha = useCallback(async (atual: string, nova: string) => {
    if (nova.trim().length < 6) return 'A nova senha precisa ter pelo menos 6 caracteres.'
    try {
      await apiAlterarSenha(atual, nova)
    } catch (err) {
      if (apiToken()) return err instanceof Error ? err.message : 'Não foi possível alterar a senha.'
      if (!usuario || usuario.senha !== atual) return 'Senha atual incorreta.'
    }
    if (!usuario) return 'Entre novamente para alterar a senha.'
    commit((prev) => ({
      ...prev,
      usuarios: prev.usuarios.map((u) => (u.id === usuario.id ? { ...u, senha: nova } : u)),
    }))
    return null
  }, [commit, usuario])

  const savePessoa = useCallback((pessoa: Pessoa, acesso?: AcessoApp | null) => {
    commit((prev) => aplicarPessoaNoEstado(prev, pessoa, acesso), true)
  }, [commit])

  const importarPessoas = useCallback((itens: { pessoa: Pessoa; acesso?: AcessoApp | null }[]) => {
    if (!itens.length) return
    commit((prev) => itens.reduce((acc, item) => aplicarPessoaNoEstado(acc, item.pessoa, item.acesso), prev), true)
  }, [commit])

  const removePessoa = useCallback((id: string) => {
    commit((prev) => {
      const target = prev.pessoas.find((p) => p.id === id)
      const pessoas = prev.pessoas.filter((p) => p.id !== id)
      const escolas = target
        ? prev.escolas.map((e) => (e.id === target.escolaId ? bump(e, target.status, -1) : e))
        : prev.escolas
      const usuariosFora = prev.usuarios.filter((u) => u.pessoaId === id).map((u) => u.id)
      const usuarios = prev.usuarios.filter((u) => u.pessoaId !== id)
      return {
        ...prev,
        pessoas,
        escolas,
        usuarios,
        pessoasRemovidas: marcarRemovidos(prev.pessoasRemovidas, [id]),
        usuariosRemovidos: marcarRemovidos(prev.usuariosRemovidos, usuariosFora),
      }
    }, true)
  }, [commit])

  const saveEscola = useCallback((escola: Escola) => {
    commit((prev) => {
      const exists = prev.escolas.some((e) => e.id === escola.id)
      const escolas = exists
        ? prev.escolas.map((e) => (e.id === escola.id ? escola : e))
        : [...prev.escolas, escola]
      return {
        ...prev,
        escolas,
        escolasRemovidas: tirarRemovido(prev.escolasRemovidas, escola.id),
      }
    }, true)
  }, [commit])

  const importarEscolas = useCallback((novas: Escola[]) => {
    if (!novas.length) return
    commit((prev) => {
      let escolas = prev.escolas
      for (const escola of novas) {
        const exists = escolas.some((e) => e.id === escola.id)
        escolas = exists ? escolas.map((e) => (e.id === escola.id ? escola : e)) : [...escolas, escola]
      }
      return {
        ...prev,
        escolas,
        escolasRemovidas: (prev.escolasRemovidas ?? []).filter((id) => !novas.some((e) => e.id === id)),
      }
    }, true)
  }, [commit])

  const removeEscola = useCallback((id: string) => {
    commit((prev) => {
      const pessoasFora = prev.pessoas.filter((p) => p.escolaId === id)
      const pessoaIds = pessoasFora.map((p) => p.id)
      const turmaIds = (prev.turmas ?? []).filter((t) => t.escolaId === id).map((t) => t.id)
      const usuarioIds = prev.usuarios.filter((u) => u.pessoaId && pessoaIds.includes(u.pessoaId)).map((u) => u.id)
      return {
        ...prev,
        escolas: prev.escolas.filter((e) => e.id !== id),
        pessoas: prev.pessoas.filter((p) => p.escolaId !== id),
        turmas: (prev.turmas ?? []).filter((t) => t.escolaId !== id),
        relatorios: prev.relatorios.filter((r) => r.escolaId !== id),
        usuarios: prev.usuarios.filter((u) => !(u.pessoaId && pessoaIds.includes(u.pessoaId))),
        escolasRemovidas: marcarRemovidos(prev.escolasRemovidas, [id]),
        pessoasRemovidas: marcarRemovidos(prev.pessoasRemovidas, pessoaIds),
        turmasRemovidas: marcarRemovidos(prev.turmasRemovidas, turmaIds),
        usuariosRemovidos: marcarRemovidos(prev.usuariosRemovidos, usuarioIds),
      }
    }, true)
  }, [commit])

  const saveTurma = useCallback((turma: TurmaCadastro) => {
    commit((prev) => {
      const turmas = prev.turmas ?? []
      const gravar = { ...turma, updatedAt: agoraIso() }
      const exists = turmas.some((t) => t.id === gravar.id)
      return {
        ...prev,
        turmas: exists ? turmas.map((t) => (t.id === gravar.id ? gravar : t)) : [...turmas, gravar],
        turmasRemovidas: tirarRemovido(prev.turmasRemovidas, gravar.id),
      }
    }, true)
  }, [commit])

  const importarTurmas = useCallback((novas: TurmaCadastro[]) => {
    if (!novas.length) return
    commit((prev) => {
      let turmas = prev.turmas ?? []
      for (const turma of novas) {
        const exists = turmas.some((t) => t.id === turma.id)
        turmas = exists ? turmas.map((t) => (t.id === turma.id ? turma : t)) : [...turmas, turma]
      }
      return {
        ...prev,
        turmas,
        turmasRemovidas: (prev.turmasRemovidas ?? []).filter((id) => !novas.some((t) => t.id === id)),
      }
    }, true)
  }, [commit])

  const removeTurma = useCallback((id: string) => {
    commit(
      (prev) => ({
        ...prev,
        turmas: (prev.turmas ?? []).filter((t) => t.id !== id),
        turmasRemovidas: marcarRemovidos(prev.turmasRemovidas, [id]),
      }),
      true,
    )
  }, [commit])

  const saveRelatorio = useCallback((relatorio: RelatorioDiario, ctx?: { turma?: string }) => {
    const agora = new Date().toISOString()
    commit((prev) => {
      const payload = { ...relatorio, updatedAt: agora }
      const exists = prev.relatorios.some((r) => r.id === payload.id)
      const relatorios = exists
        ? prev.relatorios.map((r) => (r.id === payload.id ? payload : r))
        : [...prev.relatorios, payload]
      const turma = (ctx?.turma ?? '').trim()
      const valor = turma.toLowerCase() === 'professores' ? (payload.ofertaProfessores ?? 0) : payload.oferta
      const lancId = turma ? idLancOfertaClasse(payload.escolaId, payload.data, turma) : `oferta_${payload.id}`
      let lancamentos = prev.lancamentos
      let lancamentosRemovidos = prev.lancamentosRemovidos
      if (valor > 0) {
        const lanc: LancamentoFinanceiro = {
          id: lancId,
          escolaId: payload.escolaId,
          data: payload.data,
          tipo: 'oferta',
          descricao: turma
            ? `Oferta EBD ${turma} · ${formatDateBR(payload.data)}`
            : `Oferta EBD ${formatDateBR(payload.data)}`,
          valor,
          turma: turma || undefined,
          categoriaId: CAT_OFERTA_EBD_ID,
          updatedAt: agora,
        }
        lancamentos = lancamentos.some((l) => l.id === lancId)
          ? lancamentos.map((l) => (l.id === lancId ? lanc : l))
          : [...lancamentos, lanc]
        lancamentosRemovidos = tirarRemovido(lancamentosRemovidos, lancId)
      } else {
        const existia = lancamentos.some((l) => l.id === lancId)
        lancamentos = lancamentos.filter((l) => l.id !== lancId)
        if (existia) lancamentosRemovidos = marcarRemovidos(lancamentosRemovidos, [lancId])
      }
      return {
        ...prev,
        relatorios,
        lancamentos,
        lancamentosRemovidos,
        categoriasFinanceiras: garantirCategorias(prev.categoriasFinanceiras, prev.categoriasRemovidas),
      }
    }, true)
  }, [commit])

  const saveLancamento = useCallback((lancamento: LancamentoFinanceiro) => {
    commit((prev) => {
      const gravar = { ...lancamento, updatedAt: agoraIso() }
      const exists = prev.lancamentos.some((l) => l.id === gravar.id)
      const lancamentos = exists
        ? prev.lancamentos.map((l) => (l.id === gravar.id ? gravar : l))
        : [...prev.lancamentos, gravar]
      return {
        ...prev,
        lancamentos,
        lancamentosRemovidos: tirarRemovido(prev.lancamentosRemovidos, gravar.id),
      }
    }, true)
  }, [commit])

  const removeLancamento = useCallback((id: string) => {
    commit(
      (prev) => ({
        ...prev,
        lancamentos: prev.lancamentos.filter((l) => l.id !== id),
        lancamentosRemovidos: marcarRemovidos(prev.lancamentosRemovidos, [id]),
      }),
      true,
    )
  }, [commit])

  const saveCategoriaFinanceira = useCallback((categoria: CategoriaFinanceira) => {
    commit((prev) => {
      const lista = prev.categoriasFinanceiras ?? []
      const gravar = { ...categoria, updatedAt: agoraIso() }
      const categoriasFinanceiras = lista.some((c) => c.id === gravar.id)
        ? lista.map((c) => (c.id === gravar.id ? gravar : c))
        : [...lista, gravar]
      return {
        ...prev,
        categoriasFinanceiras,
        categoriasRemovidas: tirarRemovido(prev.categoriasRemovidas, gravar.id),
      }
    }, true)
  }, [commit])

  const removeCategoriaFinanceira = useCallback((id: string) => {
    commit(
      (prev) => ({
        ...prev,
        categoriasFinanceiras: (prev.categoriasFinanceiras ?? []).filter((c) => c.id !== id),
        categoriasRemovidas: marcarRemovidos(prev.categoriasRemovidas, [id]),
      }),
      true,
    )
  }, [commit])

  const saveSetorEbd = useCallback((setor: SetorEbd) => {
    commit((prev) => {
      const lista = prev.setoresEbd ?? []
      const gravar = { ...setor, updatedAt: agoraIso() }
      const setoresEbd = lista.some((s) => s.id === gravar.id)
        ? lista.map((s) => (s.id === gravar.id ? gravar : s))
        : [...lista, gravar]
      return {
        ...prev,
        setoresEbd,
        setoresEbdRemovidos: tirarRemovido(prev.setoresEbdRemovidos, gravar.id),
      }
    }, true)
  }, [commit])

  const removeSetorEbd = useCallback((id: string) => {
    commit(
      (prev) => ({
        ...prev,
        setoresEbd: (prev.setoresEbd ?? []).filter((s) => s.id !== id),
        turmas: (prev.turmas ?? []).map((t) => (t.setorId === id ? { ...t, setorId: undefined } : t)),
        setoresEbdRemovidos: marcarRemovidos(prev.setoresEbdRemovidos, [id]),
      }),
      true,
    )
  }, [commit])

  const saveRevista = useCallback((revista: RevistaControle) => {
    commit((prev) => {
      const lista = prev.revistas ?? []
      const gravar = { ...revista, updatedAt: agoraIso() }
      const revistas = lista.some((r) => r.id === gravar.id)
        ? lista.map((r) => (r.id === gravar.id ? gravar : r))
        : [...lista, gravar]
      const lancId = idLancRevista(gravar.id)
      const pessoa = prev.pessoas.find((p) => p.id === gravar.pessoaId)
      let lancamentos = prev.lancamentos
      let lancamentosRemovidos = prev.lancamentosRemovidos
      if (revistaGeraReceita(gravar)) {
        const lanc: LancamentoFinanceiro = {
          id: lancId,
          escolaId: gravar.escolaId,
          data: gravar.dataPagamento || toISODate(new Date()),
          tipo: 'outro',
          descricao: `Revista ${gravar.trimestre}º/${gravar.ano} — ${pessoa?.nome ?? 'aluno'}`,
          valor: gravar.valor,
          turma: gravar.turma,
          categoriaId: CAT_REVISTAS_VENDIDAS_ID,
          updatedAt: agoraIso(),
        }
        lancamentos = lancamentos.some((l) => l.id === lancId)
          ? lancamentos.map((l) => (l.id === lancId ? lanc : l))
          : [...lancamentos, lanc]
        lancamentosRemovidos = tirarRemovido(lancamentosRemovidos, lancId)
      } else {
        const existia = lancamentos.some((l) => l.id === lancId)
        lancamentos = lancamentos.filter((l) => l.id !== lancId)
        if (existia) lancamentosRemovidos = marcarRemovidos(lancamentosRemovidos, [lancId])
      }
      return {
        ...prev,
        revistas,
        revistasRemovidas: tirarRemovido(prev.revistasRemovidas, gravar.id),
        lancamentos,
        lancamentosRemovidos,
        categoriasFinanceiras: garantirCategorias(prev.categoriasFinanceiras, prev.categoriasRemovidas),
      }
    }, true)
  }, [commit])

  const removeRevista = useCallback((id: string) => {
    commit((prev) => {
      const lancId = idLancRevista(id)
      const existiaLanc = prev.lancamentos.some((l) => l.id === lancId)
      return {
        ...prev,
        revistas: (prev.revistas ?? []).filter((r) => r.id !== id),
        revistasRemovidas: marcarRemovidos(prev.revistasRemovidas, [id]),
        lancamentos: prev.lancamentos.filter((l) => l.id !== lancId),
        lancamentosRemovidos: existiaLanc
          ? marcarRemovidos(prev.lancamentosRemovidos, [lancId])
          : prev.lancamentosRemovidos,
      }
    }, true)
  }, [commit])

  const setWhatsapp = useCallback((numero: string) => {
    commit((prev) => ({ ...prev, whatsapp: numero }))
  }, [commit])

  const addSetor = useCallback((nome: string) => {
    commit((prev) => ({
      ...prev,
      setores: [...prev.setores, { id: uid('setor'), nome, usuarioIds: [] }],
    }))
  }, [commit])

  const renameSetor = useCallback((id: string, nome: string) => {
    commit((prev) => ({
      ...prev,
      setores: prev.setores.map((s) => (s.id === id ? { ...s, nome } : s)),
    }))
  }, [commit])

  const removeSetor = useCallback((id: string) => {
    commit(
      (prev) => ({
        ...prev,
        setores: prev.setores.filter((s) => s.id !== id),
        setoresRemovidos: marcarRemovidos(prev.setoresRemovidos, [id]),
      }),
      true,
    )
  }, [commit])

  const addUsuarioAoSetor = useCallback((setorId: string, usuarioId: string) => {
    commit((prev) => ({
      ...prev,
      setores: prev.setores.map((s) =>
        s.id === setorId && !s.usuarioIds.includes(usuarioId)
          ? { ...s, usuarioIds: [...s.usuarioIds, usuarioId] }
          : s,
      ),
    }))
  }, [commit])

  const removeUsuarioDoSetor = useCallback((setorId: string, usuarioId: string) => {
    commit((prev) => ({
      ...prev,
      setores: prev.setores.map((s) =>
        s.id === setorId ? { ...s, usuarioIds: s.usuarioIds.filter((id) => id !== usuarioId) } : s,
      ),
    }))
  }, [commit])

  const saveUsuario = useCallback((usuarioNovo: Usuario) => {
    commit((prev) => {
      const exists = prev.usuarios.some((u) => u.id === usuarioNovo.id)
      const usuarios = exists
        ? prev.usuarios.map((u) => (u.id === usuarioNovo.id ? usuarioNovo : u))
        : [...prev.usuarios, usuarioNovo]
      return {
        ...prev,
        usuarios,
        usuariosRemovidos: tirarRemovido(prev.usuariosRemovidos, usuarioNovo.id),
      }
    }, true)
  }, [commit])

  const saveEvento = useCallback((evento: EventoCalendario) => {
    commit((prev) => {
      const eventos = prev.eventos.some((e) => e.id === evento.id)
        ? prev.eventos.map((e) => (e.id === evento.id ? evento : e))
        : [...prev.eventos, evento]
      return {
        ...prev,
        eventos,
        eventosRemovidos: tirarRemovido(prev.eventosRemovidos, evento.id),
      }
    }, true)
  }, [commit])

  const removeEvento = useCallback((id: string) => {
    commit(
      (prev) => ({
        ...prev,
        eventos: prev.eventos.filter((e) => e.id !== id),
        eventosRemovidos: marcarRemovidos(prev.eventosRemovidos, [id]),
      }),
      true,
    )
  }, [commit])

  const saveLicao = useCallback((licao: Licao, data?: string) => {
    commit((prev) => {
      let gravar: Licao = { ...licao, updatedAt: agoraIso() }
      const turma = (gravar.turma ?? '').trim()
      if (turma) {
        const existente = acharVarianteTurma(prev.licoes, gravar, turma, gravar.escolaId)
        if (existente) gravar = { ...gravar, id: existente.id, turma, escolaId: existente.escolaId || gravar.escolaId }
        else gravar = { ...gravar, turma }
      } else {
        const mesma = prev.licoes.find((l) => ehLicaoGeral(l) && chaveAula(l) === chaveAula(gravar))
        if (mesma) gravar = { ...gravar, id: mesma.id, turma: undefined, escolaId: undefined }
        else gravar = { ...gravar, id: idCatalogoPadrao(gravar), turma: undefined, escolaId: undefined }
      }
      const lista = prev.licoes.some((l) => l.id === gravar.id)
        ? prev.licoes.map((l) => (l.id === gravar.id ? gravar : l))
        : [...prev.licoes, gravar]
      const { licoes, extras } = deduplicarLicoes(lista)
      const licoesRemovidas = [
        ...new Set([...(prev.licoesRemovidas ?? []).filter((id) => id !== gravar.id), ...extras]),
      ]
      let eventos = prev.eventos.map((e) => {
        if (!e.licaoId) return e
        if (e.licaoId === gravar.id && !turma) {
          return { ...e, titulo: gravar.tema, descricao: `${gravar.trimestre}º trimestre ${gravar.ano}` }
        }
        const apontada = licoes.find((l) => l.id === e.licaoId)
        if (apontada && !ehLicaoGeral(apontada)) {
          const cat = catalogoDeLicao(licoes, apontada)
          return { ...e, licaoId: cat.id }
        }
        return e
      })
      if (data && !turma) {
        const existente = eventos.find((e) => e.licaoId === gravar.id)
        if (existente) {
          eventos = eventos.map((e) => (e.id === existente.id ? { ...e, data, titulo: gravar.tema } : e))
        } else {
          eventos = [
            ...eventos,
            {
              id: `ev-lic-${gravar.id}-${data}`,
              data,
              tipo: 'licao' as const,
              titulo: gravar.tema,
              descricao: `${gravar.trimestre}º trimestre ${gravar.ano}`,
              licaoId: gravar.id,
            },
          ]
        }
      }
      return { ...prev, licoes, eventos, licoesRemovidas }
    }, true)
  }, [commit])

  const removeLicao = useCallback((id: string) => {
    commit((prev) => ({
      ...prev,
      licoes: prev.licoes.filter((l) => l.id !== id),
      eventos: prev.eventos.filter((e) => e.licaoId !== id),
      licoesRemovidas: (prev.licoesRemovidas ?? []).includes(id)
        ? prev.licoesRemovidas
        : [...(prev.licoesRemovidas ?? []), id],
    }), true)
  }, [commit])

  const saveAviso = useCallback((aviso: Aviso) => {
    commit((prev) => {
      const avisos = prev.avisos.some((a) => a.id === aviso.id)
        ? prev.avisos.map((a) => (a.id === aviso.id ? aviso : a))
        : [aviso, ...prev.avisos]
      return {
        ...prev,
        avisos,
        avisosRemovidos: tirarRemovido(prev.avisosRemovidos, aviso.id),
      }
    }, true)
  }, [commit])

  const removeAviso = useCallback((id: string) => {
    commit(
      (prev) => ({
        ...prev,
        avisos: prev.avisos.filter((a) => a.id !== id),
        avisosRemovidos: marcarRemovidos(prev.avisosRemovidos, [id]),
      }),
      true,
    )
  }, [commit])

  const saveCertificado = useCallback((certificado: Certificado) => {
    commit((prev) => {
      const certificados = prev.certificados.some((c) => c.id === certificado.id)
        ? prev.certificados.map((c) => (c.id === certificado.id ? certificado : c))
        : [...prev.certificados, certificado]
      return {
        ...prev,
        certificados,
        certificadosRemovidos: (prev.certificadosRemovidos ?? []).filter((id) => id !== certificado.id),
      }
    }, true)
  }, [commit])

  const removeCertificado = useCallback((id: string) => {
    commit(
      (prev) => ({
        ...prev,
        certificados: prev.certificados.filter((c) => c.id !== id),
        certificadosRemovidos: [...new Set([...(prev.certificadosRemovidos ?? []), id])],
      }),
      true,
    )
  }, [commit])

  const saveModeloCertificado = useCallback((modelo: ModeloCertificado) => {
    commit((prev) => ({ ...prev, modeloCertificado: modelo }))
  }, [commit])

  const saveAvaliacao = useCallback((avaliacao: Avaliacao) => {
    commit((prev) => {
      const avaliacoes = prev.avaliacoes.some((a) => a.id === avaliacao.id)
        ? prev.avaliacoes.map((a) => (a.id === avaliacao.id ? avaliacao : a))
        : [...prev.avaliacoes, avaliacao]
      return {
        ...prev,
        avaliacoes,
        avaliacoesRemovidas: (prev.avaliacoesRemovidas ?? []).filter((id) => id !== avaliacao.id),
      }
    }, true)
  }, [commit])

  const removeAvaliacao = useCallback((id: string) => {
    commit(
      (prev) => ({
        ...prev,
        avaliacoes: prev.avaliacoes.filter((a) => a.id !== id),
        avaliacoesRemovidas: [...new Set([...(prev.avaliacoesRemovidas ?? []), id])],
      }),
      true,
    )
  }, [commit])

  const responderAvaliacao = useCallback((avaliacaoId: string, pessoaId: string, alternativa: number) => {
    commit((prev) => ({
      ...prev,
      avaliacoes: prev.avaliacoes.map((a) => {
        if (a.id !== avaliacaoId) return a
        const respostas = a.respostas.some((r) => r.pessoaId === pessoaId)
          ? a.respostas.map((r) => (r.pessoaId === pessoaId ? { pessoaId, alternativa } : r))
          : [...a.respostas, { pessoaId, alternativa }]
        return { ...a, respostas }
      }),
    }))
  }, [commit])

  const saveMeta = useCallback((meta: MetaEscola) => {
    commit((prev) => {
      const metas = prev.metas.some((m) => m.escolaId === meta.escolaId)
        ? prev.metas.map((m) => (m.escolaId === meta.escolaId ? meta : m))
        : [...prev.metas, meta]
      return { ...prev, metas }
    })
  }, [commit])

  const setRankingCompetitivo = useCallback((on: boolean) => {
    commit((prev) => ({ ...prev, rankingCompetitivo: on }))
  }, [commit])

  const concluirAulaCurso = useCallback((usuarioId: string, cursoId: string, aula: number) => {
    commit((prev) => {
      const atual = prev.progressos.find((p) => p.usuarioId === usuarioId && p.cursoId === cursoId)
      if (!atual) {
        return { ...prev, progressos: [...prev.progressos, { usuarioId, cursoId, concluidas: [aula] }] }
      }
      const concluidas = atual.concluidas.includes(aula) ? atual.concluidas : [...atual.concluidas, aula]
      return {
        ...prev,
        progressos: prev.progressos.map((p) => (p === atual ? { ...p, concluidas } : p)),
      }
    })
  }, [commit])

  const saveCurso = useCallback((curso: CursoProfessor) => {
    commit((prev) => {
      const cursos = prev.cursos.some((c) => c.id === curso.id)
        ? prev.cursos.map((c) => (c.id === curso.id ? curso : c))
        : [...prev.cursos, curso]
      return {
        ...prev,
        cursos,
        cursosRemovidos: tirarRemovido(prev.cursosRemovidos, curso.id),
      }
    }, true)
  }, [commit])

  const removeCurso = useCallback((id: string) => {
    commit(
      (prev) => ({
        ...prev,
        cursos: prev.cursos.filter((c) => c.id !== id),
        progressos: prev.progressos.filter((p) => p.cursoId !== id),
        cursosRemovidos: marcarRemovidos(prev.cursosRemovidos, [id]),
      }),
      true,
    )
  }, [commit])

  const resetDemo = useCallback(() => {
    const fresh = createSeedState()
    persist(fresh)
    setState(fresh)
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      state,
      usuario,
      login,
      logout,
      alterarSenha,
      savePessoa,
      importarPessoas,
      removePessoa,
      saveEscola,
      importarEscolas,
      removeEscola,
      saveTurma,
      importarTurmas,
      removeTurma,
      saveRelatorio,
      saveLancamento,
      removeLancamento,
      saveCategoriaFinanceira,
      removeCategoriaFinanceira,
      saveSetorEbd,
      removeSetorEbd,
      saveRevista,
      removeRevista,
      setWhatsapp,
      addSetor,
      renameSetor,
      removeSetor,
      addUsuarioAoSetor,
      removeUsuarioDoSetor,
      saveUsuario,
      saveEvento,
      removeEvento,
      saveLicao,
      removeLicao,
      saveAviso,
      removeAviso,
      saveCertificado,
      removeCertificado,
      saveModeloCertificado,
      saveAvaliacao,
      removeAvaliacao,
      responderAvaliacao,
      saveMeta,
      setRankingCompetitivo,
      concluirAulaCurso,
      saveCurso,
      removeCurso,
      resetDemo,
      escolasVisiveis,
      pessoasVisiveis,
      podeVerTudo,
      podeEditarLicoes,
      podeEditarConteudoLicao,
      podePublicarAvisos,
      podeEmitirCertificado,
      ehProfessor,
      ehAluno,
      ehSecretario,
    }),
    [
      state,
      usuario,
      login,
      logout,
      alterarSenha,
      savePessoa,
      importarPessoas,
      removePessoa,
      saveEscola,
      importarEscolas,
      removeEscola,
      saveTurma,
      importarTurmas,
      removeTurma,
      saveRelatorio,
      saveLancamento,
      removeLancamento,
      saveCategoriaFinanceira,
      removeCategoriaFinanceira,
      saveSetorEbd,
      removeSetorEbd,
      saveRevista,
      removeRevista,
      setWhatsapp,
      addSetor,
      renameSetor,
      removeSetor,
      addUsuarioAoSetor,
      removeUsuarioDoSetor,
      saveUsuario,
      saveEvento,
      removeEvento,
      saveLicao,
      removeLicao,
      saveAviso,
      removeAviso,
      saveCertificado,
      removeCertificado,
      saveModeloCertificado,
      saveAvaliacao,
      removeAvaliacao,
      responderAvaliacao,
      saveMeta,
      setRankingCompetitivo,
      concluirAulaCurso,
      saveCurso,
      removeCurso,
      resetDemo,
      escolasVisiveis,
      pessoasVisiveis,
      podeVerTudo,
      podeEditarLicoes,
      podeEditarConteudoLicao,
      podePublicarAvisos,
      podeEmitirCertificado,
      ehProfessor,
      ehAluno,
      ehSecretario,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore fora do StoreProvider')
  return ctx
}

export type { SetorAcesso }
