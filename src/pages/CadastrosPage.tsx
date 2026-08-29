import { Download, Plus, Pencil, Trash2, UserRoundSearch, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, GhostButton, Modal, PrimaryButton, DateInput, inputClass } from '../components/ui'
import { exportToExcel } from '../lib/excel'
import { sugestaoUsername, useStore } from '../lib/store'
import {
  FAIXAS_ETARIAS,
  SEXOS,
  STATUS_PESSOA,
  TIPOS_PESSOA,
  type FaixaEtaria,
  type Pessoa,
  type Sexo,
  type StatusPessoa,
  type TipoPessoa,
} from '../lib/types'
import { formatDateBR, matches, senhaGerada, uid } from '../lib/utils'

const emptyForm = (escolaId: string): Pessoa => ({
  id: uid('p'),
  nome: '',
  dataNascimento: '',
  turma: '',
  faixaEtaria: 'Adultos',
  tipo: 'Aluno',
  sexo: 'Feminino',
  status: 'Ativo',
  escolaId,
  telefone: '',
  email: '',
})

function papelDoTipo(tipo: TipoPessoa) {
  if (tipo === 'Aluno') return 'aluno' as const
  if (tipo === 'Professor') return 'professor' as const
  if (tipo === 'Superintendente') return 'superintendente' as const
  if (tipo === 'Secretário') return 'secretario' as const
  return null
}

function precisaAcessoApp(tipo: TipoPessoa) {
  return tipo === 'Aluno' || tipo === 'Professor' || tipo === 'Superintendente' || tipo === 'Secretário'
}

