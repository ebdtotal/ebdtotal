import { Check, Download, Plus, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ImportacaoExcel } from '../components/ImportacaoExcel'
import { Field, GhostButton, Modal, PrimaryButton, Confirmacao, inputClass } from '../components/ui'
import { casarOpcao, celula, exportToExcel, lerPlanilha } from '../lib/excel'
import { useStore } from '../lib/store'
import { STATUS_ESCOLA, type Escola, type StatusEscola } from '../lib/types'
import { matches, uid } from '../lib/utils'

export function EscolasPage() {
  const { escolasVisiveis, saveEscola, importarEscolas, removeEscola, podeVerTudo } = useStore()
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState('Todos')
  const [editing, setEditing] = useState<Escola | null>(null)
  const [excluirEscola, setExcluirEscola] = useState<Escola | null>(null)

  const lista = useMemo(() => {
    const filtered = escolasVisiveis.filter((e) =>
      matches(`${e.nome} ${e.setor} ${e.bairro} ${e.responsavel} ${e.username}`, busca),
    )
    return limite === 'Todos' ? filtered : filtered.slice(0, Number(limite))
  }, [escolasVisiveis, busca, limite])

  const totais = escolasVisiveis.reduce(
    (acc, e) => ({ alunos: acc.alunos + e.ativos + e.inativos }),
    { alunos: 0 },
  )

  function exportar() {
    exportToExcel('escolas-ebd', lista.map((e) => ({
      ID: e.id,
      Nome: e.nome,
      Setor: e.setor,
      Bairro: e.bairro,
      Responsavel: e.responsavel,
      Username: e.username,
      Ativos: e.ativos,
      Inativos: e.inativos,
      Status: e.status,
    })))
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Escolas</h1>
          <p className="text-sm text-muted">Lista de escolas associadas ou esperando aprovação</p>
        </div>
        {podeVerTudo ? (
          <PrimaryButton
            onClick={() =>
              setEditing({
                id: String(17000 + Math.floor(Math.random() * 2000)),
                nome: '',
                setor: 'Sede',
                bairro: '',
                regional: 'Regional 35',
                responsavel: '',
                username: '',
                status: 'Pendente',
                ativos: 0,
                inativos: 0,
              })
            }
          >
            <Plus size={16} /> Inserir filial
          </PrimaryButton>
        ) : null}
      </div>

      {podeVerTudo ? (
        <ImportacaoExcel
          arquivoModelo="modelo-escolas-ebd"
          colunas={['Nome', 'Setor', 'Bairro', 'Regional', 'Responsável', 'Status']}
          exemplo={{
            Nome: 'Ex.: Congregação Centro',
            Setor: 'Sede',
            Bairro: 'Centro',
            Regional: 'Regional 35',
            Responsável: 'Maria Silva',
            Status: 'Ativa',
          }}
          onImportar={async (file) => {
            const rows = await lerPlanilha(file)
            const novas: Escola[] = []
            const erros: string[] = []
            rows.forEach((row, i) => {
              const linha = i + 2
              const nome = celula(row, 'nome', 'congregacao', 'igreja')
              if (!nome || /^ex\.?:/i.test(nome)) return
              const ja =
                escolasVisiveis.some((e) => e.nome.toLowerCase() === nome.toLowerCase()) ||
                novas.some((e) => e.nome.toLowerCase() === nome.toLowerCase())
              if (ja) {
                erros.push(`Linha ${linha}: escola "${nome}" já cadastrada`)
                return
              }
              novas.push({
                id: uid('esc'),
                nome,
                setor: celula(row, 'setor') || 'Sede',
                bairro: celula(row, 'bairro'),
                regional: celula(row, 'regional'),
                responsavel: celula(row, 'responsavel'),
                username: '',
                status: casarOpcao(celula(row, 'status'), STATUS_ESCOLA, 'Ativa'),
                ativos: 0,
                inativos: 0,
              })
            })
            importarEscolas(novas)
            return { ok: novas.length, erros }
          }}
        />
      ) : null}

      <section className="mb-5 rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Escolas associadas ({totais.alunos} alunos e professores)
          </h2>
          <PrimaryButton onClick={exportar}>
            <Download size={16} /> Excel
          </PrimaryButton>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 text-muted">
            Visualizando
            <select className={inputClass + ' w-auto'} value={limite} onChange={(e) => setLimite(e.target.value)}>
              <option>Todos</option>
              <option>10</option>
              <option>25</option>
            </select>
            registros
          </label>
          <label className="flex items-center gap-2">
            Pesquisar:
            <input className={inputClass + ' w-44'} value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
        </div>
        <div className="table-wrap">
          <table className="data w-full min-w-[980px] text-left">
            <thead>
              <tr>
                {['ID', 'Nome', 'Setor', 'Bairro', 'Responsável', 'Username', 'Ativos', 'Inativos', 'Status', ''].map((h) => (
                  <th key={h || 'a'} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-3">{e.id}</td>
                  <td className="px-3 py-3 font-medium">{e.nome}</td>
                  <td className="px-3 py-3">{e.setor}</td>
                  <td className="px-3 py-3">{e.bairro}</td>
                  <td className="px-3 py-3">{e.responsavel}</td>
                  <td className="px-3 py-3">{e.username}</td>
                  <td className="px-3 py-3">{e.ativos}</td>
                  <td className="px-3 py-3">{e.inativos}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-white ${
                        e.status === 'Ativa' ? 'bg-emerald-500' : e.status === 'Pendente' ? 'bg-amber-400' : 'bg-slate-400'
                      }`}
                      title={e.status}
                    >
                      <Check size={14} />
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button type="button" className="mr-2 text-muted hover:text-navy" onClick={() => setEditing(e)}>
                      <Pencil size={15} />
                    </button>
                    {podeVerTudo ? (
                      <button type="button" className="text-muted hover:text-red-600" onClick={() => setExcluirEscola(e)}>
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <EscolaModal
        escola={editing}
        onClose={() => setEditing(null)}
        onSave={(e) => {
          saveEscola(e)
          setEditing(null)
        }}
      />
      <Confirmacao
        open={!!excluirEscola}
        titulo="Excluir escola"
        texto={`Excluir “${excluirEscola?.nome ?? ''}”? Cadastros e turmas desta congregação também saem.`}
        onCancel={() => setExcluirEscola(null)}
        onConfirm={() => {
          if (excluirEscola) removeEscola(excluirEscola.id)
          setExcluirEscola(null)
        }}
      />
    </div>
  )
}

function EscolaModal({
  escola,
  onClose,
  onSave,
}: {
  escola: Escola | null
  onClose: () => void
  onSave: (e: Escola) => void
}) {
  const [form, setForm] = useState<Escola | null>(escola)
  if (escola && form?.id !== escola.id) setForm(escola)

  return (
    <Modal open={!!escola} title="Filial / Escola" onClose={onClose} wide>
      {form ? (
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            onSave({ ...form, id: form.id || uid('esc') })
          }}
        >
          <Field label="Nome">
            <input className={inputClass} required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Setor">
            <input className={inputClass} value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} />
          </Field>
          <Field label="Bairro">
            <input className={inputClass} value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
          </Field>
          <Field label="Regional">
            <input className={inputClass} value={form.regional} onChange={(e) => setForm({ ...form, regional: e.target.value })} />
          </Field>
          <Field label="Responsável">
            <input className={inputClass} value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </Field>
          <Field label="Username">
            <input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusEscola })}>
              {STATUS_ESCOLA.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <GhostButton onClick={onClose}>Cancelar</GhostButton>
            <PrimaryButton type="submit">Salvar</PrimaryButton>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}
