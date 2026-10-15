import { Download, FileText, Plus, Pencil, Trash2, UserRoundSearch, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, GhostButton, Modal, PrimaryButton, DateInput, Confirmacao, inputClass } from '../components/ui'
import { ImportacaoExcel } from '../components/ImportacaoExcel'
import { TelaImpressao } from '../components/TelaImpressao'
import { casarOpcao, celula, exportToExcel, lerPlanilha, normalizarChave } from '../lib/excel'
import { htmlListaPdf, tentarImprimirHtml } from '../lib/imprimir'
import { ehLoginAutomatico, sugestaoUsername, useStore } from '../lib/store'
import {
  FAIXAS_ETARIAS,
  SEXOS,
  STATUS_PESSOA,
  TIPOS_PESSOA,
  ESTADOS_CIVIS,
  ESCOLARIDADES,
  TIPOS_SANGUINEOS,
  UFS,
  type FaixaEtaria,
  type Pessoa,
  type Sexo,
  type StatusPessoa,
  type TipoPessoa,
} from '../lib/types'
import { formatDateBR, maskCpf, maskWhatsApp, matches, pad2, parseDateBR, senhaGerada, uid, duplicataCadastro, textoDuplicata } from '../lib/utils'

const emptyForm = (escolaId: string): Pessoa => ({
  id: uid('p'),
  nome: '',
  dataNascimento: '',
  turma: '',
  faixaEtaria: 'Adultos',
  tipo: 'Aluno',
  sexo: 'Feminino',
  status: 'Ativo',
  escolaId,
  telefone: '',
  email: '',
  cpf: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  responsaveis: '',
  contato: '',
  tipoSanguineo: '',
  dataMatricula: '',
  estadoCivil: '',
  escolaridade: '',
})

function papelDoTipo(tipo: TipoPessoa) {
  if (tipo === 'Aluno') return 'aluno' as const
  if (tipo === 'Professor') return 'professor' as const
  if (tipo === 'Superintendente') return 'superintendente' as const
  if (tipo === 'Secretário') return 'secretario' as const
  return null
}

function precisaAcessoApp(tipo: TipoPessoa) {
  return tipo === 'Aluno' || tipo === 'Professor' || tipo === 'Superintendente' || tipo === 'Secretário'
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function partesNascimento(valor: string): { ano: number; mes: number; dia: number } | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor.trim())
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim())
  const ano = iso ? Number(iso[1]) : br ? Number(br[3]) : 0
  const mes = iso ? Number(iso[2]) : br ? Number(br[2]) : 0
  const dia = iso ? Number(iso[3]) : br ? Number(br[1]) : 0
  if (!ano || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  return { ano, mes, dia }
}

function listaOpcional<T extends string>(valor: string, opcoes: readonly T[]): T | '' {
  const n = normalizarChave(valor)
  if (!n) return ''
  return opcoes.find((o) => normalizarChave(o) === n) ?? opcoes.find((o) => normalizarChave(o).includes(n) || n.includes(normalizarChave(o))) ?? ''
}

