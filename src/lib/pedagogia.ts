import { catalogoDeLicao, deduplicarLicoes, ehLicaoGeral } from './acompanhamento'
import { MODELO_CERTIFICADO_PADRAO } from './certificado'
import type { AppState, Aviso, Certificado, CursoProfessor, Desafio, EventoCalendario, Licao, MetaEscola, TipoEvento } from './types'
import { toISODate } from './utils'

export const ROTULO_EVENTO: Record<TipoEvento, string> = {
  licao: 'Lição',
  congresso: 'Congresso',
  culto: 'Culto',
  feriado: 'Feriado',
  reuniao: 'Reunião',
  capacitacao: 'Capacitação',
  ebf: 'Escola Bíblica de Férias',
  encerramento: 'Encerramento',
}

export const ANOS_AULAS = [2026, 2027, 2028]

export function nomeAulaPadrao(tri: number, numero: number): string {
  return `${tri} tri aula ${numero}`
}

export function trimestreDe(d: Date): number {
  return Math.floor(d.getMonth() / 3) + 1
}

function licaoBase(partial: Partial<Licao> & Pick<Licao, 'id' | 'ano' | 'trimestre' | 'numero' | 'tema'>): Licao {
  return {
    textoBiblico: '',
    versiculo: '',
    objetivos: [],
    resumo: '',
    perguntas: [],
    dinamica: '',
    aplicacao: '',
    atividade: '',
    complementar: '',
    ...partial,
  }
}

const CONTEUDO_Q3_2026: Omit<Licao, 'id' | 'ano' | 'trimestre' | 'numero' | 'tema'>[] = [
  {
    textoBiblico: 'Atos 1.1-11',
    versiculo: 'Atos 1.8',
    objetivos: ['Compreender o chamado a testemunhar', 'Valorizar a obra do Espírito', 'Comprometer-se com a EBD'],
    resumo: 'Jesus comissiona a igreja a ser testemunha em Jerusalém, Judeia, Samaria e até os confins da terra.',
    perguntas: ['O que significa ser testemunha?', 'Qual o papel do Espírito Santo na missão?', 'Onde é o “confins da terra” da sua turma?'],
    dinamica: 'Mapa da cidade: cada aluno marca um lugar onde pode testemunhar esta semana.',
    aplicacao: 'Escolha uma pessoa para orar e convidar para a próxima aula.',
    atividade: 'Escrever um convite simples para um amigo vir à EBD.',
    complementar: 'Hino de missões e mapa-múndi impresso.',
  },
  {
    textoBiblico: 'Atos 2.42-47',
    versiculo: 'Atos 2.42',
    objetivos: ['Identificar as marcas da igreja primitiva', 'Praticar comunhão e ensino', 'Servir com generosidade'],
    resumo: 'A comunidade perseverava na doutrina, comunhão, partir do pão e orações, e o Senhor acrescentava os que eram salvos.',
    perguntas: ['Quais eram as quatro práticas de Atos 2.42?', 'Como a generosidade aparecia?', 'O que falta na nossa turma?'],
    dinamica: 'Círculo de oração: cada um ora em uma frase pelo da direita.',
    aplicacao: 'Leve um versículo memorizado na próxima semana.',
    atividade: 'Montar um cartaz com as quatro marcas da igreja.',
    complementar: 'Revista do trimestre e Bíblia de estudo.',
  },
  {
    textoBiblico: 'Atos 10',
    versiculo: 'Atos 10.34-35',
    objetivos: ['Perceber que o evangelho é para todos', 'Combater preconceitos', 'Acolher o visitante'],
    resumo: 'Pedro aprende, na casa de Cornélio, que Deus não faz acepção de pessoas.',
    perguntas: ['Por que Pedro hesitou?', 'O que a visão do lençol ensina?', 'Quem estamos deixando de fora?'],
    dinamica: 'Cadeiras da acolhida: o visitante escolhe onde sentar e a turma o apresenta.',
    aplicacao: 'Sente-se ao lado de alguém novo no próximo culto.',
    atividade: 'Lista de 3 pessoas para convidar neste mês.',
    complementar: 'Testemunho de um membro que veio como visitante.',
  },
  {
    textoBiblico: 'Atos 20.17-38',
    versiculo: 'Atos 20.24',
    objetivos: ['Valorizar o ministério fiel', 'Cuidar do rebanho', 'Terminar a carreira com alegria'],
    resumo: 'Paulo se despede dos presbíteros de Éfeso, lembrando que não recuou de anunciar todo o desígnio de Deus e que o rebanho precisa ser guardado.',
    perguntas: ['O que Paulo considerava mais importante que a própria vida?', 'Qual o alerta sobre lobos vorazes?', 'Como a turma pode cuidar uns dos outros?'],
    dinamica: 'Cartas de despedida: cada aluno escreve um conselho espiritual para um colega.',
    aplicacao: 'Ore por um líder da igreja nesta semana e envie uma mensagem de ânimo.',
    atividade: 'Resumir Atos 20.24 em uma frase e ilustrar.',
    complementar: 'Mapa das viagens de Paulo e trecho em áudio de Atos 20.',
  },
]

