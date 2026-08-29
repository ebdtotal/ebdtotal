import { Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { GhostButton, PrimaryButton } from './ui'
import { baixarModeloExcel } from '../lib/excel'

export function ImportacaoExcel({
  arquivoModelo,
  colunas,
  exemplo,
  onImportar,
}: {
  arquivoModelo: string
  colunas: string[]
  exemplo: Record<string, string | number>
  onImportar: (file: File) => Promise<{ ok: number; erros: string[] }> | { ok: number; erros: string[] }
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [resultado, setResultado] = useState<{ ok: number; erros: string[] } | null>(null)
  const [lendo, setLendo] = useState(false)

  return (
    <div className="mb-5 rounded-xl border border-gold/40 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-navy">Importar em lote (Excel)</p>
      <p className="mt-1 text-xs text-muted">
        Baixe o modelo, preencha as linhas e envie o arquivo. A primeira linha é o exemplo — pode apagar.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <GhostButton
          type="button"
          onClick={() => baixarModeloExcel(arquivoModelo, colunas, exemplo)}
        >
          <Download size={16} /> Baixar modelo
        </GhostButton>
        <PrimaryButton type="button" onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> {lendo ? 'Lendo…' : 'Enviar planilha'}
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
      </div>
      {resultado ? (
        <div className="mt-3 text-sm">
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
      ) : null}
    </div>
  )
}
