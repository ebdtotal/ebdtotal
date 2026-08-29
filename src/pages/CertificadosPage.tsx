import { useEffect, useMemo, useState } from 'react'
import { TelaImpressao } from '../components/TelaImpressao'
import { Field, GhostButton, Modal, PrimaryButton, DateInput, inputClass } from '../components/ui'
import { aplicarModelo, htmlCertificado, dadosCertificado, modeloCertificadoDe } from '../lib/certificado'
import { useStore } from '../lib/store'
import type { Certificado, ModeloCertificado } from '../lib/types'
import { formatDateBR, toISODate, uid } from '../lib/utils'

export function CertificadosPage() {
  const {
    state,
    usuario,
    pessoasVisiveis,
    ehAluno,
    podeEmitirCertificado,
    saveCertificado,
    removeCertificado,
    saveModeloCertificado,
  } = useStore()
  const pessoaAluno = state.pessoas.find((p) => p.id === usuario?.pessoaId)
  const meus = state.certificados.filter((c) => c.pessoaId === pessoaAluno?.id)
  const [editando, setEditando] = useState<Certificado | null>(null)
  const [modeloAberto, setModeloAberto] = useState(false)
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)
  const alunos = useMemo(
    () => pessoasVisiveis.filter((p) => p.tipo === 'Aluno' && p.status === 'Ativo'),
    [pessoasVisiveis],
  )

  function baixar(c: Certificado, pessoa: typeof pessoaAluno) {
    setPreviewPdf(htmlCertificado(state, c, pessoa))
  }

  if (ehAluno) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink">Certificados</h1>
        <p className="mb-5 text-sm text-muted">Baixe em PDF os certificados emitidos para você.</p>
        {meus.length === 0 ? (
          <p className="rounded-xl bg-white p-5 text-sm text-muted shadow-sm">Nenhum certificado disponível ainda.</p>
        ) : (
          <ul className="space-y-3">
            {meus.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5 shadow-sm">
                <div>
                  <div className="font-semibold">{c.titulo}</div>
                  <div className="text-sm text-muted">{formatDateBR(c.data)}</div>
                </div>
                <PrimaryButton onClick={() => baixar(c, pessoaAluno)}>Baixar PDF</PrimaryButton>
              </li>
            ))}
          </ul>
        )}
        {previewPdf ? <TelaImpressao html={previewPdf} onClose={() => setPreviewPdf(null)} /> : null}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Certificados</h1>
          <p className="text-sm text-muted">Emita para os alunos. Eles baixam o PDF no app. O modelo padrão pode ser editado.</p>
        </div>
        {podeEmitirCertificado ? (
          <div className="flex flex-wrap gap-2">
            <GhostButton onClick={() => setModeloAberto(true)}>Editar modelo</GhostButton>
            <PrimaryButton
              onClick={() =>
                setEditando({
                  id: uid('cert'),
                  pessoaId: alunos[0]?.id ?? '',
                  titulo: 'Frequência fiel',
                  curso: 'Escola Bíblica Dominical',
                  carga: '1 trimestre',
                  data: toISODate(new Date()),
                })
              }
            >
              Emitir certificado
            </PrimaryButton>
          </div>
        ) : null}
      </div>

      {state.certificados.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm text-muted shadow-sm">Nenhum certificado emitido ainda.</p>
      ) : (
        <ul className="space-y-3">
          {state.certificados
            .slice()
            .sort((a, b) => b.data.localeCompare(a.data))
            .map((c) => {
              const pessoa = state.pessoas.find((p) => p.id === c.pessoaId)
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5 shadow-sm">
                  <div>
                    <div className="font-semibold">{pessoa?.nome ?? c.pessoaId}</div>
                    <div className="text-sm text-muted">
                      {c.titulo} · {formatDateBR(c.data)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <GhostButton onClick={() => baixar(c, pessoa)}>PDF</GhostButton>
                    {podeEmitirCertificado ? (
                      <>
                        <GhostButton onClick={() => setEditando(c)}>Editar</GhostButton>
                        <GhostButton
                          onClick={() => {
                            if (confirm('Excluir este certificado?')) removeCertificado(c.id)
                          }}
                        >
                          Excluir
                        </GhostButton>
                      </>
                    ) : null}
                  </div>
                </li>
              )
            })}
        </ul>
      )}

      <CertificadoModal
        certificado={editando}
        alunos={alunos}
        onClose={() => setEditando(null)}
        onSave={(c) => {
          saveCertificado(c)
          setEditando(null)
        }}
      />
      <ModeloModal
        open={modeloAberto}
        modelo={modeloCertificadoDe(state)}
        onClose={() => setModeloAberto(false)}
        onSave={(m) => {
          saveModeloCertificado(m)
          setModeloAberto(false)
        }}
      />
      {previewPdf ? <TelaImpressao html={previewPdf} onClose={() => setPreviewPdf(null)} /> : null}
    </div>
  )
}

