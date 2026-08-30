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
  return htmlDocumentoPdf(titulo, tabelaHtml(colunas, linhas))
}

export function tabelaHtml(colunas: string[], linhas: string[][]): string {
  const th = colunas.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
  const tr = linhas
    .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<table>
    <thead><tr>${th}</tr></thead>
    <tbody>${tr || `<tr><td colspan="${colunas.length}">Nenhum registro.</td></tr>`}</tbody>
  </table>`
}

export function htmlDocumentoPdf(titulo: string, corpo: string, subtitulo = ''): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(titulo)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Arial, sans-serif; color: #152238; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 6px; }
  .sub { font-size: 12px; color: #64748b; margin: 0 0 14px; }
  h2 { font-size: 14px; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #c9d2de; padding: 6px 8px; text-align: left; }
  th { background: #152238; color: #fff; }
  tr:nth-child(even) td { background: #f4f7fb; }
  .kpis { display: flex; gap: 8px; margin: 0 0 14px; }
  .kpi { flex: 1; border: 1px solid #c9d2de; border-radius: 8px; padding: 8px 10px; }
  .kpi span { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; }
  .kpi strong { font-size: 16px; }
  .graficos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 0 16px; page-break-inside: avoid; }
  .graf { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
  .pizza { display: flex; align-items: center; gap: 12px; }
  .pizza ul { margin: 0; padding: 0; list-style: none; font-size: 11px; }
  @media print { .graficos { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>${escapeHtml(titulo)}</h1>
  ${subtitulo ? `<p class="sub">${escapeHtml(subtitulo)}</p>` : ''}
  ${corpo}
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
