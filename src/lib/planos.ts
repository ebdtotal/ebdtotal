export const LIMITE_PESSOAS_IGREJA = 600

export type PlanoId = 'avista' | 'parcelado'

export const PLANOS: Record<
  PlanoId,
  {
    id: PlanoId
    nome: string
    preco: number
    parcelas: number
    destaque?: boolean
    descricao: string
  }
> = {
  avista: {
    id: 'avista',
    nome: 'Anual à vista',
    preco: 1299,
    parcelas: 1,
    destaque: true,
    descricao: 'Pagamento único no PIX, cartão ou boleto.',
  },
  parcelado: {
    id: 'parcelado',
    nome: 'Anual parcelado',
    preco: 1499,
    parcelas: 12,
    descricao: 'Até 12 parcelas iguais no cartão.',
  },
}

export function planoValido(v: string | null | undefined): PlanoId {
  return v === 'parcelado' ? 'parcelado' : 'avista'
}

export function formatarBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function valorParcela(plano: PlanoId): number {
  const p = PLANOS[plano]
  return Math.round((p.preco / p.parcelas) * 100) / 100
}