export function gerarAulasDomingo(anos: number[] = ANOS_AULAS): { licoes: Licao[]; eventos: EventoCalendario[] } {
  const licoes: Licao[] = []
  const eventos: EventoCalendario[] = []
  for (const ano of anos) {
    const d = new Date(ano, 0, 1)
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1)
    const contagem = [0, 0, 0, 0, 0]
    while (d.getFullYear() === ano) {
      const iso = toISODate(d)
      const tri = trimestreDe(d)
      contagem[tri] += 1
      const numero = contagem[tri]
      const id = `lic-${ano}-t${tri}-a${numero}`
      const extra = ano === 2026 && tri === 3 && numero <= 4 ? CONTEUDO_Q3_2026[numero - 1] : undefined
      licoes.push(
        licaoBase({
          id,
          ano,
          trimestre: tri,
          numero,
          tema: nomeAulaPadrao(tri, numero),
          ...extra,
        }),
      )
      eventos.push({
        id: `ev-lic-${ano}-${iso}`,
        data: iso,
        tipo: 'licao',
        titulo: nomeAulaPadrao(tri, numero),
        descricao: `${tri}º trimestre ${ano}`,
        licaoId: id,
      })
      d.setDate(d.getDate() + 7)
    }
  }
  return { licoes, eventos }
}

const CATALOGO = gerarAulasDomingo()
export const LICOES: Licao[] = CATALOGO.licoes

const EVENTOS_EXTRAS: EventoCalendario[] = [
  { id: 'ev13', data: '2026-09-07', tipo: 'congresso', titulo: 'Congresso de jovens', descricao: 'Sábado — IADESL 35 Central' },
  { id: 'ev14', data: '2026-09-14', tipo: 'culto', titulo: 'Culto de missões', descricao: 'Oferta missionária da EBD' },
  { id: 'ev15', data: '2026-09-21', tipo: 'capacitacao', titulo: 'Capacitação de professores', descricao: 'Escola de Professores — módulo 1' },
  { id: 'ev16', data: '2026-09-28', tipo: 'encerramento', titulo: 'Encerramento do trimestre', descricao: 'Apresentação das turmas' },
  { id: 'ev17', data: '2026-07-09', tipo: 'feriado', titulo: 'Feriado municipal', descricao: 'Sem aula extra' },
  { id: 'ev18', data: '2026-07-20', tipo: 'reuniao', titulo: 'Reunião de superintendentes', descricao: 'Metas do 3º trimestre' },
  { id: 'ev19', data: '2026-07-15', tipo: 'ebf', titulo: 'Escola Bíblica de Férias', descricao: 'Manhãs de quarta a sexta' },
]

export function eventosSeed(): EventoCalendario[] {
  return [...CATALOGO.eventos, ...EVENTOS_EXTRAS]
}

const IDS_SEED_ANTIGA = new Set(['lic-2026-3-1', 'lic-2026-3-2', 'lic-2026-3-3', 'lic-2026-3-4'])

