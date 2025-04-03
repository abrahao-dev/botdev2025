# Próximos Passos para o BotDev 2025

## Configurações Pendentes (Checklist)

### 1. Configurar Variáveis de Ambiente (.env) 

- [ ] **Chaves da API da Binance**:
  - [ ] `BINANCE_API_KEY=SUA_API_KEY_AQUI` - Obtenha em sua conta da Binance
  - [ ] `BINANCE_SECRET_KEY=SUA_SECRET_KEY_AQUI` - Obtenha em sua conta da Binance
  - [x] `BINANCE_TESTNET=true` - Mantenha como `true` para testes iniciais

- [ ] **Configurações do Telegram**:
  - [ ] `TELEGRAM_BOT_TOKEN=SEU_TOKEN_AQUI` - Obtenha conversando com @BotFather no Telegram
  - [ ] `TELEGRAM_CHAT_ID=SEU_CHAT_ID_AQUI` - Obtenha enviando uma mensagem para seu bot

- [ ] **Configurações do Banco de Dados**:
  - [ ] `DB_HOST=seu-endpoint-rds.amazonaws.com` - Endpoint do seu banco PostgreSQL
  - [ ] `DB_PORT=5432` - Porta padrão do PostgreSQL
  - [ ] `DB_USER=admin` - Usuário do banco
  - [ ] `DB_PASSWORD=suaSenhaForte` - Senha do banco
  - [ ] `DB_NAME=trading` - Nome do banco de dados

### 2. Configurar Banco de Dados PostgreSQL 

**Escolha uma das opções abaixo:**

#### Opção 1: PostgreSQL Local (para testes rápidos)

- [ ] Instalar PostgreSQL: `brew install postgresql`
- [ ] Iniciar o serviço: `brew services start postgresql`
- [ ] Criar o banco de dados: `createdb trading`
- [ ] Criar tabelas necessárias (script abaixo)

```sql
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  price NUMERIC(16, 8) NOT NULL,
  quantity NUMERIC(16, 8) NOT NULL,
  profit NUMERIC(16, 8),
  status VARCHAR(20) NOT NULL
);
```

#### Opção 2: PostgreSQL na Nuvem (para produção)

- [ ] Criar conta em um dos serviços gratuitos:
  - [Supabase](https://supabase.com) (PostgreSQL gratuito)
  - [ElephantSQL](https://www.elephantsql.com) (Plano gratuito)
  - [Neon](https://neon.tech) (PostgreSQL serverless com tier gratuito)
- [ ] Criar banco de dados e tabelas necessárias
- [ ] Obter credenciais de conexão e atualizar o arquivo .env

### 3. Configurar Bot do Telegram 

- [ ] Criar bot com @BotFather no Telegram
  - [ ] Enviar `/newbot` para @BotFather
  - [ ] Seguir as instruções para criar o bot
  - [ ] Copiar o token fornecido
- [ ] Obter Chat ID
  - [ ] Iniciar conversa com seu bot
  - [ ] Enviar qualquer mensagem para o bot
  - [ ] Acessar: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
  - [ ] Localizar o valor de `"chat":{"id":123456789}` e copiar

### 4. Testar o Bot em Ambiente Controlado 

- [ ] Configurar testnet da Binance
  - [ ] Criar conta no [Testnet da Binance](https://testnet.binance.vision/)
  - [ ] Gerar chaves de API específicas para o testnet
  - [ ] Solicitar fundos de teste no faucet
- [ ] Executar o bot: `npm start`
- [ ] Verificar notificações no Telegram
- [ ] Monitorar operações e ajustar parâmetros se necessário

### 5. Hospedagem na Nuvem (Opcional) 

**Escolha uma das opções abaixo:**

#### Oracle Cloud Free Tier (Recomendado)

- [ ] Criar conta no [Oracle Cloud](https://www.oracle.com/cloud/free/)
- [ ] Configurar uma VM (Compute Instance)
  - [ ] Escolher Oracle Linux ou Ubuntu
  - [ ] Configurar SSH e regras de firewall
- [ ] Instalar Node.js e dependências
  ```
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs git
  ```
- [ ] Clonar o repositório e instalar dependências
  ```
  git clone https://github.com/seu-usuario/botdev2025.git
  cd botdev2025
  npm install
  ```
- [ ] Configurar o arquivo .env
- [ ] Instalar e configurar PM2
  ```
  npm install -g pm2
  pm2 start index.js --name bot-binance
  pm2 startup
  pm2 save
  ```

#### Fly.io (Alternativa)

- [ ] Criar conta no [Fly.io](https://fly.io/)
- [ ] Instalar Flyctl CLI
- [ ] Fazer login: `flyctl auth login`
- [ ] Inicializar app: `flyctl launch`
- [ ] Configurar secrets para variáveis de ambiente
  ```
  flyctl secrets set BINANCE_API_KEY=sua_api_key
  flyctl secrets set BINANCE_SECRET_KEY=sua_secret_key
  ...
  ```
- [ ] Fazer deploy: `flyctl deploy`

## Estratégia de Trading Atual

O bot está configurado com a seguinte estratégia:

- **Compra**: Quando RSI < 35 (mercado sobrevendido)
- **Venda**: Quando uma das condições for atendida:
  - RSI > 65 (mercado sobrecomprado)
  - Preço 8% acima do preço de compra (take profit)
  - Preço 3% abaixo do preço de compra (stop loss)
- **Proteção**: Lucro mínimo de 1.5% (para compensar taxas)

## Notificações Telegram

Você receberá as seguintes notificações no Telegram:

- **Compras**: Quantidade, preço e data/hora
- **Vendas**: Quantidade, preço, lucro/prejuízo (%) e data/hora
- **Erros**: Mensagens de erro importantes (como carteira vazia)

## Próximos Passos Recomendados

1. Preencha as variáveis no arquivo `.env`
2. Configure o banco de dados PostgreSQL
3. Configure o bot do Telegram
4. Teste o bot no ambiente testnet da Binance
5. Monitore o desempenho e ajuste parâmetros se necessário
6. Quando estiver satisfeito, configure para produção

## Observações Importantes

- **Segurança**: Nunca compartilhe suas chaves de API ou tokens
- **Testes**: Sempre teste primeiro no ambiente de testnet
- **Monitoramento**: Use as notificações do Telegram para acompanhar o desempenho
- **Backup**: Faça backups regulares do banco de dados
- **Aviso Legal**: Use o bot por sua conta e risco, não há garantias de lucro