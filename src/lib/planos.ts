export type ProdutoId = 'essencial' | 'igreja'
export type PagamentoId = 'avista' | 'parcelado'
export type PlanoCheckoutId =
  | 'essencial'
  | 'essencial12'
  | 'igreja'
  | 'igreja12'
  | 'teste'
  | 'avista'
  | 'parcelado'

export type RecursoId =
  | 'painel'
  | 'metas'
  | 'resumos'
  | 'atividades'
  | 'setores'
  | 'escolas'
  | 'financeiro'
  | 'certificados'
  | 'formacao'
  | 'configuracoes'

export type IgrejaSessao = {
  id: string
  nome: string
  cidade: string
  responsavel: string
  email: string
  telefone: string
  status: string
  plano: ProdutoId
  pagamento: PagamentoId | 'teste'
  contratadoEm: string
  validoAte: string
}

export type Entitlements = {
  produto: ProdutoId
  pessoas: number
  escolas: number
  recursos: RecursoId[]
}

const RECURSOS_IGREJA: RecursoId[] = [
  'painel',
  'metas',
  'resumos',
  'atividades',
  'setores',
  'escolas',
  'financeiro',
  'certificados',
  'formacao',
  'configuracoes',
]

const ROTAS_RECURSO: Record<string, RecursoId> = {
  '/painel': 'painel',
  '/metas': 'metas',
  '/resumos': 'resumos',
  '/atividades': 'atividades',
  '/setores': 'setores',
  '/escolas': 'escolas',
  '/financeiro': 'financeiro',
  '/certificados': 'certificados',
  '/formacao': 'formacao',
  '/configuracoes': 'configuracoes',
}

export const PRODUTOS: Record<
  ProdutoId,
  {
    id: ProdutoId
    nome: string
    pessoas: number
    escolas: number
    recursos: RecursoId[]
    descricao: string
    itens: string[]
  }
> = {
  essencial: {
    id: 'essencial',
    nome: 'Essencial',
    pessoas: 80,
    escolas: 1,
    recursos: [],
    descricao: 'Uma congregação, chamada e cadastros do domingo.',
    itens: [
      '1 congregação',
      'Até 80 cadastros',
      'Chamada, relatório, lição e avisos',
      'Portal do aluno e do professor',
    ],
  },
  igreja: {
    id: 'igreja',
    nome: 'Igreja',
    pessoas: 600,
    escolas: 9999,
    recursos: RECURSOS_IGREJA,
    descricao: 'Sede e filiais, financeiro, certificados e painel.',
    itens: [
      'Congregações ilimitadas',
      'Até 600 cadastros',
      'Acima de 600: + R$ 2,50 por cadastro',
      'Painel, metas, financeiro e certificados',
      'Formação de professores e auditoria',
    ],
  },
}

export const PLANOS: Record<
  PlanoCheckoutId,
  {
    id: PlanoCheckoutId
    produto: ProdutoId
    pagamento: PagamentoId | 'teste'
    nome: string
    preco: number
    parcelas: number
    destaque?: boolean
    descricao: string
  }
> = {
  essencial: {
    id: 'essencial',
    produto: 'essencial',
    pagamento: 'avista',
    nome: 'Essencial à vista',
    preco: 499,
    parcelas: 1,
    descricao: 'Pagamento único no PIX, cartão ou boleto.',
  },
  essencial12: {
    id: 'essencial12',
    produto: 'essencial',
    pagamento: 'parcelado',
    nome: 'Essencial em 12x',
    preco: 588,
    parcelas: 12,
    descricao: 'Até 12 parcelas iguais no cartão.',
  },
  igreja: {
    id: 'igreja',
    produto: 'igreja',
    pagamento: 'avista',
    nome: 'Igreja à vista',
    preco: 1499,
    parcelas: 1,
    destaque: true,
    descricao: 'Pagamento único no PIX, cartão ou boleto.',
  },
  igreja12: {
    id: 'igreja12',
    produto: 'igreja',
    pagamento: 'parcelado',
    nome: 'Igreja em 12x',
    preco: 1798.8,
    parcelas: 12,
    descricao: 'Até 12 parcelas iguais no cartão.',
  },
  teste: {
    id: 'teste',
    produto: 'igreja',
    pagamento: 'teste',
    nome: 'Teste de pagamento',
    preco: 2,
    parcelas: 1,
    descricao: 'Cobrança de R$ 2,00 para validar o Mercado Pago e o e-mail de acesso.',
  },
  avista: {
    id: 'igreja',
    produto: 'igreja',
    pagamento: 'avista',
    nome: 'Igreja à vista',
    preco: 1499,
    parcelas: 1,
    destaque: true,
    descricao: 'Pagamento único no PIX, cartão ou boleto.',
  },
  parcelado: {
    id: 'igreja12',
    produto: 'igreja',
    pagamento: 'parcelado',
    nome: 'Igreja em 12x',
    preco: 1798.8,
    parcelas: 12,
    descricao: 'Até 12 parcelas iguais no cartão.',
  },
}

export const LIMITE_PESSOAS_IGREJA = PRODUTOS.igreja.pessoas

export function planoValido(v: string | null | undefined): PlanoCheckoutId {
  if (v === 'essencial' || v === 'essencial12' || v === 'igreja' || v === 'igreja12' || v === 'teste') return v
  if (v === 'avista') return 'igreja'
  if (v === 'parcelado') return 'igreja12'
  return 'igreja'
}

export function checkoutDo(produto: ProdutoId, pagamento: PagamentoId): PlanoCheckoutId {
  if (produto === 'essencial') return pagamento === 'parcelado' ? 'essencial12' : 'essencial'
  return pagamento === 'parcelado' ? 'igreja12' : 'igreja'
}

