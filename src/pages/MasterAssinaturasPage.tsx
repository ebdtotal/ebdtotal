import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { apiClientes, type CaixaAssinatura } from '../lib/api'
import { formatarBRL, rotuloProduto } from '../lib/planos'
import { useStore } from '../lib/store'
import { formatDateBR } from '../lib/utils'

const VAZIO: CaixaAssinatura = {
  totalPago: 0,
  esteMes: 0,
  mesPassado: 0,
  aReceber: 0,
  pagos: 0,
  pendentes: 0,
  vencidas: 0,
  vencendo: 0,
  fluxo: [],
  lancamentos: [],
  renovar: [],
}

export function MasterAssinaturasPage() {
  const { usuario } = useStore()
  const [caixa, setCaixa] = useState<CaixaAssinatura>(VAZIO)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    void apiClientes()
      .then((r) => setCaixa(r.financeiro ?? VAZIO))
      .catch((e: Error) => setErro(e.message))
  }, [])

  if (usuario?.papel !== 'admin') return <Navigate to="/inicio" replace />

  const maxFluxo = Math.max(1, ...caixa.fluxo.map((f) => f.total))

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Assinaturas e caixa</h1>
      <p className="mt-1 text-sm text-muted">
        Receita das assinaturas pagas no site, parcelas no tempo e vencimentos. Igrejas criadas pelo master sem pagamento
        não entram no caixa.
      </p>
      <p className="mt-2 text-sm">
        <Link to="/master" className="font-semibold text-navy hover:underline">
          ← Painel das igrejas
        </Link>
      </p>
      {erro ? <p className="mt-3 text-sm text-red-600">{erro}</p> : null}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Recebido no total', formatarBRL(caixa.totalPago)],
          ['Caixa deste mês', formatarBRL(caixa.esteMes)],
          ['Mês anterior', formatarBRL(caixa.mesPassado)],
          ['A receber (pendentes)', formatarBRL(caixa.aReceber)],
          ['Pagamentos confirmados', String(caixa.pagos)],
          ['Checkouts pendentes', String(caixa.pendentes)],
          ['Vencendo (30 dias)', String(caixa.vencendo)],
          ['Já vencidas', String(caixa.vencidas)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
            <div className="mt-1 text-xl font-semibold text-navy">{value}</div>
          </div>
        ))}
      </div>

      <section className="mt-5 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Fluxo de caixa (à vista no mês + parcelas 12x)</h2>
        {caixa.fluxo.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Ainda não há pagamentos registrados.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {caixa.fluxo.slice(-12).map((f) => (
              <li key={f.mes}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{f.mes}</span>
                  <span>{formatarBRL(f.total)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-page">
                  <div className="h-full bg-navy" style={{ width: `${Math.round((f.total / maxFluxo) * 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  À vista {formatarBRL(f.avista)} · 12x {formatarBRL(f.parcelado)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm">
        <h2 className="px-4 pt-4 text-lg font-semibold">Renovações</h2>
        <p className="px-4 pt-1 text-sm text-muted">Igrejas vencidas ou que vencem em até 30 dias, com o valor de referência à vista.</p>
        <table className="data mt-2 w-full min-w-[720px] text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Igreja</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Validade</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3">Referência</th>
            </tr>
          </thead>
          <tbody>
            {caixa.renovar.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={5}>
                  Nenhuma renovação no horizonte de 30 dias.
                </td>
              </tr>
            ) : (
              caixa.renovar.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.nome}</td>
                  <td className="px-4 py-3">{rotuloProduto(r.plano)}</td>
                  <td className="px-4 py-3">{formatDateBR((r.validoAte || '').slice(0, 10))}</td>
                  <td className="px-4 py-3">
                    {r.dias < 0 ? (
                      <span className="font-semibold text-red-700">Venceu há {Math.abs(r.dias)} dia{Math.abs(r.dias) === 1 ? '' : 's'}</span>
                    ) : (
                      `Em ${r.dias} dia${r.dias === 1 ? '' : 's'}`
                    )}
                  </td>
                  <td className="px-4 py-3">{formatarBRL(r.preco)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm">
        <h2 className="px-4 pt-4 text-lg font-semibold">Pagamentos</h2>
        <table className="data mt-2 w-full min-w-[820px] text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Igreja</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Forma</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {caixa.lancamentos.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={6}>
                  Nenhum pagamento confirmado ainda.
                </td>
              </tr>
            ) : (
              caixa.lancamentos.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">{formatDateBR((l.data || '').slice(0, 10))}</td>
                  <td className="px-4 py-3">{l.igreja}</td>
                  <td className="px-4 py-3">{rotuloProduto(l.plano)}</td>
                  <td className="px-4 py-3">{l.pagamento === 'parcelado' ? '12x' : 'À vista'}</td>
                  <td className="px-4 py-3">{l.origem === 'migracao' ? 'Migração' : 'Site'}</td>
                  <td className="px-4 py-3">{formatarBRL(l.valor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
