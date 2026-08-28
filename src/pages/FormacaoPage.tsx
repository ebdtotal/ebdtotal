import { useState } from 'react'
import { GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react'
import { Field, GhostButton, Modal, PrimaryButton, inputClass } from '../components/ui'
import { useStore } from '../lib/store'
import type { CursoAula, CursoProfessor } from '../lib/types'
import { uid, youtubeEmbed } from '../lib/utils'

const AULA_VAZIA: CursoAula = { titulo: '', conteudo: '', videoUrl: '' }

export function FormacaoPage() {
  const { state, usuario, concluirAulaCurso, saveCurso, removeCurso, podeEditarLicoes } = useStore()
  const podeEditar = podeEditarLicoes
  const [aberto, setAberto] = useState(state.cursos[0]?.id ?? '')
  const [editando, setEditando] = useState<CursoProfessor | null>(null)
  const curso = state.cursos.find((c) => c.id === aberto) ?? state.cursos[0]

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
            <GraduationCap size={22} /> Escola de Professores
          </h1>
          <p className="text-sm text-muted">
            {podeEditar
              ? 'Master e superintendente editam os módulos. Professores estudam e concluem as aulas.'
              : 'Cursos curtos para quem ensina — não só para quem faz a chamada'}
          </p>
        </div>
        {podeEditar ? (
          <PrimaryButton
            onClick={() =>
              setEditando({
                id: uid('curso'),
                titulo: '',
                descricao: '',
                duracao: '20 min',
                aulas: [{ ...AULA_VAZIA }],
              })
            }
          >
            <Plus size={16} /> Novo módulo
          </PrimaryButton>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ul className="space-y-2">
          {state.cursos.map((c) => {
            const prog = state.progressos.find((p) => p.usuarioId === usuario?.id && p.cursoId === c.id)
            const n = prog?.concluidas.length ?? 0
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setAberto(c.id)}
                  className={`w-full rounded-xl p-4 text-left shadow-sm ${aberto === c.id ? 'bg-navy text-white' : 'bg-white'}`}
                >
                  <div className="font-semibold">{c.titulo}</div>
                  <div className={`text-xs ${aberto === c.id ? 'text-white/70' : 'text-muted'}`}>
                    {c.duracao} · {n}/{c.aulas.length} aulas
                  </div>
                </button>
              </li>
            )
          })}
          {state.cursos.length === 0 ? (
            <li className="rounded-xl bg-white p-4 text-sm text-muted shadow-sm">Nenhum módulo cadastrado.</li>
          ) : null}
        </ul>

        {curso ? (
          <section className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{curso.titulo}</h2>
                <p className="text-sm text-muted">{curso.descricao}</p>
              </div>
              {podeEditar ? (
                <div className="flex gap-1">
                  <GhostButton onClick={() => setEditando(curso)}>
                    <Pencil size={16} /> Editar
                  </GhostButton>
                  <GhostButton
                    onClick={() => {
                      if (!confirm(`Excluir o módulo “${curso.titulo}”?`)) return
                      removeCurso(curso.id)
                      setAberto(state.cursos.find((c) => c.id !== curso.id)?.id ?? '')
                    }}
                  >
                    <Trash2 size={16} /> Excluir
                  </GhostButton>
                </div>
              ) : null}
            </div>
            <ol className="space-y-4">
              {curso.aulas.map((aula, i) => {
                const prog = state.progressos.find((p) => p.usuarioId === usuario?.id && p.cursoId === curso.id)
                const ok = prog?.concluidas.includes(i)
                const embed = aula.videoUrl ? youtubeEmbed(aula.videoUrl) : null
                return (
                  <li key={`${curso.id}-${i}`} className="rounded-lg border border-line p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-medium">
                        {i + 1}. {aula.titulo}
                      </h3>
                      {ok ? (
                        <span className="text-xs font-semibold text-emerald-600">Concluída</span>
                      ) : usuario ? (
                        <PrimaryButton onClick={() => concluirAulaCurso(usuario.id, curso.id, i)}>
                          Concluir
                        </PrimaryButton>
                      ) : null}
                    </div>
                    {aula.conteudo ? <p className="text-sm leading-6">{aula.conteudo}</p> : null}
                    {embed ? (
                      <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-navy/5">
                        <iframe
                          title={aula.titulo}
                          src={embed}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : aula.videoUrl ? (
                      <a href={aula.videoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-navy">
                        Abrir vídeo →
                      </a>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </section>
        ) : null}
      </div>

      <CursoModal
        curso={editando}
        onClose={() => setEditando(null)}
        onSave={(c) => {
          saveCurso(c)
          setAberto(c.id)
          setEditando(null)
        }}
      />
    </div>
  )
}

function CursoModal({
  curso,
  onClose,
  onSave,
}: {
  curso: CursoProfessor | null
  onClose: () => void
  onSave: (c: CursoProfessor) => void
}) {
  const [form, setForm] = useState<CursoProfessor | null>(curso)
  if (curso && form?.id !== curso.id) setForm(curso)

  return (
    <Modal open={!!curso} title={form?.titulo ? 'Editar módulo' : 'Novo módulo'} onClose={onClose} wide>
      {form ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSave({
              ...form,
              titulo: form.titulo.trim(),
              descricao: form.descricao.trim(),
              duracao: form.duracao.trim() || '20 min',
              aulas: form.aulas
                .map((a) => ({
                  titulo: a.titulo.trim(),
                  conteudo: a.conteudo.trim(),
                  videoUrl: a.videoUrl?.trim() || undefined,
                }))
                .filter((a) => a.titulo || a.conteudo || a.videoUrl),
            })
          }}
        >
          <Field label="Título do módulo">
            <input className={inputClass} required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <textarea className={inputClass} rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          <Field label="Duração">
            <input className={inputClass} value={form.duracao} onChange={(e) => setForm({ ...form, duracao: e.target.value })} />
          </Field>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink">Aulas</span>
              <GhostButton onClick={() => setForm({ ...form, aulas: [...form.aulas, { ...AULA_VAZIA }] })}>
                <Plus size={14} /> Aula
              </GhostButton>
            </div>
            <ul className="space-y-3">
              {form.aulas.map((aula, i) => (
                <li key={i} className="rounded-xl border border-line p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted">Aula {i + 1}</span>
                    {form.aulas.length > 1 ? (
                      <button
                        type="button"
                        className="text-xs text-red-600"
                        onClick={() => setForm({ ...form, aulas: form.aulas.filter((_, j) => j !== i) })}
                      >
                        Excluir
                      </button>
                    ) : null}
                  </div>
                  <Field label="Título">
                    <input
                      className={inputClass}
                      value={aula.titulo}
                      onChange={(e) =>
                        setForm({ ...form, aulas: form.aulas.map((a, j) => (j === i ? { ...a, titulo: e.target.value } : a)) })
                      }
                    />
                  </Field>
                  <div className="mt-2">
                    <Field label="Conteúdo">
                      <textarea
                        className={inputClass}
                        rows={2}
                        value={aula.conteudo}
                        onChange={(e) =>
                          setForm({ ...form, aulas: form.aulas.map((a, j) => (j === i ? { ...a, conteudo: e.target.value } : a)) })
                        }
                      />
                    </Field>
                  </div>
                  <div className="mt-2">
                    <Field label="Link do YouTube (opcional)">
                      <input
                        className={inputClass}
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={aula.videoUrl ?? ''}
                        onChange={(e) =>
                          setForm({ ...form, aulas: form.aulas.map((a, j) => (j === i ? { ...a, videoUrl: e.target.value } : a)) })
                        }
                      />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={onClose}>Cancelar</GhostButton>
            <PrimaryButton type="submit">Salvar módulo</PrimaryButton>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}