export function produtoDe(plano: string | null | undefined): ProdutoId {
  const id = planoValido(plano)
  return PLANOS[id].produto
}

export function entitlementsDe(plano: string | null | undefined): Entitlements {
  const p = produtoDe(plano)
  const def = PRODUTOS[p]
  return { produto: p, pessoas: def.pessoas, escolas: def.escolas, recursos: def.recursos }
}

export function recursoDaRota(pathname: string): RecursoId | null {
  for (const [prefixo, rec] of Object.entries(ROTAS_RECURSO)) {
    if (pathname === prefixo || pathname.startsWith(prefixo + '/')) return rec
  }
  return null
}

export function rotaLiberadaNoPlano(plano: string | null | undefined, pathname: string): boolean {
  const rec = recursoDaRota(pathname)
  if (!rec) return true
  return entitlementsDe(plano).recursos.includes(rec)
}

export function formatarBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function valorParcela(plano: PlanoCheckoutId): number {
  const p = PLANOS[planoValido(plano)]
  return Math.round((p.preco / p.parcelas) * 100) / 100
}

export function rotuloProduto(plano: string | null | undefined): string {
  return PRODUTOS[produtoDe(plano)].nome
}

export function planoVencido(validoAte: string | null | undefined): boolean {
  if (!validoAte) return false
  const t = Date.parse(validoAte)
  if (!Number.isFinite(t)) return false
  return t < Date.now()
}

export function diasParaVencer(validoAte: string | null | undefined): number | null {
  if (!validoAte) return null
  const t = Date.parse(validoAte)
  if (!Number.isFinite(t)) return null
  return Math.ceil((t - Date.now()) / 86400000)
}

export function assinaturaVigente(igreja: IgrejaSessao | null | undefined): boolean {
  if (!igreja) return true
  if (igreja.status === 'suspensa') return false
  if (planoVencido(igreja.validoAte)) return false
  return true
}

export function papelRestritoSemAssinatura(papel: string | undefined | null): boolean {
  return papel === 'aluno' || papel === 'professor'
}

/** Plano vencido ou igreja suspensa: não lança chamada nem financeiro. Consulta, relatórios e cadastros seguem. */
export function bloqueiaChamadaEFinanceiro(igreja: IgrejaSessao | null | undefined): boolean {
  return !assinaturaVigente(igreja)
}

export function avisoRenovacaoPlano(igreja: IgrejaSessao | null | undefined): { titulo: string; texto: string; data: string } | null {
  if (!igreja?.validoAte) return null
  const dias = diasParaVencer(igreja.validoAte)
  if (dias == null || dias > 15 || dias < 0) return null
  const validade = igreja.validoAte.slice(0, 10)
  const [y, m, d] = validade.split('-')
  const quando = y && m && d ? `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}` : validade
  return {
    titulo: 'Renove a assinatura da EBD',
    texto:
      dias === 0
        ? `O plano ${rotuloProduto(igreja.plano)} vence hoje (${quando}). Renove em Minha conta para alunos e professores continuarem no app.`
        : `Faltam ${dias} dia${dias === 1 ? '' : 's'} para o término do plano ${rotuloProduto(igreja.plano)} (${quando}). Renove em Minha conta para não interromper o acesso de alunos e professores.`,
    data: validade,
  }
}

/** Extra anual por cadastro além do limite do plano Igreja. */
export const EXTRA_POR_CADASTRO_IGREJA = 2.5

/** Parcela mensal em 12x = valor à vista ÷ 10 (total parcelado = à vista × 1,2). */
export const DIVISOR_PARCELA_12X = 10

export function precoParceladoDe(avista: number): number {
  return Math.round(avista * (12 / DIVISOR_PARCELA_12X) * 100) / 100
}

export function parcelaDe(avista: number): number {
  return Math.round((avista / DIVISOR_PARCELA_12X) * 100) / 100
}

/** Preço Igreja com extras só acima de 600 cadastros. */
export function precoIgrejaComCadastros(cadastrosInformados: number) {
  const cadastros = Math.max(1, Math.floor(cadastrosInformados) || 1)
  const limite = PRODUTOS.igreja.pessoas
  const precoBase = PLANOS.igreja.preco
  const extras = cadastros > limite ? (cadastros - limite) * EXTRA_POR_CADASTRO_IGREJA : 0
  const avista = precoBase + extras
  return {
    cadastros,
    limite,
    precoBase,
    extras,
    avista,
    parcelado: precoParceladoDe(avista),
    parcela: parcelaDe(avista),
    comExtras: extras > 0,
  }
}

export function simularCustoPorAluno(produto: ProdutoId, cadastrosInformados: number) {
  const cadastros = Math.max(1, Math.floor(cadastrosInformados) || 1)
  const plano = produto === 'essencial' ? PLANOS.essencial : PLANOS.igreja
  const limite = PRODUTOS[produto].pessoas
  const extras =
    produto === 'igreja' && cadastros > limite ? (cadastros - limite) * EXTRA_POR_CADASTRO_IGREJA : 0
  const totalAno = plano.preco + extras
  const porAluno = totalAno / cadastros
  const porAlunoMes = porAluno / 12
  return {
    cadastros,
    limite,
    precoBase: plano.preco,
    extras,
    totalAno,
    totalParcelado: precoParceladoDe(totalAno),
    parcelaMensal: parcelaDe(totalAno),
    porAluno,
    porAlunoMes,
    acimaDoLimite: cadastros > limite,
  }
}
