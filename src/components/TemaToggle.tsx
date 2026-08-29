import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { aplicarTema, temaAtual, type Tema } from '../lib/tema'

export function TemaToggle({ compact }: { compact?: boolean }) {
  const [tema, setTema] = useState<Tema>(() => temaAtual())
  const claro = tema === 'claro'
  return (
    <button
      type="button"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-navy shadow-md"
      aria-label={claro ? 'Ativar tema escuro' : 'Ativar tema claro'}
      title={claro ? 'Tema escuro' : 'Tema claro'}
      onClick={() => {
        const next: Tema = claro ? 'escuro' : 'claro'
        aplicarTema(next)
        setTema(next)
      }}
    >
      {claro ? <Moon size={compact ? 18 : 20} strokeWidth={2.4} /> : <Sun size={compact ? 18 : 20} strokeWidth={2.4} />}
    </button>
  )
}