export function CadastrosPage() {
  const { state, escolasVisiveis, pessoasVisiveis, savePessoa, importarPessoas, removePessoa, usuario, ehProfessor, limitePessoas } = useStore()
  const podeCadastrar =
    usuario?.papel === 'admin' || usuario?.papel === 'sede' || usuario?.papel === 'superintendente'
  const ehSecretario = usuario?.papel === 'escola' || usuario?.papel === 'secretario'
  const podeAlunos = podeCadastrar || ehSecretario
  const [filtros, setFiltros] = useState({
    regional: '',
    congregacao: '',
    nome: '',
    nascimento: '',
    turma: '',
    faixa: '',
    tipo: '',
    sexo: '',
    status: '',
  })
  const [aplicados, setAplicados] = useState(filtros)
  const [buscaTabela, setBuscaTabela] = useState('')
  const [editing, setEditing] = useState<Pessoa | null>(null)
  const [acessoSalvo, setAcessoSalvo] = useState<{
    nome: string
    username: string
    senha: string
    pessoaId: string
    tipo: TipoPessoa
  } | null>(null)
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)
  const [excluirPessoa, setExcluirPessoa] = useState<Pessoa | null>(null)
  const [erroLimite, setErroLimite] = useState<string | null>(null)
  const [aba, setAba] = useState<'lista' | 'aniversariantes'>('lista')
  const noLimite = state.pessoas.length >= limitePessoas
  const vagas = Math.max(0, limitePessoas - state.pessoas.length)

  useEffect(() => {
    if (!acessoSalvo) return
    const u = state.usuarios.find((x) => x.pessoaId === acessoSalvo.pessoaId)
    if (!u) return
    const senha = u.senha && !u.senha.startsWith('$2') ? u.senha : acessoSalvo.senha
    if (u.username === acessoSalvo.username && senha === acessoSalvo.senha) return
    setAcessoSalvo({ ...acessoSalvo, username: u.username, senha })
  }, [state.usuarios, acessoSalvo])

  const pessoas = useMemo(() => {
    const ids = new Set(escolasVisiveis.map((e) => e.id))
    return pessoasVisiveis.filter((p) => {
      if (!ids.has(p.escolaId)) return false
      const escola = state.escolas.find((e) => e.id === p.escolaId)
      if (aplicados.regional && !matches(escola?.regional ?? '', aplicados.regional)) return false
      if (aplicados.congregacao && !matches(escola?.nome ?? '', aplicados.congregacao)) return false
      if (aplicados.nome && !matches(p.nome, aplicados.nome)) return false
      if (aplicados.nascimento && p.dataNascimento !== aplicados.nascimento) return false
      if (aplicados.turma && !matches(p.turma, aplicados.turma)) return false
      if (aplicados.faixa && p.faixaEtaria !== aplicados.faixa) return false
      if (aplicados.tipo && p.tipo !== aplicados.tipo) return false
      if (aplicados.sexo && p.sexo !== aplicados.sexo) return false
      if (aplicados.status && p.status !== aplicados.status) return false
      return matches(`${p.nome} ${p.turma} ${p.faixaEtaria}`, buscaTabela)
    })
  }, [pessoasVisiveis, state.escolas, aplicados, buscaTabela])

  function limpar() {
    const z = { regional: '', congregacao: '', nome: '', nascimento: '', turma: '', faixa: '', tipo: '', sexo: '', status: '' }
    setFiltros(z)
    setAplicados(z)
  }

  function linhasExportacao() {
    return pessoas.map((p) => {
      const escola = state.escolas.find((e) => e.id === p.escolaId)
      return {
        Nome: p.nome,
        CPF: p.cpf ?? '',
        'Data de nascimento': formatDateBR(p.dataNascimento),
        Endereço: p.endereco ?? '',
        Nº: p.numero ?? '',
        Bairro: p.bairro ?? '',
        Cidade: p.cidade ?? '',
        Estado: p.estado ?? '',
        Responsáveis: p.responsaveis ?? '',
        Contato: p.contato ?? '',
        'Tipo sanguíneo': p.tipoSanguineo ?? '',
        'Data da matrícula': p.dataMatricula ? formatDateBR(p.dataMatricula) : '',
        'Estado civil': p.estadoCivil ?? '',
        Escolaridade: p.escolaridade ?? '',
        Turma: p.turma,
        'Faixa etária': p.faixaEtaria,
        Tipo: p.tipo,
        Sexo: p.sexo,
        Status: p.status,
        Congregação: escola?.nome ?? '',
        Regional: escola?.regional ?? '',
        WhatsApp: p.telefone ? maskWhatsApp(p.telefone) : '',
        'E-mail': p.email ?? '',
      }
    })
  }

  function exportar() {
    exportToExcel(ehProfessor ? 'turma-ebd' : 'cadastros-ebd', linhasExportacao())
  }

  function exportarPdf() {
    const rows = linhasExportacao()
    const colunas = ehProfessor
      ? ['Nome', 'Data de nascimento', 'Turma', 'Faixa etária', 'Sexo', 'Status']
      : ['Nome', 'Data de nascimento', 'Turma', 'Faixa etária', 'Tipo', 'Sexo', 'Status', 'Congregação']
    const linhas = rows.map((r) => colunas.map((c) => String(r[c as keyof typeof r] ?? '')))
    const html = htmlListaPdf(ehProfessor ? `Turma ${usuario?.turma ?? ''}`.trim() : 'Cadastros da EBD', colunas, linhas)
    if (!tentarImprimirHtml(html)) setPreviewPdf(html)
  }

  const COLUNAS_MODELO = [
    'Nome',
    'CPF',
    'Data de nascimento',
    'Endereço',
    'Nº',
    'Bairro',
    'Cidade',
    'Estado',
    'Responsáveis',
    'Contato',
    'Tipo sanguíneo',
    'Data da matrícula',
    'Estado civil',
    'Escolaridade',
    'Turma',
    'Faixa etária',
    'Tipo',
    'Sexo',
    'Status',
    'Congregação',
    'WhatsApp',
    'E-mail',
    'Login',
    'Senha',
  ]

  async function importarArquivo(file: File) {
    const rows = await lerPlanilha(file)
    const itens: { pessoa: Pessoa; acesso?: { username: string; senha: string; email?: string } | null }[] = []
    const erros: string[] = []
    let usuarios = [...state.usuarios]
    rows.forEach((row, i) => {
      const linha = i + 2
      const nome = celula(row, 'nome')
      if (!nome || /^ex\.?:/i.test(nome)) return
      const congregacao = celula(row, 'congregacao', 'igreja', 'escola')
      const escola =
        escolasVisiveis.find((e) => matches(e.nome, congregacao)) ??
        (congregacao ? undefined : escolasVisiveis[0])
      if (!escola) {
        erros.push(`Linha ${linha}: congregação "${congregacao || '(vazia)'}" não encontrada`)
        return
      }
      const tipoInformado = casarOpcao(celula(row, 'tipo'), TIPOS_PESSOA, 'Aluno')
      const tipo = tipoInformado
      const sexo = casarOpcao(celula(row, 'sexo'), SEXOS, 'Feminino')
      const status = casarOpcao(celula(row, 'status'), STATUS_PESSOA, 'Ativo')
      const faixa = casarOpcao(celula(row, 'faixaetaria', 'faixa'), FAIXAS_ETARIAS, 'Adultos')
      const nascRaw = celula(row, 'datadenascimento', 'nascimento', 'data')
      const dataNascimento = nascRaw ? parseDateBR(nascRaw) ?? nascRaw : ''
      const matRaw = celula(row, 'datadamatrícula', 'datadamatricula', 'matricula')
      const dataMatricula = matRaw ? parseDateBR(matRaw) ?? matRaw : ''
      const uf = listaOpcional(celula(row, 'estado', 'uf'), UFS)
      const pessoa: Pessoa = {
        id: uid('p'),
        nome,
        dataNascimento,
        turma: celula(row, 'turma'),
        faixaEtaria: faixa,
        tipo,
        sexo,
        status,
        escolaId: escola.id,
        telefone: maskWhatsApp(celula(row, 'whatsapp', 'telefone')),
        email: celula(row, 'email', 'e-mail').toLowerCase(),
        cpf: maskCpf(celula(row, 'cpf')),
        endereco: celula(row, 'endereco', 'endereço'),
        numero: celula(row, 'n', 'numero', 'número', 'nº'),
        bairro: celula(row, 'bairro'),
        cidade: celula(row, 'cidade'),
        estado: uf,
        responsaveis: celula(row, 'responsaveis', 'responsáveis'),
        contato: celula(row, 'contato'),
        tipoSanguineo: (TIPOS_SANGUINEOS as readonly string[]).includes(celula(row, 'tiposanguineo', 'tipo sanguíneo').trim().toUpperCase())
          ? celula(row, 'tiposanguineo', 'tipo sanguíneo').trim().toUpperCase()
          : '',
        dataMatricula,
        estadoCivil: listaOpcional(celula(row, 'estadocivil'), ESTADOS_CIVIS),
        escolaridade: listaOpcional(celula(row, 'escolaridade'), ESCOLARIDADES),
      }
      const duplicata = duplicataCadastro(
        [...state.pessoas, ...itens.map((item) => item.pessoa)],
        pessoa,
      )
      if (duplicata) {
        erros.push(`Linha ${linha}: ${textoDuplicata(duplicata.pessoa.nome, duplicata.motivo)}`)
        return
      }
      const papel = papelDoTipo(tipo)
      let acesso: { username: string; senha: string; email?: string } | null = null
      if (papel && status === 'Ativo') {
        const username = (celula(row, 'login', 'usuario', 'username') || sugestaoUsername(nome, usuarios)).toLowerCase()
        const senha = celula(row, 'senha') || senhaGerada()
        acesso = { username, senha, email: pessoa.email }
        usuarios = [
          ...usuarios,
          { id: uid('u'), nome, username, senha, papel, pessoaId: pessoa.id, escolaId: escola.id, turma: pessoa.turma, email: pessoa.email },
        ]
      }
      itens.push({ pessoa, acesso })
    })
    if (itens.length > vagas) {
      erros.push(`O plano permite ${limitePessoas} cadastros. Só restam ${vagas} vagas — importamos até esse limite.`)
      itens.splice(vagas)
    }
    importarPessoas(itens)
    return { ok: itens.length, erros }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{ehProfessor ? 'Turma' : 'Cadastros'}</h1>
          <p className="text-sm text-muted">
            {ehProfessor
              ? 'Alunos da sua turma. Somente o master e o superintendente cadastram.'
              : podeCadastrar
                ? `Lista de registros e suas respectivas congregações. ${state.pessoas.length} de ${limitePessoas} cadastros.`
                : podeAlunos
                  ? `Lista de registros da congregação. O secretário inclui e edita cadastros. ${state.pessoas.length} de ${limitePessoas} cadastros.`
                  : 'Lista de registros da congregação. Somente o master e o superintendente cadastram.'}
          </p>
          {erroLimite ? <p className="mt-1 text-sm text-red-600">{erroLimite}</p> : null}
        </div>
        {aba === 'lista' && podeAlunos ? (
          <PrimaryButton
            disabled={noLimite}
            onClick={() => {
              if (noLimite) {
                setErroLimite(`Limite de ${limitePessoas} cadastros de pessoas por igreja.`)
                return
              }
              setErroLimite(null)
              setEditing(emptyForm(escolasVisiveis[0]?.id ?? ''))
            }}
          >
            <Plus size={16} /> Novo cadastro
          </PrimaryButton>
        ) : null}
      </div>

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Cadastros">
        {(
          [
            ['lista', ehProfessor ? 'Turma' : 'Cadastros'],
            ['aniversariantes', 'Aniversariantes'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              aba === id ? 'bg-navy text-white' : 'bg-white text-navy shadow-sm'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </nav>

      {aba === 'aniversariantes' ? (
        <AniversariantesLista pessoas={pessoasVisiveis} escolas={state.escolas} mostrarCongregacao={escolasVisiveis.length > 1} />
      ) : null}

      {aba === 'lista' && podeAlunos ? (
        <ImportacaoExcel
          arquivoModelo="modelo-cadastros-ebd"
          colunas={COLUNAS_MODELO}
          exemplo={{
            Nome: 'Ex.: Maria Silva',
            CPF: '000.000.000-00',
            'Data de nascimento': '12/03/2015',
            Endereço: 'Rua das Flores',
            Nº: '120',
            Bairro: 'Centro',
            Cidade: 'São Luís',
            Estado: 'MA',
            Responsáveis: 'Ana Silva',
            Contato: '(98) 98400-0000',
            'Tipo sanguíneo': 'O+',
            'Data da matrícula': '02/02/2024',
            'Estado civil': '',
            Escolaridade: '',
            Turma: 'Primários A',
            'Faixa etária': 'Primários',
            Tipo: 'Aluno',
            Sexo: 'Feminino',
            Status: 'Ativo',
            Congregação: escolasVisiveis[0]?.nome ?? 'Nome da igreja',
            WhatsApp: '(98) 98400-0000',
            'E-mail': 'maria@email.com',
            Login: '',
            Senha: '',
          }}
          onImportar={importarArquivo}
        />
      ) : null}

      {acessoSalvo ? (
        <div className="mb-5 rounded-xl border border-teal/30 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-navy">
            Acesso de {acessoSalvo.tipo.toLowerCase()} para {acessoSalvo.nome}
          </p>
          <p className="mt-1 text-sm">
            Usuário: <b>{acessoSalvo.username}</b>
            {acessoSalvo.senha ? (
              <>
                {' '}
                · Senha: <b>{acessoSalvo.senha}</b>
              </>
            ) : (
              <> · senha anterior (só muda se você gerar outra)</>
            )}
          </p>
          <p className="mt-1 text-xs text-muted">Anote e entregue à pessoa. Ela entra no site ou no app com esses dados.</p>
        </div>
      ) : null}

      {aba === 'lista' && !ehProfessor ? (
      <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Regional">
            <input className={inputClass} placeholder="Ex.: Regional Aparecida" value={filtros.regional} onChange={(e) => setFiltros({ ...filtros, regional: e.target.value })} />
          </Field>
          <Field label="Congregação">
            <input className={inputClass} placeholder="Nome da igreja" value={filtros.congregacao} onChange={(e) => setFiltros({ ...filtros, congregacao: e.target.value })} />
          </Field>
          <Field label="Nome">
            <input className={inputClass} placeholder="Nome do aluno/professor" value={filtros.nome} onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })} />
          </Field>
          <Field label="Data de nascimento">
            <DateInput allowEmpty value={filtros.nascimento} onChange={(nascimento) => setFiltros({ ...filtros, nascimento })} />
          </Field>
          <Field label="Turma">
            <input className={inputClass} placeholder="Nome da turma" value={filtros.turma} onChange={(e) => setFiltros({ ...filtros, turma: e.target.value })} />
          </Field>
          <Field label="Faixa etária">
            <select className={inputClass} value={filtros.faixa} onChange={(e) => setFiltros({ ...filtros, faixa: e.target.value })}>
              <option value="">Todas</option>
              {FAIXAS_ETARIAS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select className={inputClass} value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
              <option value="">Todos</option>
              {TIPOS_PESSOA.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Sexo">
            <select className={inputClass} value={filtros.sexo} onChange={(e) => setFiltros({ ...filtros, sexo: e.target.value })}>
              <option value="">Todos</option>
              {SEXOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
              <option value="">Todos</option>
              {STATUS_PESSOA.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <PrimaryButton onClick={() => setAplicados(filtros)}>Pesquisar</PrimaryButton>
          <GhostButton onClick={limpar}>Limpar</GhostButton>
        </div>
      </section>
      ) : null}

      {aba === 'lista' ? (
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-3">
          <PrimaryButton onClick={exportar}>
            <Download size={16} /> Excel
          </PrimaryButton>
          <PrimaryButton onClick={exportarPdf}>
            <FileText size={16} /> PDF
          </PrimaryButton>
          <label className="flex items-center gap-2 text-sm">
            Pesquisar por nome:
            <input className={inputClass + ' w-44'} value={buscaTabela} onChange={(e) => setBuscaTabela(e.target.value)} placeholder="Nome" />
          </label>
        </div>
        <div className="table-wrap">
          <table className="data w-full min-w-[860px] text-left">
            <thead>
              <tr>
                {['Nome', 'Data de nascimento', 'Turma', 'Faixa etária', 'Tipo', 'Sexo', 'Status', ''].map((h) => (
                  <th key={h || 'a'} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-3 font-medium">{p.nome}</td>
                  <td className="px-3 py-3">{formatDateBR(p.dataNascimento)}</td>
                  <td className="px-3 py-3">{p.turma}</td>
                  <td className="px-3 py-3">{p.faixaEtaria}</td>
                  <td className="px-3 py-3">{p.tipo}</td>
                  <td className="px-3 py-3">{p.sexo}</td>
                  <td className="px-3 py-3">
                    <span className={p.status === 'Ativo' ? 'text-emerald-600' : 'text-muted'}>{p.status}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {p.tipo === 'Aluno' ? (
                      <Link to={`/alunos/${p.id}`} className="mr-2 inline-block text-muted hover:text-navy" title="Ficha">
                        <UserRoundSearch size={15} />
                      </Link>
                    ) : null}
                    {podeAlunos ? (
                      <button type="button" className="mr-2 text-muted hover:text-navy" onClick={() => setEditing(p)}>
                        <Pencil size={15} />
                      </button>
                    ) : null}
                    {podeCadastrar || (ehSecretario && p.tipo === 'Aluno') ? (
                      <button type="button" className="text-muted hover:text-red-600" onClick={() => setExcluirPessoa(p)}>
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {podeAlunos ? (
        <PessoaModal
          pessoa={editing}
          onClose={() => setEditing(null)}
          onSave={(p, acesso) => {
            const erro = savePessoa(p, acesso)
            if (erro) return erro
            setErroLimite(null)
            if (acesso?.username) {
              setAcessoSalvo({
                nome: p.nome,
                username: acesso.username,
                senha: acesso.senha,
                pessoaId: p.id,
                tipo: p.tipo,
              })
            }
            setEditing(null)
            return null
          }}
        />
      ) : null}
      {previewPdf ? <TelaImpressao html={previewPdf} onClose={() => setPreviewPdf(null)} /> : null}
      <Confirmacao
        open={!!excluirPessoa}
        titulo="Excluir cadastro"
        texto={`Excluir ${excluirPessoa?.nome ?? ''}? O login dessa pessoa também sai e a exclusão não volta na sincronização.`}
        onCancel={() => setExcluirPessoa(null)}
        onConfirm={() => {
          if (excluirPessoa) removePessoa(excluirPessoa.id)
          setExcluirPessoa(null)
        }}
      />
    </div>
  )
}

function PessoaModal({
  pessoa,
  onClose,
  onSave,
}: {
  pessoa: Pessoa | null
  onClose: () => void
  onSave: (p: Pessoa, acesso: { username: string; senha: string } | null) => string | null
}) {
  const { escolasVisiveis, state } = useStore()
  const [form, setForm] = useState<Pessoa | null>(pessoa)
  const [username, setUsername] = useState('')
  const [senha, setSenha] = useState('')
  const [userManual, setUserManual] = useState(false)
  const [usuarioId, setUsuarioId] = useState<string | undefined>()
  const [erroForm, setErroForm] = useState('')

  useEffect(() => {
    if (!pessoa) {
      setForm(null)
      setUsuarioId(undefined)
      return
    }
    setForm({
      ...pessoa,
      telefone: maskWhatsApp(pessoa.telefone ?? ''),
      cpf: maskCpf(pessoa.cpf ?? ''),
    })
    setErroForm('')
    const existente = state.usuarios.find((u) => u.pessoaId === pessoa.id)
    if (existente) {
      setUsername(existente.username)
      setSenha(existente.senha.startsWith('$2') ? '' : existente.senha)
      setUserManual(true)
      setUsuarioId(existente.id)
    } else {
      const papel = papelDoTipo(pessoa.tipo)
      setUsername(papel && pessoa.nome ? sugestaoUsername(pessoa.nome, state.usuarios) : '')
      setSenha(senhaGerada())
      setUserManual(false)
      setUsuarioId(undefined)
    }
  }, [pessoa, state.usuarios])

  function atualizarTipo(tipo: TipoPessoa) {
    if (!form) return
    const papel = papelDoTipo(tipo)
    setForm({ ...form, tipo })
    if (!papel) return
    if (!userManual || ehLoginAutomatico(username, form.nome)) {
      setUsername(sugestaoUsername(form.nome, state.usuarios, usuarioId))
      setUserManual(false)
    }
  }

  function atualizarNome(nome: string) {
    if (!form) return
    setForm({ ...form, nome })
    const papel = papelDoTipo(form.tipo)
    if ((!userManual || ehLoginAutomatico(username, form.nome)) && papel) {
      setUsername(sugestaoUsername(nome, state.usuarios, usuarioId))
      setUserManual(false)
    }
  }

  function faixaDaTurma(nome: string, escolaId: string): FaixaEtaria | null {
    const alvo = nome.trim().toLowerCase()
    if (!alvo) return null
    const turma = (state.turmas ?? []).find(
      (t) => t.escolaId === escolaId && t.nome.trim().toLowerCase() === alvo,
    )
    if (!turma) return null
    return (FAIXAS_ETARIAS as readonly string[]).includes(turma.faixaEtaria) ? turma.faixaEtaria : null
  }

  function atualizarTurma(nome: string) {
    if (!form) return
    const faixa = faixaDaTurma(nome, form.escolaId)
    setForm({ ...form, turma: nome, ...(faixa ? { faixaEtaria: faixa } : {}) })
  }

  const mostraAcesso = form ? precisaAcessoApp(form.tipo) && form.status === 'Ativo' : false

  return (
    <Modal open={!!pessoa} title={pessoa ? 'Cadastro' : ''} onClose={onClose} wide>
      {form ? (
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            const acesso = mostraAcesso && username.trim()
              ? { username: username.trim().toLowerCase(), senha: senha.trim(), email: (form.email ?? '').trim().toLowerCase() }
              : null
            const erro = onSave({ ...form, telefone: maskWhatsApp(form.telefone ?? ''), cpf: maskCpf(form.cpf ?? '') }, acesso)
            setErroForm(erro ?? '')
          }}
        >
          {erroForm ? <p className="sm:col-span-2 text-sm text-red-600">{erroForm}</p> : null}
          <Field label="Nome">
            <input className={inputClass} required value={form.nome} onChange={(e) => atualizarNome(e.target.value)} />
          </Field>
          <Field label="Congregação">
            <select
              className={inputClass}
              value={form.escolaId}
              onChange={(e) => {
                const escolaId = e.target.value
                const faixa = faixaDaTurma(form.turma, escolaId)
                setForm({ ...form, escolaId, ...(faixa ? { faixaEtaria: faixa } : {}) })
              }}
            >
              {escolasVisiveis.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Data de nascimento">
            <DateInput value={form.dataNascimento} onChange={(dataNascimento) => setForm({ ...form, dataNascimento })} />
          </Field>
          <Field label="CPF">
            <input
              className={inputClass}
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={form.cpf ?? ''}
              onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })}
            />
          </Field>
          <Field label="Tipo sanguíneo">
            <select className={inputClass} value={form.tipoSanguineo ?? ''} onChange={(e) => setForm({ ...form, tipoSanguineo: e.target.value })}>
              <option value="">Selecione</option>
              {TIPOS_SANGUINEOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Data da matrícula">
            <DateInput allowEmpty value={form.dataMatricula ?? ''} onChange={(dataMatricula) => setForm({ ...form, dataMatricula })} />
          </Field>
          <Field label="Turma">
            <input className={inputClass} list="turmas-cadastro" value={form.turma} onChange={(e) => atualizarTurma(e.target.value)} />
            <datalist id="turmas-cadastro">
              {(state.turmas ?? [])
                .filter((t) => t.escolaId === form.escolaId)
                .map((t) => (
                  <option key={t.id} value={t.nome} />
                ))}
            </datalist>
          </Field>
          <Field label="Faixa etária">
            <select className={inputClass} value={form.faixaEtaria} onChange={(e) => setForm({ ...form, faixaEtaria: e.target.value as FaixaEtaria })}>
              {FAIXAS_ETARIAS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select
              className={inputClass}
              value={form.tipo}
              onChange={(e) => atualizarTipo(e.target.value as TipoPessoa)}
            >
              {TIPOS_PESSOA.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Sexo">
            <select className={inputClass} value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value as Sexo })}>
              {SEXOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusPessoa })}>
              {STATUS_PESSOA.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="WhatsApp">
            <input
              className={inputClass}
              inputMode="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              value={form.telefone ?? ''}
              onChange={(e) => setForm({ ...form, telefone: maskWhatsApp(e.target.value) })}
            />
          </Field>
          <Field label="E-mail (para recuperar senha)">
            <input className={inputClass} type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          {mostraAcesso ? (
            <>
              <Field label="Login do app">
                <input
                  className={inputClass}
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => {
                    setUserManual(true)
                    setUsername(e.target.value)
                  }}
                />
              </Field>
              <Field label="Senha do app">
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    required={!usuarioId}
                    placeholder={usuarioId ? 'Deixe em branco para manter' : ''}
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <GhostButton
                    type="button"
                    className="shrink-0"
                    onClick={() => setSenha(senhaGerada())}
                    aria-label="Gerar senha"
                  >
                    <RefreshCw size={16} />
                  </GhostButton>
                </div>
              </Field>
              <p className="sm:col-span-2 text-sm text-muted">
                Este login entra no app de {form.tipo.toLowerCase()}. Você pode alterar o usuário e a senha antes de salvar.
              </p>
            </>
          ) : null}
          <section className="sm:col-span-2 rounded-xl border border-line bg-page p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy">Informações adicionais</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Endereço">
                <input className={inputClass} value={form.endereco ?? ''} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
              </Field>
              <Field label="Nº">
                <input className={inputClass} value={form.numero ?? ''} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              </Field>
              <Field label="Bairro">
                <input className={inputClass} value={form.bairro ?? ''} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
              </Field>
              <Field label="Cidade">
                <input className={inputClass} value={form.cidade ?? ''} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </Field>
              <Field label="Estado">
                <select className={inputClass} value={form.estado ?? ''} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  <option value="">Selecione</option>
                  {UFS.map((uf) => <option key={uf}>{uf}</option>)}
                </select>
              </Field>
              <Field label="Nome do responsável">
                <input className={inputClass} value={form.responsaveis ?? ''} onChange={(e) => setForm({ ...form, responsaveis: e.target.value })} />
              </Field>
              <Field label="Contato do responsável">
                <input
                  className={inputClass}
                  inputMode="tel"
                  placeholder="(00) 00000-0000"
                  value={form.contato ?? ''}
                  onChange={(e) => setForm({ ...form, contato: maskWhatsApp(e.target.value) })}
                />
              </Field>
              <Field label="Escolaridade">
                <select className={inputClass} value={form.escolaridade ?? ''} onChange={(e) => setForm({ ...form, escolaridade: e.target.value })}>
                  <option value="">Selecione</option>
                  {ESCOLARIDADES.map((e) => <option key={e}>{e}</option>)}
                </select>
              </Field>
              <Field label="Estado civil">
                <select className={inputClass} value={form.estadoCivil ?? ''} onChange={(e) => setForm({ ...form, estadoCivil: e.target.value })}>
                  <option value="">Selecione</option>
                  {ESTADOS_CIVIS.map((e) => <option key={e}>{e}</option>)}
                </select>
              </Field>
            </div>
          </section>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
            <PrimaryButton type="submit">Salvar</PrimaryButton>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}

function AniversariantesLista({
  pessoas,
  escolas,
  mostrarCongregacao,
}: {
  pessoas: Pessoa[]
  escolas: { id: string; nome: string }[]
  mostrarCongregacao: boolean
}) {
  const grupos = useMemo(() => {
    const itens = pessoas.flatMap((pessoa) => {
      if (pessoa.status !== 'Ativo') return []
      const partes = partesNascimento(pessoa.dataNascimento)
      if (!partes) return []
      return [{ pessoa, ...partes, idade: new Date().getFullYear() - partes.ano }]
    })
    itens.sort((a, b) => a.mes - b.mes || a.dia - b.dia || a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR'))
    const mapa = new Map<number, typeof itens>()
    for (const item of itens) {
      const lista = mapa.get(item.mes) ?? []
      lista.push(item)
      mapa.set(item.mes, lista)
    }
    return [...mapa.entries()]
  }, [pessoas])

  if (grupos.length === 0) {
    return (
      <section className="rounded-xl bg-white p-6 text-sm text-muted shadow-sm">
        Nenhum aniversariante com data de nascimento cadastrada.
      </section>
    )
  }

  return (
    <div className="space-y-4">
      {grupos.map(([mes, itens]) => (
        <section key={mes} className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy">{MESES[mes - 1]}</h2>
          <ul className="divide-y divide-slate-100">
            {itens.map(({ pessoa, dia, idade }) => (
              <li key={pessoa.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
                <span className="w-12 shrink-0 font-semibold text-navy">
                  {pad2(dia)}/{pad2(mes)}
                </span>
                <span className="font-medium text-ink">{pessoa.nome}</span>
                <span className="text-muted">{pessoa.turma || 'Sem turma'}</span>
                <span className="text-muted">{pessoa.tipo}</span>
                {mostrarCongregacao ? (
                  <span className="text-muted">{escolas.find((e) => e.id === pessoa.escolaId)?.nome}</span>
                ) : null}
                {idade > 0 ? <span className="text-muted">{idade} anos</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
