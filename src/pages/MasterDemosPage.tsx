import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Confirmacao, inputClass } from '../components/ui'
import { apiDemos, apiPatchDemo, type DemoPedido } from '../lib/api'
import { useStore } from '../lib/store'
import { formatDateBR, whatsappUrl } from '../lib/utils'

const STATUS: Record<string, string> = {
  nova: 'Nova',
  contactada: 'Contactada',
  concluida: 'Concluída',
}

export function MasterDemosPage() {
  const { usuario } = useStore()
  const [demos, setDemos] = useState<DemoPedido[]>([])
  const [resumo, setResumo] = useState({ total: 0, novas: 0, contactadas: 0, concluidas: 0 })
  const [erro, setErro] = useState<string | null>(null)
  const [excluir, setExcluir] = useState<DemoPedido | null>(null)

  function carregar() {
    void apiDemos()
      .then((r) => {
        setDemos(r.demos ?? [])
        setResumo(r.resumo ?? { total: 0, novas: 0, contactadas: 0, concluidas: 0 })
        setErro(null)
      })
      .catch((e: Error) => setErro(e.message))
  }

  useEffect(() => {
    carregar()
  }, [])

  if (usuario?.papel !== 'admin') return <Navigate to="/inicio" replace />

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Demonstrações</h1>
      <p className="mt-1 text-sm text-muted">
        Quem pediu demonstração pelo site. Entre em contato e marque o status.
      </p>
      <p className="mt-2 text-sm">
        <Link to="/master" className="font-semibold text-navy hover:underline">
          ← Painel das igrejas
        </Link>
      </p>
      {erro ? <p className="mt-3 text-sm text-red-600">{erro}</p> : null}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Total', String(resumo.total)],
          ['Novas', String(resumo.novas)],
          ['Contactadas', String(resumo.contactadas)],
          ['Concluídas', String(resumo.concluidas)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
            <div className="mt-1 text-xl font-semibold text-navy">{value}</div>
          </div>
        ))}
      </div>

      <section className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="data mt-0 w-full min-w-[860px] text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Igreja</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {demos.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-sm text-muted" colSpan={6}>
                  Nenhuma demonstração agendada ainda.
                </td>
              </tr>
            ) : (
              demos.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 text-sm">{formatDateBR((d.created_at || '').slice(0, 10))}</td>
                  <td className="px-4 py-3 font-medium">{d.nome}</td>
                  <td className="px-4 py-3">{d.igreja}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>{d.email}</div>
                    <div className="text-muted">{d.telefone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={inputClass + ' w-36'}
                      value={d.status || 'nova'}
                      onChange={(e) => {
                        const status = e.target.value
                        void apiPatchDemo(d.id, { status })
                          .then(carregar)
                          .catch((err: Error) => setErro(err.message))
                      }}
                    >
                      {Object.entries(STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      {d.telefone ? (
                        <a
                          href={whatsappUrl(d.telefone, `Olá ${d.nome}, sobre a demonstração do EDB Total para ${d.igreja}.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-emerald-700 hover:underline"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="text-sm font-semibold text-red-700 hover:underline"
                        onClick={() => setExcluir(d)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <Confirmacao
        open={!!excluir}
        titulo="Excluir pedido"
        texto={`Excluir o pedido de ${excluir?.nome ?? ''} (${excluir?.igreja ?? ''})?`}
        confirmar="Excluir"
        onCancel={() => setExcluir(null)}
        onConfirm={() => {
          if (!excluir) return
          void apiPatchDemo(excluir.id, { acao: 'excluir' })
            .then(() => {
              setExcluir(null)
              carregar()
            })
            .catch((err: Error) => setErro(err.message))
        }}
      />
    </div>
  )
}
