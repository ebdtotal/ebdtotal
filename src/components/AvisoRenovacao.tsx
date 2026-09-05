import { Link } from 'react-router-dom'
import { avisoRenovacaoPlano } from '../lib/planos'
import { useStore } from '../lib/store'
import { formatDateBR } from '../lib/utils'

export function AvisoRenovacao() {
  const { igreja, usuario } = useStore()
  if (usuario?.papel === 'admin') return null
  const aviso = avisoRenovacaoPlano(igreja)
  if (!aviso) return null
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">{formatDateBR(aviso.data)}</div>
      <h2 className="mt-1 text-lg font-semibold">{aviso.titulo}</h2>
      <p className="mt-2 text-sm leading-6">{aviso.texto}</p>
      {usuario?.papel === 'sede' || usuario?.papel === 'superintendente' ? (
        <Link to="/conta" className="mt-3 inline-flex rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white">
          Ver plano e renovar
        </Link>
      ) : (
        <p className="mt-2 text-xs">Peça à sede da igreja para renovar a assinatura.</p>
      )}
    </div>
  )
}
