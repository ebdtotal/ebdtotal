import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Field, PrimaryButton, inputClass } from '../components/ui'
import { apiAssinar, apiClientes, apiStatusIgreja, type CadastroGeral, type IgrejaCliente } from '../lib/api'
import { useStore } from '../lib/store'

export function MasterPage() {
  const { usuario } = useStore()
  const [igrejas, setIgrejas] = useState<IgrejaCliente[]>([])
  const [cadastros, setCadastros] = useState<CadastroGeral[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', cidade: '', responsavel: '', email: '', telefone: '' })
  const [novo, setNovo] = useState<{ username: string; senha: string; email?: string } | null>(null)

  function carregar() {
    void apiClientes()
      .then((r) => {
        setIgrejas(r.igrejas)
        setCadastros(r.cadastros)
      })
      .catch((e: Error) => setErro(e.message))
  }

  useEffect(() => {
    carregar()
  }, [])

  if (usuario?.papel !== 'admin') return <Navigate to="/inicio" replace />

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Igrejas assinantes</h1>
      <p className="mt-1 text-sm text-muted">Cadastro automático de login. Os cadastros do app entram na contabilização geral.</p>

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
                setForm({ nome: '', cidade: '', responsavel: '', email: '', telefone: '' })
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
        <table className="data w-full min-w-[640px] text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Igreja</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {igrejas.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{i.nome}</div>
                  <div className="text-xs text-muted">{i.cidade}</div>
                </td>
                <td className="px-4 py-3">{i.responsavel}</td>
                <td className="px-4 py-3">{i.username_admin}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
                  Ainda não há cadastros nas igrejas. Eles aparecem aqui assim que a secretaria salvar no app.
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