export function hidratarLicoes(state: AppState): AppState {
  const gerado = gerarAulasDomingo()
  const removidas = new Set(state.licoesRemovidas ?? [])
  const byId = new Map<string, Licao>()
  for (const l of gerado.licoes) {
    if (!removidas.has(l.id)) byId.set(l.id, l)
  }
  for (const l of state.licoes ?? []) {
    if (removidas.has(l.id)) continue
    if (IDS_SEED_ANTIGA.has(l.id)) continue
    const atual = byId.get(l.id)
    byId.set(l.id, atual ? { ...atual, ...l, tema: l.tema || atual.tema } : l)
  }
  const referidas = new Set(
    (state.eventos ?? []).map((e) => e.licaoId).filter((id): id is string => Boolean(id)),
  )
  for (const l of state.licoes ?? []) {
    if (IDS_SEED_ANTIGA.has(l.id) && referidas.has(l.id) && !removidas.has(l.id)) {
      byId.set(l.id, l)
    }
  }

  const { licoes: unicas, extras } = deduplicarLicoes([...byId.values()])
  const licoes = unicas.sort((a, b) => a.ano - b.ano || a.trimestre - b.trimestre || a.numero - b.numero)
  for (const id of extras) removidas.add(id)
  const geradoPorData = new Map(gerado.eventos.map((e) => [e.data, e]))
  const eventos = (state.eventos ?? []).map((e) => {
    if (!/^ev\d+$/.test(e.id) || e.tipo !== 'licao') {
      if (!e.licaoId) return e
      const apontada = licoes.find((l) => l.id === e.licaoId)
      if (apontada && !ehLicaoGeral(apontada)) {
        const cat = catalogoDeLicao(licoes, apontada)
        return { ...e, licaoId: cat.id }
      }
      return e
    }
    const ger = geradoPorData.get(e.data)
    return ger && !removidas.has(ger.licaoId ?? '') ? ger : e
  })
  const datasLicao = new Set(eventos.filter((e) => e.tipo === 'licao').map((e) => e.data))
  for (const ev of gerado.eventos) {
    if (removidas.has(ev.licaoId ?? '')) continue
    if (datasLicao.has(ev.data)) continue
    eventos.push(ev)
    datasLicao.add(ev.data)
  }
  return { ...state, licoes, eventos, licoesRemovidas: [...removidas] }
}

export function hidratarEstado(state: AppState): AppState {
  const next = hidratarLicoes({
    ...state,
    escolas: state.escolas ?? [],
    pessoas: state.pessoas ?? [],
    turmas: state.turmas ?? [],
    usuarios: state.usuarios ?? [],
    setores: state.setores ?? [],
    relatorios: state.relatorios ?? [],
    lancamentos: state.lancamentos ?? [],
    licoes: state.licoes ?? [],
    eventos: state.eventos ?? [],
    avaliacoes: state.avaliacoes ?? [],
    metas: state.metas ?? [],
    avisos: state.avisos ?? [],
    desafios: state.desafios ?? [],
    certificados: state.certificados ?? [],
    cursos: state.cursos ?? [],
    progressos: state.progressos ?? [],
    licoesRemovidas: state.licoesRemovidas ?? [],
    avaliacoesRemovidas: state.avaliacoesRemovidas ?? [],
    certificadosRemovidos: state.certificadosRemovidos ?? [],
    modeloCertificado: state.modeloCertificado?.texto ? { ...MODELO_CERTIFICADO_PADRAO, ...state.modeloCertificado } : MODELO_CERTIFICADO_PADRAO,
  })
  const avRem = new Set(next.avaliacoesRemovidas ?? [])
  const certRem = new Set(next.certificadosRemovidos ?? [])
  return {
    ...next,
    avaliacoes: next.avaliacoes.filter((a) => !avRem.has(a.id)),
    certificados: next.certificados.filter((c) => !certRem.has(c.id)),
  }
}

export function catalogoCresceu(antes: AppState, depois: AppState): boolean {
  return (
    depois.licoes.length !== (antes.licoes?.length ?? 0) ||
    depois.eventos.length > (antes.eventos?.length ?? 0) ||
    (depois.licoesRemovidas?.length ?? 0) > (antes.licoesRemovidas?.length ?? 0) ||
    !antes.modeloCertificado?.texto
  )
}

export function rotuloLicao(l: Licao, data?: string): string {
  return data ? `${l.tema} · ${data}` : l.tema
}

