# Tutorial: Deploy das Modificações na Vercel

Este guia descreve os passos necessários para publicar as novas funcionalidades de "Gerenciamento de Conta" e "Recuperação de Senha" (Magic Link) no seu ambiente de produção da Vercel.

## 1. Atualizar Variáveis de Ambiente na Vercel

As novas funcionalidades exigem o envio de e-mails via SMTP e configurações para a expiração do token. Antes de fazer o deploy do código, você precisa garantir que a Vercel contenha as novas variáveis de ambiente.

1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard).
2. Selecione o projeto do Bolão 2026.
3. Vá em **Settings** > **Environment Variables**.
4. Adicione as seguintes variáveis (com os valores do seu provedor SMTP real):
   - `SMTP_HOST` (Ex: `smtp.sendgrid.net` ou `smtp.mailgun.org`)
   - `SMTP_PORT` (Ex: `587` ou `465`)
   - `SMTP_USER` (Seu usuário SMTP)
   - `SMTP_PASS` (Sua senha SMTP)
   - `SMTP_FROM` (Ex: `"Bolão 2026" <noreply@bolao2026.com>`)
   - `PASSWORD_RESET_TOKEN_TTL_MINUTES` (Ex: `30`)
   - `APP_URL` (A URL em produção do seu app, ex: `https://seu-bolao-2026.vercel.app`. **Importante:** não inclua a barra `/` no final).

*Nota: O `APP_URL` é criticamente importante, pois os links mágicos de reset de senha enviados por e-mail utilizarão esta URL como base.*

## 2. Preparar e Executar Migrações do Banco de Dados

Nesta atualização, duas novas tabelas foram criadas (`PasswordResetToken` e `AuditLog`) e novos campos foram adicionados ao `User` e `Session`.

Se você estiver utilizando um banco PostgreSQL serverless (como Supabase ou Vercel Postgres), você precisará aplicar a migração em produção. Recomenda-se fazer o seguinte antes ou durante o deploy:

### Opção A: Executar a migração localmente contra o banco de produção
Se o seu banco de produção aceita conexões externas (e você tem a URL de produção na sua máquina local provisoriamente):
```bash
# Certifique-se de usar a DATABASE_URL de produção neste comando:
npx prisma migrate deploy
```

### Opção B: Build script da Vercel (Recomendado)
A Vercel normalmente utiliza o comando de `build` configurado no `package.json`. Certifique-se de que o seu script de build no `package.json` execute a migração e a geração do Prisma antes do build do Next.js.
Por exemplo, garanta que no seu `package.json` exista:
```json
"scripts": {
  "build": "prisma generate && prisma migrate deploy && next build"
}
```
*Atenção: Apenas use `migrate deploy` em produção. Nunca use `migrate dev` no build da Vercel.*

## 3. Realizar o Commit e Push do Código

Agora que o ambiente está preparado e as migrações estão configuradas, basta enviar o código atualizado para a branch que está conectada à Vercel (ex: `main` ou `master`).

```bash
# Adicionar todas as modificações
git add .

# Criar o commit
git commit -m "feat: Adiciona gestão de contas, esqueci a senha e ações de gerente"

# Enviar para o repositório remoto
git push origin main
```

O push acionará automaticamente um novo Build e Deploy na Vercel.

## 4. Validar o Deploy

Assim que o deploy for concluído na Vercel (status "Ready"):

1. Acesse o seu `APP_URL` de produção.
2. **Teste a Recuperação de Senha**: Vá para a página de Login e clique em "Esqueci minha senha". Insira um e-mail válido, verifique se o e-mail chega na sua caixa de entrada e teste o preenchimento da nova senha através do Link Mágico.
3. **Teste o Gerenciamento de Conta**: Faça o login e clique no botão "Minha Conta" no canto superior direito. Tente alterar algum dado ou verifique as sessões ativas.
4. **Teste o Painel do Gerente**: Acesse a aba Gerenciar, clique em "Usuários", procure por um usuário e verifique se as tags e funções administrativas carregam perfeitamente.

## 5. Solucionando Problemas Comuns

- **Link Mágico quebrado no e-mail**: Verifique se a variável `APP_URL` na Vercel está definida com `https://` corretamente e **sem a barra final**.
- **Erro 500 no Prisma**: Significa que o banco de produção ainda não recebeu as novas tabelas e colunas. Confirme a execução do `prisma migrate deploy` conforme o passo 2.
- **E-mails não chegam**: Verifique os dados `SMTP_*` nas Environment Variables da Vercel. E-mails podem cair na pasta de spam, portanto, cheque-a no primeiro teste.
