import type { AppState, Licao, Pessoa } from './types'
import { formatDateBR, whatsappUrl } from './utils'

export type AulaMarca = { data: string; presente: boolean }

export type FichaAluno = {
  pessoa: Pessoa
  frequencia: number
  aulas: number
  presentes: number
  ultimas8: AulaMarca[]
  tendencia: 'alta' | 'estavel' | 'queda'
  ultimaPresenca: string | null
  faltasSeguidas: number
  acao: string
  indicadores: {
    frequencia: number
    participacao: number
    atividades: number
    evolucao: number
    aprendizado: number
    leitura: number
    projetos: number
  }
}

export function fichaAluno(state: AppState, pessoaId: string): FichaAluno | null {
  const pessoa = state.pessoas.find((p) => p.id === pessoaId)
  if (!pessoa) return null
  const rels = state.relatorios
    .filter((r) => r.escolaId === pessoa.escolaId && r.alunos.length)
    .sort((a, b) => a.data.localeCompare(b.data))
  const hist: AulaMarca[] = rels.map((r) => ({
    data: r.data,
    presente: r.alunos.find((a) => a.pessoaId === pessoaId)?.presente ?? false,
  }))
  const ultimas8 = hist.slice(-8)
  const presentes = hist.filter((h) => h.presente).length
  const aulas = hist.length
  const frequencia = aulas ? Math.round((presentes / aulas) * 100) : 0
  const half = Math.max(1, Math.floor(ultimas8.length / 2))
  const ini = ultimas8.slice(0, half).filter((h) => h.presente).length / half
  const fim = ultimas8.slice(-half).filter((h) => h.presente).length / half
  const tendencia: FichaAluno['tendencia'] =
    fim + 0.15 < ini ? 'queda' : fim > ini + 0.15 ? 'alta' : 'estavel'
  const ultimaPresenca = [...hist].reverse().find((h) => h.presente)?.data ?? null
  let seg = 0
  for (let i = hist.length - 1; i >= 0; i -= 1) {
    if (!hist[i]?.presente) seg += 1
    else break
  }

  const rows = rels.map((r) => r.alunos.find((a) => a.pessoaId === pessoaId)).filter(Boolean)
  const part = rows.length
    ? Math.round((rows.filter((a) => (a!.pontosParticipacao ?? 0) > 0 || a!.participacao).length / rows.length) * 100)
    : 0
  const leitura = rows.length ? Math.round((rows.filter((a) => a!.biblia).length / rows.length) * 100) : 0
  const quizzes = state.avaliacoes.flatMap((a) => a.respostas.filter((r) => r.pessoaId === pessoaId).map((r) => ({
    ok: r.alternativa === a.correta,
  })))
  const aprendizado = quizzes.length ? Math.round((quizzes.filter((q) => q.ok).length / quizzes.length) * 100) : 0
  const atividades = state.avaliacoes.filter((a) => a.turma === pessoa.turma).length
    ? Math.round((quizzes.length / Math.max(1, state.avaliacoes.filter((a) => a.turma === pessoa.turma).length)) * 100)
    : 0
  const evolucao = tendencia === 'alta' ? 80 : tendencia === 'estavel' ? 55 : 25
  const projetos = state.desafios.filter((d) => d.ativo).length ? (frequencia > 70 ? 70 : 40) : 0

  const acao =
    seg >= 2 || tendencia === 'queda'
      ? 'Entrar em contato'
      : frequencia < 60
        ? 'Acompanhar de perto'
        : 'Manter encorajamento'

  return {
    pessoa,
    frequencia,
    aulas,
    presentes,
    ultimas8,
    tendencia,
    ultimaPresenca,
    faltasSeguidas: seg,
    acao,
    indicadores: { frequencia, participacao: part, atividades, evolucao, aprendizado, leitura, projetos },
  }
}

export function contatoAluno(pessoa: Pessoa, whatsapp: string, nome: string) {
  const n = pessoa.telefone || whatsapp
  return whatsappUrl(n, `Olá! Somos da EBD. Notamos que ${nome} tem se afastado das aulas. Podemos conversar e ajudar?`)
}

export function rotuloTendencia(t: FichaAluno['tendencia']) {
  if (t === 'queda') return '↓ queda de frequência'
  if (t === 'alta') return '↑ crescimento de frequência'
  return '→ frequência estável'
}

export function dataBR(iso: string | null) {
  return iso ? formatDateBR(iso) : '—'
}

export function licaoDaData(
  licoes: Licao[],
  eventos: AppState['eventos'],
  data: string,
  filtro?: { turma?: string; escolaId?: string },
): Licao | null {
  const catalogo = catalogoDaData(licoes, eventos, data)
  if (!catalogo) return null
  return licaoDaTurma(licoes, catalogo, filtro?.turma, filtro?.escolaId)
}

export function ehLicaoGeral(l: Licao) {
  return !(l.turma ?? '').trim()
}

export function chaveAula(l: Pick<Licao, 'ano' | 'trimestre' | 'numero'>) {
  return `${l.ano}|${l.trimestre}|${l.numero}`
}

