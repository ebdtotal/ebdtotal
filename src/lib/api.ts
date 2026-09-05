import { Capacitor } from '@capacitor/core'
import type { IgrejaSessao, PlanoCheckoutId } from './planos'

const TOKEN_KEY = 'ebd-token'
export const SITE_URL = 'https://ebdtotal.com'

export function apiRoot(): string {
  return Capacitor.isNativePlatform() ? `${SITE_URL}/api` : '/api'
}

export function apiToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return sessionStorage.getItem(TOKEN_KEY)
  }
}

export function setApiToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      sessionStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) }
  if (init.body) headers['Content-Type'] = 'application/json'
  const token = apiToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${apiRoot()}/${path}`, { ...init, headers })
  const raw = await res.text()
  let data = {} as T & { erro?: string }
  try {
    data = JSON.parse(raw) as T & { erro?: string }
  } catch {
    throw new Error('Falha na conexão com o servidor.')
  }
  if (!res.ok) throw new Error(data.erro || 'Falha na conexão com o servidor.')
  return data
}

export type UsuarioSessao = {
  id: string
  nome: string
  username: string
  papel: string
  escolaId?: string | null
  pessoaId?: string | null
  turma?: string | null
  tenantId: string
}

export type StatsPublicos = {
  igrejas: number
  escolas: number
  alunos: number
  professores: number
  pessoas: number
}

export type IgrejaCliente = {
  id: string
  nome: string
  cidade: string
  responsavel: string
  email: string
  telefone: string
  status: string
  username_admin: string
  created_at: string
  plano?: string
  pagamento?: string
  contratado_em?: string
  valido_ate?: string
  pessoas?: number
}

export type ResumoMaster = {
  igrejas: number
  ativas: number
  suspensas: number
  trial: number
  essencial: number
  igreja: number
  vencendo: number
  vencidas: number
  pessoas: number
}

export type CadastroGeral = {
  tenant_id: string
  nome: string
  tipo: string
  status: string
  escola: string
  turma: string
  igreja: string
}

export async function apiLogin(username: string, senha: string) {
  return req<{ token: string; usuario: UsuarioSessao; igreja: IgrejaSessao | null }>('login.php', {
    method: 'POST',
    body: JSON.stringify({ username, senha }),
  })
}

export async function apiLogout() {
  try {
    await req('logout.php', { method: 'POST' })
  } catch {
    /* sessão local */
  }
  setApiToken(null)
}

export async function apiGetState(since?: string) {
  const headers: Record<string, string> = {}
  const token = apiToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (since) headers['If-None-Match'] = `"${since}"`
  const q = since ? `?since=${encodeURIComponent(since)}` : ''
  const res = await fetch(`${apiRoot()}/state.php${q}`, { headers })
  if (res.status === 304) {
    return { notModified: true as const, updatedAt: since ?? '', usuarioId: '', state: undefined }
  }
  const raw = await res.text()
  let data = {} as { state?: unknown; usuarioId?: string; updatedAt?: string; erro?: string }
  try {
    data = JSON.parse(raw) as typeof data
  } catch {
    throw new Error('Falha na conexão com o servidor.')
  }
  if (!res.ok) throw new Error(data.erro || 'Falha na conexão com o servidor.')
  return {
    notModified: false as const,
    state: data.state,
    usuarioId: data.usuarioId ?? '',
    updatedAt: data.updatedAt,
    igreja: (data as { igreja?: IgrejaSessao | null }).igreja ?? null,
  }
}

export async function apiSaveState(state: unknown, patch = false) {
  return req<{ ok: boolean; updatedAt?: string }>('state.php', {
    method: 'POST',
    body: JSON.stringify(patch ? { patch: state } : { state }),
  })
}

export async function apiStats(): Promise<StatsPublicos> {
  return req<StatsPublicos>('stats.php')
}

export async function apiAssinar(payload: {
  nome: string
  cidade: string
  responsavel: string
  email: string
  telefone: string
  plano?: PlanoCheckoutId
}) {
  return req<{
    igreja: { id: string; nome: string; status: string }
    login: { username: string; senha: string; nome: string; email: string }
    emailEnviado: boolean
  }>('clientes.php', { method: 'POST', body: JSON.stringify({ ...payload, origem: 'master' }) })
}

export async function apiIniciarAssinatura(payload: {
  nome: string
  cidade: string
  responsavel: string
  email: string
  telefone: string
  plano: PlanoCheckoutId
}) {
  return req<{ checkoutUrl: string; signupId: string; preco: number; plano: string; email: string; igreja: string }>(
    'clientes.php',
    { method: 'POST', body: JSON.stringify({ ...payload, origem: 'site' }) },
  )
}

export async function apiStatusAssinatura(sid: string, paymentId?: string) {
  const sp = new URLSearchParams({ sid })
  if (paymentId) sp.set('payment_id', paymentId)
  return req<{ signupId: string; igreja: string; email: string; status: string; pagoEm: string }>(`pagamento.php?${sp}`)
}

export type AssinaturaPendente = {
  id: string
  nome: string
  cidade: string
  responsavel: string
  email: string
  telefone: string
  status: string
  username: string
  created_at: string
  pago_em: string
  plano?: string
  upgrade_tenant_id?: string
}

export async function apiEsqueciSenha(usuario: string) {
  return req<{ ok: boolean; mensagem: string }>('senha.php', {
    method: 'POST',
    body: JSON.stringify({ acao: 'esqueci', usuario }),
  })
}

export async function apiAlterarSenha(senhaAtual: string, senhaNova: string) {
  return req<{ ok: boolean }>('senha.php', {
    method: 'POST',
    body: JSON.stringify({ acao: 'alterar', senhaAtual, senhaNova }),
  })
}

export type CaixaAssinatura = {
  totalPago: number
  esteMes: number
  mesPassado: number
  aReceber: number
  pagos: number
  pendentes: number
  vencidas: number
  vencendo: number
  fluxo: { mes: string; avista: number; parcelado: number; total: number }[]
  lancamentos: {
    id: string
    data: string
    igreja: string
    plano: string
    pagamento: string
    valor: number
    origem: string
  }[]
  renovar: { id: string; nome: string; plano: string; validoAte: string; dias: number; preco: number }[]
}

export async function apiClientes() {
  return req<{
    igrejas: IgrejaCliente[]
    cadastros: CadastroGeral[]
    assinaturas: AssinaturaPendente[]
    resumo: ResumoMaster
    financeiro: CaixaAssinatura
  }>('clientes.php')
}

export type DemoPedido = {
  id: string
  nome: string
  email: string
  telefone: string
  igreja: string
  status: string
  created_at: string
  contato_em?: string
  notas?: string
}

export async function apiAgendarDemo(payload: { nome: string; email: string; telefone: string; igreja: string }) {
  return req<{ ok: boolean; mensagem: string; id: string }>('demos.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiDemos() {
  return req<{
    demos: DemoPedido[]
    resumo: { total: number; novas: number; contactadas: number; concluidas: number }
  }>('demos.php')
}

export async function apiPatchDemo(
  id: string,
  extra: { status?: string; notas?: string; acao?: 'excluir' },
) {
  return req<{ ok: boolean }>('demos.php', {
    method: 'PATCH',
    body: JSON.stringify({ id, ...extra }),
  })
}

export async function apiStatusIgreja(id: string, status: string) {
  return req<{ ok: boolean }>('clientes.php', { method: 'PATCH', body: JSON.stringify({ id, status }) })
}

export async function apiPatchIgrejaMaster(
  id: string,
  acao: 'dados' | 'plano' | 'renovar' | 'reset_senha' | 'excluir',
  extra: Record<string, string> = {},
) {
  return req<{ ok: boolean; igreja?: IgrejaSessao; login?: { username: string; senha: string; email: string }; emailEnviado?: boolean }>(
    'clientes.php',
    { method: 'PATCH', body: JSON.stringify({ id, acao, ...extra }) },
  )
}

export async function apiGetIgreja() {
  return req<{ igreja: IgrejaSessao | null }>('conta.php')
}

export async function apiSalvarIgreja(dados: {
  nome: string
  cidade: string
  responsavel: string
  email: string
  telefone: string
}) {
  return req<{ ok: boolean; igreja: IgrejaSessao }>('conta.php', {
    method: 'PATCH',
    body: JSON.stringify({ acao: 'dados', ...dados }),
  })
}

export async function apiMigrarPlano(pagamento: 'avista' | 'parcelado') {
  return req<{ checkoutUrl: string; signupId: string; preco: number; plano: string }>('conta.php', {
    method: 'POST',
    body: JSON.stringify({ acao: 'migrar', pagamento }),
  })
}

export async function apiConfirmarSignup(id: string) {
  return req<{ ok: boolean; login?: { username: string; senha: string; email: string }; emailEnviado?: boolean }>(
    'clientes.php',
    { method: 'PATCH', body: JSON.stringify({ acao: 'confirmar_signup', id }) },
  )
}

export type AtividadeRegistro = {
  id: string
  tenant_id: string
  user_id: string
  username: string
  nome: string
  papel: string
  acao: string
  detalhe: string
  ip: string
  created_at: string
  igreja?: string
}

export type AtividadeLogin = {
  id: string
  username: string
  nome: string
  papel: string
  tenant_id: string
  igreja?: string
  ultima_em?: string | null
  ultima_acao?: string | null
  ultima_detalhe?: string | null
}

export async function apiAtividades(params?: { q?: string; papel?: string; username?: string }) {
  const sp = new URLSearchParams()
  if (params?.q) sp.set('q', params.q)
  if (params?.papel) sp.set('papel', params.papel)
  if (params?.username) sp.set('username', params.username)
  const qs = sp.toString()
  return req<{ atividades: AtividadeRegistro[]; logins: AtividadeLogin[]; master: boolean }>(
    `atividades.php${qs ? `?${qs}` : ''}`,
  )
}
