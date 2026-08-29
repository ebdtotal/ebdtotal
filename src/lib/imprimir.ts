import { ehAppNativo } from './native'

export function tentarImprimirHtml(html: string): boolean {
  if (ehAppNativo()) return false
  try {
    const w = window.open('', '_blank')
    if (!w) return false
    w.document.open()
    w.document.write(html)
    w.document.close()
    const imprimir = () => {
      try {
        w.focus()
        w.print()
      } catch {
        /* popup */
      }
    }
    w.addEventListener('load', imprimir)
    window.setTimeout(imprimir, 400)
    return true
  } catch {
    return false
  }
}

export function htmlListaPdf(titulo: string, colunas: string[], linhas: string[][]): string {
  const th = colunas.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
  const tr = linhas
    .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(titulo)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Arial, sans-serif; color: #152238; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #c9d2de; padding: 6px 8px; text-align: left; }
  th { background: #152238; color: #fff; }
  tr:nth-child(even) td { background: #f4f7fb; }
</style>
</head>
<body>
  <h1>${escapeHtml(titulo)}</h1>
  <table>
    <thead><tr>${th}</tr></thead>
    <tbody>${tr || `<tr><td colspan="${colunas.length}">Nenhum registro.</td></tr>`}</tbody>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
