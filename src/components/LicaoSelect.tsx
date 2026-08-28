import { useMemo } from 'react'
import { inputClass } from './ui'
import type { EventoCalendario, Licao } from '../lib/types'
import { formatDateBR } from '../lib/utils'

export function LicaoSelect({
  value,
  onChange,
  licoes,
  eventos,
  allowEmpty,
}: {
  value: string
  onChange: (id: string) => void
  licoes: Licao[]
  eventos: EventoCalendario[]
  allowEmpty?: boolean
}) {
  const grupos = useMemo(() => {
    const map = new Map<string, Licao[]>()
    for (const l of [...licoes].sort((a, b) => a.ano - b.ano || a.trimestre - b.trimestre || a.numero - b.numero)) {
      const key = `${l.ano} · ${l.trimestre}º tri`
      map.set(key, [...(map.get(key) ?? []), l])
    }
    return [...map.entries()]
  }, [licoes])
  const dataDe = (id: string) => eventos.find((e) => e.licaoId === id)?.data

  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty ? <option value="">Nenhuma</option> : null}
      {grupos.map(([grupo, lista]) => (
        <optgroup key={grupo} label={grupo}>
          {lista.map((l) => {
            const data = dataDe(l.id)
            return (
              <option key={l.id} value={l.id}>
                {l.tema}
                {data ? ` · ${formatDateBR(data)}` : ''}
              </option>
            )
          })}
        </optgroup>
      ))}
    </select>
  )
}
