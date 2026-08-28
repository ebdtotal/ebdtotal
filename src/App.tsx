import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { PortalLayout } from './components/PortalLayout'
import { destinoInicial, perfilDe, rotaPermitida } from './lib/perfis'
import { useStore } from './lib/store'
import { AlertasPage } from './pages/AlertasPage'
import { AssinePage } from './pages/AssinePage'
import { AssistentePage } from './pages/AssistentePage'
import { AvaliacaoPage } from './pages/AvaliacaoPage'
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
import { MetasPage } from './pages/MetasPage'
import { PainelPage } from './pages/PainelPage'
import { PortalAlunoPage } from './pages/PortalAlunoPage'
import { PortalQuizPage } from './pages/PortalQuizPage'
import { RankingPage } from './pages/RankingPage'
import { RelatorioAulaPage } from './pages/RelatorioAulaPage'
import { RelatorioFilialPage } from './pages/RelatorioFilialPage'
import { RelatorioPage } from './pages/RelatorioPage'
import { ResumosPage } from './pages/ResumosPage'
import { TurmasPage } from './pages/TurmasPage'

function Staff({ children }: { children: ReactNode }) {
  const { usuario } = useStore()
  const location = useLocation()
  if (!usuario) return <Navigate to="/login" replace />
  const perfil = perfilDe(usuario.papel)
  if (perfil === 'aluno') return <Navigate to="/portal" replace />
  if (!rotaPermitida(perfil, location.pathname)) {
    return <Navigate to={destinoInicial(usuario.papel)} replace />
  }
  return <AppLayout>{children}</AppLayout>
}

function Aluno({ children }: { children: ReactNode }) {
  const { usuario } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
  if (perfilDe(usuario.papel) !== 'aluno') return <Navigate to={destinoInicial(usuario.papel)} replace />
  return <PortalLayout>{children}</PortalLayout>
}

function SharedCalendario() {
  const { usuario } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
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
  const { usuario } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
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
  const { usuario } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
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
  const { usuario } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
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
  const { usuario } = useStore()
  if (!usuario) return <Navigate to="/login" replace />
  const perfil = perfilDe(usuario.papel)
  if (perfil === 'secretario') return <Navigate to={destinoInicial(usuario.papel)} replace />
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
      <Route path="/" element={<LandingPage />} />
      <Route path="/assine" element={<AssinePage />} />
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
      <Route path="/assistente" element={<Staff><AssistentePage /></Staff>} />
      <Route path="/formacao" element={<Staff><FormacaoPage /></Staff>} />
      <Route path="/relatorio" element={<Staff><RelatorioPage /></Staff>} />
      <Route path="/relatorio/:escolaId" element={<Staff><RelatorioFilialPage /></Staff>} />
      <Route path="/aula" element={<Staff><RelatorioAulaPage /></Staff>} />
      <Route path="/resumos" element={<Staff><ResumosPage /></Staff>} />
      <Route path="/chamada" element={<Staff><ChamadaPage /></Staff>} />
      <Route path="/cadastros" element={<Staff><CadastrosPage /></Staff>} />
      <Route path="/turmas" element={<Staff><TurmasPage /></Staff>} />
      <Route path="/escolas" element={<Staff><EscolasPage /></Staff>} />
      <Route path="/rankings" element={<Staff><RankingPage /></Staff>} />
      <Route path="/alertas" element={<Staff><AlertasPage /></Staff>} />
      <Route path="/financeiro" element={<Staff><FinanceiroPage /></Staff>} />
      <Route path="/configuracoes" element={<Staff><ConfiguracoesPage /></Staff>} />
      <Route path="/conta" element={<ContaGate />} />
      <Route path="/master" element={<Staff><MasterPage /></Staff>} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

function HomeRedirect() {
  const { usuario } = useStore()
  if (!usuario) return <Navigate to="/" replace />
  return <Navigate to={destinoInicial(usuario.papel)} replace />
}
