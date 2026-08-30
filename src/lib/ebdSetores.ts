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
  { id: 'cat-revistas-vendidas', nome: 'Revistas vendidas', natureza: 'receita' },
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

export const CAT_REVISTAS_VENDIDAS_ID = 'cat-revistas-vendidas'
export const CAT_OFERTA_EBD_ID = 'cat-oferta'

export function slugTurma(nome: string) {
  const slug = nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'classe'
}

export function idLancRevista(revistaId: string) {
  return `revpag_${revistaId}`
}

export function idLancOfertaClasse(escolaId: string, data: string, turma: string) {
  return `oferta_${escolaId}_${data}_${slugTurma(turma)}`
}

export function revistaGeraReceita(r: { recebeu: boolean; pagou: boolean; valor: number }) {
  return (r.recebeu || r.pagou) && r.valor > 0
}

export function idCategoria(
  cats: CategoriaFinanceira[] | undefined,
  idPadrao: string,
  nome: string,
  natureza: CategoriaFinanceira['natureza'] = 'receita',
): string {
  const lista = cats ?? []
  const porId = lista.find((c) => c.id === idPadrao)
  if (porId) return porId.id
  const alvo = nome.toLowerCase()
  const porNome = lista.find((c) => c.natureza === natureza && c.nome.toLowerCase() === alvo)
  if (porNome) return porNome.id
  return idPadrao
}

export function categoriaOuPadrao(
  atual: string | undefined,
  cats: CategoriaFinanceira[] | undefined,
  idPadrao: string,
  nome: string,
  natureza: CategoriaFinanceira['natureza'] = 'receita',
): string {
  const lista = cats ?? []
  if (atual && lista.some((c) => c.id === atual)) return atual
  return idCategoria(lista, idPadrao, nome, natureza)
}

export function garantirCategorias(atuais: CategoriaFinanceira[] | undefined, removidas: string[] | undefined): CategoriaFinanceira[] {
  const rem = new Set(removidas ?? [])
  const lista = [...(atuais ?? [])]
  const base = lista.length === 0 ? CATEGORIAS_FINANCEIRAS_PADRAO.filter((c) => !rem.has(c.id)) : lista.filter((c) => !rem.has(c.id))
  const agora = new Date().toISOString()
  function garantir(id: string, nome: string, natureza: CategoriaFinanceira['natureza']) {
    if (rem.has(id)) return
    if (base.some((c) => c.id === id || (c.natureza === natureza && c.nome.toLowerCase() === nome.toLowerCase()))) return
    base.push({ id, nome, natureza, updatedAt: agora })
  }
  garantir(CAT_REVISTAS_VENDIDAS_ID, 'Revistas vendidas', 'receita')
  garantir(CAT_OFERTA_EBD_ID, 'Oferta da EBD', 'receita')
  return base
}
