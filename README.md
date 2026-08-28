# EDB Total

Sistema de Escola Bíblica Dominical — cadastros, escolas, acessos, chamada e relatórios de presença, bíblias, revistas e ofertas.

Funciona no navegador e pode ser publicado na **Google Play** e na **App Store** com Capacitor.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

### Acessos de demonstração

| Perfil | Usuário | Senha |
| --- | --- | --- |
| Superintendente | `quenazmartins35` | `123456` |
| Secretário (Oliveiras) | `zilmara144` | `123456` |
| Superintendente (Betel) | `wesleydias35` | `123456` |
| Professor | `fernanda.prof` | `123456` |
| Aluno | `joao.aluno` | `123456` |

No celular, o login pede primeiro o aplicativo (Professor, Superintendente, Secretário ou Aluno). Cada perfil vê menus e atalhos diferentes.

Para gerar o app Android:

```bash
npm run android
```

## Módulos

- **Cadastros** — alunos e professores, com filtros por regional, congregação, turma, faixa etária, tipo, sexo e status
- **Escolas** — filiais, responsável, ativos/inativos e status
- **Configurações** — setores e acessos (RBAC)
- **Chamada** — presença, bíblia, revista, visitantes e oferta
- **Relatório** — consolidado do domingo (KPIs + tabela por escola + Excel)

## Publicar nas lojas

O app web é empacotado com Capacitor.

### Android (Google Play)

1. Instale o [Android Studio](https://developer.android.com/studio)
2. No projeto:

```bash
npm install @capacitor/android --save
npx cap add android
npm run android
```

3. No Android Studio: **Build > Generate Signed Bundle / APK** e envie o `.aab` no [Play Console](https://play.google.com/console)

### iOS (App Store) — sem Mac

A Apple exige um Mac só para **compilar**. Usamos um Mac na nuvem (Codemagic, ~500 min/mês no plano grátis). O certificado é criado no site; não precisa de Xcode.

**A. Site no ar** — a loja exige URL pública:
`https://ebdtotal.com/privacidade` e `https://ebdtotal.com/termos`.

**B. Apple (navegador no Windows)**

1. A conta precisa ser do **Apple Developer Program pago** (não basta Apple ID grátis).
2. [developer.apple.com/account](https://developer.apple.com/account) → Identifiers → `+` → App IDs → App → Bundle ID **Explicit**: `com.portalebd.app`.
3. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → Apps → Novo app: iOS, nome **EDB Total**, idioma Português (Brasil), bundle `com.portalebd.app`, SKU `ebdtotal`.
4. **Chave de API** (só baixa uma vez): App Store Connect → Usuários e acesso → Integrações → App Store Connect API → `+` → nome `EDB Total CI`, acesso **Gerente de apps**. Anote **Issuer ID** e **Key ID**. Baixe o arquivo `.p8` e guarde fora do projeto.
5. Preencha a ficha (texto abaixo). Criptografia: só HTTPS. Idade: 4+. Capturas: iPhone 6.7" e 6.1" — pode tirar no próprio iPhone, no site/app (o visual é o mesmo).

**C. Codemagic (recomendado)**

1. Crie um repositório no [GitHub](https://github.com) (grátis) com este projeto, incluindo a pasta `ios/` e o arquivo `codemagic.yaml`.
2. Cadastre-se em [codemagic.io](https://codemagic.io) com o GitHub e adicione o repositório.
3. Team settings → **Team integrations → Developer Portal** → cole Issuer ID, Key ID e o `.p8`.
4. Team settings → **codemagic.yaml settings → Environment variables** → grupo `app_store_credentials` com:
   - `APP_STORE_CONNECT_KEY_IDENTIFIER` = Key ID
   - `APP_STORE_CONNECT_ISSUER_ID` = Issuer ID
   - `APP_STORE_CONNECT_PRIVATE_KEY` = texto inteiro do `.p8` (incluindo BEGIN/END)
5. Na aplicação: Check for configuration file → inicie o workflow **EDB Total iOS TestFlight**.
6. Quando o build ficar **Waiting for review** no TestFlight, abra App Store Connect no Windows, complete a ficha e envie para a App Store.

**D. GitHub Actions (alternativa)**

Secrets do repositório: `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`. Depois: Actions → **iOS TestFlight** → Run workflow.

### Texto para a ficha da App Store

- **Nome:** EDB Total
- **Subtítulo:** Escola Bíblica Dominical
- **Categoria:** Educação
- **URL de suporte:** https://ebdtotal.com
- **URL de privacidade:** https://ebdtotal.com/privacidade
- **Descrição:**

EDB Total é o sistema da Escola Bíblica Dominical da sua igreja: chamada, cadastros, lição, avaliação, avisos, certificados, financeiro e portal do aluno.

Na secretaria e na superintendência: presença, Bíblia, revista, oferta, turmas, congregações e relatório do domingo.

No celular do aluno: frequência, lição da semana, atividades e certificados.

Cada igreja tem os dados separados. Funciona no site e no aplicativo.

- **Palavras-chave:** ebd,escola biblica,igreja,chamada,escola dominical,licao,secretaria

### Testar no celular agora

- `npm run dev` e acesse o IP da máquina na mesma rede
- Ou instale como PWA (Adicionar à tela inicial) pelo navegador
