import { apiRoot } from './api'

const KEY = 'ebd-afiliado-ref'
const CLICK_PREFIX = 'ebd-afiliado-click:'

export function normalizarCodigoAfiliado(codigo: string): string {
  return codigo
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 40)
}

export function capturarRefDaUrl(search: string, pathname = ''): string | null {
  try {
    const sp = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
    const ref = sp.get('ref') || sp.get('afiliado')
    if (ref) return normalizarCodigoAfiliado(ref) || null
    const m = pathname.match(/^\/a\/([^/?#]+)/i)
    if (m?.[1]) return normalizarCodigoAfiliado(decodeURIComponent(m[1])) || null
  } catch {
    /* ignore */
  }
  return null
}

export function salvarAfiliadoRef(codigo: string) {
  const c = normalizarCodigoAfiliado(codigo)
  if (!c) return
  try {
    sessionStorage.setItem(KEY, c)
  } catch {
    /* private mode */
  }
}

export function lerAfiliadoRef(): string | null {
  try {
    const c = sessionStorage.getItem(KEY)
    return c ? normalizarCodigoAfiliado(c) || null : null
  } catch {
    return null
  }
}

/** Grava o ref da URL e registra 1 clique por sessão no servidor. */
export async function ativarAfiliadoDaVisita(search: string, pathname: string): Promise<string | null> {
  const codigo = capturarRefDaUrl(search, pathname)
  if (!codigo) return lerAfiliadoRef()
  salvarAfiliadoRef(codigo)
  try {
    if (sessionStorage.getItem(CLICK_PREFIX + codigo)) return codigo
    sessionStorage.setItem(CLICK_PREFIX + codigo, '1')
  } catch {
    /* still try to ping */
  }
  try {
    await fetch(`${apiRoot()}afiliados.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'clique', codigo, path: pathname || '/' }),
    })
  } catch {
    /* offline */
  }
  return codigo
}
