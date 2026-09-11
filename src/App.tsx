import { Navigate, Route, Routes, useLocation, useParams, Link } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { AppLayout } from './components/AppLayout'
import { PortalLayout } from './components/PortalLayout'
import { ativarAfiliadoDaVisita } from './lib/afiliado'
import { ehAppNativo } from './lib/native'
import { destinoInicial, perfilDe, rotaMaster, rotaPermitida } from './lib/perfis'
import { assinaturaVigente, papelRestritoSemAssinatura, rotaLiberadaNoPlano } from './lib/planos'
import { useStore } from './lib/store'
import { AlertasPage } from './pages/AlertasPage'
import { AssinePage, AssineRetornoPage } from './pages/AssinePage'
import { AvaliacaoPage } from './pages/AvaliacaoPage'
import { AtividadesPage } from './pages/AtividadesPage'
import { AvisosPage } from './pages/AvisosPage'
import { CadastrosPage } from './pages/CadastrosPage'
import { CalendarioPage } from './pages/CalendarioPage'
import { CertificadosPage } from './pages/CertificadosPage'
import { ChamadaPage } from './pages/ChamadaPage'
import { ConfiguracoesPage } from './pages/ConfiguracoesPage'
import { ContaPage } from './pages/ContaPage'
import { EscolasPage } from './pages/EscolasPage'
import { FichaAlunoPage } from './pages/FichaAlunoPage'
import { FinanceiroPage } from './pages/FinanceiroPage'
import { FormacaoPage } from './pages/FormacaoPage'
import { InicioPage } from './pages/InicioPage'
import { LandingPage } from './pages/LandingPage'
import { PrivacidadePage, TermosPage } from './pages/LegalPage'
import { LicaoPage } from './pages/LicaoPage'
import { LoginPage } from './pages/LoginPage'
import { MasterPage } from './pages/MasterPage'
import { MasterAssinaturasPage } from './pages/MasterAssinaturasPage'
import { MasterDemosPage } from './pages/MasterDemosPage'
import { MasterAfiliadosPage } from './pages/MasterAfiliadosPage'
import { MetasPage } from './pages/MetasPage'
import { PainelPage } from './pages/PainelPage'
import { PortalAlunoPage } from './pages/PortalAlunoPage'
import { PortalQuizPage } from './pages/PortalQuizPage'
import { RankingPage } from './pages/RankingPage'
import { RelatorioAulaPage } from './pages/RelatorioAulaPage'
import { RelatorioFilialPage } from './pages/RelatorioFilialPage'
import { RelatorioPage } from './pages/RelatorioPage'
import { SetoresPage } from './pages/SetoresPage'
import { ResumosPage } from './pages/ResumosPage'
import { TurmasPage } from './pages/TurmasPage'

function Staff({ children }: { children: ReactNode }) {
  const { usuario, igreja } = useStore()
  const location = useLocation()
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.papel === 'admin') {
    if (!rotaMaster(location.pathname)) return <Navigate to="/master" replace />
    return <AppLayout>{children}</AppLayout>
  }
  const perfil = perfilDe(usuario.papel)
  if (perfil === 'aluno') return <Navigate to="/portal" replace />
  if (papelRestritoSemAssinatura(usuario.papel) && !assinaturaVigente(igreja)) {
    return <AssinaturaBloqueada />
  }
  if (!rotaPermitida(perfil, location.pathname)) {
    return <Navigate to={destinoInicial(usuario.papel)} replace />
  }
  if (!rotaLiberadaNoPlano(igreja?.plano, location.pathname)) {
    return (
      <AppLayout>
        <RecursoDoPlano />
      </AppLayout>
    )
  }
  return <AppLayout>{children}</AppLayout>
}

