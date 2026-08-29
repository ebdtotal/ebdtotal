import { useMemo, useState } from 'react'
import { DateInput, Field, GhostButton, Modal, PrimaryButton, Confirmacao, inputClass } from '../components/ui'
import { useStore } from '../lib/store'
import type { Aviso } from '../lib/types'
import { formatDateBR, toISODate, uid } from '../lib/utils'

export function AvisosPage() {
  const { state, usuario, podePublicarAvisos, ehAluno, saveAviso, removeAviso } = useStore()
  const [editando, setEditando] = useState<Aviso | null>(null)
  const [excluirAviso, setExcluirAviso] = useState<Aviso | null>(null)
  const avisos = useMemo(
    () =>
      [...state.avisos]
        .filter((a) => !a.escolaId || a.escolaId === usuario?.escolaId)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [state.avisos, usuario?.escolaId],
  )

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Avisos</h1>
          <p className="text-sm text-muted">
            {ehAluno
              ? 'Comunicados da EBD. Só leitura.'
              : podePublicarAvisos
                ? 'Publicações aparecem para professores, superintendentes, secretários e alunos.'
                : 'Comunicados da EBD.'}
          </p>
        </div>
        {podePublicarAvisos ? (
          <PrimaryButton
            onClick={() =>
              setEditando({
                id: uid('av'),
                titulo: '',
                texto: '',
                data: toISODate(new Date()),
                escolaId: usuario?.escolaId,
              })
            }
          >
            Novo aviso
          </PrimaryButton>
        ) : null}
      </div>

      {avisos.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm text-muted shadow-sm">Nenhum aviso publicado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {avisos.map((a) => (
            <li key={a.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gold">{formatDateBR(a.data)}</div>
                  <h2 className="mt-1 text-lg font-semibold text-ink">{a.titulo}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/90">{a.texto}</p>
                </div>
                {podePublicarAvisos ? (
                  <div className="flex gap-2">
                    <GhostButton onClick={() => setEditando(a)}>Editar</GhostButton>
                    <GhostButton onClick={() => setExcluirAviso(a)}>Excluir</GhostButton>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AvisoModal
        aviso={editando}
        onClose={() => setEditando(null)}
        onSave={(a) => {
          saveAviso(a)
          setEditando(null)
        }}
      />
      <Confirmacao
        open={!!excluirAviso}
        titulo="Excluir aviso"
        texto={`Excluir o aviso “${excluirAviso?.titulo ?? ''}”?`}
        onCancel={() => setExcluirAviso(null)}
        onConfirm={() => {
          if (excluirAviso) removeAviso(excluirAviso.id)
          setExcluirAviso(null)
        }}
      />
    </div>
  )
}

function AvisoModal({
  aviso,
  onClose,
  onSave,
}: {
  aviso: Aviso | null
  onClose: () => void
  onSave: (a: Aviso) => void
}) {
  const [form, setForm] = useState<Aviso | null>(aviso)
  if (aviso && form?.id !== aviso.id) setForm(aviso)

  return (
    <Modal open={!!aviso} title={form?.titulo ? 'Editar aviso' : 'Novo aviso'} onClose={onClose}>
      {form ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSave({ ...form, titulo: form.titulo.trim(), texto: form.texto.trim() })
          }}
        >
          <Field label="Título">
            <input className={inputClass} required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Field>
          <Field label="Data">
            <DateInput value={form.data} onChange={(data) => setForm({ ...form, data })} />
          </Field>
          <Field label="Texto">
            <textarea className={inputClass} rows={5} required value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={onClose}>Cancelar</GhostButton>
            <PrimaryButton type="submit">Publicar</PrimaryButton>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}
