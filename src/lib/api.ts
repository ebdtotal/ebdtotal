import { Capacitor } from '@capacitor/core'

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
  return req<{ token: string; usuario: UsuarioSessao }>('login.php', {
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

export async function apiGetState() {
  return req<{ state: unknown; usuarioId: string }>('state.php')
}

export async function apiSaveState(state: unknown) {
  return req<{ ok: boolean }>('state.php', { method: 'POST', body: JSON.stringify({ state }) })
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
}) {
  return req<{
    igreja: { id: string; nome: string; status: string }
    login: { username: string; senha: string; nome: string; email: string }
    emailEnviado: boolean
  }>('clientes.php', { method: 'POST', body: JSON.stringify(payload) })
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

export async function apiClientes() {
  return req<{ igrejas: IgrejaCliente[]; cadastros: CadastroGeral[] }>('clientes.php')
}

export async function apiStatusIgreja(id: string, status: string) {
  return req<{ ok: boolean }>('clientes.php', { method: 'PATCH', body: JSON.stringify({ id, status }) })
}
