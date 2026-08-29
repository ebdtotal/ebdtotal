import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  GraduationCap,
  MessageCircle,
  School,
  Shield,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { apiStats, type StatsPublicos, WHATSAPP_SUPORTE_LINK } from '../lib/landing'
import { WHATSAPP_SUPORTE, whatsappUrl } from '../lib/utils'

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: 'Chamada inteligente',
    texto: 'Presença por aluno e por professor, Bíblia, revista, oferta e relatório do domingo — inclusive edição depois de enviado.',
  },
  {
    icon: Users,
    title: 'Cadastros da EBD',
    texto: 'Alunos, professores, secretários e superintendentes por turma e congregação. Os números entram na contabilização geral do site.',
  },
  {
    icon: School,
    title: 'Rede de congregações',
    texto: 'Uma igreja, várias escolas. Sede vê o consolidado; a filial lança só a sua classe.',
  },
  {
    icon: BarChart3,
    title: 'Painel e metas',
    texto: 'Frequência, visitantes, crescimento e alertas de ausentes em um só lugar.',
  },
  {
    icon: BookOpen,
    title: 'Lição e avaliação',
    texto: 'Tema da semana, dinâmica e miniavaliação para a turma.',
  },
  {
    icon: GraduationCap,
    title: 'Portal do aluno',
    texto: 'Frequência, lição e atividades no celular do aluno — com login criado na hora do cadastro.',
  },
  {
    icon: Wallet,
    title: 'Oferta e financeiro',
    texto: 'Oferta da classe, dízimo e despesas, ligados ao relatório do domingo.',
  },
  {
    icon: CalendarDays,
    title: 'Calendário da escola',
    texto: 'Lições, congressos, EBF e capacitação de professores.',
  },
  {
    icon: Smartphone,
    title: 'App e site',
    texto: 'Funciona no navegador, no atalho da tela inicial e no app (Android e iPhone).',
  },
]

export function LandingPage() {
  const [stats, setStats] = useState<StatsPublicos | null>(null)
  useEffect(() => {
    document.documentElement.classList.add('site-publico')
    return () => document.documentElement.classList.remove('site-publico')
  }, [])
  useEffect(() => {
    void apiStats()
      .then(setStats)
      .catch(() => setStats({ igrejas: 0, escolas: 0, alunos: 0, professores: 0, pessoas: 0 }))
  }, [])

  const wa = whatsappUrl(WHATSAPP_SUPORTE, 'Olá! Quero assinar o EDB Total para a minha igreja.')

  return (
    <div className="min-h-dvh bg-page text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Logo variant="mark" className="h-9 w-9" />
            <span className="font-semibold text-navy">EDB Total</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#numeros">Números</a>
            <a href="#planos">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-navy">
              Entrar
            </Link>
            <Link to="/assine" className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-navy">
              Assinar
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Escola Bíblica Dominical</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">O sistema completo da EBD para a sua igreja</h1>
            <p className="mt-4 text-base text-white/75 md:text-lg">
              Chamada, cadastros, relatório do domingo, portal do aluno e formação de professores — no celular da secretaria e no site da rede.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/assine" className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-navy">
                Começar agora
              </Link>
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold">
                <MessageCircle size={16} /> Falar no WhatsApp
              </a>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 text-ink shadow-2xl">
            <Logo variant="full" className="mx-auto h-20 w-auto" />
            <p className="mt-4 text-center text-sm text-muted">Tudo o que a EBD precisa, em um só lugar.</p>
            <ul className="mt-5 space-y-2 text-sm">
              {['Chamada das classes e dos professores', 'Cadastros que alimentam o painel da rede', 'Login automático para cada aluno e professor', 'Assinatura por igreja, com dados isolados'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-teal" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="numeros" className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">Contabilização geral em tempo real</p>
          <h2 className="mt-1 text-center text-2xl font-semibold text-navy">Os cadastros do app aparecem aqui</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
            <Stat n={stats?.igrejas} l="Igrejas" />
            <Stat n={stats?.escolas} l="Escolas / classes" />
            <Stat n={stats?.alunos} l="Alunos" />
            <Stat n={stats?.professores} l="Professores" />
            <Stat n={stats?.pessoas} l="Cadastros ativos" />
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold text-navy">Tudo o que o sistema e o app fazem</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted">
          Pensado para superintendente, secretário, professor e aluno — cada um no seu aplicativo.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <article key={f.title} className="rounded-2xl bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-gold">
                  <Icon size={18} />
                </span>
                <h3 className="mt-3 font-semibold text-navy">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.texto}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section id="planos" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-semibold text-navy">Assinatura para igrejas</h2>
          <p className="mt-2 text-center text-sm text-muted">Comece em minutos. Login e senha são gerados na hora.</p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-line p-6">
              <p className="text-sm font-semibold text-muted">Igreja</p>
              <p className="mt-2 text-3xl font-semibold text-navy">R$ 79<span className="text-base font-medium text-muted">/mês</span></p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li>1 igreja, congregações ilimitadas</li>
                <li>Chamada, cadastros e relatório</li>
                <li>Portal do aluno e do professor</li>
                <li>Suporte no WhatsApp</li>
              </ul>
              <Link to="/assine" className="mt-6 block rounded-xl bg-navy py-3 text-center text-sm font-semibold text-white">
                Assinar
              </Link>
            </div>
            <div className="rounded-2xl bg-navy p-6 text-white">
              <p className="text-sm font-semibold text-gold">Rede / convenção</p>
              <p className="mt-2 text-3xl font-semibold">Sob consulta</p>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>Várias igrejas na mesma conta master</li>
                <li>Painel consolidado da rede</li>
                <li>Contabilização geral no site</li>
                <li>Onboarding assistido</li>
              </ul>
              <a href={wa} target="_blank" rel="noreferrer" className="mt-6 block rounded-xl bg-gold py-3 text-center text-sm font-semibold text-navy">
                Falar com o master
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-start gap-3 rounded-2xl bg-white p-6 shadow-sm">
          <Shield className="mt-0.5 shrink-0 text-navy" size={22} />
          <div>
            <h3 className="font-semibold text-navy">Dados de cada igreja ficam separados</h3>
            <p className="mt-1 text-sm text-muted">
              Banco próprio no servidor, senhas com hash e acesso por login. O master vê a contabilização geral; a igreja vê só a sua EBD.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-navy py-8 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm">
          <span>EDB Total · Escola Bíblica Dominical</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacidade" className="text-gold">
              Privacidade
            </Link>
            <Link to="/termos" className="text-gold">
              Termos
            </Link>
            <a href={WHATSAPP_SUPORTE_LINK} className="text-gold">
              WhatsApp (98) 98125-8852
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Stat({ n, l }: { n?: number; l: string }) {
  return (
    <div className="rounded-2xl bg-page px-4 py-5 text-center">
      <div className="text-2xl font-semibold text-navy">{n ?? '—'}</div>
      <div className="mt-1 text-xs text-muted">{l}</div>
    </div>
  )
}
