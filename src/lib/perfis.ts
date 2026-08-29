import type { Papel } from './types'

export const PERFIS_APP = ['professor', 'superintendente', 'secretario', 'aluno'] as const
export type PerfilApp = (typeof PERFIS_APP)[number]

export type NavItem = { to: string; label: string }

export function perfilDe(papel: string | undefined | null): PerfilApp {
  if (papel === 'aluno') return 'aluno'
  if (papel === 'professor') return 'professor'
  if (papel === 'escola' || papel === 'secretario') return 'secretario'
  return 'superintendente'
}

export const ROTULO_PERFIL: Record<PerfilApp, string> = {
  professor: 'Professor',
  superintendente: 'Superintendente',
  secretario: 'Secretário',
  aluno: 'Aluno',
}

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: 'Master',
  sede: 'Superintendente (igreja)',
  escola: 'Secretário (filial)',
  professor: 'Professor',
  aluno: 'Aluno',
  superintendente: 'Superintendente',
  secretario: 'Secretário',
}

const NAV: Record<PerfilApp, NavItem[]> = {
  professor: [
    { to: '/inicio', label: 'Início' },
    { to: '/chamada', label: 'Chamada' },
    { to: '/licao', label: 'Lição' },
    { to: '/avaliacao', label: 'Avaliação' },
    { to: '/formacao', label: 'Formação' },
    { to: '/calendario', label: 'Calendário' },
    { to: '/avisos', label: 'Avisos' },
    { to: '/certificados', label: 'Certificados' },
    { to: '/cadastros', label: 'Turma' },
    { to: '/alertas', label: 'Alertas' },
    { to: '/rankings', label: 'Indicadores' },
    { to: '/conta', label: 'Minha conta' },
  ],
  superintendente: [
    { to: '/inicio', label: 'Início' },
    { to: '/chamada', label: 'Chamada' },
    { to: '/painel', label: 'Painel' },
    { to: '/metas', label: 'Metas' },
    { to: '/alertas', label: 'Alertas' },
    { to: '/relatorio', label: 'Relatório' },
    { to: '/aula', label: 'Por aula' },
    { to: '/resumos', label: 'Resumos' },
    { to: '/cadastros', label: 'Cadastros' },
    { to: '/atividades', label: 'Atividades' },
    { to: '/turmas', label: 'Turmas' },
    { to: '/escolas', label: 'Escolas' },
    { to: '/calendario', label: 'Calendário' },
    { to: '/licao', label: 'Lição' },
    { to: '/avisos', label: 'Avisos' },
    { to: '/certificados', label: 'Certificados' },
    { to: '/avaliacao', label: 'Avaliação' },
    { to: '/formacao', label: 'Professores' },
    { to: '/rankings', label: 'Indicadores' },
    { to: '/financeiro', label: 'Financeiro' },
    { to: '/configuracoes', label: 'Configurações' },
    { to: '/conta', label: 'Minha conta' },
  ],
  secretario: [
    { to: '/inicio', label: 'Início' },
    { to: '/relatorio', label: 'Relatório' },
    { to: '/chamada', label: 'Chamada' },
    { to: '/cadastros', label: 'Cadastros' },
    { to: '/turmas', label: 'Turmas' },
    { to: '/alertas', label: 'Alertas' },
    { to: '/aula', label: 'Por aula' },
    { to: '/resumos', label: 'Resumos' },
    { to: '/calendario', label: 'Calendário' },
    { to: '/licao', label: 'Lição' },
    { to: '/avisos', label: 'Avisos' },
    { to: '/financeiro', label: 'Financeiro' },
    { to: '/rankings', label: 'Indicadores' },
    { to: '/metas', label: 'Metas' },
    { to: '/conta', label: 'Minha conta' },
  ],
  aluno: [
    { to: '/portal', label: 'Início' },
    { to: '/calendario', label: 'Calendário' },
    { to: '/licao', label: 'Lição' },
    { to: '/avisos', label: 'Avisos' },
    { to: '/certificados', label: 'Certificados' },
    { to: '/portal/avaliacao', label: 'Atividades' },
    { to: '/conta', label: 'Minha conta' },
  ],
}