export function CadastrosPage() {
  const { state, escolasVisiveis, pessoasVisiveis, savePessoa, removePessoa, usuario, ehProfessor } = useStore()
  const podeCadastrar =
    usuario?.papel === 'admin' || usuario?.papel === 'sede' || usuario?.papel === 'superintendente'
  const [filtros, setFiltros] = useState({
    regional: '',
    congregacao: '',
    nome: '',
    nascimento: '',
    turma: '',
    faixa: '',
    tipo: '',
    sexo: '',
    status: '',
  })
  const [aplicados, setAplicados] = useState(filtros)
  const [buscaTabela, setBuscaTabela] = useState('')
  const [editing, setEditing] = useState<Pessoa | null>(null)
  const [acessoSalvo, setAcessoSalvo] = useState<{ nome: string; username: string; senha: string } | null>(null)

  const pessoas = useMemo(() => {
    const ids = new Set(escolasVisiveis.map((e) => e.id))
    return pessoasVisiveis.filter((p) => {
      if (!ids.has(p.escolaId)) return false
      const escola = state.escolas.find((e) => e.id === p.escolaId)
      if (aplicados.regional && !matches(escola?.regional ?? '', aplicados.regional)) return false
      if (aplicados.congregacao && !matches(escola?.nome ?? '', aplicados.congregacao)) return false
      if (aplicados.nome && !matches(p.nome, aplicados.nome)) return false
      if (aplicados.nascimento && p.dataNascimento !== aplicados.nascimento) return false
      if (aplicados.turma && !matches(p.turma, aplicados.turma)) return false
      if (aplicados.faixa && p.faixaEtaria !== aplicados.faixa) return false
      if (aplicados.tipo && p.tipo !== aplicados.tipo) return false
      if (aplicados.sexo && p.sexo !== aplicados.sexo) return false
      if (aplicados.status && p.status !== aplicados.status) return false
      return matches(`${p.nome} ${p.turma} ${p.faixaEtaria}`, buscaTabela)
    })
  }, [pessoasVisiveis, state.escolas, aplicados, buscaTabela])

  function limpar() {
    const z = { regional: '', congregacao: '', nome: '', nascimento: '', turma: '', faixa: '', tipo: '', sexo: '', status: '' }
    setFiltros(z)
    setAplicados(z)
  }

  function exportar() {
    exportToExcel('cadastros-ebd', pessoas.map((p) => {
      const escola = state.escolas.find((e) => e.id === p.escolaId)
      return {
        Nome: p.nome,
        'Data de nascimento': formatDateBR(p.dataNascimento),
        Turma: p.turma,
        'Faixa etária': p.faixaEtaria,
        Tipo: p.tipo,
        Sexo: p.sexo,
        Status: p.status,
        Congregação: escola?.nome ?? '',
        Regional: escola?.regional ?? '',
      }
    }))
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{ehProfessor ? 'Turma' : 'Cadastros'}</h1>
          <p className="text-sm text-muted">
            {ehProfessor
              ? 'Alunos da sua turma. Somente o master e o superintendente cadastram.'
              : podeCadastrar
                ? 'Lista de registros e suas respectivas congregações. No cadastro, defina o login do app.'
                : 'Lista de registros da congregação. Somente o master e o superintendente cadastram.'}
          </p>
        </div>
        {podeCadastrar ? (
          <PrimaryButton onClick={() => setEditing(emptyForm(escolasVisiveis[0]?.id ?? ''))}>
            <Plus size={16} /> Novo cadastro
          </PrimaryButton>
        ) : null}
      </div>

      {acessoSalvo ? (
        <div className="mb-5 rounded-xl border border-teal/30 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-navy">Acesso do app criado para {acessoSalvo.nome}</p>
          <p className="mt-1 text-sm">
            Usuário: <b>{acessoSalvo.username}</b> · Senha: <b>{acessoSalvo.senha}</b>
          </p>
          <p className="mt-1 text-xs text-muted">Anote e entregue à pessoa. Ela entra no app com esses dados.</p>
        </div>
      ) : null}

      <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Regional">
            <input className={inputClass} placeholder="Ex.: Regional Aparecida" value={filtros.regional} onChange={(e) => setFiltros({ ...filtros, regional: e.target.value })} />
          </Field>
          <Field label="Congregação">
            <input className={inputClass} placeholder="Nome da igreja" value={filtros.congregacao} onChange={(e) => setFiltros({ ...filtros, congregacao: e.target.value })} />
          </Field>
          <Field label="Nome">
            <input className={inputClass} placeholder="Nome do aluno/professor" value={filtros.nome} onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })} />
          </Field>
          <Field label="Data de nascimento">
            <DateInput allowEmpty value={filtros.nascimento} onChange={(nascimento) => setFiltros({ ...filtros, nascimento })} />
          </Field>
          <Field label="Turma">
            <input className={inputClass} placeholder="Nome da turma" value={filtros.turma} onChange={(e) => setFiltros({ ...filtros, turma: e.target.value })} />
          </Field>
          <Field label="Faixa etária">
            <select className={inputClass} value={filtros.faixa} onChange={(e) => setFiltros({ ...filtros, faixa: e.target.value })}>
              <option value="">Todas</option>
              {FAIXAS_ETARIAS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select className={inputClass} value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
              <option value="">Todos</option>
              {TIPOS_PESSOA.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Sexo">
            <select className={inputClass} value={filtros.sexo} onChange={(e) => setFiltros({ ...filtros, sexo: e.target.value })}>
              <option value="">Todos</option>
              {SEXOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
              <option value="">Todos</option>
              {STATUS_PESSOA.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <PrimaryButton onClick={() => setAplicados(filtros)}>Pesquisar</PrimaryButton>
          <GhostButton onClick={limpar}>Limpar</GhostButton>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-3">
          <PrimaryButton onClick={exportar}>
            <Download size={16} /> Excel
          </PrimaryButton>
          <label className="flex items-center gap-2 text-sm">
            Pesquisar:
            <input className={inputClass + ' w-44'} value={buscaTabela} onChange={(e) => setBuscaTabela(e.target.value)} />
          </label>
        </div>
        <div className="table-wrap">
          <table className="data w-full min-w-[860px] text-left">
            <thead>
              <tr>
                {['Nome', 'Data de nascimento', 'Turma', 'Faixa etária', 'Tipo', 'Sexo', 'Status', ''].map((h) => (
                  <th key={h || 'a'} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-3 font-medium">{p.nome}</td>
                  <td className="px-3 py-3">{formatDateBR(p.dataNascimento)}</td>
                  <td className="px-3 py-3">{p.turma}</td>
                  <td className="px-3 py-3">{p.faixaEtaria}</td>
                  <td className="px-3 py-3">{p.tipo}</td>
                  <td className="px-3 py-3">{p.sexo}</td>
                  <td className="px-3 py-3">
                    <span className={p.status === 'Ativo' ? 'text-emerald-600' : 'text-muted'}>{p.status}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {p.tipo === 'Aluno' ? (
                      <Link to={`/alunos/${p.id}`} className="mr-2 inline-block text-muted hover:text-navy" title="Ficha">
                        <UserRoundSearch size={15} />
                      </Link>
                    ) : null}
                    {podeCadastrar ? (
                      <>
                        <button type="button" className="mr-2 text-muted hover:text-navy" onClick={() => setEditing(p)}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="text-muted hover:text-red-600" onClick={() => removePessoa(p.id)}>
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
      </section>

      {podeCadastrar ? (
        <PessoaModal
          pessoa={editing}
          onClose={() => setEditing(null)}
          onSave={(p, acesso) => {
            savePessoa(p, acesso)
            if (acesso?.username && acesso.senha) {
              setAcessoSalvo({ nome: p.nome, username: acesso.username, senha: acesso.senha })
            }
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}

function PessoaModal({
  pessoa,
  onClose,
  onSave,
}: {
  pessoa: Pessoa | null
  onClose: () => void
  onSave: (p: Pessoa, acesso: { username: string; senha: string } | null) => void
}) {
  const { escolasVisiveis, state } = useStore()
  const [form, setForm] = useState<Pessoa | null>(pessoa)
  const [username, setUsername] = useState('')
  const [senha, setSenha] = useState('')
  const [userManual, setUserManual] = useState(false)
  const [usuarioId, setUsuarioId] = useState<string | undefined>()

  useEffect(() => {
    if (!pessoa) {
      setForm(null)
      setUsuarioId(undefined)
      return
    }
    setForm(pessoa)
    const existente = state.usuarios.find((u) => u.pessoaId === pessoa.id)
    if (existente) {
      setUsername(existente.username)
      setSenha(existente.senha.startsWith('$2') ? '' : existente.senha)
      setUserManual(true)
      setUsuarioId(existente.id)
    } else {
      const papel = papelDoTipo(pessoa.tipo)
      setUsername(papel && pessoa.nome ? sugestaoUsername(pessoa.nome, papel, state.usuarios) : '')
      setSenha(senhaGerada())
      setUserManual(false)
      setUsuarioId(undefined)
    }
  }, [pessoa, state.usuarios])

  function atualizarTipo(tipo: TipoPessoa) {
    if (!form) return
    const papel = papelDoTipo(tipo)
    setForm({ ...form, tipo })
    if (!userManual && papel) setUsername(sugestaoUsername(form.nome, papel, state.usuarios, usuarioId))
  }

  function atualizarNome(nome: string) {
    if (!form) return
    setForm({ ...form, nome })
    const papel = papelDoTipo(form.tipo)
    if (!userManual && papel) setUsername(sugestaoUsername(nome, papel, state.usuarios, usuarioId))
  }

  const mostraAcesso = form ? precisaAcessoApp(form.tipo) && form.status === 'Ativo' : false

  return (
    <Modal open={!!pessoa} title={pessoa ? 'Cadastro' : ''} onClose={onClose} wide>
      {form ? (
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            const acesso = mostraAcesso && username.trim()
              ? { username: username.trim().toLowerCase(), senha: senha.trim(), email: (form.email ?? '').trim().toLowerCase() }
              : null
            onSave(form, acesso)
          }}
        >
          <Field label="Nome">
            <input className={inputClass} required value={form.nome} onChange={(e) => atualizarNome(e.target.value)} />
          </Field>
          <Field label="Congregação">
            <select className={inputClass} value={form.escolaId} onChange={(e) => setForm({ ...form, escolaId: e.target.value })}>
              {escolasVisiveis.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Data de nascimento">
            <DateInput value={form.dataNascimento} onChange={(dataNascimento) => setForm({ ...form, dataNascimento })} />
          </Field>
          <Field label="Turma">
            <input className={inputClass} list="turmas-cadastro" value={form.turma} onChange={(e) => setForm({ ...form, turma: e.target.value })} />
            <datalist id="turmas-cadastro">
              {(state.turmas ?? [])
                .filter((t) => t.escolaId === form.escolaId)
                .map((t) => (
                  <option key={t.id} value={t.nome} />
                ))}
            </datalist>
          </Field>
          <Field label="Faixa etária">
            <select className={inputClass} value={form.faixaEtaria} onChange={(e) => setForm({ ...form, faixaEtaria: e.target.value as FaixaEtaria })}>
              {FAIXAS_ETARIAS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select className={inputClass} value={form.tipo} onChange={(e) => atualizarTipo(e.target.value as TipoPessoa)}>
              {TIPOS_PESSOA.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Sexo">
            <select className={inputClass} value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value as Sexo })}>
              {SEXOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusPessoa })}>
              {STATUS_PESSOA.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="WhatsApp (opcional)">
            <input className={inputClass} placeholder="5598984000000" value={form.telefone ?? ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Field>
          <Field label="E-mail (para recuperar senha)">
            <input className={inputClass} type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          {mostraAcesso ? (
            <>
              <Field label="Login do app">
                <input
                  className={inputClass}
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => {
                    setUserManual(true)
                    setUsername(e.target.value)
                  }}
                />
              </Field>
              <Field label="Senha do app">
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    required={!usuarioId}
                    placeholder={usuarioId ? 'Deixe em branco para manter' : ''}
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <GhostButton
                    type="button"
                    className="shrink-0"
                    onClick={() => setSenha(senhaGerada())}
                    aria-label="Gerar senha"
                  >
                    <RefreshCw size={16} />
                  </GhostButton>
                </div>
              </Field>
              <p className="sm:col-span-2 text-sm text-muted">
                Este login entra no app de {form.tipo.toLowerCase()}. Você pode alterar o usuário e a senha antes de salvar.
              </p>
            </>
          ) : null}
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
            <PrimaryButton type="submit">Salvar</PrimaryButton>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}