function CertificadoModal({
  certificado,
  alunos,
  onClose,
  onSave,
}: {
  certificado: Certificado | null
  alunos: { id: string; nome: string }[]
  onClose: () => void
  onSave: (c: Certificado) => void
}) {
  const [form, setForm] = useState<Certificado | null>(certificado)
  if (certificado && form?.id !== certificado.id) setForm(certificado)

  return (
    <Modal open={!!certificado} title="Certificado" onClose={onClose}>
      {form ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.pessoaId) return
            onSave({
              ...form,
              titulo: form.titulo.trim(),
              curso: (form.curso ?? form.titulo).trim(),
              carga: (form.carga ?? '').trim() || '1 trimestre',
            })
          }}
        >
          <Field label="Aluno">
            <select className={inputClass} required value={form.pessoaId} onChange={(e) => setForm({ ...form, pessoaId: e.target.value })}>
              <option value="">Selecione</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Título no app">
            <input className={inputClass} required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Field>
          <Field label="Curso (no certificado)">
            <input className={inputClass} value={form.curso ?? ''} onChange={(e) => setForm({ ...form, curso: e.target.value })} />
          </Field>
          <Field label="Carga horária">
            <input className={inputClass} value={form.carga ?? ''} onChange={(e) => setForm({ ...form, carga: e.target.value })} />
          </Field>
          <Field label="Data">
            <DateInput value={form.data} onChange={(data) => setForm({ ...form, data })} />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={onClose}>Cancelar</GhostButton>
            <PrimaryButton type="submit">Salvar</PrimaryButton>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}

function ModeloModal({
  open,
  modelo,
  onClose,
  onSave,
}: {
  open: boolean
  modelo: ModeloCertificado
  onClose: () => void
  onSave: (m: ModeloCertificado) => void
}) {
  const { state } = useStore()
  const [form, setForm] = useState(modelo)
  useEffect(() => {
    if (open) setForm(modelo)
  }, [open, modelo])
  const previewPessoa = state.pessoas.find((p) => p.tipo === 'Aluno') ?? state.pessoas[0]
  const previewCert: Certificado = {
    id: 'preview',
    pessoaId: previewPessoa?.id ?? '',
    titulo: 'Frequência fiel',
    curso: 'Escola Bíblica Dominical',
    carga: '1 trimestre',
    data: toISODate(new Date()),
  }
  const preview = aplicarModelo(form, dadosCertificado(state, previewCert, previewPessoa))

  return (
    <Modal open={open} title="Modelo do certificado" onClose={onClose} wide>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
      >
        <p className="text-xs text-muted">
          Use {'{{nome}}'}, {'{{curso}}'}, {'{{data}}'}, {'{{igreja}}'}, {'{{carga}}'}, {'{{turma}}'} e {'{{titulo}}'}.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Título">
            <input className={inputClass} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Field>
          <Field label="Subtítulo">
            <input className={inputClass} value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} />
          </Field>
        </div>
        <Field label="Texto">
          <textarea className={inputClass} rows={4} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Assinatura 1">
            <input className={inputClass} value={form.assinatura1} onChange={(e) => setForm({ ...form, assinatura1: e.target.value })} />
          </Field>
          <Field label="Cargo 1">
            <input className={inputClass} value={form.cargo1} onChange={(e) => setForm({ ...form, cargo1: e.target.value })} />
          </Field>
          <Field label="Assinatura 2">
            <input className={inputClass} value={form.assinatura2} onChange={(e) => setForm({ ...form, assinatura2: e.target.value })} />
          </Field>
          <Field label="Cargo 2">
            <input className={inputClass} value={form.cargo2} onChange={(e) => setForm({ ...form, cargo2: e.target.value })} />
          </Field>
        </div>
        <div className="rounded-xl bg-page p-4 text-sm leading-6">{preview}</div>
        <div className="flex justify-end gap-2">
          <GhostButton onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit">Salvar modelo</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
