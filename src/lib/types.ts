export const FAIXAS_ETARIAS = [
  'Berçário',
  'Maternal',
  'Jardim de Infância',
  'Primários',
  'Juniores',
  'Pré Adolescentes',
  'Adolescentes',
  'Juvenis',
  'Jovens',
  'Adultos',
  'Coordenação (sec./superintendentes)',
  'Discipulados',
] as const

export type FaixaEtaria = (typeof FAIXAS_ETARIAS)[number]

export const TIPOS_PESSOA = ['Aluno', 'Professor', 'Secretário', 'Superintendente'] as const
export type TipoPessoa = (typeof TIPOS_PESSOA)[number]

export const SEXOS = ['Masculino', 'Feminino'] as const
export type Sexo = (typeof SEXOS)[number]

export const STATUS_PESSOA = ['Ativo', 'Inativo'] as const
export type StatusPessoa = (typeof STATUS_PESSOA)[number]

export const STATUS_ESCOLA = ['Ativa', 'Pendente', 'Inativa'] as const
export type StatusEscola = (typeof STATUS_ESCOLA)[number]

export const PAPEIS = ['admin', 'sede', 'escola', 'professor', 'aluno', 'superintendente', 'secretario'] as const
export type Papel = (typeof PAPEIS)[number]

export const TIPOS_LANCAMENTO = ['oferta', 'dizimo', 'despesa', 'outro'] as const
export type TipoLancamento = (typeof TIPOS_LANCAMENTO)[number]

export type Escola = {
  id: string
  nome: string
  setor: string
  bairro: string
  regional: string
  responsavel: string
  username: string
  status: StatusEscola
  ativos: number
  inativos: number
}

export type Pessoa = {
  id: string
  nome: string
  dataNascimento: string
  turma: string
  faixaEtaria: FaixaEtaria
  tipo: TipoPessoa
  sexo: Sexo
  status: StatusPessoa
  escolaId: string
  telefone?: string
  email?: string
  updatedAt?: string
}

export type TurmaCadastro = {
  id: string
  nome: string
  escolaId: string
  faixaEtaria: FaixaEtaria
}

export type Usuario = {
  id: string
  nome: string
  username: string
  senha: string
  papel: Papel
  escolaId?: string
  pessoaId?: string
  turma?: string
  email?: string
  updatedAt?: string
}

export type SetorAcesso = {
  id: string
  nome: string
  usuarioIds: string[]
}

export type ChamadaAluno = {
  pessoaId: string
  presente: boolean
  biblia: boolean
  revista: boolean
  ofertou: boolean
  participacao: boolean
  pontosParticipacao?: number
}

export type RelatorioDiario = {
  id: string
  escolaId: string
  data: string
  matriculados: number
  presentes: number
  ausentes: number
  visitantes: number
  biblias: number
  revistas: number
  oferta: number
  anotacao?: string
  bibliasProfessores?: number
  revistasProfessores?: number
  ofertaProfessores?: number
  finalizado: boolean
  alunos: ChamadaAluno[]
  updatedAt?: string
}

export type LancamentoFinanceiro = {
  id: string
  escolaId: string
  data: string
  tipo: TipoLancamento
  descricao: string
  valor: number
  turma?: string
  updatedAt?: string
}

export const TIPOS_EVENTO = [
  'licao',
  'congresso',
  'culto',
  'feriado',
  'reuniao',
  'capacitacao',
  'ebf',
  'encerramento',
] as const
export type TipoEvento = (typeof TIPOS_EVENTO)[number]

export type Licao = {
  id: string
  ano: number
  trimestre: number
  numero: number
  tema: string
  textoBiblico: string
  versiculo: string
  objetivos: string[]
  resumo: string
  perguntas: string[]
  dinamica: string
  aplicacao: string
  atividade: string
  complementar: string
  turma?: string
  escolaId?: string
  faixaEtaria?: string
  updatedAt?: string
}

export type EventoCalendario = {
  id: string
  data: string
  tipo: TipoEvento
  titulo: string
  descricao: string
  licaoId?: string
  escolaId?: string
}

export type Avaliacao = {
  id: string
  licaoId: string
  escolaId: string
  turma: string
  data: string
  pergunta: string
  alternativas: string[]
  correta: number
  respostas: { pessoaId: string; alternativa: number }[]
}

export type MetaEscola = {
  escolaId: string
  frequencia: number
  crescimento: number
  visitantesMes: number
  professoresCapacitados: number
}

export type Aviso = {
  id: string
  titulo: string
  texto: string
  data: string
  escolaId?: string
}

export type Desafio = {
  id: string
  titulo: string
  descricao: string
  ativo: boolean
}

export type Certificado = {
  id: string
  pessoaId: string
  titulo: string
  data: string
  curso?: string
  carga?: string
}

export type ModeloCertificado = {
  titulo: string
  subtitulo: string
  texto: string
  assinatura1: string
  cargo1: string
  assinatura2: string
  cargo2: string
}

export type CursoAula = {
  titulo: string
  conteudo: string
  videoUrl?: string
}

export type CursoProfessor = {
  id: string
  titulo: string
  descricao: string
  duracao: string
  aulas: CursoAula[]
}

export type ProgressoCurso = {
  usuarioId: string
  cursoId: string
  concluidas: number[]
}

export type AppState = {
  escolas: Escola[]
  pessoas: Pessoa[]
  turmas: TurmaCadastro[]
  usuarios: Usuario[]
  setores: SetorAcesso[]
  relatorios: RelatorioDiario[]
  lancamentos: LancamentoFinanceiro[]
  licoes: Licao[]
  eventos: EventoCalendario[]
  avaliacoes: Avaliacao[]
  metas: MetaEscola[]
  avisos: Aviso[]
  desafios: Desafio[]
  certificados: Certificado[]
  modeloCertificado?: ModeloCertificado
  licoesRemovidas?: string[]
  avaliacoesRemovidas?: string[]
  certificadosRemovidos?: string[]
  pessoasRemovidas?: string[]
  escolasRemovidas?: string[]
  turmasRemovidas?: string[]
  usuariosRemovidos?: string[]
  lancamentosRemovidos?: string[]
  avisosRemovidos?: string[]
  eventosRemovidos?: string[]
  setoresRemovidos?: string[]
  cursosRemovidos?: string[]
  cursos: CursoProfessor[]
  progressos: ProgressoCurso[]
  rankingCompetitivo: boolean
  whatsapp: string
  sessaoId: string | null
}

export function pontosParticipacaoDe(a: ChamadaAluno): number {
  if (typeof a.pontosParticipacao === 'number' && Number.isFinite(a.pontosParticipacao)) {
    return Math.max(0, Math.round(a.pontosParticipacao))
  }
  return a.participacao ? 1 : 0
}

export function pontosDe(a: ChamadaAluno): number {
  return (
    Number(a.presente) +
    Number(a.biblia) +
    Number(a.revista) +
    Number(!!a.ofertou) +
    pontosParticipacaoDe(a)
  )
}

export function pontosAvaliacaoDe(avaliacoes: Avaliacao[], pessoaId: string, licaoId?: string): number {
  return avaliacoes.reduce((n, av) => {
    if (licaoId && av.licaoId !== licaoId) return n
    const resp = av.respostas.find((r) => r.pessoaId === pessoaId)
    return n + (resp && resp.alternativa === av.correta ? 1 : 0)
  }, 0)
}

export function chamadaVazia(pessoaId: string): ChamadaAluno {
  return { pessoaId, presente: false, biblia: false, revista: false, ofertou: false, participacao: false, pontosParticipacao: 0 }
}
