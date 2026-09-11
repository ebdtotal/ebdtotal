import { alertasMudancaFaixa } from './faixa'
import type { AppState, Pessoa, Usuario } from './types'

export type TipoNotificacao = 'aviso' | 'aniversario' | 'aniversario-professor' | 'faixa'

export type Notificacao = {
  id: string
  tipo: TipoNotificacao
  titulo: string
  texto: string
  quando: string
  to: string
}

const EVT = 'ebd-notificacoes'

function chaveLidas(usuarioId: string) {
  return `ebd-notif-lidas:${usuarioId}`
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || nome
}

function aniversarioHoje(nasc: string, ref = new Date()): boolean {
  if (!nasc || nasc.length < 10) return false
  const md = nasc.slice(5, 10)
  const hoje = `${String(ref.getMonth() + 1).padStart(2, '0')}-${String(ref.getDate()).padStart(2, '0')}`
  return md === hoje
}

function pessoaDoUsuario(usuario: Usuario, pessoas: Pessoa[]): Pessoa | undefined {
  if (usuario.pessoaId) return pessoas.find((p) => p.id === usuario.pessoaId)
  const nome = usuario.nome.trim().toLowerCase()
  return pessoas.find(
    (p) => p.nome.trim().toLowerCase() === nome && (!usuario.escolaId || p.escolaId === usuario.escolaId),
  )
}

function professorDaTurma(usuario: Usuario, aluno: Pessoa): boolean {
  if (usuario.papel !== 'professor' || !usuario.turma) return false
  if (aluno.turma !== usuario.turma) return false
  if (usuario.escolaId && aluno.escolaId !== usuario.escolaId) return false
  return true
}

function superintendenteDaEscola(usuario: Usuario, aluno: Pessoa): boolean {
  if (usuario.papel !== 'superintendente') return false
  if (!usuario.escolaId) return true
  return usuario.escolaId === aluno.escolaId
}

function recebeFaixa(usuario: Usuario, aluno: Pessoa): boolean {
  if (usuario.papel === 'professor') return professorDaTurma(usuario, aluno)
  if (usuario.papel === 'sede') return true
  return superintendenteDaEscola(usuario, aluno)
}

export function notificacoesDe(state: AppState, usuario: Usuario | null, agora = new Date()): Notificacao[] {
  if (!usuario || usuario.papel === 'admin') return []
  const out: Notificacao[] = []
  const ano = agora.getFullYear()
  const hojeIso = `${ano}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`

  for (const a of state.avisos ?? []) {
    if (a.escolaId && a.escolaId !== usuario.escolaId) continue
    out.push({
      id: `aviso:${a.id}`,
      tipo: 'aviso',
      titulo: a.titulo || 'Novo aviso',
      texto: a.texto,
      quando: a.data || hojeIso,
      to: '/avisos',
    })
  }

  const eu = pessoaDoUsuario(usuario, state.pessoas)
  if (eu && eu.status === 'Ativo' && aniversarioHoje(eu.dataNascimento, agora)) {
    out.push({
      id: `aniversario:${eu.id}:${ano}`,
      tipo: 'aniversario',
      titulo: 'Feliz aniversário',
      texto: `Parabéns ${primeiroNome(eu.nome)}, que Deus lhe abençoe grandemente`,
      quando: hojeIso,
      to: '',
    })
  }

  const alunos = state.pessoas.filter((p) => p.tipo === 'Aluno' && p.status === 'Ativo' && aniversarioHoje(p.dataNascimento, agora))
  if (usuario.papel === 'professor') {
    for (const aluno of alunos) {
      if (!professorDaTurma(usuario, aluno)) continue
      if (eu?.id === aluno.id) continue
      out.push({
        id: `aniversario-professor:${aluno.id}:${ano}`,
        tipo: 'aniversario-professor',
        titulo: 'Aniversariante da turma',
        texto: `Hoje é o aniversário do ${aluno.nome}, já deu os parabéns?`,
        quando: hojeIso,
        to: `/alunos/${aluno.id}`,
      })
    }
  }

  if (usuario.papel === 'professor' || usuario.papel === 'superintendente' || usuario.papel === 'sede') {
    const faixas = alertasMudancaFaixa(state.pessoas, state.turmas ?? [])
    for (const a of faixas) {
      if (!recebeFaixa(usuario, a.pessoa)) continue
      out.push({
        id: `faixa:${a.pessoa.id}:${a.faixaNova}`,
        tipo: 'faixa',
        titulo: 'Mudança de faixa',
        texto: `${a.pessoa.nome} deve migrar de ${a.faixaAtual} para ${a.faixaNova} (${a.idade} anos).`,
        quando: hojeIso,
        to: usuario.papel === 'professor' ? '/alertas' : `/alunos/${a.pessoa.id}`,
      })
    }
  }

  return out.sort((a, b) => b.quando.localeCompare(a.quando) || a.titulo.localeCompare(b.titulo, 'pt-BR'))
}

export function lidasDe(usuarioId: string): Set<string> {
  try {
    const raw = localStorage.getItem(chaveLidas(usuarioId))
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function marcarNotificacoesLidas(usuarioId: string, ids: string[]) {
  if (!ids.length) return
  const set = lidasDe(usuarioId)
  for (const id of ids) set.add(id)
  try {
    localStorage.setItem(chaveLidas(usuarioId), JSON.stringify([...set]))
  } catch {
    /* quota */
  }
  window.dispatchEvent(new Event(EVT))
}

export function onNotificacoesChange(fn: () => void) {
  window.addEventListener(EVT, fn)
  window.addEventListener('storage', fn)
  return () => {
    window.removeEventListener(EVT, fn)
    window.removeEventListener('storage', fn)
  }
}
