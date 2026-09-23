import { Download, Upload } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { GhostButton, PrimaryButton } from './ui'
import { baixarModeloExcel } from '../lib/excel'

const botaoCompacto = 'shrink-0 whitespace-nowrap !min-h-0 !h-9 !gap-1 !border-2 !px-2 !py-0 !text-[11px]'

export function ImportacaoExcel({
  arquivoModelo,
  colunas,
  exemplo,
  onImportar,
  compact = false,
  children,
}: {
  arquivoModelo: string
  colunas: string[]
  exemplo: Record<string, string | number>
  onImportar: (file: File) => Promise<{ ok: number; erros: string[] }> | { ok: number; erros: string[] }
  compact?: boolean
  children?: ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [resultado, setResultado] = useState<{ ok: number; erros: string[] } | null>(null)
  const [lendo, setLendo] = useState(false)

  const botoes = (
    <>
      <GhostButton
        type="button"
        className={compact ? botaoCompacto : undefined}
        onClick={() => baixarModeloExcel(arquivoModelo, colunas, exemplo)}
      >
        <Download size={compact ? 14 : 16} /> Baixar modelo
      </GhostButton>
      <PrimaryButton type="button" className={compact ? botaoCompacto : undefined} onClick={() => inputRef.current?.click()}>
        <Upload size={compact ? 14 : 16} /> {lendo ? 'Lendo…' : compact ? 'Importar' : 'Enviar planilha'}
      </PrimaryButton>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setLendo(true)
          setResultado(null)
          void Promise.resolve(onImportar(file))
            .then(setResultado)
            .finally(() => setLendo(false))
        }}
      />
    </>
  )

  const aviso = resultado ? (
    <div className={compact ? 'basis-full text-sm' : 'mt-3 text-sm'}>
      {resultado.ok > 0 ? (
        <p className="text-emerald-700">{resultado.ok} registro(s) importado(s).</p>
      ) : null}
      {resultado.erros.length ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-red-600">
          {resultado.erros.slice(0, 12).map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
    </div>
  ) : null

  if (compact) {
    return (
      <div className="flex w-full flex-col items-end gap-2 sm:w-auto">
        <div className="flex max-w-full flex-nowrap items-center justify-end gap-1.5">
          {botoes}
          {children}
        </div>
        {aviso}
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-xl border border-gold/40 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-navy">Importar em lote (Excel)</p>
      <p className="mt-1 text-xs text-muted">
        Baixe o modelo, preencha as linhas e envie o arquivo. A primeira linha é o exemplo — pode apagar.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">{botoes}</div>
      {aviso}
    </div>
  )
}
