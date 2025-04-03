const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Configuração do bot do Telegram
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// Verificar se as variáveis de ambiente estão configuradas
if (!token || token === 'SEU_TOKEN_AQUI') {
  console.warn('\n⚠️ Aviso: TELEGRAM_BOT_TOKEN não configurado no arquivo .env');
  console.warn('⚠️ As notificações do Telegram estão DESATIVADAS');
  console.warn('⚠️ Configure o token no arquivo .env para ativar as notificações\n');
}

if (!chatId || chatId === 'SEU_CHAT_ID_AQUI') {
  console.warn('\n⚠️ Aviso: TELEGRAM_CHAT_ID não configurado no arquivo .env');
  console.warn('⚠️ As notificações do Telegram estão DESATIVADAS');
  console.warn('⚠️ Configure o chat ID no arquivo .env para ativar as notificações\n');
}

// Inicializar o bot
let bot = null;
try {
  if (token && token !== 'SEU_TOKEN_AQUI' && chatId && chatId !== 'SEU_CHAT_ID_AQUI') {
    bot = new TelegramBot(token, { polling: false });
    console.log('\n✅ Bot do Telegram configurado com sucesso!');
    console.log(`✅ Notificações serão enviadas para o chat ID: ${chatId.substring(0, 3)}...${chatId.substring(chatId.length - 3)}\n`);
  }
} catch (error) {
  console.error('\n🚨 Erro ao configurar bot do Telegram:', error.message);
  console.error('🚨 Verifique se o token está correto no arquivo .env\n');
  bot = null;
}

/**
 * Envia uma mensagem para o chat configurado no Telegram
 * @param {string} message - Mensagem a ser enviada
 * @returns {Promise<boolean>} - true se enviado com sucesso, false caso contrário
 */
async function sendMessage(message) {
  // Verificar se o bot está configurado corretamente
  if (!bot || !chatId || chatId === 'SEU_CHAT_ID_AQUI') {
    console.log('⚠️ Notificação não enviada: Bot do Telegram ou Chat ID não configurados.');
    return false;
  }

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    console.log('📱 Notificação enviada para o Telegram');
    return true;
  } catch (error) {
    console.error('🚨 Erro ao enviar mensagem para o Telegram:', error.message);
    
    // Verificar erros comuns
    if (error.message.includes('ETELEGRAM: 401')) {
      console.error('🚨 Erro de autenticação: Verifique se o token está correto');
    } else if (error.message.includes('ETELEGRAM: 400') && error.message.includes('chat not found')) {
      console.error('🚨 Chat ID não encontrado: Verifique se o Chat ID está correto');
    }
    
    return false;
  }
}

/**
 * Envia notificação de compra
 * @param {Object} orderDetails - Detalhes da ordem de compra
 */
async function notifyBuy(orderDetails) {
  const message = `🟢 *COMPRA REALIZADA*\n\n💰 Quantidade: ${orderDetails.quantity} BTC\n💵 Preço: ${orderDetails.price} USDT\n⏱️ Data: ${new Date().toLocaleString('pt-BR')}\n`;
  
  return await sendMessage(message);
}

/**
 * Envia notificação de venda
 * @param {Object} orderDetails - Detalhes da ordem de venda
 */
async function notifySell(orderDetails) {
  const profitEmoji = orderDetails.profit >= 0 ? '📈' : '📉';
  const message = `🔴 *VENDA REALIZADA*\n\n💰 Quantidade: ${orderDetails.quantity} BTC\n💵 Preço: ${orderDetails.price} USDT\n${profitEmoji} Lucro: ${(orderDetails.profit * 100).toFixed(2)}%\n⏱️ Data: ${new Date().toLocaleString('pt-BR')}\n`;
  
  return await sendMessage(message);
}

/**
 * Envia notificação de erro
 * @param {string} errorMessage - Mensagem de erro
 */
async function notifyError(errorMessage) {
  const message = `⚠️ *ERRO IMPORTANTE*\n\n🚨 ${errorMessage}\n⏱️ ${new Date().toLocaleString('pt-BR')}\n`;
  
  return await sendMessage(message);
}

/**
 * Envia notificação de erro de carteira vazia
 */
async function notifyEmptyWallet() {
  const message = `📊 *CARTEIRA VAZIA*\n\nSaldo insuficiente para executar operações.\nVerifique seu saldo na Binance.\n⏱️ ${new Date().toLocaleString('pt-BR')}\n`;
  
  return await sendMessage(message);
}

/**
 * Envia relatório diário de desempenho
 * @param {Object} stats - Estatísticas do bot
 */
async function sendDailyReport(stats) {
  const message = `📊 *RELATÓRIO DIÁRIO*\n\n🔄 Operações: ${stats.totalTrades}\n🟢 Compras: ${stats.buys}\n🔴 Vendas: ${stats.sells}\n💰 Lucro total: ${(stats.totalProfit * 100).toFixed(2)}%\n⏱️ Data: ${new Date().toLocaleString('pt-BR')}\n`;
  
  return await sendMessage(message);
}

module.exports = {
  sendMessage,
  notifyBuy,
  notifySell,
  notifyError,
  notifyEmptyWallet,
  sendDailyReport
};