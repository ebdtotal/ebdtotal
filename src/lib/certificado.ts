import type { AppState, Certificado, ModeloCertificado, Pessoa } from './types'
import { formatDateBR } from './utils'

export const MODELO_CERTIFICADO_PADRAO: ModeloCertificado = {
  titulo: 'CERTIFICADO',
  subtitulo: 'Escola Bíblica Dominical',
  texto:
    'Certificamos que {{nome}} concluiu o curso {{curso}} na {{igreja}}, com carga horária de {{carga}}, em {{data}}.',
  assinatura1: 'Superintendente',
  cargo1: 'Superintendência da EBD',
  assinatura2: 'Professor(a)',
  cargo2: 'Classe',
}

export function modeloCertificadoDe(state: AppState): ModeloCertificado {
  const m = state.modeloCertificado
  if (!m?.texto) return MODELO_CERTIFICADO_PADRAO
  return { ...MODELO_CERTIFICADO_PADRAO, ...m }
}

export function dadosCertificado(
  state: AppState,
  cert: Certificado,
  pessoa: Pessoa | undefined,
): Record<string, string> {
  const igreja =
    state.escolas.find((e) => e.id === pessoa?.escolaId)?.nome ?? state.escolas[0]?.nome ?? 'EBD'
  return {
    nome: pessoa?.nome ?? 'Aluno',
    curso: cert.curso || cert.titulo,
    titulo: cert.titulo,
    data: formatDateBR(cert.data),
    igreja,
    carga: cert.carga || '1 trimestre',
    turma: pessoa?.turma ?? '',
  }
}

export function aplicarModelo(modelo: ModeloCertificado, dados: Record<string, string>): string {
  return modelo.texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, chave: string) => dados[chave] ?? '')
}

export function baixarCertificadoPdf(state: AppState, cert: Certificado, pessoa: Pessoa | undefined) {
  const modelo = modeloCertificadoDe(state)
  const dados = dadosCertificado(state, cert, pessoa)
    const corpo = aplicarModelo(modelo, dados)
    const nome = escapeHtml(dados.nome)
    const corpoHtml = escapeHtml(corpo).replaceAll(nome, `<span class="nome">${nome}</span>`)
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(cert.titulo)} — ${escapeHtml(dados.nome)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body { font-family: Georgia, "Times New Roman", serif; background: #fff; color: #152238; }
  .folha {
    min-height: 100%;
    border: 10px solid #152238;
    outline: 2px solid #c9a227;
    outline-offset: -18px;
    padding: 36px 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
  }
  .kicker { letter-spacing: .35em; font-size: 12px; color: #c9a227; text-transform: uppercase; font-family: Arial, sans-serif; }
  h1 { margin: 12px 0 6px; font-size: 42px; letter-spacing: .12em; }
  h2 { margin: 0; font-size: 18px; font-weight: normal; color: #445; }
  .corpo { max-width: 820px; font-size: 20px; line-height: 1.55; margin: 28px 0; }
  .nome { font-weight: bold; font-size: 26px; }
  .assinaturas { display: flex; gap: 80px; justify-content: center; width: 100%; margin-top: 12px; }
  .ass { width: 260px; }
  .linha { border-top: 1px solid #152238; margin-bottom: 8px; }
  .cargo { font-size: 12px; color: #667; font-family: Arial, sans-serif; }
  .rodape { font-size: 11px; color: #889; font-family: Arial, sans-serif; letter-spacing: .08em; }
  @media print { .folha { min-height: auto; height: 100%; } }
</style>
</head>
<body>
  <div class="folha">
    <div>
      <div class="kicker">${escapeHtml(modelo.subtitulo)}</div>
      <h1>${escapeHtml(modelo.titulo)}</h1>
      <h2>${escapeHtml(dados.igreja)}</h2>
    </div>
    <p class="corpo">${corpoHtml}</p>
    <div>
      <div class="assinaturas">
        <div class="ass"><div class="linha"></div><div>${escapeHtml(modelo.assinatura1)}</div><div class="cargo">${escapeHtml(modelo.cargo1)}</div></div>
        <div class="ass"><div class="linha"></div><div>${escapeHtml(modelo.assinatura2)}</div><div class="cargo">${escapeHtml(modelo.cargo2)}</div></div>
      </div>
      <p class="rodape">EDB Total · ${escapeHtml(dados.data)}</p>
    </div>
  </div>
  <script>window.onload = function () { window.focus(); window.print(); }<\/script>
</body>
</html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
