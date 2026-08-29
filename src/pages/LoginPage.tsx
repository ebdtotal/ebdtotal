import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { TemaToggle } from '../components/TemaToggle'
import { GhostButton, PrimaryButton, inputClass } from '../components/ui'
import { apiEsqueciSenha } from '../lib/api'
import { ehAppNativo } from '../lib/native'
import { destinoInicial } from '../lib/perfis'
import { useStore } from '../lib/store'

export function LoginPage() {
  const { usuario, login } = useStore()
  const [username, setUsername] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [esqueci, setEsqueci] = useState(false)
  const [msgEsqueci, setMsgEsqueci] = useState<string | null>(null)

  if (usuario) return <Navigate to={destinoInicial(usuario.papel)} replace />

  return (
    <div className="login-shell relative flex h-full min-h-[var(--app-min-h,100dvh)] items-center justify-center overflow-y-auto bg-navy px-4 py-8 pt-[max(2rem,env(safe-area-inset-top),var(--safe-top,0px))] pb-[max(2rem,env(safe-area-inset-bottom),var(--safe-bottom,0px))]">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top),var(--safe-top,0px))]">
        <TemaToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo variant="full" className="h-28 w-auto" />
          <p className="mt-3 text-sm text-muted">
            {esqueci ? 'Enviamos uma senha provisória para o e-mail cadastrado' : 'Entre com o acesso da sua igreja'}
          </p>
        </div>
        {esqueci ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setEnviando(true)
              setErro(null)
              setMsgEsqueci(null)
              void apiEsqueciSenha(username)
                .then((r) => setMsgEsqueci(r.mensagem))
                .catch((err: Error) => setErro(err.message))
                .finally(() => setEnviando(false))
            }}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Usuário ou e-mail</span>
              <input className={inputClass} required value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </label>
            {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
            {msgEsqueci ? <p className="text-sm text-emerald-700">{msgEsqueci}</p> : null}
            <PrimaryButton type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar senha provisória'}
            </PrimaryButton>
            <GhostButton
              className="w-full"
              onClick={() => {
                setEsqueci(false)
                setErro(null)
                setMsgEsqueci(null)
              }}
            >
              Voltar ao login
            </GhostButton>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setEnviando(true)
              setErro(null)
              void login(username, senha).then((msg) => {
                setEnviando(false)
                if (msg) setErro(msg)
              })
            }}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Usuário</span>
              <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Senha</span>
              <input
                className={inputClass}
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
            <PrimaryButton type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar no app'}
            </PrimaryButton>
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-navy"
              onClick={() => {
                setEsqueci(true)
                setErro(null)
              }}
            >
              Esqueceu a senha?
            </button>
          </form>
        )}
        {ehAppNativo() ? null : (
          <>
            <p className="mt-5 text-center text-sm text-muted">
              Ainda não é cliente?{' '}
              <Link to="/assine" className="font-semibold text-navy">
                Assinar o EDB Total
              </Link>
            </p>
            <p className="mt-2 text-center text-sm">
              <Link to="/" className="text-navy">
                Voltar ao site
              </Link>
            </p>
          </>
        )}
        <p className="mt-3 text-center text-xs text-muted">
          <Link to="/privacidade" className="underline">
            Privacidade
          </Link>
          {' · '}
          <Link to="/termos" className="underline">
            Termos
          </Link>
        </p>
      </div>
    </div>
  )
}
