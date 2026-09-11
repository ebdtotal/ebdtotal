import { Link, useLocation } from 'react-router-dom'
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  Heart,
  NotebookPen,
  Play,
  School,
  Shield,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { Field, Modal, PrimaryButton, inputClass } from '../components/ui'
import { apiAgendarDemo } from '../lib/api'
import { ativarAfiliadoDaVisita, lerAfiliadoRef } from '../lib/afiliado'
import { APP_STORE_URL, WHATSAPP_SUPORTE_LINK } from '../lib/landing'
import { formatarBRL, PLANOS, PRODUTOS, valorParcela } from '../lib/planos'
import { WHATSAPP_SUPORTE, whatsappUrl } from '../lib/utils'

const RECURSOS = [
  { icon: ClipboardCheck, title: 'Presença', texto: 'Registro rápido de alunos e professores.' },
  { icon: NotebookPen, title: 'Avaliações', texto: 'Acompanhe o aprendizado dos alunos.' },
  { icon: BookOpen, title: 'Anotações', texto: 'Anotações de aula sempre disponíveis.' },
  { icon: Trophy, title: 'Ranking', texto: 'Reconheça e incentive os melhores.' },
  { icon: Award, title: 'Certificados', texto: 'Emita certificados de participação.' },
  { icon: Wallet, title: 'Financeiro', texto: 'Controle entradas, saídas e relatórios.' },
  { icon: BarChart3, title: 'Relatórios', texto: 'Dados claros para decisões.' },
]

const BENEFICIOS = [
  {
    icon: School,
    titulo: 'Para o Superintendente',
    texto: 'Visão completa da EBD, metas e consolidado das congregações.',
  },
  {
    icon: Users,
    titulo: 'Para o Professor',
    texto: 'Chamada da turma, lição da semana e acompanhamento dos alunos.',
  },
  {
    icon: BookOpen,
    titulo: 'Para o Aluno',
    texto: 'Portal no celular com frequência, lição e atividades.',
  },
  {
    icon: Heart,
    titulo: 'Para a Igreja',
    texto: 'Organização, participação e impacto no ensino dominical.',
  },
]

const FORM_VAZIO = { nome: '', email: '', telefone: '', igreja: '' }

