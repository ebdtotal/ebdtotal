import * as XLSX from 'xlsx'

export function exportToExcel(filename: string, rows: Record<string, string | number>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Dados')
  XLSX.writeFile(book, `${filename}.xlsx`)
}