export function metasSeed(escolaIds: string[]): MetaEscola[] {
  return escolaIds.map((escolaId) => ({
    escolaId,
    frequencia: 80,
    crescimento: 10,
    visitantesMes: 20,
    professoresCapacitados: 100,
  }))
}

export const AVISOS: Aviso[] = []

export const DESAFIOS: Desafio[] = [
  { id: 'dz1', titulo: '7 dias de Atos', descricao: 'Leia um capítulo de Atos por dia nesta semana.', ativo: true },
  { id: 'dz2', titulo: 'Convide alguém', descricao: 'Traga um visitante até o fim do mês.', ativo: true },
]

export function certificadosSeed(): Certificado[] {
  return []
}

export const CURSOS: CursoProfessor[] = [
  {
    id: 'curso1',
    titulo: 'Como preparar uma aula',
    descricao: 'Do texto bíblico ao encerramento em 40 minutos.',
    duracao: '25 min',
    aulas: [
      { titulo: 'Orar e ler o texto', conteudo: 'Leia a lição e o texto bíblico duas vezes antes de montar o plano.' },
      { titulo: 'Objetivo único', conteudo: 'Defina uma frase: “Ao sair, o aluno deverá…”' },
      { titulo: 'Gancho, ensino, aplicação', conteudo: '10 min gancho, 20 min ensino, 10 min aplicação e oração.' },
    ],
  },
  {
    id: 'curso2',
    titulo: 'Hermenêutica básica',
    descricao: 'Contexto, texto e aplicação sem forçar o sentido.',
    duracao: '30 min',
    aulas: [
      { titulo: 'Contexto', conteudo: 'Quem escreveu, para quem e por quê.' },
      { titulo: 'Texto', conteudo: 'O que o texto diz — não o que queremos que diga.' },
      { titulo: 'Cristo e a vida', conteudo: 'Toda lição aponta para o evangelho e para a obediência.' },
    ],
  },
  {
    id: 'curso3',
    titulo: 'Como trabalhar com adolescentes',
    descricao: 'Linguagem, limites e pertencimento.',
    duracao: '20 min',
    aulas: [
      { titulo: 'Pertencer antes de aprender', conteudo: 'Chame pelo nome e dê voz na aula.' },
      { titulo: 'Perguntas reais', conteudo: 'Troque o “certo/errado” por dilemas da semana deles.' },
    ],
  },
  {
    id: 'curso4',
    titulo: 'Como ensinar crianças',
    descricao: 'Movimento, repetição e história.',
    duracao: '20 min',
    aulas: [
      { titulo: 'Menos fala, mais ação', conteudo: 'Alterne 5 minutos de fala com atividade.' },
      { titulo: 'Um versículo', conteudo: 'Repita o versículo com gesto e música.' },
    ],
  },
  {
    id: 'curso5',
    titulo: 'Como fazer perguntas',
    descricao: 'Perguntas que abrem a Bíblia, não só a opinião.',
    duracao: '15 min',
    aulas: [
      { titulo: 'Observação, interpretação, aplicação', conteudo: 'O que o texto diz? O que significa? O que faremos?' },
    ],
  },
  {
    id: 'curso6',
    titulo: 'Recursos visuais',
    descricao: 'Quadro, objeto e imagem a serviço da lição.',
    duracao: '15 min',
    aulas: [
      { titulo: 'Um objeto, uma verdade', conteudo: 'Leve um item que ilustra o tema e não dispute atenção com o texto.' },
    ],
  },
  {
    id: 'curso7',
    titulo: 'Alunos difíceis',
    descricao: 'Limite com afeto e parceria com a família.',
    duracao: '20 min',
    aulas: [
      { titulo: 'Antes da aula', conteudo: 'Combine regras em 3 frases positivas.' },
      { titulo: 'Durante', conteudo: 'Aproxime-se, não exponha o aluno. Fale depois da aula com o responsável.' },
    ],
  },
  {
    id: 'curso8',
    titulo: 'Como avaliar aprendizagem',
    descricao: 'Miniavaliação sem constranger.',
    duracao: '15 min',
    aulas: [
      { titulo: 'Uma pergunta-chave', conteudo: 'Se 80% acertam o conceito principal, a aula cumpriu o objetivo.' },
    ],
  },
]
