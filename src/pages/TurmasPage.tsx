import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Field, GhostButton, Modal, PrimaryButton, inputClass } from '../components/ui'
import { useStore } from '../lib/store'
import { FAIXAS_ETARIAS, type FaixaEtaria, type TurmaCadastro } from '../lib/types'
import { uid } from '../lib/utils'

export function TurmasPage() {
  const { state, escolasVisiveis, saveTurma, removeTurma, podeVerTudo, usuario } = useStore()
  const podeCadastrar =
    usuario?.papel === 'admin' || usuario?.papel === 'sede' || usuario?.papel === 'superintendente'
  const [editing, setEditing] = useState<TurmaCadastro | null>(null)
  const turmas = useMemo(() => {
    const ids = new Set(escolasVisiveis.map((e) => e.id))
    return (state.turmas ?? []).filter((t) => ids.has(t.escolaId))
  }, [state.turmas, escolasVisiveis])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Turmas</h1>
          <p className="text-sm text-muted">
            {podeCadastrar
              ? 'Cadastre as classes de cada escola. Depois vincule alunos e professores no Cadastros.'
              : 'Classes da escola. Somente o master e o superintendente cadastram turmas.'}
          </p>
        </div>
        {podeCadastrar && (podeVerTudo || escolasVisiveis.length > 0) ? (
          <PrimaryButton
            onClick={() =>
              setEditing({
                id: uid('t'),
                nome: '',
                escolaId: escolasVisiveis[0]?.id ?? '',
                faixaEtaria: 'Adultos',
              })
            }
          >
            <Plus size={16} /> Nova turma
          </PrimaryButton>
        ) : null}
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        {turmas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Nenhuma turma cadastrada ainda.</p>
        ) : (
          <div className="table-wrap">
            <table className="data w-full min-w-[640px] text-left">
              <thead>
                <tr>
                  {['Turma', 'Escola', 'Faixa etária', ''].map((h) => (
                    <th key={h || 'a'} className="px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {turmas.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-3 font-medium">{t.nome}</td>
                    <td className="px-3 py-3">{escolasVisiveis.find((e) => e.id === t.escolaId)?.nome ?? t.escolaId}</td>
                    <td className="px-3 py-3">{t.faixaEtaria}</td>
                    <td className="px-3 py-3 text-right">
                      {podeCadastrar ? (
                        <>
                          <button type="button" className="mr-2 text-muted hover:text-navy" onClick={() => setEditing(t)}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="text-muted hover:text-red-600" onClick={() => removeTurma(t.id)}>
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {podeCadastrar ? (
      <Modal open={!!editing} title={editing ? 'Turma' : ''} onClose={() => setEditing(null)}>
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              saveTurma(editing)
              setEditing(null)
            }}
          >
            <Field label="Nome da turma">
              <input className={inputClass} required value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
            </Field>
            <Field label="Escola">
              <select className={inputClass} value={editing.escolaId} onChange={(e) => setEditing({ ...editing, escolaId: e.target.value })}>
                {escolasVisiveis.map((esc) => (
                  <option key={esc.id} value={esc.id}>{esc.nome}</option>
                ))}
              </select>
            </Field>
            <Field label="Faixa etária">
              <select
                className={inputClass}
                value={editing.faixaEtaria}
                onChange={(e) => setEditing({ ...editing, faixaEtaria: e.target.value as FaixaEtaria })}
              >
                {FAIXAS_ETARIAS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setEditing(null)}>Cancelar</GhostButton>
              <PrimaryButton type="submit">Salvar</PrimaryButton>
            </div>
          </form>
        ) : null}
      </Modal>
      ) : null}
    </div>
  )
}
