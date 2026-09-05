import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Field, GhostButton, PrimaryButton, Confirmacao, inputClass } from '../components/ui'
import {
  apiAssinar,
  apiClientes,
  apiConfirmarSignup,
  apiPatchIgrejaMaster,
  apiStatusIgreja,
  type AssinaturaPendente,
  type CadastroGeral,
  type IgrejaCliente,
  type ResumoMaster,
} from '../lib/api'
import { formatarBRL, PLANOS, planoVencido, produtoDe, rotuloProduto, type PlanoCheckoutId } from '../lib/planos'
import { useStore } from '../lib/store'
import { formatDateBR } from '../lib/utils'

const RESUMO_VAZIO: ResumoMaster = {
  igrejas: 0,
  ativas: 0,
  suspensas: 0,
  trial: 0,
  essencial: 0,
  igreja: 0,
  vencendo: 0,
  vencidas: 0,
  pessoas: 0,
}

export function MasterPage() {
  const { usuario } = useStore()
  const [igrejas, setIgrejas] = useState<IgrejaCliente[]>([])
  const [cadastros, setCadastros] = useState<CadastroGeral[]>([])
  const [assinaturas, setAssinaturas] = useState<AssinaturaPendente[]>([])
  const [resumo, setResumo] = useState<ResumoMaster>(RESUMO_VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState({
    nome: '',
    cidade: '',
    responsavel: '',
    email: '',
    telefone: '',
    plano: 'igreja' as PlanoCheckoutId,
  })
  const [novo, setNovo] = useState<{ username: string; senha: string; email?: string } | null>(null)
  const [editando, setEditando] = useState<IgrejaCliente | null>(null)
  const [excluir, setExcluir] = useState<IgrejaCliente | null>(null)

  function carregar() {
    void apiClientes()
      .then((r) => {
        setIgrejas(r.igrejas)
        setCadastros(r.cadastros)
        setAssinaturas(r.assinaturas ?? [])
        setResumo(r.resumo ?? RESUMO_VAZIO)
      })
      .catch((e: Error) => setErro(e.message))
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return igrejas
    return igrejas.filter((i) =>
      `${i.nome} ${i.cidade} ${i.responsavel} ${i.email} ${i.telefone} ${i.username_admin}`.toLowerCase().includes(q),
    )
  }, [igrejas, busca])

  if (usuario?.papel !== 'admin') return <Navigate to="/inicio" replace />

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Painel master</h1>
      <p className="mt-1 text-sm text-muted">Igrejas, contatos, vencimento do plano e operações da conta.</p>
      <p className="mt-2 text-sm">
        <Link to="/atividades" className="font-semibold text-navy hover:underline">
          Registro de atividades dos logins →
        </Link>
        {' · '}
        <Link to="/master/assinaturas" className="font-semibold text-navy hover:underline">
          Relatório financeiro das assinaturas →
        </Link>
        {' · '}
        <Link to="/master/demos" className="font-semibold text-navy hover:underline">
          Pedidos de demonstração →
        </Link>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Igrejas', String(resumo.igrejas)],
          ['Ativas', String(resumo.ativas)],
          ['Vencendo (30 dias)', String(resumo.vencendo)],
          ['Vencidas', String(resumo.vencidas)],
          ['Essencial', String(resumo.essencial)],
          ['Igreja', String(resumo.igreja)],
          ['Suspensas', String(resumo.suspensas)],
          ['Cadastros', String(resumo.pessoas)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-navy">{value}</div>
          </div>
        ))}
      </div>

      <section className="mt-5 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Nova igreja</h2>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            setErro(null)
            void apiAssinar(form)
              .then((r) => {
                setNovo(r.login)
                setForm({ nome: '', cidade: '', responsavel: '', email: '', telefone: '', plano: 'igreja' })
                carregar()
              })
              .catch((err: Error) => setErro(err.message))
          }}
        >
          <Field label="Igreja">
            <input className={inputClass} required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Cidade">
            <input className={inputClass} value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </Field>
          <Field label="Responsável">
            <input className={inputClass} required value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </Field>
          <Field label="E-mail (envia o login)">
            <input className={inputClass} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="WhatsApp">
            <input className={inputClass} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Field>
          <Field label="Plano">
            <select className={inputClass} value={form.plano} onChange={(e) => setForm({ ...form, plano: e.target.value as PlanoCheckoutId })}>
              <option value="essencial">Essencial à vista ({formatarBRL(PLANOS.essencial.preco)})</option>
              <option value="essencial12">Essencial 12x</option>
              <option value="igreja">Igreja à vista ({formatarBRL(PLANOS.igreja.preco)})</option>
              <option value="igreja12">Igreja 12x</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <PrimaryButton type="submit">Gerar acesso</PrimaryButton>
          </div>
        </form>
        {novo ? (
          <p className="mt-3 rounded-lg bg-page p-3 text-sm">
            Login criado: <b>{novo.username}</b> · senha <b>{novo.senha}</b>
            {novo.email ? ` · enviado para ${novo.email}` : ''}
          </p>
        ) : null}
        {erro ? <p className="mt-2 text-sm text-red-600">{erro}</p> : null}
      </section>

      <section className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm">
        <h2 className="px-4 pt-4 text-lg font-semibold">Assinaturas do site</h2>
        <p className="px-4 pt-1 text-sm text-muted">Quem preencheu /assine. O acesso só é criado depois do pagamento (ou da confirmação abaixo).</p>
        <table className="data mt-2 w-full min-w-[820px] text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Igreja</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {assinaturas.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={5}>
                  Nenhuma assinatura pelo site ainda.
                </td>
              </tr>
            ) : (
              assinaturas.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.nome}</div>
                    <div className="text-xs text-muted">{a.cidade}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{a.responsavel}</div>
                    <div className="text-xs text-muted">{a.email}</div>
                    {a.telefone ? <div className="text-xs text-muted">{a.telefone}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    {rotuloProduto(a.plano)}
                    {a.upgrade_tenant_id ? <div className="text-xs text-muted">Migração</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'pago' ? `Pago${a.username ? ` · ${a.username}` : ''}` : 'Pendente'}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'pendente' ? (
                      <button
                        type="button"
                        className="text-sm font-semibold text-navy hover:underline"
                        onClick={() => {
                          setErro(null)
                          void apiConfirmarSignup(a.id)
                            .then((r) => {
                              if (r.login) setNovo(r.login)
                              carregar()
                            })
                            .catch((err: Error) => setErro(err.message))
                        }}
                      >
                        Confirmar e enviar acesso
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4">
          <h2 className="text-lg font-semibold">Igrejas</h2>
          <input
            className={`${inputClass} max-w-xs`}
            placeholder="Buscar igreja, e-mail, cidade…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <table className="data mt-2 w-full min-w-[980px] text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Igreja</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Validade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((i) => {
              const vencido = planoVencido(i.valido_ate)
              return (
                <tr key={i.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{i.nome}</div>
                    <div className="text-xs text-muted">
                      {i.cidade} · {i.pessoas ?? 0} cadastros · @{i.username_admin}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{i.responsavel}</div>
                    <div className="text-xs text-muted">{i.email}</div>
                    {i.telefone ? <div className="text-xs text-muted">{i.telefone}</div> : null}
                  </td>
                  <td className="px-4 py-3">{rotuloProduto(i.plano ?? produtoDe(i.plano))}</td>
                  <td className="px-4 py-3">
                    <span className={vencido ? 'font-semibold text-red-700' : ''}>
                      {formatDateBR((i.valido_ate || '').slice(0, 10))}
                    </span>
                    <div className="text-xs text-muted">desde {formatDateBR((i.contratado_em || i.created_at || '').slice(0, 10))}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={inputClass}
                      value={i.status}
                      onChange={(e) => {
                        void apiStatusIgreja(i.id, e.target.value).then(carregar)
                      }}
                    >
                      <option value="trial">Trial</option>
                      <option value="ativa">Ativa</option>
                      <option value="suspensa">Suspensa</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <button type="button" className="text-sm font-semibold text-navy hover:underline" onClick={() => setEditando(i)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-sm font-semibold text-navy hover:underline"
                        onClick={() => {
                          void apiPatchIgrejaMaster(i.id, 'renovar').then(carregar)
                        }}
                      >
                        +1 ano
                      </button>
                      <button
                        type="button"
                        className="text-sm font-semibold text-navy hover:underline"
                        onClick={() => {
                          void apiPatchIgrejaMaster(i.id, 'reset_senha').then((r) => {
                            if (r.login) setNovo(r.login)
                            carregar()
                          })
                        }}
                      >
                        Nova senha sede
                      </button>
                      <button
                        type="button"
                        className="text-sm font-semibold text-red-700 hover:underline"
                        onClick={() => setExcluir(i)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {editando ? (
        <EditarIgreja
          igreja={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null)
            carregar()
          }}
        />
      ) : null}

      <Confirmacao
        open={!!excluir}
        titulo="Excluir igreja"
        texto={`Excluir “${excluir?.nome ?? ''}” e todos os cadastros, logins, chamadas e dados vinculados? Esta ação não tem volta.`}
        confirmar="Excluir igreja"
        onCancel={() => setExcluir(null)}
        onConfirm={() => {
          if (!excluir) return
          void apiPatchIgrejaMaster(excluir.id, 'excluir')
            .then(() => {
              setExcluir(null)
              carregar()
            })
            .catch((err: Error) => setErro(err.message))
        }}
      />

      <section className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm">
        <h2 className="px-4 pt-4 text-lg font-semibold">Cadastros do app (geral)</h2>
        <table className="data mt-2 w-full min-w-[720px] text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Igreja</th>
              <th className="px-4 py-3">Escola</th>
              <th className="px-4 py-3">Turma</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {cadastros.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={6}>
                  Ainda não há cadastros nas igrejas.
                </td>
              </tr>
            ) : (
              cadastros.map((c) => (
                <tr key={`${c.tenant_id}-${c.nome}-${c.turma}`}>
                  <td className="px-4 py-3">{c.nome}</td>
                  <td className="px-4 py-3">{c.tipo}</td>
                  <td className="px-4 py-3">{c.igreja}</td>
                  <td className="px-4 py-3">{c.escola}</td>
                  <td className="px-4 py-3">{c.turma}</td>
                  <td className="px-4 py-3">{c.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function EditarIgreja({
  igreja,
  onClose,
  onSaved,
}: {
  igreja: IgrejaCliente
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    nome: igreja.nome,
    cidade: igreja.cidade,
    responsavel: igreja.responsavel,
    email: igreja.email,
    telefone: igreja.telefone,
    plano: (igreja.plano === 'essencial' ? 'essencial' : 'igreja') as 'essencial' | 'igreja',
    validoAte: (igreja.valido_ate || '').slice(0, 10),
  })
  const [erro, setErro] = useState<string | null>(null)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Editar {igreja.nome}</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            setErro(null)
            void apiPatchIgrejaMaster(igreja.id, 'dados', form)
              .then(() =>
                apiPatchIgrejaMaster(igreja.id, 'plano', {
                  plano: form.plano,
                  validoAte: form.validoAte ? `${form.validoAte}T00:00:00Z` : '',
                }),
              )
              .then(onSaved)
              .catch((err: Error) => setErro(err.message))
          }}
        >
          <Field label="Igreja">
            <input className={inputClass} required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Cidade">
            <input className={inputClass} value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </Field>
          <Field label="Responsável">
            <input className={inputClass} required value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </Field>
          <Field label="E-mail">
            <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="WhatsApp">
            <input className={inputClass} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Field>
          <Field label="Plano">
            <select className={inputClass} value={form.plano} onChange={(e) => setForm({ ...form, plano: e.target.value as 'essencial' | 'igreja' })}>
              <option value="essencial">Essencial</option>
              <option value="igreja">Igreja</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Válido até">
              <input className={inputClass} type="date" value={form.validoAte} onChange={(e) => setForm({ ...form, validoAte: e.target.value })} />
            </Field>
          </div>
          {erro ? <p className="sm:col-span-2 text-sm text-red-600">{erro}</p> : null}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <GhostButton type="button" onClick={onClose}>
              Cancelar
            </GhostButton>
            <PrimaryButton type="submit">Salvar</PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  )
}
