import type { AppState, ChamadaAluno, Escola, Pessoa } from './types'
import { pontosAvaliacaoDe, pontosDe } from './types'
import { aniversarioNoPeriodo, idadeEm, noAno, noTrimestre, pct } from './utils'

export type RankingLinha = {
  pessoa: Pessoa
  presentes: number
  aulas: number
  faltas: number
  pontos: number
  taxa: number
}

export function rankingDe(
  state: AppState,
  escolaIds: Set<string>,
  turma?: string,
): RankingLinha[] {
  const alunos = state.pessoas.filter(
    (p) =>
      escolaIds.has(p.escolaId) &&
      p.status === 'Ativo' &&
      p.tipo === 'Aluno' &&
      (!turma || p.turma === turma),
  )
  const rels = state.relatorios
    .filter((r) => escolaIds.has(r.escolaId) && r.alunos.length)
    .sort((a, b) => a.data.localeCompare(b.data))

  return alunos
    .map((pessoa) => {
      let presentes = 0
      let aulas = 0
      let pontos = 0
      for (const r of rels.filter((x) => x.escolaId === pessoa.escolaId)) {
        const row = r.alunos.find((a) => a.pessoaId === pessoa.id)
        if (!row) continue
        aulas += 1
        if (row.presente) presentes += 1
        pontos += pontosDe(row)
      }
      pontos += pontosAvaliacaoDe(state.avaliacoes, pessoa.id)
      return {
        pessoa,
        presentes,
        aulas,
        faltas: Math.max(0, aulas - presentes),
        pontos,
        taxa: aulas ? Math.round((presentes / aulas) * 100) : 0,
      }
    })
    .sort((a, b) => b.pontos - a.pontos || b.taxa - a.taxa || a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR'))
}

export function ausentesRecentes(state: AppState, escolaIds: Set<string>, minFaltas = 2) {
  const datas = [...new Set(state.relatorios.filter((r) => escolaIds.has(r.escolaId) && r.alunos.length).map((r) => r.data))]
    .sort()
    .slice(-4)
  return rankingDe(state, escolaIds).filter((l) => {
    const faltasSeguidas = datas.reduce((acc, data) => {
      const r = state.relatorios.find((x) => x.escolaId === l.pessoa.escolaId && x.data === data)
      const row = r?.alunos.find((a) => a.pessoaId === l.pessoa.id)
      if (!row) return acc
      return row.presente ? 0 : acc + 1
    }, 0)
    return faltasSeguidas >= minFaltas || l.faltas >= minFaltas
  })
}

export function aniversariantes(pessoas: Pessoa[], dias = 7) {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + dias)
  return pessoas
    .filter((p) => p.status === 'Ativo' && aniversarioNoPeriodo(p.dataNascimento, from, to))
    .map((p) => ({
      pessoa: p,
      idade: idadeEm(p.dataNascimento),
      quando: p.dataNascimento.slice(5),
    }))
    .sort((a, b) => a.quando.localeCompare(b.quando))
}

export function relatorioPorAula(
  state: AppState,
  escolaId: string,
  data: string,
  turma: string,
  pessoas: Pessoa[],
) {
  const r = state.relatorios.find((x) => x.escolaId === escolaId && x.data === data)
  const daTurma = pessoas.filter((p) => p.escolaId === escolaId && p.status === 'Ativo' && p.turma === turma)
  const rows = daTurma.map((p) => {
    const row = r?.alunos.find((a) => a.pessoaId === p.id)
    return { pessoa: p, chamada: row ?? null }
  })
  const presentes = rows.filter((x) => x.chamada?.presente).length
  const biblias = rows.filter((x) => x.chamada?.biblia).length
  const revistas = rows.filter((x) => x.chamada?.revista).length
  const ofertaram = rows.filter((x) => x.chamada?.ofertou).length
  const pontos = rows.reduce((acc, x) => acc + (x.chamada ? pontosDe(x.chamada) : 0), 0)
  return {
    turma,
    matriculados: daTurma.length,
    presentes,
    ausentes: Math.max(0, daTurma.length - presentes),
    biblias,
    revistas,
    ofertaram,
    pontos,
    rows,
    oferta: r?.oferta ?? 0,
    visitantes: r?.visitantes ?? 0,
    finalizado: r?.finalizado ?? false,
  }
}

