export type Tema = 'claro' | 'escuro'

const KEY = 'ebd-tema'

function pathPublico() {
  try {
    const p = window.location.pathname.replace(/\/$/, '') || '/'
    return p === '/' || p.startsWith('/assine') || p === '/privacidade' || p === '/termos'
  } catch {
    return false
  }
}

export function temaAtual(): Tema {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'claro' || v === 'escuro') return v
  } catch {
    /* WebView */
  }
  return pathPublico() ? 'claro' : 'escuro'
}

export function aplicarTema(tema: Tema) {
  const root = document.documentElement
  root.classList.toggle('tema-claro', tema === 'claro')
  root.classList.toggle('tema-escuro', tema === 'escuro')
  try {
    localStorage.setItem(KEY, tema)
  } catch {
    /* quota */
  }
}

export function iniciarTema() {
  aplicarTema(temaAtual())
}
