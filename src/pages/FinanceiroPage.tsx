import { Download, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Field, GhostButton, Modal, PrimaryButton, DateInput, inputClass } from '../components/ui'
import { exportToExcel } from '../lib/excel'
import { useStore } from '../lib/store'
import { nomeEscola } from '../lib/stats'
import { TIPOS_LANCAMENTO, type LancamentoFinanceiro, type TipoLancamento } from '../lib/types'
import { formatDateBR, moneyBR, noAno, toISODate, uid } from '../lib/utils'

const LABELS: Record<TipoLancamento, string> = {
  oferta: 'Oferta',
  dizimo: 'Dízimo',
  despesa: 'Despesa',
  outro: 'Outro',
}

export function FinanceiroPage() {
  const { state, escolasVisiveis, saveLancamento, removeLancamento, usuario } = useStore()
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [tipo, setTipo] = useState('')
  const [editing, setEditing] = useState<LancamentoFinanceiro | null>(null)
  const ids = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])

  const lista = state.lancamentos
    .filter((l) => ids.has(l.escolaId) && noAno(l.data, ano) && (!tipo || l.tipo === tipo))
    .sort((a, b) => b.data.localeCompare(a.data))

  const receitas = lista.filter((l) => l.tipo !== 'despesa').reduce((a, l) => a + l.valor, 0)
  const despesas = lista.filter((l) => l.tipo === 'despesa').reduce((a, l) => a + l.valor, 0)

  function exportar() {
    exportToExcel(`financeiro-${ano}`, lista.map((l) => ({
      Data: formatDateBR(l.data),
      Escola: nomeEscola(state.escolas, l.escolaId),
      Tipo: LABELS[l.tipo],
      Descricao: l.descricao,
      Valor: l.valor,
    })))
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Relatório financeiro</h1>
          <p className="text-sm text-muted">Ofertas, dízimos e despesas de todas as filiais</p>
        </div>
        <PrimaryButton onClick={() => setEditing({
          id: uid('fin'),
          escolaId: escolasVisiveis[0]?.id ?? '',
          data: toISODate(new Date()),
          tipo: 'oferta',
          descricao: '',
          valor: 0,
        })}>
          <Plus size={16} /> Lançamento
        </PrimaryButton>
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border-l-4 border-emerald-400 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-muted">Receitas</div>
          <div className="mt-1 text-2xl font-semibold">{moneyBR(receitas)}</div>
        </div>
        <div className="rounded-xl border-l-4 border-red-400 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-muted">Despesas</div>
          <div className="mt-1 text-2xl font-semibold">{moneyBR(despesas)}</div>
        </div>
        <div className="rounded-xl border-l-4 border-gold bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-muted">Saldo</div>
          <div className="mt-1 text-2xl font-semibold">{moneyBR(receitas - despesas)}</div>
        </div>
      </div>
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <select className={inputClass + ' w-28'} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
              {[anoAtual, anoAtual - 1].map((a) => <option key={a}>{a}</option>)}
            </select>
            <select className={inputClass + ' w-36'} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              {TIPOS_LANCAMENTO.map((t) => <option key={t} value={t}>{LABELS[t]}</option>)}
            </select>
          </div>
          <PrimaryButton onClick={exportar}><Download size={16} /> Excel</PrimaryButton>
        </div>
        <div className="table-wrap">
          <table className="data w-full min-w-[720px] text-left">
            <thead>
              <tr>
                {['Data', 'Escola', 'Tipo', 'Descrição', 'Valor', ''].map((h) => (
                  <th key={h || 'a'} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-3">{formatDateBR(l.data)}</td>
                  <td className="px-3 py-3">{nomeEscola(state.escolas, l.escolaId)}</td>
                  <td className="px-3 py-3">{LABELS[l.tipo]}</td>
                  <td className="px-3 py-3">{l.descricao}</td>
                  <td className={`px-3 py-3 font-medium ${l.tipo === 'despesa' ? 'text-red-600' : 'text-emerald-700'}`}>
                    {l.tipo === 'despesa' ? '−' : '+'}{moneyBR(l.valor)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button type="button" className="text-muted hover:text-red-600" onClick={() => removeLancamento(l.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Modal open={!!editing} title="Lançamento financeiro" onClose={() => setEditing(null)}>
        {editing ? (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveLancamento(editing); setEditing(null) }}>
            <Field label="Data">
              <DateInput value={editing.data} onChange={(data) => setEditing({ ...editing, data })} />
            </Field>
            <Field label="Escola">
              <select className={inputClass} value={editing.escolaId} disabled={usuario?.papel === 'professor'} onChange={(e) => setEditing({ ...editing, escolaId: e.target.value })}>
                {escolasVisiveis.map((esc) => <option key={esc.id} value={esc.id}>{esc.nome}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select className={inputClass} value={editing.tipo} onChange={(e) => setEditing({ ...editing, tipo: e.target.value as TipoLancamento })}>
                {TIPOS_LANCAMENTO.map((t) => <option key={t} value={t}>{LABELS[t]}</option>)}
              </select>
            </Field>
            <Field label="Descrição">
              <input className={inputClass} required value={editing.descricao} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
            </Field>
            <Field label="Valor (R$)">
              <input className={inputClass} type="number" min={0} step="0.01" value={editing.valor} onChange={(e) => setEditing({ ...editing, valor: Number(e.target.value) })} />
            </Field>
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setEditing(null)}>Cancelar</GhostButton>
              <PrimaryButton type="submit">Salvar</PrimaryButton>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}
