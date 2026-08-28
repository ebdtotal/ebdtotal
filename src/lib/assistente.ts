import type { Licao } from './types'

export function assistentePedagogico(pedido: string, licao: Licao, faixa = 'Adolescentes'): string {
  const p = pedido.toLowerCase()
  if (p.includes('dinâmica') || p.includes('dinamica')) {
    return [
      `Dinâmica para ${faixa} — ${licao.tema}`,
      ``,
      `Base bíblica: ${licao.textoBiblico}`,
      ``,
      licao.dinamica,
      ``,
      `Variação para a turma:`,
      `1. Divida a classe em duplas e peça que expliquem o versículo ${licao.versiculo} com as próprias palavras.`,
      `2. Cada dupla apresenta uma aplicação prática do tema “${licao.tema}”.`,
      `3. Feche orando pelos pontos de aplicação.`,
      ``,
      `Tempo sugerido: 12 a 15 minutos.`,
    ].join('\n')
  }
  if (p.includes('pergunta') || p.includes('revis')) {
    const extra = [
      `O que o texto de ${licao.textoBiblico} ensina sobre o tema “${licao.tema}”?`,
      `Como o versículo ${licao.versiculo} se aplica à sua semana?`,
      `Qual objetivo da lição você já viveu na prática?`,
      `O que mudaria na sua vida se esta verdade fosse levada a sério?`,
      `Como você explicaria esta lição a um amigo que não veio hoje?`,
    ]
    return [`10 perguntas de revisão — Lição ${licao.numero}: ${licao.tema}`, '', ...[...licao.perguntas, ...extra].slice(0, 10).map((q, i) => `${i + 1}. ${q}`)].join('\n')
  }
  if (p.includes('crianç') || p.includes('8 ano') || p.includes('8 anos') || p.includes('infantil')) {
    return [
      `Explicação para crianças (~8 anos)`,
      ``,
      `Hoje vamos falar de: ${licao.tema}.`,
      `A Bíblia conta isso em ${licao.textoBiblico}.`,
      ``,
      `Em palavras simples: ${licao.resumo}`,
      ``,
      `Versículo para lembrar: ${licao.versiculo}`,
      ``,
      `Atividade: ${licao.atividade}`,
      ``,
      `Peça que cada criança desenhe uma coisa que aprendeu e conte para a turma.`,
    ].join('\n')
  }
  if (p.includes('15 minuto') || p.includes('atividade')) {
    return [
      `Atividade de 15 minutos — ${licao.tema}`,
      ``,
      `0–3 min: leia ${licao.textoBiblico} e o versículo ${licao.versiculo}.`,
      `3–8 min: ${licao.atividade}`,
      `8–12 min: discussão com a pergunta: “${licao.perguntas[0] ?? 'O que Deus quer que façamos com esta lição?'}”`,
      `12–15 min: ${licao.aplicacao}`,
    ].join('\n')
  }
  return [
    `Plano de aula — ${licao.ano}.${licao.trimestre} Lição ${licao.numero}`,
    `Tema: ${licao.tema}`,
    `Texto: ${licao.textoBiblico}`,
    ``,
    `Objetivos:`,
    ...licao.objetivos.map((o) => `• ${o}`),
    ``,
    `Resumo: ${licao.resumo}`,
    ``,
    `Dinâmica: ${licao.dinamica}`,
    ``,
    `Aplicação: ${licao.aplicacao}`,
    ``,
    `Material: ${licao.complementar}`,
    ``,
    `Pedido do professor: ${pedido}`,
  ].join('\n')
}
