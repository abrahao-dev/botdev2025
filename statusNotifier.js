require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Configurações do bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// Criar instância do bot
const bot = new TelegramBot(token, { polling: false });

// Função para enviar notificação de inicialização
async function notifyInitialization() {
  const now = new Date();
  const formattedTime = now.toLocaleTimeString('pt-BR');
  const formattedDate = now.toLocaleDateString('pt-BR');
  
  const message = `📣 *BOT DE TRADING INICIADO*\n\n⏰ Horário: ${formattedTime}\n📅 Data: ${formattedDate}\n📹 Ambiente: ${process.env.BINANCE_TESTNET === 'true' ? 'TESTNET' : 'PRODUÇÃO'}\n\n✅ Bot iniciado e monitorando o mercado!`;
  
  return bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

// Função para enviar status
function sendStatusUpdate() {
  const now = new Date();
  const formattedTime = now.toLocaleTimeString('pt-BR');
  const formattedDate = now.toLocaleDateString('pt-BR');
  
  const message = `📊 *STATUS DO BOT DE TRADING*\n\n⏰ Horário: ${formattedTime}\n📅 Data: ${formattedDate}\n📹 Bot está rodando no ambiente ${process.env.BINANCE_TESTNET === 'true' ? 'TESTNET' : 'PRODUÇÃO'}\n\nℹ️ Este é um relatório automático enviado a cada hora.`;
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    .then(() => {
      console.log('✅ Status enviado para o Telegram com sucesso!');
    })
    .catch(error => {
      console.error('❌ Erro ao enviar status para o Telegram:', error.message);
    });
}

// Configurar envio periódico (a cada 1 hora)
setInterval(sendStatusUpdate, 60 * 60 * 1000);

module.exports = {
  sendStatusUpdate,
  notifyInitialization
};
