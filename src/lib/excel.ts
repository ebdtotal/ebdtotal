import * as XLSX from 'xlsx'

export function exportToExcel(filename: string, rows: Record<string, string | number>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Dados')
  XLSX.writeFile(book, `${filename}.xlsx`)
}

export function baixarModeloExcel(filename: string, colunas: string[], exemplo: Record<string, string | number>) {
  exportToExcel(filename, [exemplo, Object.fromEntries(colunas.map((c) => [c, '']))])
}

export function normalizarChave(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function lerPlanilha(file: File): Promise<Record<string, string>[]> {
  return file.arrayBuffer().then((buf) => {
    const book = XLSX.read(buf, { type: 'array', cellDates: true })
    const sheet = book.Sheets[book.SheetNames[0] ?? '']
    if (!sheet) return []
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
    return rows.map((row) => {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) {
        const chave = normalizarChave(k)
        if (!chave) continue
        out[chave] = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').trim()
      }
      return out
    }).filter((row) => Object.values(row).some((v) => v !== ''))
  })
}

export function celula(row: Record<string, string>, ...aliases: string[]) {
  for (const a of aliases) {
    const v = row[normalizarChave(a)]
    if (v) return v
  }
  return ''
}

export function casarOpcao<T extends string>(valor: string, opcoes: readonly T[], padrao: T): T {
  const n = normalizarChave(valor)
  if (!n) return padrao
  return opcoes.find((o) => normalizarChave(o) === n) ?? opcoes.find((o) => normalizarChave(o).includes(n) || n.includes(normalizarChave(o))) ?? padrao
}