export function LandingPage() {
  const location = useLocation()
  const [demoAberto, setDemoAberto] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [ref, setRef] = useState<string | null>(() => lerAfiliadoRef())

  useEffect(() => {
    document.documentElement.classList.add('site-publico')
    return () => document.documentElement.classList.remove('site-publico')
  }, [])

  useEffect(() => {
    void ativarAfiliadoDaVisita(location.search, location.pathname).then((c) => setRef(c))
  }, [location.search, location.pathname])

  const assinar = whatsappUrl(WHATSAPP_SUPORTE, 'Olá! Quero assinar o EBD Total para a minha igreja.')
  const linkAssine = (plano: string) => (ref ? `/assine?plano=${plano}&ref=${encodeURIComponent(ref)}` : `/assine?plano=${plano}`)

  function abrirDemo() {
    setErro(null)
    setOk(null)
    setForm(FORM_VAZIO)
    setDemoAberto(true)
  }

  async function enviarDemo(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setOk(null)
    setEnviando(true)
    try {
      const afiliadoCodigo = lerAfiliadoRef() || undefined
      const r = await apiAgendarDemo({ ...form, afiliadoCodigo })
      setOk(r.mensagem || 'Recebemos seu pedido. Em breve entraremos em contato.')
      setForm(FORM_VAZIO)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-dvh bg-white text-ink">
      {/* Header — primeira dobra */}
      <header className="sticky top-0 z-30 border-b border-navy/8 bg-white/95 pt-[max(env(safe-area-inset-top),var(--safe-top,0px))] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <Logo variant="mark" className="h-10 w-10 shrink-0" />
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-wide text-navy">
                EBD <span className="text-gold">Total</span>
              </span>
              <span className="hidden text-[10px] text-navy/55 sm:block">Sua EBD completa em um só lugar.</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-[11px] font-semibold tracking-[0.14em] text-navy lg:flex">
            <a href="#recursos" className="hover:text-gold">
              RECURSOS
            </a>
            <a href="#planos" className="hover:text-gold">
              PLANOS
            </a>
            <a href="mailto:contato@ebdtotal.com" className="hover:text-gold">
              CONTATO
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-full px-3 py-2 text-[11px] font-bold tracking-wide text-navy hover:text-gold sm:px-3.5"
            >
              ENTRAR
            </Link>
            <button
              type="button"
              onClick={abrirDemo}
              className="rounded-full border border-gold bg-navy px-3.5 py-2.5 text-[10px] font-bold tracking-[0.08em] text-white sm:px-5 sm:text-[11px]"
            >
              SOLICITAR DEMONSTRAÇÃO
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-8 md:grid-cols-2 md:gap-6 md:pb-14 md:pt-10 lg:gap-4">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-[2.25rem] font-bold leading-[1.1] tracking-tight text-navy sm:text-[2.75rem] lg:text-[3.15rem]">
              Organize. Acompanhe.
              <br />
              Ensine. Reconheça.
              <br />
              <span className="text-gold">Transforme vidas.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-navy/70 sm:text-base">
              O EBD Total é a plataforma completa que simplifica a gestão da sua Escola Bíblica Dominical e fortalece o
              ensino da Palavra.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#recursos"
                className="inline-flex items-center gap-2.5 rounded-full bg-navy px-5 py-3 text-xs font-bold tracking-wide text-white shadow-sm"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                  <Play size={11} fill="currentColor" />
                </span>
                VER COMO FUNCIONA
              </a>
              <button
                type="button"
                onClick={abrirDemo}
                className="inline-flex items-center rounded-full border-2 border-gold bg-white px-5 py-3 text-xs font-bold tracking-wide text-navy"
              >
                SOLICITAR DEMONSTRAÇÃO
              </button>
            </div>
            <div className="mt-5">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-xl bg-[#152238] px-4 py-2.5 text-white shadow-sm transition hover:bg-navy/90"
                aria-label="Baixar o EBD Total na App Store"
              >
                <svg width="22" height="26" viewBox="0 0 22 26" fill="currentColor" aria-hidden="true">
                  <path d="M18.05 13.7c-.03-3.02 2.47-4.47 2.58-4.54-1.41-2.06-3.6-2.34-4.38-2.37-1.86-.19-3.64 1.1-4.58 1.1-.95 0-2.4-1.08-3.95-1.05-2.03.03-3.9 1.18-4.94 3-2.11 3.66-.54 9.08 1.52 12.05 1.01 1.45 2.2 3.08 3.77 3.02 1.52-.06 2.09-.98 3.93-.98 1.83 0 2.35.98 3.96.95 1.64-.03 2.67-1.48 3.66-2.94 1.16-1.68 1.63-3.31 1.66-3.39-.04-.02-3.17-1.22-3.23-4.85zM14.9 4.6c.83-1.01 1.4-2.41 1.24-3.81-1.2.05-2.66.8-3.52 1.81-.77.89-1.45 2.32-1.27 3.68 1.34.1 2.71-.68 3.55-1.68z" />
                </svg>
                <span className="leading-tight text-left">
                  <span className="block text-[9px] font-medium tracking-wide text-white/70">Baixar na</span>
                  <span className="block text-sm font-semibold tracking-tight">App Store</span>
                </span>
              </a>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-navy/10 pt-7">
              {[
                { icon: Users, t: 'Mais organização para sua EBD' },
                { icon: BarChart3, t: 'Mais participação dos alunos' },
                { icon: Heart, t: 'Mais impacto no Reino de Deus' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.t} className="text-center">
                    <span className="mx-auto flex h-9 w-9 items-center justify-center text-navy">
                      <Icon size={24} strokeWidth={1.4} />
                    </span>
                    <p className="mt-2 text-[11px] font-medium leading-snug text-navy/75">{item.t}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="relative -mx-2 sm:mx-0 md:-mr-4 lg:-mr-8">
            <img
              src="/hero-devices.jpg"
              alt="EBD Total no computador e no celular"
              className="relative z-[1] mx-auto w-full max-w-xl object-contain object-right drop-shadow-sm md:max-w-none"
              width={507}
              height={582}
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="bg-navy py-14 text-white md:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
            Tudo o que sua EBD precisa, <span className="text-gold">em um só lugar.</span>
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-7 lg:gap-3">
            {RECURSOS.map((r) => {
              const Icon = r.icon
              return (
                <article key={r.title} className="text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center text-gold">
                    <Icon size={28} strokeWidth={1.5} />
                  </span>
                  <h3 className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em]">{r.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-snug text-white/65">{r.texto}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefícios + Planos */}
      <section id="planos" className="bg-[#eceff3] py-14 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:gap-12">
          <div id="sobre">
            <h2 className="text-xl font-bold text-navy md:text-2xl">Benefícios para toda a igreja</h2>
            <ul className="mt-8 space-y-5">
              {BENEFICIOS.map((b) => {
                const Icon = b.icon
                return (
                  <li key={b.titulo} className="flex gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy/25 text-navy">
                      <Icon size={18} strokeWidth={1.6} />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-navy">{b.titulo}</h3>
                      <p className="mt-0.5 text-sm text-muted">{b.texto}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <blockquote className="relative mt-10 rounded-xl border border-gold/40 bg-[#f7efd8] px-5 py-5">
              <span className="absolute -top-3 left-4 text-4xl leading-none text-gold/80">“</span>
              <p className="text-sm leading-relaxed text-navy/85">
                A tecnologia não substitui o ensino, mas ajuda a igreja a cumprir melhor a sua missão.
              </p>
              <footer className="mt-2 text-xs font-semibold text-navy/60">— EBD Total</footer>
            </blockquote>
          </div>

          <div>
            <h2 className="text-xl font-bold text-navy md:text-2xl">Planos para cada realidade</h2>
            <p className="mt-1 text-sm text-muted">Escolha o plano ideal para sua igreja.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <PlanoCard
                nome="EBD Total Essencial"
                destaque={false}
                ideal="Ideal para igrejas menores"
                itens={PRODUTOS.essencial.itens}
                preco={PLANOS.essencial.preco}
                parcela={valorParcela('essencial12')}
                to={linkAssine('essencial')}
              />
              <PlanoCard
                nome="EBD Total Igreja"
                destaque
                ideal="Ideal para igrejas maiores"
                itens={PRODUTOS.igreja.itens}
                preco={PLANOS.igreja.preco}
                parcela={valorParcela('igreja12')}
                to={linkAssine('igreja')}
              />
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              Rede / convenção sob consulta.{' '}
              <a href={assinar} target="_blank" rel="noreferrer" className="font-semibold text-navy underline">
                Fale conosco
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section id="contato" className="bg-navy py-8 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row md:gap-4">
          <div className="flex items-center gap-3 text-center md:text-left">
            <CalendarDays className="shrink-0 text-gold" size={28} strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold">Agende uma demonstração gratuita</p>
              <p className="text-xs text-white/60">Conheça o EBD Total com a sua equipe.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={abrirDemo}
            className="rounded-full bg-gold px-8 py-3 text-xs font-bold tracking-[0.12em] text-navy shadow-md"
          >
            AGENDAR AGORA
          </button>
          <div className="flex items-center gap-3 text-center md:text-left">
            <Shield className="shrink-0 text-gold" size={28} strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold">Segurança e confiança</p>
              <p className="text-xs text-white/60">Dados protegidos e backup automático.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-navy pb-8 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-4 text-xs text-white/55">
          <span>EBD Total · Escola Bíblica Dominical</span>
          <div className="flex flex-wrap items-center gap-4">
            <a href={APP_STORE_URL} target="_blank" rel="noreferrer" className="hover:text-gold">
              App Store
            </a>
            <Link to="/login" className="hover:text-gold">
              Entrar
            </Link>
            <Link to="/privacidade" className="hover:text-gold">
              Privacidade
            </Link>
            <Link to="/termos" className="hover:text-gold">
              Termos
            </Link>
            <a href={WHATSAPP_SUPORTE_LINK} className="hover:text-gold">
              WhatsApp
            </a>
          </div>
        </div>
      </footer>

      <Modal open={demoAberto} title="Agendar demonstração" onClose={() => setDemoAberto(false)}>
        {ok ? (
          <div className="space-y-4 py-2">
            <p className="text-sm leading-relaxed text-ink">{ok}</p>
            <PrimaryButton type="button" className="w-full" onClick={() => setDemoAberto(false)}>
              Fechar
            </PrimaryButton>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => void enviarDemo(e)}>
            <p className="text-sm text-muted">
              Preencha seus dados. Entraremos em contato para agendar a demonstração gratuita.
            </p>
            <Field label="Nome">
              <input
                className={inputClass}
                required
                autoComplete="name"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </Field>
            <Field label="E-mail">
              <input
                className={inputClass}
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Telefone / WhatsApp">
              <input
                className={inputClass}
                type="tel"
                required
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </Field>
            <Field label="Igreja">
              <input
                className={inputClass}
                required
                value={form.igreja}
                onChange={(e) => setForm({ ...form, igreja: e.target.value })}
              />
            </Field>
            {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
            <PrimaryButton type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Solicitar demonstração'}
            </PrimaryButton>
          </form>
        )}
      </Modal>
    </div>
  )
}

function PlanoCard({
  nome,
  destaque,
  ideal,
  itens,
  preco,
  parcela,
  to,
}: {
  nome: string
  destaque?: boolean
  ideal: string
  itens: string[]
  preco: number
  parcela: number
  to: string
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className={`px-4 py-3 text-center text-[11px] font-bold tracking-[0.08em] text-white ${destaque ? 'bg-gold text-navy' : 'bg-navy'}`}>
        {nome}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-5 pt-4">
        <p className="text-center text-xs text-muted">{ideal}</p>
        <span
          className={`mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-full border-2 ${destaque ? 'border-gold text-gold' : 'border-navy text-navy'}`}
        >
          <School size={26} strokeWidth={1.5} />
        </span>
        <ul className="mt-4 flex-1 space-y-2 text-xs text-ink/80">
          {itens.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check size={14} className={`mt-0.5 shrink-0 ${destaque ? 'text-gold' : 'text-navy'}`} />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-center">
          <span className="text-2xl font-bold text-navy">{formatarBRL(preco)}</span>
          <span className="text-sm text-muted">/ano</span>
        </p>
        <p className="text-center text-[11px] text-muted">ou 12× de {formatarBRL(parcela)}</p>
        <Link
          to={to}
          className={`mt-4 block rounded-full py-2.5 text-center text-[11px] font-bold tracking-wide ${
            destaque ? 'bg-gold text-navy' : 'bg-navy text-white'
          }`}
        >
          QUERO ESTE PLANO
        </Link>
      </div>
    </div>
  )
}