const MOBILE: Record<PerfilApp, string[]> = {
  professor: ['/inicio', '/chamada', '/licao', '/avaliacao', '/alertas'],
  superintendente: ['/inicio', '/chamada', '/painel', '/relatorio', '/alertas'],
  secretario: ['/inicio', '/relatorio', '/chamada', '/cadastros', '/alertas'],
  aluno: ['/portal', '/licao', '/avisos', '/portal/avaliacao'],
}

export function navDoPerfil(perfil: PerfilApp): NavItem[] {
  return NAV[perfil]
}

export function mobileDoPerfil(perfil: PerfilApp): NavItem[] {
  const allow = new Set(MOBILE[perfil])
  return NAV[perfil].filter((i) => allow.has(i.to))
}

export function destinoInicial(papel: string): string {
  if (papel === 'admin') return '/master'
  const p = perfilDe(papel)
  if (p === 'aluno') return '/portal'
  return '/inicio'
}

export function rotaPermitida(perfil: PerfilApp, pathname: string): boolean {
  if (pathname.startsWith('/alunos/')) {
    return perfil === 'superintendente' || perfil === 'secretario' || perfil === 'professor'
  }
  if (pathname.startsWith('/licao')) return true
  if (pathname.startsWith('/calendario')) return true
  if (pathname.startsWith('/avisos')) return true
  if (pathname.startsWith('/certificados')) {
    return perfil === 'aluno' || perfil === 'professor' || perfil === 'superintendente'
  }
  if (pathname.startsWith('/portal')) return perfil === 'aluno'
  if (pathname === '/conta') return true
  if (pathname === '/master') return perfil === 'superintendente'
  if (pathname === '/' || pathname === '/assine' || pathname === '/privacidade' || pathname === '/termos') return true
  if (pathname === '/login') return true
  return NAV[perfil].some((i) => pathname === i.to || (i.to !== '/' && pathname.startsWith(i.to)))
}

export const ATALHOS: Record<Exclude<PerfilApp, 'aluno'>, { to: string; search?: string; label: string; texto: string }[]> = {
  professor: [
    { to: '/chamada', label: 'Fazer chamada', texto: 'Presença só da sua turma' },
    { to: '/licao', label: 'Lição da semana', texto: 'Tema, texto e dinâmica' },
    { to: '/avaliacao', label: 'Miniavaliação', texto: 'Ver quem compreendeu' },
    { to: '/avisos', label: 'Avisos', texto: 'Comunicados da EBD' },
    { to: '/certificados', label: 'Certificados', texto: 'Emitir PDF para a turma' },
    { to: '/formacao', label: 'Escola de Professores', texto: 'Cursos curtos' },
    { to: '/alertas', label: 'Ausentes', texto: 'Quem precisa de contato' },
  ],
  superintendente: [
    { to: '/chamada', label: 'Chamada das classes', texto: 'Presença de cada turma' },
    { to: '/chamada', search: '?modo=professores', label: 'Chamada dos professores', texto: 'Lista única, sem separar por classe' },
    { to: '/painel', label: 'Painel da EBD', texto: 'Números e alertas agora' },
    { to: '/metas', label: 'Metas', texto: 'Frequência e crescimento' },
    { to: '/relatorio', label: 'Relatório do domingo', texto: 'Consolidado das escolas' },
    { to: '/cadastros', label: 'Cadastros', texto: 'Alunos e professores' },
    { to: '/atividades', label: 'Atividades', texto: 'O que cada login fez no sistema' },
    { to: '/escolas', label: 'Escolas', texto: 'Congregações da rede' },
    { to: '/avisos', label: 'Avisos', texto: 'Publicar para toda a EBD' },
    { to: '/certificados', label: 'Certificados', texto: 'Modelo e emissão em PDF' },
    { to: '/alertas', label: 'Alertas', texto: 'Faltas e aniversários' },
  ],
  secretario: [
    { to: '/relatorio', label: 'Relatório diário', texto: 'Lançar o domingo' },
    { to: '/chamada', label: 'Chamada', texto: 'Presença da congregação' },
    { to: '/cadastros', label: 'Cadastros', texto: 'Matricular e atualizar' },
    { to: '/financeiro', label: 'Ofertas', texto: 'Oferta, dízimo e despesa' },
    { to: '/alertas', label: 'Alertas', texto: 'Ausentes da semana' },
    { to: '/calendario', label: 'Calendário', texto: 'Lições e eventos' },
    { to: '/avisos', label: 'Avisos', texto: 'Comunicados da EBD' },
  ],
}
