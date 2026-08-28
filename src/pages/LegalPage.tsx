import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { WHATSAPP_SUPORTE_LINK } from '../lib/landing'

function Shell({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('site-publico')
    document.title = `${title} — EDB Total`
    return () => document.documentElement.classList.remove('site-publico')
  }, [title])

  return (
    <div className="min-h-dvh bg-page">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo variant="mark" className="h-9 w-9" />
            <span className="font-semibold text-navy">EDB Total</span>
          </Link>
          <Link to="/login" className="text-sm font-medium text-navy">
            Entrar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-navy">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink">{children}</div>
      </main>
      <footer className="border-t border-line bg-navy py-6 text-sm text-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4">
          <span>EDB Total</span>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacidade" className="text-gold">
              Privacidade
            </Link>
            <Link to="/termos" className="text-gold">
              Termos
            </Link>
            <a href={WHATSAPP_SUPORTE_LINK} className="text-gold">
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function PrivacidadePage() {
  return (
    <Shell title="Política de privacidade">
      <p>Última atualização: 28 de agosto de 2026.</p>
      <p>
        O EDB Total (<a className="font-medium text-navy underline" href="https://ebdtotal.com">ebdtotal.com</a>) é um sistema para
        igrejas administrarem a Escola Bíblica Dominical. Esta política descreve quais dados tratamos no site e no aplicativo
        para iPhone e Android.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Quais dados coletamos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Dados da igreja: nome, cidade, responsável, e-mail e WhatsApp informados na assinatura.</li>
        <li>Contas de acesso: nome, usuário, senha (armazenada com hash) e perfil (aluno, professor, secretário, superintendente).</li>
        <li>
          Dados da EBD lançados pela igreja: alunos, turmas, presença, Bíblia, revista, oferta, lições, avaliações, avisos,
          certificados e financeiro da escola.
        </li>
        <li>Registros técnicos do servidor (IP, data e página) para segurança e funcionamento do serviço.</li>
      </ul>
      <h2 className="pt-2 text-base font-semibold text-navy">Para que usamos</h2>
      <p>
        Só usamos os dados para prestar o serviço da EBD, autenticar o login, enviar o acesso por e-mail, atender o suporte e
        mostrar a contabilização geral no site (totais agregados, sem identificar a igreja na vitrine pública). Não vendemos
        dados e não usamos anúncios de terceiros no aplicativo.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Onde ficam</h2>
      <p>
        Os dados de cada igreja ficam em banco próprio no servidor contratado no Brasil. O aplicativo nativo guarda a sessão no
        aparelho e consulta o servidor por HTTPS.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Compartilhamento</h2>
      <p>
        Não compartilhamos cadastros com outras igrejas. O suporte só acessa o necessário para resolver um chamado. O WhatsApp
        é um serviço da Meta: se você nos escrever por lá, valem também as regras deles.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Crianças e adolescentes</h2>
      <p>
        O app pode ser usado por alunos da EBD, inclusive menores, sob responsabilidade da igreja que cadastra a turma. Não
        pedimos dados extras de menores além do necessário para a escola.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Exclusão da conta</h2>
      <p>
        Você pode pedir a exclusão da conta no próprio aplicativo (Minha conta) ou pelo WhatsApp{' '}
        <a className="font-medium text-navy underline" href={WHATSAPP_SUPORTE_LINK}>
          (98) 98125-8852
        </a>
        . Apagamos o acesso e os dados da igreja em até 7 dias, salvo obrigação legal de guarda.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Contato</h2>
      <p>
        Dúvidas: WhatsApp (98) 98125-8852 ou o site{' '}
        <a className="font-medium text-navy underline" href="https://ebdtotal.com">
          ebdtotal.com
        </a>
        .
      </p>
    </Shell>
  )
}

export function TermosPage() {
  return (
    <Shell title="Termos de uso">
      <p>Última atualização: 28 de agosto de 2026.</p>
      <p>
        Ao criar uma igreja no EDB Total ou entrar no aplicativo, você concorda com estes termos. O serviço é oferecido para
        gestão da Escola Bíblica Dominical — chamada, cadastros, lição, avaliação, avisos, certificados e relatórios.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Conta e responsabilidade</h2>
      <p>
        A igreja é responsável pelos dados que lança (alunos, ofertas, usuários) e por guardar o login em segurança. O
        superintendente ou responsável cadastrado administra os acessos da congregação.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Uso aceitável</h2>
      <p>
        Não use o sistema para conteúdo ilegal, spam ou para acessar dados de outra igreja. Podemos suspender contas em caso
        de abuso ou inadimplência.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Disponibilidade</h2>
      <p>
        Nos esforçamos para manter o serviço no ar, mas não garantimos disponibilidade ininterrupta. Cópias de segurança e o
        uso contínuo da EBD no papel, se necessário, são responsabilidade da igreja.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Encerramento</h2>
      <p>
        Você pode encerrar a conta a qualquer momento pelo aplicativo ou pelo WhatsApp. Após a exclusão, o acesso e os dados
        da igreja são removidos conforme a política de privacidade.
      </p>
      <h2 className="pt-2 text-base font-semibold text-navy">Contato</h2>
      <p>
        WhatsApp (98) 98125-8852 ·{' '}
        <a className="font-medium text-navy underline" href="https://ebdtotal.com">
          ebdtotal.com
        </a>
      </p>
    </Shell>
  )
}
