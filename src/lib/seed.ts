import type {
  AppState,
  Escola,
  FaixaEtaria,
  Pessoa,
  RelatorioDiario,
  Sexo,
  TipoPessoa,
} from './types'
import { chamadaVazia } from './types'
import { AVISOS, CURSOS, DESAFIOS, eventosSeed, hidratarEstado, LICOES, metasSeed } from './pedagogia'
import { WHATSAPP_SUPORTE } from './utils'

const E = {
  oliveiras: '17819',
  betel: '17892',
  siao: '17901',
  getsemani: '17914',
  peniel: '17928',
  betania: '17933',
  ebenezer: '17947',
  central: '17801',
} as const

function p(partial: Omit<Pessoa, 'id'> & { id?: string }): Pessoa {
  return {
    id: partial.id ?? `p_${partial.nome.slice(0, 8).replace(/\s/g, '').toLowerCase()}`,
    ...partial,
  }
}

const escolas: Escola[] = [
  {
    id: E.central,
    nome: 'IADESL 35 Central',
    setor: 'Sede',
    bairro: 'Centro',
    regional: 'Regional 35',
    responsavel: 'Quenaz Martins',
    username: 'quenazmartins35',
    status: 'Ativa',
    ativos: 39,
    inativos: 8,
  },
  {
    id: E.oliveiras,
    nome: 'IADESL 35 Monte das Oliveiras',
    setor: 'Sede',
    bairro: 'Santo Antônio',
    regional: 'Regional 35',
    responsavel: 'Zilmara Silva Leite Campelo',
    username: 'zilmara144',
    status: 'Ativa',
    ativos: 99,
    inativos: 84,
  },
  {
    id: E.betel,
    nome: 'IADESL35 Betel',
    setor: 'Sede',
    bairro: 'Cutim Anil',
    regional: 'Regional 35',
    responsavel: 'Wesley de Oliveira Dias',
    username: 'wesleydias35',
    status: 'Ativa',
    ativos: 16,
    inativos: 3,
  },
  {
    id: E.siao,
    nome: 'IADESL 35 Monte Sião',
    setor: 'Sede',
    bairro: 'Pirapora',
    regional: 'Regional 35',
    responsavel: 'Jardiel Rocha Silva',
    username: 'jardiel35',
    status: 'Ativa',
    ativos: 42,
    inativos: 11,
  },
  {
    id: E.getsemani,
    nome: 'IADESL 35 Getsêmani',
    setor: 'Sede',
    bairro: 'Cohab',
    regional: 'Regional 35',
    responsavel: 'Silviane Melo',
    username: 'silviane35',
    status: 'Ativa',
    ativos: 38,
    inativos: 9,
  },
  {
    id: E.peniel,
    nome: 'IADESL 35 Peniel',
    setor: 'Sede',
    bairro: 'Anil',
    regional: 'Regional 35',
    responsavel: 'Marcos Antônio Pereira',
    username: 'marcospeniel',
    status: 'Ativa',
    ativos: 31,
    inativos: 6,
  },
  {
    id: E.betania,
    nome: 'IADESL 35 Betânia',
    setor: 'Sede',
    bairro: 'Turu',
    regional: 'Regional 35',
    responsavel: 'Ana Paula Santos',
    username: 'anapaula35',
    status: 'Ativa',
    ativos: 28,
    inativos: 5,
  },
  {
    id: E.ebenezer,
    nome: 'IADESL 35 Ebenézer',
    setor: 'Sede',
    bairro: 'São Francisco',
    regional: 'Regional 35',
    responsavel: 'Roberto Carlos Lima',
    username: 'roberto35',
    status: 'Ativa',
    ativos: 35,
    inativos: 7,
  },
]

