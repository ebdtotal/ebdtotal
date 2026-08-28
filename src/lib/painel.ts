import { fichaAluno } from './acompanhamento'
import type { AppState, MetaEscola } from './types'
import { turmasDaEscola } from './stats'

export type PainelDados = {
  matriculados: number
  mediaPresenca: number
  professores: number
  visitantes: number
  novos: number
  faltas3: { id: string; nome: string; turma: string; faltas: number }[]
  turmasAbaixo: { turma: string; taxa: number; meta: number }[]
  turmasCrescendo: { turma: string; taxa: number }[]
}

export function metaDaEscola(state: AppState, escolaId: string): MetaEscola {
  return (
    state.metas.find((m) => m.escolaId === escolaId) ?? {
      escolaId,
      frequencia: 80,
      crescimento: 10,
      visitantesMes: 20,
      professoresCapacitados: 100,
    }
  )
}

export function painelEbd(state: AppState, escolaIds: Set<string>): PainelDados {
  const pessoas = state.pessoas.filter((p) => escolaIds.has(p.escolaId) && p.status === 'Ativo')
  const alunos = pessoas.filter((p) => p.tipo === 'Aluno')
  const professores = pessoas.filter((p) => p.tipo === 'Professor')
  const rels = state.relatorios.filter((r) => escolaIds.has(r.escolaId))
  const ultimaData = [...new Set(rels.map((r) => r.data))].sort().at(-1)
  const ultima = rels.filter((r) => r.data === ultimaData)
  const mat = ultima.reduce((a, r) => a + r.matriculados, 0)
  const pre = ultima.reduce((a, r) => a + r.presentes, 0)
  const visitantes = ultima.reduce((a, r) => a + r.visitantes, 0)

  const fichas = alunos.map((a) => fichaAluno(state, a.id)).filter(Boolean)
  const faltas3 = fichas
    .filter((f) => f!.faltasSeguidas >= 3)
    .map((f) => ({
      id: f!.pessoa.id,
      nome: f!.pessoa.nome,
      turma: f!.pessoa.turma,
      faltas: f!.faltasSeguidas,
    }))

  const turmas = [...new Set(alunos.map((a) => `${a.escolaId}::${a.turma}`))]
  const turmasAbaixo: PainelDados['turmasAbaixo'] = []
  const turmasCrescendo: PainelDados['turmasCrescendo'] = []
  for (const key of turmas) {
    const [escolaId, turma] = key.split('::')
    const daTurma = fichas.filter((f) => f!.pessoa.escolaId === escolaId && f!.pessoa.turma === turma)
    if (!daTurma.length) continue
    const taxa = Math.round(daTurma.reduce((a, f) => a + f!.frequencia, 0) / daTurma.length)
    const meta = metaDaEscola(state, escolaId).frequencia
    if (taxa < meta) turmasAbaixo.push({ turma, taxa, meta })
    if (daTurma.filter((f) => f!.tendencia === 'alta').length >= Math.ceil(daTurma.length / 3)) {
      turmasCrescendo.push({ turma, taxa })
    }
  }

  const datas = [...new Set(rels.map((r) => r.data))].sort()
  const recentes = new Set(datas.slice(-2))
  const novos = alunos.filter((a) => {
    const f = fichas.find((x) => x!.pessoa.id === a.id)
    if (!f || !f.ultimaPresenca) return false
    return recentes.has(f.ultimaPresenca) && f.presentes <= 2
  }).length

  return {
    matriculados: alunos.length || mat,
    mediaPresenca: mat ? Math.round((pre / mat) * 100) : 0,
    professores: professores.length,
    visitantes,
    novos,
    faltas3,
    turmasAbaixo: turmasAbaixo.sort((a, b) => a.taxa - b.taxa),
    turmasCrescendo,
  }
}

export function indicadoresTurma(state: AppState, escolaId: string, turma?: string) {
  const turmas = turma ? [turma] : turmasDaEscola(state.pessoas, escolaId)
  return turmas.map((t) => {
    const alunos = state.pessoas.filter(
      (p) => p.escolaId === escolaId && p.turma === t && p.tipo === 'Aluno' && p.status === 'Ativo',
    )
    const fichas = alunos.map((a) => fichaAluno(state, a.id)).filter(Boolean)
    const n = fichas.length || 1
    return {
      turma: t,
      alunos: alunos.length,
      frequencia: Math.round(fichas.reduce((a, f) => a + f!.frequencia, 0) / n),
      participacao: Math.round(fichas.reduce((a, f) => a + f!.indicadores.participacao, 0) / n),
      aprendizado: Math.round(fichas.reduce((a, f) => a + f!.indicadores.aprendizado, 0) / n),
      leitura: Math.round(fichas.reduce((a, f) => a + f!.indicadores.leitura, 0) / n),
    }
  })
}

export function progressoMeta(atual: number, meta: number): number {
  if (!meta) return 0
  return Math.min(100, Math.round((atual / meta) * 1000) / 10)
}

export function frequenciaAtual(state: AppState, escolaId: string): number {
  const rels = state.relatorios.filter((r) => r.escolaId === escolaId)
  const ultima = [...rels].sort((a, b) => a.data.localeCompare(b.data)).at(-1)
  if (!ultima?.matriculados) return 0
  return Math.round((ultima.presentes / ultima.matriculados) * 100)
}

export function visitantesNoMes(state: AppState, escolaId: string, ref = '2026-08-23'): number {
  const mes = ref.slice(0, 7)
  return state.relatorios
    .filter((r) => r.escolaId === escolaId && r.data.startsWith(mes))
    .reduce((a, r) => a + r.visitantes, 0)
}

export function crescimentoPercentual(state: AppState, escolaId: string): number {
  const rels = state.relatorios.filter((r) => r.escolaId === escolaId).sort((a, b) => a.data.localeCompare(b.data))
  if (rels.length < 2) return 0
  const recente = rels.slice(-2)
  const ant = recente[0]!.presentes
  const atual = recente[1]!.presentes
  if (!ant) return 0
  return Math.round(((atual - ant) / ant) * 100)
}

export function professoresCapacitadosPct(state: AppState, escolaId: string): number {
  const profs = state.pessoas.filter(
    (p) => p.escolaId === escolaId && p.tipo === 'Professor' && p.status === 'Ativo',
  )
  if (!profs.length) return 0
  const ok = profs.filter((p) => {
    const u = state.usuarios.find((x) => x.pessoaId === p.id && x.papel === 'professor')
    if (!u) return false
    return state.cursos.some((c) => {
      const prog = state.progressos.find((x) => x.usuarioId === u.id && x.cursoId === c.id)
      return (prog?.concluidas.length ?? 0) >= c.aulas.length
    })
  }).length
  return Math.round((ok / profs.length) * 100)
}
