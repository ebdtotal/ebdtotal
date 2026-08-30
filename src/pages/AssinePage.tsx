import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { TemaToggle } from '../components/TemaToggle'
import { Field, PrimaryButton, inputClass } from '../components/ui'
import { apiIniciarAssinatura, apiStatusAssinatura } from '../lib/api'
import { WHATSAPP_SUPORTE_LINK } from '../lib/landing'
import { formatarBRL, LIMITE_PESSOAS_IGREJA, PLANOS, planoValido, valorParcela, type PlanoId } from '../lib/planos'

function Shell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('site-publico')
    return () => document.documentElement.classList.remove('site-publico')
  }, [])

  return (
    <div className="relative min-h-dvh bg-page px-4 py-10">
      <div className="absolute right-4 top-4">
        <TemaToggle compact />
      </div>
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-sm sm:p-8">{children}</div>
    </div>
  )
}

export function AssinePage() {
  const [params] = useSearchParams()
  const [form, setForm] = useState({ nome: '', cidade: '', responsavel: '', email: '', telefone: '' })
  const [plano, setPlano] = useState<PlanoId>(() => planoValido(params.get('plano')))
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const escolhido = PLANOS[plano]

  return (
    <Shell>
      <Link to="/" className="text-sm text-navy">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-navy">Assinar o EDB Total</h1>
      <p className="mt-1 text-sm text-muted">
        Cadastre a igreja, pague o plano anual e receba o usuário e a senha inicial no e-mail informado. Até {LIMITE_PESSOAS_IGREJA} cadastros por igreja.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className={`rounded-xl border p-4 text-left ${plano === 'avista' ? 'border-navy bg-navy text-white' : 'border-line bg-white'}`}
          onClick={() => setPlano('avista')}
        >
          <p className="text-sm font-semibold">À vista</p>
          <p className="mt-1 text-lg font-semibold">{formatarBRL(PLANOS.avista.preco)}/ano</p>
          <p className={`mt-1 text-xs ${plano === 'avista' ? 'text-white/80' : 'text-muted'}`}>Pagamento único</p>
        </button>
        <button
          type="button"
          className={`rounded-xl border p-4 text-left ${plano === 'parcelado' ? 'border-navy bg-navy text-white' : 'border-line bg-white'}`}
          onClick={() => setPlano('parcelado')}
        >
          <p className="text-sm font-semibold">Até 12x</p>
          <p className="mt-1 text-lg font-semibold">{formatarBRL(PLANOS.parcelado.preco)}/ano</p>
          <p className={`mt-1 text-xs ${plano === 'parcelado' ? 'text-white/80' : 'text-muted'}`}>
            {PLANOS.parcelado.parcelas}x de {formatarBRL(valorParcela('parcelado'))}
          </p>
        </button>
      </div>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          setEnviando(true)
          setErro(null)
          void apiIniciarAssinatura({ ...form, plano })
            .then((r) => {
              try {
                sessionStorage.setItem(
                  'ebd-assine',
                  JSON.stringify({ signupId: r.signupId, email: r.email, igreja: r.igreja }),
                )
              } catch {
                /* private mode */
              }
              window.location.href = r.checkoutUrl
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
        <Field label="E-mail (obrigatório — enviaremos o login e a senha após o pagamento)">
          <input className={inputClass} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="WhatsApp">
          <input className={inputClass} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        </Field>
        {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
        <p className="text-xs text-muted">
          Ao continuar, você concorda com os{' '}
          <Link to="/termos" className="font-medium text-navy underline">
            Termos de uso
          </Link>{' '}
          e a{' '}
          <Link to="/privacidade" className="font-medium text-navy underline">
            Política de privacidade
          </Link>
          . {escolhido.nome}: {formatarBRL(escolhido.preco)}/ano
          {plano === 'parcelado' ? ` em até 12x de ${formatarBRL(valorParcela('parcelado'))}` : ' no pagamento único'}.
        </p>
        <PrimaryButton type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Abrindo pagamento…' : 'Ir para o pagamento'}
        </PrimaryButton>
      </form>
    </Shell>
  )
}

export function AssineRetornoPage({ tipo }: { tipo: 'sucesso' | 'falha' | 'pendente' }) {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<'aguardando' | 'pago' | 'pendente' | 'erro'>(
    tipo === 'sucesso' ? 'aguardando' : tipo === 'pendente' ? 'pendente' : 'erro',
  )
  const [info, setInfo] = useState<{ email: string; igreja: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.add('site-publico')
    return () => document.documentElement.classList.remove('site-publico')
  }, [])

  useEffect(() => {
    if (tipo !== 'sucesso') return
    let salvo: { email?: string; igreja?: string; signupId?: string } = {}
    try {
      salvo = JSON.parse(sessionStorage.getItem('ebd-assine') || '{}') as {
        email?: string
        igreja?: string
        signupId?: string
      }
    } catch {
      /* ignore */
    }
    const sid = params.get('sid') || params.get('external_reference') || salvo.signupId || ''
    const paymentId = params.get('payment_id') || params.get('collection_id') || ''
    if (!sid) {
      setStatus('erro')
      setErro('Não encontramos esta assinatura. Se o pagamento foi aprovado, fale no WhatsApp.')
      return
    }

    let cancel = false
    const esperar = async () => {
      for (let i = 0; i < 16; i++) {
        try {
          const r = await apiStatusAssinatura(sid, paymentId || undefined)
          if (cancel) return
          setInfo({ email: r.email || salvo.email || '', igreja: r.igreja || salvo.igreja || '' })
          if (r.status === 'pago') {
            setStatus('pago')
            return
          }
        } catch (e) {
          if (cancel) return
          if (i === 15) {
            setStatus('erro')
            setErro(e instanceof Error ? e.message : 'Não foi possível confirmar o pagamento.')
            return
          }
        }
        await new Promise((ok) => setTimeout(ok, 2000))
      }
      if (!cancel) setStatus('pendente')
    }
    void esperar()
    return () => {
      cancel = true
    }
  }, [tipo, params])

  const titulo =
    status === 'pago'
      ? 'Pagamento confirmado'
      : status === 'erro' || tipo === 'falha'
        ? tipo === 'falha'
          ? 'Pagamento não concluído'
          : 'Não foi possível confirmar'
        : tipo === 'pendente' || status === 'pendente'
          ? 'Pagamento em análise'
          : 'Confirmando pagamento'

  return (
    <Shell>
      <Logo variant="full" className="mx-auto h-20 w-auto" />
      <h1 className="mt-4 text-center text-xl font-semibold text-navy">{titulo}</h1>
      {tipo === 'falha' ? (
        <p className="mt-2 text-center text-sm text-muted">Você pode tentar de novo. Nenhum acesso é criado antes do pagamento aprovado.</p>
      ) : null}
      {tipo === 'pendente' && status !== 'pago' ? (
        <p className="mt-2 text-center text-sm text-muted">
          Assim que o pagamento for aprovado, enviamos o usuário e a senha inicial para o e-mail cadastrado.
        </p>
      ) : null}
      {tipo === 'sucesso' && status === 'aguardando' ? (
        <p className="mt-2 text-center text-sm text-muted">Estamos confirmando o pagamento e preparando o acesso da igreja…</p>
      ) : null}
      {status === 'pago' ? (
        <p className="mt-2 text-center text-sm text-muted">
          Enviamos o login e a senha inicial para <b>{info?.email || 'o e-mail cadastrado'}</b>
          {info?.igreja ? ` (${info.igreja})` : ''}. Confira também a caixa de spam.
        </p>
      ) : null}
      {status === 'pendente' && tipo === 'sucesso' ? (
        <p className="mt-2 text-center text-sm text-muted">
          O pagamento ainda está sendo confirmado. Se o e-mail não chegar em alguns minutos, fale no WhatsApp.
        </p>
      ) : null}
      {erro ? <p className="mt-2 text-center text-sm text-red-600">{erro}</p> : null}
      <div className="mt-6 space-y-2">
        {status === 'pago' ? (
          <Link to="/login" className="block rounded-xl bg-navy py-3 text-center text-sm font-semibold text-white">
            Ir para o login
          </Link>
        ) : (
          <Link to="/assine" className="block rounded-xl bg-navy py-3 text-center text-sm font-semibold text-white">
            {tipo === 'falha' ? 'Tentar novamente' : 'Voltar ao cadastro'}
          </Link>
        )}
        <a href={WHATSAPP_SUPORTE_LINK} className="block rounded-xl border border-line py-3 text-center text-sm font-semibold text-navy">
          Falar no WhatsApp
        </a>
      </div>
    </Shell>
  )
}