export function turmasDaEscola(pessoas: Pessoa[], escolaId: string): string[] {
  return [...new Set(pessoas.filter((p) => p.escolaId === escolaId && p.turma).map((p) => p.turma))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
}

export type TurmaPresenca = {
  turma: string
  matriculados: number
  presentes: number
  taxa: number
}

export function relatorioFilial(state: AppState, escolaId: string, data: string) {
  const escola = state.escolas.find((e) => e.id === escolaId) ?? null
  const r = state.relatorios.find((x) => x.escolaId === escolaId && x.data === data) ?? null
  const alunos = state.pessoas.filter(
    (p) => p.escolaId === escolaId && p.status === 'Ativo' && p.tipo === 'Aluno',
  )
  const chamada = new Map((r?.alunos ?? []).map((a) => [a.pessoaId, a]))
  const grupos = new Map<string, Pessoa[]>()
  for (const p of alunos) {
    const turma = p.turma || 'Sem turma'
    const list = grupos.get(turma)
    if (list) list.push(p)
    else grupos.set(turma, [p])
  }
  const turmas: TurmaPresenca[] = [...grupos.entries()]
    .map(([turma, pessoas]) => {
      const presentes = pessoas.filter((p) => chamada.get(p.id)?.presente).length
      const matriculados = pessoas.length
      return {
        turma,
        matriculados,
        presentes,
        taxa: matriculados ? Math.round((presentes / matriculados) * 100) : 0,
      }
    })
    .sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR'))

  const matriculados = r?.matriculados ?? alunos.length
  const presentes = r?.presentes ?? alunos.filter((p) => chamada.get(p.id)?.presente).length
  const ausentes = r?.ausentes ?? Math.max(0, matriculados - presentes)
  const visitantes = r?.visitantes ?? 0
  const oferta = r?.oferta ?? 0
  const taxa = matriculados ? Math.round((presentes / matriculados) * 100) : 0

  return {
    escola,
    relatorio: r,
    turmas,
    matriculados,
    presentes,
    ausentes,
    visitantes,
    oferta,
    taxa,
  }
}

export function resumoPeriodo(
  rels: { data: string; presentes: number; matriculados: number; visitantes: number; oferta: number; biblias: number }[],
  filtro: (data: string) => boolean,
) {
  const list = rels.filter((r) => filtro(r.data))
  const presentes = list.reduce((a, r) => a + r.presentes, 0)
  const mat = list.reduce((a, r) => a + r.matriculados, 0)
  return {
    aulas: list.length,
    presentes,
    matriculados: mat,
    visitantes: list.reduce((a, r) => a + r.visitantes, 0),
    oferta: list.reduce((a, r) => a + r.oferta, 0),
    biblias: list.reduce((a, r) => a + r.biblias, 0),
    taxa: mat ? Math.round((presentes / mat) * 100) : 0,
  }
}

export function resumoTrimestre(rels: Parameters<typeof resumoPeriodo>[0], ano: number, tri: number) {
  return resumoPeriodo(rels, (d) => noTrimestre(d, ano, tri))
}

export function resumoAnual(rels: Parameters<typeof resumoPeriodo>[0], ano: number) {
  return resumoPeriodo(rels, (d) => noAno(d, ano))
}

export function nomeEscola(escolas: Escola[], id: string): string {
  return escolas.find((e) => e.id === id)?.nome ?? '—'
}

export function ultimaChamada(a: ChamadaAluno | undefined): string {
  if (!a) return 'Sem registro'
  if (a.presente) return 'Presente'
  return 'Ausente'
}

export function datasAulasEscola(state: AppState, escolaId: string): string[] {
  return [...new Set(state.relatorios.filter((r) => r.escolaId === escolaId && r.alunos.length).map((r) => r.data))].sort()
}

export type PeriodoTurma =
  | { tipo: 'ultimas'; n: number }
  | { tipo: 'trimestre'; ano: number; tri: number }
  | { tipo: 'ano'; ano: number }
  | { tipo: 'intervalo'; de: string; ate: string }

export function rotuloPeriodoTurma(p: PeriodoTurma): string {
  if (p.tipo === 'ultimas') return `Últimas ${p.n} aulas`
  if (p.tipo === 'trimestre') return `${p.tri}º trimestre de ${p.ano}`
  if (p.tipo === 'ano') return String(p.ano)
  return `${p.de} — ${p.ate}`
}

export function aplicarPeriodoTurma(datas: string[], p: PeriodoTurma): string[] {
  const ordenadas = [...datas].sort()
  if (p.tipo === 'ultimas') return ordenadas.slice(-p.n)
  if (p.tipo === 'trimestre') return ordenadas.filter((d) => noTrimestre(d, p.ano, p.tri))
  if (p.tipo === 'ano') return ordenadas.filter((d) => noAno(d, p.ano))
  return ordenadas.filter((d) => d >= p.de && d <= p.ate)
}

export type AulaTurmaPonto = {
  data: string
  presentes: number
  ausentes: number
  visitantes: number
  matriculados: number
}

export function painelTurma(state: AppState, escolaId: string, turma: string, datas: string[]) {
  const alunos = state.pessoas.filter(
    (p) => p.escolaId === escolaId && p.turma === turma && p.tipo === 'Aluno' && p.status === 'Ativo',
  )
  const aulas: AulaTurmaPonto[] = datas.map((data) => {
    const r = state.relatorios.find((x) => x.escolaId === escolaId && x.data === data)
    const presentes = alunos.filter((p) => r?.alunos.find((a) => a.pessoaId === p.id)?.presente).length
    return {
      data,
      presentes,
      ausentes: Math.max(0, alunos.length - presentes),
      visitantes: 0,
      matriculados: alunos.length,
    }
  })
  const n = aulas.length
  const somaPre = aulas.reduce((a, x) => a + x.presentes, 0)
  const somaAus = aulas.reduce((a, x) => a + x.ausentes, 0)
  const somaVis = aulas.reduce((a, x) => a + x.visitantes, 0)
  const somaMat = aulas.reduce((a, x) => a + x.matriculados, 0)
  const ranking = alunos
    .map((pessoa) => {
      let presentes = 0
      let pontos = 0
      for (const data of datas) {
        const r = state.relatorios.find((x) => x.escolaId === escolaId && x.data === data)
        const row = r?.alunos.find((a) => a.pessoaId === pessoa.id)
        if (row?.presente) presentes += 1
        if (row) pontos += pontosDe(row)
      }
      return { pessoa, presentes, pontos, aulas: n }
    })
    .sort((a, b) => b.presentes - a.presentes || a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR'))

  return {
    alunos: alunos.length,
    aulas,
    presentesUltima: aulas[aulas.length - 1]?.presentes ?? 0,
    aproveitamento: pct(somaPre, somaMat),
    mediaPre: n ? somaPre / n : 0,
    mediaAus: n ? somaAus / n : 0,
    mediaVis: n ? somaVis / n : 0,
    rankingPresenca: ranking,
    rankingPontos: [...ranking].sort((a, b) => b.pontos - a.pontos || a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR')),
  }
}
