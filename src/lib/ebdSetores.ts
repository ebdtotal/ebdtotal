import type { CategoriaFinanceira, SetorEbd } from './types'

export const SETORES_EBD_PADRAO: SetorEbd[] = [
  { id: 'sebd-infantil', nome: 'Infantil' },
  { id: 'sebd-intermediario', nome: 'Intermediário' },
  { id: 'sebd-jovens-adultos', nome: 'Jovens e adultos' },
  { id: 'sebd-obreiros', nome: 'Obreiros' },
  { id: 'sebd-casais', nome: 'Casais' },
  { id: 'sebd-terceira-idade', nome: 'Terceira Idade' },
  { id: 'sebd-novos-convertidos', nome: 'Novos convertidos' },
]

export const CATEGORIAS_FINANCEIRAS_PADRAO: CategoriaFinanceira[] = [
  { id: 'cat-oferta', nome: 'Oferta da EBD', natureza: 'receita' },
  { id: 'cat-dizimo', nome: 'Dízimo', natureza: 'receita' },
  { id: 'cat-doacao', nome: 'Doação', natureza: 'receita' },
  { id: 'cat-evento-rec', nome: 'Evento', natureza: 'receita' },
  { id: 'cat-outras-rec', nome: 'Outras receitas', natureza: 'receita' },
  { id: 'cat-revista', nome: 'Revistas', natureza: 'despesa' },
  { id: 'cat-material', nome: 'Material didático', natureza: 'despesa' },
  { id: 'cat-evento-desp', nome: 'Evento', natureza: 'despesa' },
  { id: 'cat-manutencao', nome: 'Manutenção', natureza: 'despesa' },
  { id: 'cat-outras-desp', nome: 'Outras despesas', natureza: 'despesa' },
]

export function garantirSetoresEbd(atuais: SetorEbd[] | undefined, removidos: string[] | undefined): SetorEbd[] {
  const rem = new Set(removidos ?? [])
  const lista = [...(atuais ?? [])]
  const ids = new Set(lista.map((s) => s.id))
  if (lista.length === 0) {
    return SETORES_EBD_PADRAO.filter((s) => !rem.has(s.id))
  }
  for (const s of SETORES_EBD_PADRAO) {
    if (!ids.has(s.id) && !rem.has(s.id) && !lista.some((x) => x.nome.toLowerCase() === s.nome.toLowerCase())) {
      lista.push(s)
    }
  }
  return lista.filter((s) => !rem.has(s.id))
}

export function garantirCategorias(atuais: CategoriaFinanceira[] | undefined, removidas: string[] | undefined): CategoriaFinanceira[] {
  const rem = new Set(removidas ?? [])
  const lista = [...(atuais ?? [])]
  if (lista.length === 0) return CATEGORIAS_FINANCEIRAS_PADRAO.filter((c) => !rem.has(c.id))
  return lista.filter((c) => !rem.has(c.id))
}
