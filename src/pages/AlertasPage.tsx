import { Cake, MessageCircle, UserX } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { aniversariantes, ausentesRecentes, nomeEscola } from '../lib/stats'
import { formatDateBR, whatsappUrl } from '../lib/utils'

export function AlertasPage() {
  const { state, escolasVisiveis, pessoasVisiveis } = useStore()
  const ids = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])
  const ausentes = ausentesRecentes(state, ids)
  const nivers = aniversariantes(pessoasVisiveis, 7)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Alertas</h1>
      <p className="mb-5 text-sm text-muted">Alunos ausentes e aniversariantes da semana</p>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <UserX size={18} className="text-amber-600" /> Alunos ausentes
          </h2>
          {ausentes.length === 0 ? (
            <p className="text-sm text-muted">Nenhum alerta de falta no momento.</p>
          ) : (
            <ul className="space-y-2">
              {ausentes.map((l) => (
                <li key={l.pessoa.id} className="flex items-center justify-between rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2">
                  <div>
                    <div className="font-medium">
                      <Link to={`/alunos/${l.pessoa.id}`} className="hover:underline">
                        {l.pessoa.nome}
                      </Link>
                    </div>
                    <div className="text-xs text-muted">
                      {l.pessoa.turma} · {nomeEscola(state.escolas, l.pessoa.escolaId)} · {l.faltas} faltas
                    </div>
                  </div>
                  {l.pessoa.telefone ? (
                    <a
                      className="text-emerald-600"
                      href={whatsappUrl(l.pessoa.telefone, `Olá! Notamos a ausência de ${l.pessoa.nome} na EBD. Podemos ajudar?`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={18} />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Cake size={18} className="text-pink-500" /> Aniversariantes (7 dias)
          </h2>
          {nivers.length === 0 ? (
            <p className="text-sm text-muted">Nenhum aniversário nos próximos 7 dias.</p>
          ) : (
            <ul className="space-y-2">
              {nivers.map((n) => (
                <li key={n.pessoa.id} className="flex items-center justify-between rounded-md border-l-4 border-pink-400 bg-pink-50 px-3 py-2">
                  <div>
                    <div className="font-medium">{n.pessoa.nome}</div>
                    <div className="text-xs text-muted">
                      {n.pessoa.turma} · {n.idade ?? '—'} anos
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-pink-700">
                    {formatDateBR(`2026-${n.quando}`).slice(0, 5)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