function AssinaturaBloqueada() {
  const { logout, igreja } = useStore()
  return (
    <div className="flex min-h-[var(--app-min-h,100dvh)] items-center justify-center bg-page px-4">
      <div className="max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-ink">Assinatura encerrada</h1>
        <p className="mt-2 text-sm text-muted">
          O acesso de alunos e professores da {igreja?.nome || 'igreja'} está bloqueado porque o plano não está ativo.
          Peça à sede para renovar.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white"
          onClick={() => logout()}
        >
          Sair
        </button>
      </div>
    </div>
  )
}

function RecursoDoPlano() {
  return (
    <div className="max-w-lg rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-ink">Disponível no plano Igreja</h1>
      <p className="mt-2 text-sm text-muted">
        Esta tela faz parte do plano Igreja (filiais, financeiro, certificados, painel e formação). No Essencial o
        domingo continua: chamada, cadastros, relatório, lição e avisos.
      </p>
      <Link to="/conta" className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy">
        Ver meu plano e migrar
      </Link>
    </div>
  )
}

function Aluno({ children }: { children: ReactNode }) {
  const { usuario, igreja } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
  if (perfilDe(usuario.papel) !== 'aluno') return <Navigate to={destinoInicial(usuario.papel)} replace />
  if (!assinaturaVigente(igreja)) return <AssinaturaBloqueada />
  return <PortalLayout>{children}</PortalLayout>
}

function SharedCalendario() {
  const { usuario, igreja } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
  if (papelRestritoSemAssinatura(usuario.papel) && !assinaturaVigente(igreja)) return <AssinaturaBloqueada />
  if (perfilDe(usuario.papel) === 'aluno') {
    return (
      <PortalLayout>
        <CalendarioPage />
      </PortalLayout>
    )
  }
  return (
    <AppLayout>
      <CalendarioPage />
    </AppLayout>
  )
}

function ContaGate() {
  const { usuario, igreja } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
  if (papelRestritoSemAssinatura(usuario.papel) && !assinaturaVigente(igreja)) return <AssinaturaBloqueada />
  if (perfilDe(usuario.papel) === 'aluno') {
    return (
      <PortalLayout>
        <ContaPage />
      </PortalLayout>
    )
  }
  return (
    <AppLayout>
      <ContaPage />
    </AppLayout>
  )
}

function SharedLicao() {
  const { usuario, igreja } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
  if (papelRestritoSemAssinatura(usuario.papel) && !assinaturaVigente(igreja)) return <AssinaturaBloqueada />
  if (perfilDe(usuario.papel) === 'aluno') {
    return (
      <PortalLayout>
        <LicaoPage />
      </PortalLayout>
    )
  }
  return (
    <AppLayout>
      <LicaoPage />
    </AppLayout>
  )
}

function SharedAvisos() {
  const { usuario, igreja } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
  if (papelRestritoSemAssinatura(usuario.papel) && !assinaturaVigente(igreja)) return <AssinaturaBloqueada />
  if (perfilDe(usuario.papel) === 'aluno') {
    return (
      <PortalLayout>
        <AvisosPage />
      </PortalLayout>
    )
  }
  return (
    <AppLayout>
      <AvisosPage />
    </AppLayout>
  )
}

