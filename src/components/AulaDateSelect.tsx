import { useMemo } from 'react'
import { inputClass } from './ui'
import type { EventoCalendario, Licao } from '../lib/types'
import { formatDateBR } from '../lib/utils'

export function AulaDateSelect({
  value,
  onChange,
  eventos,
  licoes,
}: {
  value: string
  onChange: (iso: string) => void
  eventos: EventoCalendario[]
  licoes?: Licao[]
}) {
  const aulas = useMemo(() => {
    const list = eventos
      .filter((e) => e.tipo === 'licao')
      .slice()
      .sort((a, b) => b.data.localeCompare(a.data))
    if (value && !list.some((e) => e.data === value)) {
      return [{ id: `extra-${value}`, data: value, titulo: 'Aula', tipo: 'licao' as const, descricao: '' }, ...list]
    }
    return list
  }, [eventos, value])

  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {aulas.map((e) => {
        const licao = e.licaoId ? licoes?.find((l) => l.id === e.licaoId) : undefined
        const nome = licao?.tema || e.titulo
        return (
          <option key={e.id} value={e.data}>
            {formatDateBR(e.data)} · {nome}
          </option>
        )
      })}
    </select>
  )
}