const extra: Array<{
  nome: string
  nasc: string
  turma: string
  faixa: FaixaEtaria
  tipo: TipoPessoa
  sexo: Sexo
  escolaId: string
  status?: Pessoa['status']
  telefone?: string
}> = [
  { nome: 'Ellen Santos Melo', nasc: '2012-02-03', turma: 'Elshaday', faixa: 'Adolescentes', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Eliene', nasc: '', turma: 'Mulheres De Fé', faixa: 'Adultos', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Lucas Gabriel Ferreira', nasc: '2011-07-19', turma: 'Elshaday', faixa: 'Adolescentes', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Maria Eduarda Costa', nasc: '2013-11-02', turma: 'Elshaday', faixa: 'Adolescentes', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Pedro Henrique Alves', nasc: '2009-08-27', turma: 'Juvenis Vida', faixa: 'Juvenis', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Ana Beatriz Nunes', nasc: '2016-08-26', turma: 'Juniores 1', faixa: 'Juniores', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'João Vitor Mendes', nasc: '2018-01-22', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras, telefone: '559899140007' },
  { nome: 'Helena Rocha', nasc: '2020-05-30', turma: 'Jardim I', faixa: 'Jardim de Infância', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Miguel Souza', nasc: '2022-12-11', turma: 'Maternal A', faixa: 'Maternal', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Laura Campos', nasc: '2024-03-17', turma: 'Berçário', faixa: 'Berçário', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Fernanda Lima Oliveira', nasc: '1988-06-21', turma: 'Mulheres De Fé', faixa: 'Adultos', tipo: 'Professor', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Carlos Eduardo Pinto', nasc: '1979-10-05', turma: 'Homens de Valor', faixa: 'Adultos', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Bruna Cristina Dias', nasc: '2003-08-16', turma: 'Jovens Unção', faixa: 'Jovens', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.betel },
  { nome: 'Rafael Santos', nasc: '2002-02-28', turma: 'Jovens Unção', faixa: 'Jovens', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.betel },
  { nome: 'Isabela Martins', nasc: '2014-05-09', turma: 'Pré Adolescentes', faixa: 'Pré Adolescentes', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.betel },
  { nome: 'Wesley de Oliveira Dias', nasc: '1985-01-12', turma: 'Coordenação', faixa: 'Coordenação (sec./superintendentes)', tipo: 'Superintendente', sexo: 'Masculino', escolaId: E.betel },
  { nome: 'Thiago Moreira', nasc: '2010-09-25', turma: 'Adolescentes Luz', faixa: 'Adolescentes', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.siao },
  { nome: 'Camila Ferreira', nasc: '1995-12-03', turma: 'Discipulado 1', faixa: 'Discipulados', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.siao },
  { nome: 'Jardiel Rocha Silva', nasc: '1982-07-07', turma: 'Coordenação', faixa: 'Coordenação (sec./superintendentes)', tipo: 'Superintendente', sexo: 'Masculino', escolaId: E.siao },
  { nome: 'Patrícia Gomes', nasc: '1990-04-18', turma: 'Mulheres De Fé', faixa: 'Adultos', tipo: 'Professor', sexo: 'Feminino', escolaId: E.getsemani },
  { nome: 'Enzo Gabriel', nasc: '2017-08-20', turma: 'Primários B', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.getsemani },
  { nome: 'Sofia Almeida', nasc: '2015-01-15', turma: 'Juniores 2', faixa: 'Juniores', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.getsemani },
  { nome: 'Silviane Melo', nasc: '1987-11-29', turma: 'Coordenação', faixa: 'Coordenação (sec./superintendentes)', tipo: 'Secretário', sexo: 'Feminino', escolaId: E.getsemani },
  { nome: 'André Luiz Barbosa', nasc: '1976-03-04', turma: 'Adultos Central', faixa: 'Adultos', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.peniel },
  { nome: 'Letícia Ramos', nasc: '2005-06-13', turma: 'Juvenis Vida', faixa: 'Juvenis', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.peniel },
  { nome: 'Davi Nascimento', nasc: '2019-10-01', turma: 'Jardim II', faixa: 'Jardim de Infância', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.betania },
  { nome: 'Ana Paula Santos', nasc: '1984-09-23', turma: 'Coordenação', faixa: 'Coordenação (sec./superintendentes)', tipo: 'Superintendente', sexo: 'Feminino', escolaId: E.betania },
  { nome: 'Gustavo Henrique', nasc: '2001-12-19', turma: 'Jovens Unção', faixa: 'Jovens', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.ebenezer },
  { nome: 'Roberto Carlos Lima', nasc: '1974-05-02', turma: 'Coordenação', faixa: 'Coordenação (sec./superintendentes)', tipo: 'Superintendente', sexo: 'Masculino', escolaId: E.ebenezer },
  { nome: 'Quenaz Martins', nasc: '1980-08-14', turma: 'Coordenação', faixa: 'Coordenação (sec./superintendentes)', tipo: 'Superintendente', sexo: 'Masculino', escolaId: E.central },
  { nome: 'Zilmara Silva Leite Campelo', nasc: '1978-02-09', turma: 'Coordenação', faixa: 'Coordenação (sec./superintendentes)', tipo: 'Superintendente', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Marcos Antônio Pereira', nasc: '1981-11-11', turma: 'Coordenação', faixa: 'Coordenação (sec./superintendentes)', tipo: 'Superintendente', sexo: 'Masculino', escolaId: E.peniel },
  { nome: 'Juliana Costa Melo', nasc: '1992-07-27', turma: 'Discipulado 2', faixa: 'Discipulados', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.central },
  { nome: 'Felipe Azevedo', nasc: '2008-03-06', turma: 'Adolescentes Luz', faixa: 'Adolescentes', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.central },
  { nome: 'Beatriz Oliveira', nasc: '2013-04-21', turma: 'Pré Adolescentes', faixa: 'Pré Adolescentes', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.ebenezer },
  { nome: 'Ricardo Moura', nasc: '1969-01-30', turma: 'Homens de Valor', faixa: 'Adultos', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.central, status: 'Inativo' },
  { nome: 'Tainá Souza', nasc: '2006-08-08', turma: 'Juvenis Vida', faixa: 'Juvenis', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras, status: 'Inativo' },
  { nome: 'Arthur Lima', nasc: '2018-02-11', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Clara Souza', nasc: '2018-04-03', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Bernardo Dias', nasc: '2017-11-19', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Manuela Castro', nasc: '2018-06-08', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Heitor Barbosa', nasc: '2018-09-14', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Valentina Ribeiro', nasc: '2017-12-22', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Theo Martins', nasc: '2018-03-30', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Heloísa Pinto', nasc: '2018-07-05', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Lorenzo Alves', nasc: '2017-10-18', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Maria Clara Dias', nasc: '2018-01-09', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Samuel Rocha', nasc: '2018-05-27', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Alice Mendes', nasc: '2017-09-12', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Benício Costa', nasc: '2018-08-21', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Júlia Nunes', nasc: '2018-02-28', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Isaac Ferreira', nasc: '2017-11-07', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Melissa Campos', nasc: '2018-04-16', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Feminino', escolaId: E.oliveiras },
  { nome: 'Cauã Oliveira', nasc: '2018-06-25', turma: 'Primários A', faixa: 'Primários', tipo: 'Aluno', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Henrique Alves', nasc: '1986-03-12', turma: 'Adolescentes Luz', faixa: 'Adolescentes', tipo: 'Professor', sexo: 'Masculino', escolaId: E.central },
  { nome: 'Mateus Rocha', nasc: '1991-09-08', turma: 'Discipulado 2', faixa: 'Discipulados', tipo: 'Professor', sexo: 'Masculino', escolaId: E.central },
  { nome: 'Sara Lima', nasc: '1989-05-19', turma: 'Homens de Valor', faixa: 'Adultos', tipo: 'Professor', sexo: 'Feminino', escolaId: E.central },
  { nome: 'Silvio Costa', nasc: '1977-11-04', turma: 'Juvenis Vida', faixa: 'Juvenis', tipo: 'Professor', sexo: 'Masculino', escolaId: E.central },
  { nome: 'Marcos Vinícius Teixeira', nasc: '1984-02-16', turma: 'Elshaday', faixa: 'Adolescentes', tipo: 'Professor', sexo: 'Masculino', escolaId: E.oliveiras },
  { nome: 'Aline Ferreira Santos', nasc: '1993-07-22', turma: 'Primários A', faixa: 'Primários', tipo: 'Professor', sexo: 'Feminino', escolaId: E.oliveiras },
]

const pessoas: Pessoa[] = extra.map((row, i) =>
  p({
    id: `p${String(i + 1).padStart(3, '0')}`,
    nome: row.nome,
    dataNascimento: row.nasc,
    turma: row.turma,
    faixaEtaria: row.faixa,
    tipo: row.tipo,
    sexo: row.sexo,
    status: row.status ?? 'Ativo',
    escolaId: row.escolaId,
    telefone: row.telefone,
  }),
)

function rel(
  escolaId: string,
  data: string,
  nums: [number, number, number, number, number, number, number],
  finalizado: boolean,
): RelatorioDiario {
  const [matriculados, presentes, ausentes, visitantes, biblias, revistas, oferta] = nums
  return {
    id: `r_${escolaId}_${data}`,
    escolaId,
    data,
    matriculados,
    presentes,
    ausentes,
    visitantes,
    biblias,
    revistas,
    oferta,
    finalizado,
    alunos: [],
  }
}

const D = '2026-08-23'
const D2 = '2026-08-16'
const Q1 = '2026-03-29'
const Q2 = '2026-06-28'

const relatorios: RelatorioDiario[] = [
  rel(E.oliveiras, D, [99, 68, 31, 4, 52, 47, 252.2], true),
  rel(E.betel, D, [16, 12, 4, 1, 10, 9, 25], true),
  rel(E.siao, D, [42, 28, 14, 2, 22, 19, 32.5], true),
  rel(E.getsemani, D, [38, 26, 12, 3, 20, 18, 28], true),
  rel(E.peniel, D, [31, 21, 10, 2, 16, 14, 18.3], false),
  rel(E.betania, D, [28, 19, 9, 1, 15, 13, 15], true),
  rel(E.ebenezer, D, [35, 24, 11, 2, 18, 16, 22], true),
  rel(E.central, D, [39, 24, 15, 3, 19, 17, 22], false),
  rel(E.oliveiras, D2, [99, 71, 28, 5, 55, 49, 198.5], true),
  rel(E.betel, D2, [16, 14, 2, 0, 11, 10, 18], true),
  rel(E.siao, D2, [42, 30, 12, 3, 24, 21, 40], true),
  rel(E.getsemani, D2, [38, 29, 9, 2, 23, 20, 31], true),
  rel(E.peniel, D2, [31, 22, 9, 1, 17, 15, 20], true),
  rel(E.betania, D2, [28, 21, 7, 2, 16, 14, 19], true),
  rel(E.ebenezer, D2, [35, 27, 8, 1, 20, 18, 24], true),
  rel(E.central, D2, [39, 28, 11, 4, 22, 19, 27], true),
  rel(E.oliveiras, Q1, [99, 74, 25, 6, 58, 51, 210], true),
  rel(E.central, Q1, [39, 30, 9, 2, 24, 20, 35], true),
  rel(E.oliveiras, Q2, [99, 70, 29, 3, 54, 48, 188], true),
  rel(E.central, Q2, [39, 27, 12, 1, 21, 18, 29], true),
  rel(E.oliveiras, '2026-07-05', [99, 72, 27, 4, 53, 46, 175], true),
  rel(E.oliveiras, '2026-07-12', [99, 73, 26, 3, 54, 47, 182], true),
  rel(E.oliveiras, '2026-07-19', [99, 71, 28, 5, 52, 45, 190], true),
  rel(E.oliveiras, '2026-07-26', [99, 69, 30, 2, 50, 44, 168], true),
  rel(E.oliveiras, '2026-08-02', [99, 70, 29, 4, 51, 46, 177], true),
  rel(E.oliveiras, '2026-08-09', [99, 68, 31, 3, 49, 43, 171], true),
]

function hashN(text: string): number {
  return [...text].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
}

function comAlunos(lista: RelatorioDiario[]): RelatorioDiario[] {
  const helena = 'p008'
  const joao = 'p007'
  const presentesFixos = new Set(['p001', 'p003', 'p004'])
  return lista.map((r) => {
    const turma = pessoas.filter(
      (p) => p.escolaId === r.escolaId && p.status === 'Ativo' && p.tipo === 'Aluno',
    )
    if (!turma.length) return r
    return {
      ...r,
      alunos: turma.map((p) => {
        const row = chamadaVazia(p.id)
        let presente = presentesFixos.has(p.id) || hashN(p.id + r.data) % 5 !== 0
        if (p.id === helena) presente = false
        if (p.id === joao) presente = !['2026-07-26', '2026-08-16', '2026-08-23'].includes(r.data)
        row.presente = presente
        row.biblia = presente && hashN(p.id + r.data + 'b') % 3 !== 0
        row.revista = presente && hashN(p.id + r.data + 'r') % 3 !== 0
        row.ofertou = presente && hashN(p.id + r.data + 'o') % 3 !== 0
        row.participacao = presente && hashN(p.id + r.data + 'p') % 4 === 0
        return row
      }),
    }
  })
}

export const seedLegacy = { escolas, pessoas, relatorios: comAlunos(relatorios) }

export function createEmptyIgrejaState(nomeIgreja = 'Minha EBD'): AppState {
  const escolaId = 'sede'
  return hidratarEstado({
    escolas: [
      {
        id: escolaId,
        nome: nomeIgreja,
        setor: 'Sede',
        bairro: '',
        regional: '',
        responsavel: '',
        username: '',
        status: 'Ativa',
        ativos: 0,
        inativos: 0,
      },
    ],
    pessoas: [],
    turmas: [],
    usuarios: [],
    setores: [],
    relatorios: [],
    lancamentos: [],
    licoes: LICOES,
    eventos: eventosSeed(),
    avaliacoes: [],
    metas: metasSeed([escolaId]),
    avisos: AVISOS,
    desafios: DESAFIOS,
    certificados: [],
    modeloCertificado: undefined,
    licoesRemovidas: [],
    avaliacoesRemovidas: [],
    certificadosRemovidos: [],
    pessoasRemovidas: [],
    escolasRemovidas: [],
    turmasRemovidas: [],
    usuariosRemovidos: [],
    lancamentosRemovidos: [],
    avisosRemovidos: [],
    eventosRemovidos: [],
    setoresRemovidos: [],
    cursosRemovidos: [],
    cursos: CURSOS,
    progressos: [],
    rankingCompetitivo: false,
    whatsapp: WHATSAPP_SUPORTE,
    sessaoId: null,
  })
}

export function createSeedState(): AppState {
  const s = createEmptyIgrejaState('EDB Total')
  return {
    ...s,
    usuarios: [{ id: 'u-master', nome: 'Itano', username: 'itano', senha: 'Itano1809@', papel: 'admin' }],
  }
}