export function licoesCatalogo(licoes: Licao[]) {
  return licoes.filter(ehLicaoGeral)
}

export function idCatalogoPadrao(l: Pick<Licao, 'ano' | 'trimestre' | 'numero'>) {
  return `lic-${l.ano}-t${l.trimestre}-a${l.numero}`
}

function slugId(texto: string) {
  return (
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'x'
  )
}

export function idLicaoDaTurma(base: Pick<Licao, 'ano' | 'trimestre' | 'numero'>, turma: string, escolaId?: string) {
  return `lic-t-${base.ano}-t${base.trimestre}-a${base.numero}-${slugId(escolaId ?? '')}-${slugId(turma)}`
}

export function acharVarianteTurma(licoes: Licao[], catalogo: Licao, turma?: string, escolaId?: string): Licao | undefined {
  const t = (turma ?? '').trim().toLowerCase()
  if (!t) return undefined
  const mesmas = licoes.filter(
    (l) =>
      !ehLicaoGeral(l) &&
      chaveAula(l) === chaveAula(catalogo) &&
      (l.turma ?? '').trim().toLowerCase() === t,
  )
  if (escolaId) {
    return mesmas.find((l) => l.escolaId === escolaId) ?? mesmas.find((l) => !l.escolaId)
  }
  return [...mesmas].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0]
}

export function licaoDaTurma(licoes: Licao[], catalogo: Licao, turma?: string, escolaId?: string): Licao {
  return acharVarianteTurma(licoes, catalogo, turma, escolaId) ?? catalogo
}

function chaveVariante(l: Licao) {
  const t = (l.turma ?? '').trim().toLowerCase()
  if (!t) return `g|${chaveAula(l)}`
  return `t|${chaveAula(l)}|${t}|${(l.escolaId ?? '').trim()}`
}

export function deduplicarLicoes(licoes: Licao[]): { licoes: Licao[]; extras: string[] } {
  const grupos = new Map<string, Licao[]>()
  for (const l of licoes) {
    const k = chaveVariante(l)
    grupos.set(k, [...(grupos.get(k) ?? []), l])
  }
  const keep: Licao[] = []
  const extras: string[] = []
  for (const [, lista] of grupos) {
    if (lista.length === 1) {
      keep.push(lista[0])
      continue
    }
    const maisNova = [...lista].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0]
    if (ehLicaoGeral(maisNova)) {
      const canonId = lista.some((l) => l.id === idCatalogoPadrao(maisNova))
        ? idCatalogoPadrao(maisNova)
        : maisNova.id
      const base = lista.find((l) => l.id === canonId) ?? maisNova
      keep.push({
        ...base,
        ...maisNova,
        id: canonId,
        turma: undefined,
        escolaId: undefined,
      })
      for (const l of lista) if (l.id !== canonId) extras.push(l.id)
    } else {
      keep.push(maisNova)
      for (const l of lista) if (l.id !== maisNova.id) extras.push(l.id)
    }
  }
  return {
    licoes: keep.sort((a, b) => a.ano - b.ano || a.trimestre - b.trimestre || a.numero - b.numero),
    extras,
  }
}

export function catalogoDaData(licoes: Licao[], eventos: AppState['eventos'], data: string): Licao | null {
  const gerais = licoesCatalogo(licoes)
  const ev = eventos.find((e) => e.data === data && e.licaoId)
  if (ev?.licaoId) {
    const apontada = licoes.find((l) => l.id === ev.licaoId)
    if (apontada) {
      if (ehLicaoGeral(apontada)) return apontada
      return gerais.find((l) => chaveAula(l) === chaveAula(apontada)) ?? apontada
    }
  }
  const aulas = eventos.filter((e) => e.tipo === 'licao' && e.licaoId).sort((a, b) => a.data.localeCompare(b.data))
  const anterior = [...aulas].reverse().find((e) => e.data <= data) ?? aulas.at(-1)
  if (anterior?.licaoId) {
    const apontada = licoes.find((l) => l.id === anterior.licaoId)
    if (apontada) {
      if (ehLicaoGeral(apontada)) return apontada
      return gerais.find((l) => chaveAula(l) === chaveAula(apontada)) ?? apontada
    }
  }
  return gerais[0] ?? licoes[0] ?? null
}

export function copiarLicaoParaTurma(base: Licao, turma: string, escolaId?: string, faixaEtaria?: string): Licao {
  return {
    ...base,
    id: idLicaoDaTurma(base, turma, escolaId),
    turma,
    escolaId,
    faixaEtaria,
    updatedAt: new Date().toISOString(),
  }
}

export function catalogoDeLicao(licoes: Licao[], l: Licao): Licao {
  if (ehLicaoGeral(l)) return l
  return licoes.find((x) => ehLicaoGeral(x) && chaveAula(x) === chaveAula(l)) ?? l
}

export function eventoDaData(eventos: AppState['eventos'], data: string) {
  return eventos.find((e) => e.data === data && e.tipo === 'licao') ?? eventos.find((e) => e.data === data) ?? null
}
