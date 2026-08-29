export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function formatDateBR(iso: string): string {
  if (!iso) return '—'
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${pad2(Number(d))}/${pad2(Number(m))}/${y}`
}

export function maskDateBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function parseDateBR(text: string): string | null {
  const t = text.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const dt = parseISODate(t)
    return Number.isNaN(dt.getTime()) ? null : t
  }
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = Number(m[1])
  const mo = Number(m[2])
  const y = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return toISODate(dt)
}

export function lastSunday(from = new Date()): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

/** Domingo da aula em vigor: no próprio domingo, hoje; de segunda a sábado, o domingo que vem. */
export function domingoDaAula(from = new Date()): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  if (day === 0) return d
  d.setDate(d.getDate() + (7 - day))
  return d
}

export function shiftDate(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function moneyBR(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function parseMoneyBR(raw: string): number | null {
  const t = raw.trim().replace(/R\$\s?/gi, '').replace(/\s/g, '')
  if (!t) return 0
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export function youtubeEmbed(url: string): string | null {
  const m = url.trim().match(/(?:youtube\.com\/(?:watch\?[^#]*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m?.[1] ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null
}

export function pct(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function matches(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true
  return normalize(haystack).includes(normalize(needle))
}

export function sortBy<T>(list: T[], key: keyof T, dir: 'asc' | 'desc'): T[] {
  const copy = [...list]
  copy.sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    const as = av == null ? '' : String(av)
    const bs = bv == null ? '' : String(bv)
    const cmp = as.localeCompare(bs, 'pt-BR', { numeric: true, sensitivity: 'base' })
    return dir === 'asc' ? cmp : -cmp
  })
  return copy
}

export function mesNome(iso: string): string {
  const d = parseISODate(iso)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function usernameFromNome(nome: string): string {
  const base = normalize(nome).replace(/[^a-z0-9]+/g, '').slice(0, 14)
  return base || 'prof'
}

export function trimestreDe(iso: string): { ano: number; tri: number } {
  const d = parseISODate(iso)
  const mes = d.getMonth()
  return { ano: d.getFullYear(), tri: Math.floor(mes / 3) + 1 }
}

export function noTrimestre(iso: string, ano: number, tri: number): boolean {
  const t = trimestreDe(iso)
  return t.ano === ano && t.tri === tri
}

export function noAno(iso: string, ano: number): boolean {
  return parseISODate(iso).getFullYear() === ano
}

export function mesDia(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${m}-${d}`
}

export function aniversarioNoPeriodo(nasc: string, from: Date, to: Date): boolean {
  if (!nasc) return false
  const md = mesDia(nasc)
  const cursor = new Date(from)
  while (cursor <= to) {
    if (mesDia(toISODate(cursor)) === md) return true
    cursor.setDate(cursor.getDate() + 1)
  }
  return false
}

export function idadeEm(nasc: string, ref = new Date()): number | null {
  if (!nasc) return null
  const d = parseISODate(nasc)
  let idade = ref.getFullYear() - d.getFullYear()
  const m = ref.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) idade -= 1
  return idade
}

/** DDI 55 + DDD 98 + 981258852 — número do suporte do EDB Total. */
export const WHATSAPP_SUPORTE = '5598981258852'
const WHATSAPP_PLACEHOLDER_ANTIGO = '5598984000000'

export function whatsappSuporte(salvo?: string): string {
  const n = (salvo ?? '').replace(/\D/g, '')
  if (!n || n === WHATSAPP_PLACEHOLDER_ANTIGO) return WHATSAPP_SUPORTE
  return n
}

export function senhaGerada(tamanho = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  const buf = new Uint32Array(tamanho)
  crypto.getRandomValues(buf)
  for (let i = 0; i < tamanho; i++) s += chars[buf[i] % chars.length]
  return s
}

export function whatsappUrl(numero: string, texto: string): string {
  const n = numero.replace(/\D/g, '')
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}
