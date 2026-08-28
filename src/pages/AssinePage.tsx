import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Field, PrimaryButton, inputClass } from '../components/ui'
import { apiAssinar } from '../lib/api'

export function AssinePage() {
  const [form, setForm] = useState({ nome: '', cidade: '', responsavel: '', email: '', telefone: '' })
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState<{ username: string; senha: string; nome: string; igreja: string; email: string; emailEnviado: boolean } | null>(null)

  useEffect(() => {
    document.documentElement.classList.add('site-publico')
    return () => document.documentElement.classList.remove('site-publico')
  }, [])

  if (ok) {
    return (
      <div className="min-h-dvh bg-page px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <Logo variant="full" className="mx-auto h-20 w-auto" />
          <h1 className="mt-4 text-center text-xl font-semibold text-navy">Igreja cadastrada</h1>
          <p className="mt-2 text-center text-sm text-muted">
            {ok.emailEnviado
              ? `Enviamos o usuário e a senha para ${ok.email}. Com esse acesso você administra escolas, turmas, superintendentes, alunos e professores.`
              : `Não foi possível enviar o e-mail agora. Guarde este acesso. Ele entra no app da ${ok.igreja} com permissão total da congregação.`}
          </p>
          <div className="mt-6 space-y-2 rounded-xl bg-page p-4 text-sm">
            <p>
              Usuário: <b>{ok.username}</b>
            </p>
            <p>
              Senha: <b>{ok.senha}</b>
            </p>
            <p>
              Responsável: {ok.nome}
            </p>
            <p>
              E-mail: <b>{ok.email}</b>
            </p>
          </div>
          <Link to="/login" className="mt-6 block rounded-xl bg-navy py-3 text-center text-sm font-semibold text-white">
            Entrar no app
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-page px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <Link to="/" className="text-sm text-navy">
          ← Voltar
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-navy">Assinar o EDB Total</h1>
        <p className="mt-1 text-sm text-muted">Geramos o login da igreja e enviamos usuário e senha para o e-mail cadastrado.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setEnviando(true)
            setErro(null)
            void apiAssinar(form)
              .then((r) => {
                setOk({ ...r.login, igreja: r.igreja.nome, emailEnviado: r.emailEnviado })
              })
              .catch((err: Error) => setErro(err.message))
              .finally(() => setEnviando(false))
          }}
        >
          <Field label="Nome da igreja">
            <input className={inputClass} required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Cidade">
            <input className={inputClass} value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </Field>
          <Field label="Responsável (superintendente / pastor)">
            <input className={inputClass} required value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </Field>
          <Field label="E-mail (obrigatório — enviaremos o login e a senha)">
            <input className={inputClass} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="WhatsApp">
            <input className={inputClass} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Field>
          {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
          <p className="text-xs text-muted">
            Ao gerar o acesso, você concorda com os{' '}
            <Link to="/termos" className="font-medium text-navy underline">
              Termos de uso
            </Link>{' '}
            e a{' '}
            <Link to="/privacidade" className="font-medium text-navy underline">
              Política de privacidade
            </Link>
            .
          </p>
          <PrimaryButton type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Criando acesso…' : 'Gerar login e senha'}
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
