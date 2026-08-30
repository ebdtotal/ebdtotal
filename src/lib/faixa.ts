import type { FaixaEtaria, Pessoa, TurmaCadastro } from './types'
import { idadeEm } from './utils'

export const FAIXAS_MIGRACAO: { faixa: FaixaEtaria; min: number; max: number }[] = [
  { faixa: 'Berçário', min: 0, max: 2 },
  { faixa: 'Maternal', min: 3, max: 4 },
  { faixa: 'Jardim de Infância', min: 5, max: 6 },
  { faixa: 'Primários', min: 7, max: 8 },
  { faixa: 'Juniores', min: 9, max: 10 },
  { faixa: 'Pré Adolescentes', min: 11, max: 12 },
  { faixa: 'Adolescentes', min: 13, max: 14 },
  { faixa: 'Juvenis', min: 15, max: 17 },
  { faixa: 'Jovens', min: 18, max: 200 },
]

const ALIAS: Record<string, FaixaEtaria> = {
  'pre-adolescentes': 'Pré Adolescentes',
  'pré-adolescentes': 'Pré Adolescentes',
  'pre adolescentes': 'Pré Adolescentes',
}

export function normalizarFaixa(nome: string): FaixaEtaria | null {
  const n = nome.trim().toLowerCase()
  if (ALIAS[n]) return ALIAS[n]
  return FAIXAS_MIGRACAO.find((f) => f.faixa.toLowerCase() === n)?.faixa ?? null
}

export function faixaPorIdade(idade: number | null): FaixaEtaria | null {
  if (idade == null || idade < 0) return null
  return FAIXAS_MIGRACAO.find((f) => idade >= f.min && idade <= f.max)?.faixa ?? null
}

export type AlertaFaixa = {
  pessoa: Pessoa
  idade: number
  faixaAtual: string
  faixaNova: FaixaEtaria
}

export function alertasMudancaFaixa(pessoas: Pessoa[], turmas: TurmaCadastro[]): AlertaFaixa[] {
  const porNome = new Map(turmas.map((t) => [`${t.escolaId}|${t.nome.toLowerCase()}`, t]))
  const out: AlertaFaixa[] = []
  for (const p of pessoas) {
    if (p.tipo !== 'Aluno' || p.status !== 'Ativo') continue
    const idade = idadeEm(p.dataNascimento)
    const sugerida = faixaPorIdade(idade)
    if (idade == null || !sugerida) continue
    const turma = porNome.get(`${p.escolaId}|${p.turma.toLowerCase()}`)
    const atual = normalizarFaixa(turma?.faixaEtaria || p.faixaEtaria)
    if (!atual) continue
    if (atual === sugerida) continue
    const iAtual = FAIXAS_MIGRACAO.findIndex((f) => f.faixa === atual)
    const iNova = FAIXAS_MIGRACAO.findIndex((f) => f.faixa === sugerida)
    if (iAtual < 0 || iNova <= iAtual) continue
    out.push({ pessoa: p, idade, faixaAtual: atual, faixaNova: sugerida })
  }
  return out.sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR'))
}