function SharedCertificados() {
  const { usuario, igreja } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
  if (papelRestritoSemAssinatura(usuario.papel) && !assinaturaVigente(igreja)) return <AssinaturaBloqueada />
  const perfil = perfilDe(usuario.papel)
  if (perfil === 'secretario') return <Navigate to={destinoInicial(usuario.papel)} replace />
  if (usuario.papel !== 'admin' && !rotaLiberadaNoPlano(igreja?.plano, '/certificados')) {
    if (perfil === 'aluno') return <Navigate to="/portal" replace />
    return (
      <AppLayout>
        <RecursoDoPlano />
      </AppLayout>
    )
  }
  if (perfil === 'aluno') {
    return (
      <PortalLayout>
        <CertificadosPage />
      </PortalLayout>
    )
  }
  return (
    <AppLayout>
      <CertificadosPage />
    </AppLayout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={ehAppNativo() ? <Navigate to="/login" replace /> : <LandingPage />} />
      <Route path="/assine" element={<AssinePage />} />
      <Route path="/assine/sucesso" element={<AssineRetornoPage tipo="sucesso" />} />
      <Route path="/assine/falha" element={<AssineRetornoPage tipo="falha" />} />
      <Route path="/assine/pendente" element={<AssineRetornoPage tipo="pendente" />} />
      <Route path="/a/:codigo" element={<AfiliadoRedirect />} />
      <Route path="/privacidade" element={<PrivacidadePage />} />
      <Route path="/termos" element={<TermosPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal" element={<Aluno><PortalAlunoPage /></Aluno>} />
      <Route path="/portal/avaliacao" element={<Aluno><PortalQuizPage /></Aluno>} />
      <Route path="/calendario" element={<SharedCalendario />} />
      <Route path="/licao" element={<SharedLicao />} />
      <Route path="/avisos" element={<SharedAvisos />} />
      <Route path="/certificados" element={<SharedCertificados />} />
      <Route path="/inicio" element={<Staff><InicioPage /></Staff>} />
      <Route path="/painel" element={<Staff><PainelPage /></Staff>} />
      <Route path="/metas" element={<Staff><MetasPage /></Staff>} />
      <Route path="/alunos/:id" element={<Staff><FichaAlunoPage /></Staff>} />
      <Route path="/avaliacao" element={<Staff><AvaliacaoPage /></Staff>} />
      <Route path="/formacao" element={<Staff><FormacaoPage /></Staff>} />
      <Route path="/relatorio" element={<Staff><RelatorioPage /></Staff>} />
      <Route path="/relatorio/:escolaId" element={<Staff><RelatorioFilialPage /></Staff>} />
      <Route path="/aula" element={<Staff><RelatorioAulaPage /></Staff>} />
      <Route path="/resumos" element={<Staff><ResumosPage /></Staff>} />
      <Route path="/chamada" element={<Staff><ChamadaPage /></Staff>} />
      <Route path="/cadastros" element={<Staff><CadastrosPage /></Staff>} />
      <Route path="/atividades" element={<Staff><AtividadesPage /></Staff>} />
      <Route path="/turmas" element={<Staff><TurmasPage /></Staff>} />
      <Route path="/setores" element={<Staff><SetoresPage /></Staff>} />
      <Route path="/escolas" element={<Staff><EscolasPage /></Staff>} />
      <Route path="/rankings" element={<Staff><RankingPage /></Staff>} />
      <Route path="/alertas" element={<Staff><AlertasPage /></Staff>} />
      <Route path="/financeiro" element={<Staff><FinanceiroPage /></Staff>} />
      <Route path="/configuracoes" element={<Staff><ConfiguracoesPage /></Staff>} />
      <Route path="/conta" element={<ContaGate />} />
      <Route path="/master" element={<Staff><MasterPage /></Staff>} />
      <Route path="/master/assinaturas" element={<Staff><MasterAssinaturasPage /></Staff>} />
      <Route path="/master/demos" element={<Staff><MasterDemosPage /></Staff>} />
      <Route path="/master/afiliados" element={<Staff><MasterAfiliadosPage /></Staff>} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

function AfiliadoRedirect() {
  const { codigo } = useParams()
  const [pronto, setPronto] = useState(false)
  useEffect(() => {
    const c = (codigo || '').trim()
    if (!c) {
      setPronto(true)
      return
    }
    void ativarAfiliadoDaVisita(`?ref=${encodeURIComponent(c)}`, `/a/${c}`).finally(() => setPronto(true))
  }, [codigo])
  if (!pronto) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted">Abrindo…</div>
  }
  const safe = (codigo || '').trim()
  if (!safe) return <Navigate to="/" replace />
  return <Navigate to={`/?ref=${encodeURIComponent(safe)}`} replace />
}

function HomeRedirect() {
  const { usuario } = useStore()
  if (!usuario) return <Navigate to="/" replace />
  return <Navigate to={destinoInicial(usuario.papel)} replace />
}
