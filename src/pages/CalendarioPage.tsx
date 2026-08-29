import { useMemo, useState } from 'react'
import { Field, GhostButton, Modal, PrimaryButton, DateInput, Confirmacao, inputClass } from '../components/ui'
import { LicaoSelect } from '../components/LicaoSelect'
import { licoesCatalogo } from '../lib/acompanhamento'
import { ROTULO_EVENTO } from '../lib/pedagogia'
import { useStore } from '../lib/store'
import { TIPOS_EVENTO, type EventoCalendario, type Licao, type TipoEvento } from '../lib/types'
import { formatDateBR, mesNome, uid } from '../lib/utils'

const COR: Record<TipoEvento, string> = {
  licao: 'bg-navy text-white',
  congresso: 'bg-violet-100 text-violet-800',
  culto: 'bg-amber-100 text-amber-800',
  feriado: 'bg-slate-200 text-slate-700',
  reuniao: 'bg-sky-100 text-sky-800',
  capacitacao: 'bg-teal/20 text-teal',
  ebf: 'bg-orange-100 text-orange-800',
  encerramento: 'bg-gold/30 text-navy',
}

export function CalendarioPage() {
  const { state, saveEvento, removeEvento, ehAluno } = useStore()
  const [editing, setEditing] = useState<EventoCalendario | null>(null)
  const [excluirEvento, setExcluirEvento] = useState<EventoCalendario | null>(null)
  const grupos = useMemo(() => {
    const map = new Map<string, EventoCalendario[]>()
    for (const ev of [...state.eventos].sort((a, b) => a.data.localeCompare(b.data))) {
      const key = ev.data.slice(0, 7)
      map.set(key, [...(map.get(key) ?? []), ev])
    }
    return [...map.entries()]
  }, [state.eventos])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Calendário pedagógico</h1>
          <p className="text-sm text-muted">Lições, congressos, cultos, feriados, reuniões, capacitações e EBF</p>
        </div>
        {ehAluno ? null : (
          <PrimaryButton
            onClick={() =>
              setEditing({
                id: uid('ev'),
                data: '2026-09-06',
                tipo: 'licao',
                titulo: '',
                descricao: '',
              })
            }
          >
            Novo evento
          </PrimaryButton>
        )}
      </div>

      {grupos.map(([mes, lista]) => (
        <section key={mes} className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-navy">
            {mesNome(`${mes}-01`)}
          </h2>
          <ul className="space-y-2">
            {lista.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-[4.5rem] text-sm font-bold text-navy">{formatDateBR(ev.data)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COR[ev.tipo]}`}>
                    {ROTULO_EVENTO[ev.tipo]}
                  </span>
                  <div>
                    <div className="font-medium">{ev.titulo}</div>
                    <div className="text-xs text-muted">{ev.descricao}</div>
                  </div>
                </div>
                {ehAluno ? null : (
                  <div className="flex gap-2">
                    <GhostButton onClick={() => setEditing(ev)}>Editar</GhostButton>
                    <GhostButton onClick={() => setExcluirEvento(ev)}>Excluir</GhostButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <EventoModal
        evento={editing}
        licoes={licoesCatalogo(state.licoes)}
        onClose={() => setEditing(null)}
        onSave={(ev) => {
          saveEvento(ev)
          setEditing(null)
        }}
      />
      <Confirmacao
        open={!!excluirEvento}
        titulo="Excluir evento"
        texto={`Excluir “${excluirEvento?.titulo ?? ''}”?`}
        onCancel={() => setExcluirEvento(null)}
        onConfirm={() => {
          if (excluirEvento) removeEvento(excluirEvento.id)
          setExcluirEvento(null)
        }}
      />
    </div>
  )
}

function EventoModal({
  evento,
  licoes,
  onClose,
  onSave,
}: {
  evento: EventoCalendario | null
  licoes: Licao[]
  onClose: () => void
  onSave: (e: EventoCalendario) => void
}) {
  const [form, setForm] = useState<EventoCalendario | null>(evento)
  if (evento && form?.id !== evento.id) setForm(evento)

  return (
    <Modal open={!!evento} title="Evento do calendário" onClose={onClose}>
      {form ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSave(form)
          }}
        >
          <Field label="Data">
            <DateInput value={form.data} onChange={(data) => setForm({ ...form, data })} />
          </Field>
          <Field label="Tipo">
            <select
              className={inputClass}
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoEvento })}
            >
              {TIPOS_EVENTO.map((t) => (
                <option key={t} value={t}>
                  {ROTULO_EVENTO[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Título">
            <input className={inputClass} required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <input className={inputClass} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          {form.tipo === 'licao' ? (
            <Field label="Lição vinculada">
              <LicaoSelect
                value={form.licaoId ?? ''}
                onChange={(licaoId) => setForm({ ...form, licaoId: licaoId || undefined })}
                licoes={licoes}
                eventos={[]}
                allowEmpty
              />
            </Field>
          ) : null}
          <p className="text-xs text-muted">Data: {formatDateBR(form.data)}</p>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={onClose}>Cancelar</GhostButton>
            <PrimaryButton type="submit">Salvar</PrimaryButton>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}
