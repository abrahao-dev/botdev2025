const axios = require("axios");
const fs = require("fs");
const { API_URL, API_KEY } = require("./config");
const { RSI, ATR, calculateBollingerBands, calculateMACD } = require("./utils");
const { getBalance, newOrder, getSymbolFilters } = require("./trade");

// Importar o módulo de notificações Telegram
const telegramNotifier = require("./telegramNotifier");
// Importar o módulo de notificações de status
const statusNotifier = require("./statusNotifier");

const SYMBOL = "BTCUSDT";
const PERIOD = 14;

// Taxa de 0.1% por operação => 0.2% total (ida+volta)
const FEE_RATE = 0.001;
const TOTAL_FEE = FEE_RATE * 2;

// Margens de lucro e prejuízo
// Lucro mínimo de 1.5% para compensar as taxas e ter algum ganho
const MIN_PROFIT_MARGIN = 0.015;

// Take Profit mais conservador (8%)
const TAKE_PROFIT_PERCENT = 0.08;

// Stop Loss para proteção contra quedas (3%)
const STOP_LOSS_PERCENT = 0.03;

// Níveis de RSI ajustados para maior precisão
const RSI_BUY_THRESHOLD = 35;  // Menos agressivo na compra (era 30)
const RSI_SELL_THRESHOLD = 65; // Menos agressivo na venda (era 70)

const STATE_FILE = "./state.json";
const TRADES_FILE = "./trades.json";

// Carrega estado do bot
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  }
  return { isOpened: false, buyPrice: 0 };
}

// Salva estado no arquivo
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Registra trades em arquivo
function saveTrade(tradeData) {
  let trades = [];
  if (fs.existsSync(TRADES_FILE)) {
    trades = JSON.parse(fs.readFileSync(TRADES_FILE, "utf8"));
  }
  trades.push(tradeData);
  fs.writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2));
}

let state = loadState();
let isOpened = state.isOpened;
let buyPrice = state.buyPrice;

// Verifica se já existe BTC na conta ao iniciar
async function initializeBot() {
  try {
    const btcBalance = await getBalance("BTC");
    const usdtBalance = await getBalance("USDT");

    if (btcBalance >= 0.00001) {
      isOpened = true;
      const { data: ticker } = await axios.get(`${API_URL}/api/v3/ticker/price?symbol=${SYMBOL}`);
      buyPrice = parseFloat(ticker.price);
    } else {
      isOpened = false;
      buyPrice = 0;
    }
    saveState({ isOpened, buyPrice });
    
    // Enviar notificação de inicialização do bot
    statusNotifier.notifyInitialization()
      .catch(err => console.error("Erro ao enviar notificação de inicialização:", err.message));
  } catch (error) {
    console.error("Erro ao inicializar o bot:", error.message);
  }
}

// Lógica principal
async function start() {
  try {
    // Obter candles
    const response = await axios.get(
      `${API_URL}/api/v3/klines?limit=100&interval=5m&symbol=${SYMBOL}`,
      {
        headers: { "X-MBX-APIKEY": API_KEY },
        timeout: 5000,
      }
    );

    if (!response || !response.data || !Array.isArray(response.data) || response.data.length === 0) {
      console.error("Erro: Resposta da Binance veio vazia ou inválida.");
      return;
    }

    const data = response.data;
    if (data.length < 20) {
      console.error(`Erro: Dados insuficientes (${data.length} candles).`);
      return;
    }

    const lastCandle = data[data.length - 1];
    if (!lastCandle || !Array.isArray(lastCandle) || lastCandle.length < 5) {
      console.error("Erro: Último candle mal formatado.");
      return;
    }

    // Preço de fechamento do último candle
    const lastPrice = parseFloat(lastCandle[4]);

    // Arrays: fechamento, máxima, mínima
    const closes = data.map(k => parseFloat(k[4])).filter(v => !isNaN(v));
    const highs = data.map(k => parseFloat(k[2])).filter(v => !isNaN(v));
    const lows = data.map(k => parseFloat(k[3])).filter(v => !isNaN(v));

    // Checa se há candles suficientes
    const minCount = Math.min(closes.length, highs.length, lows.length);
    if (minCount < 20) {
      console.error("Erro: Arrays de candles incompletos (<20).");
      return;
    }

    // Calcula indicadores
    const rsi = RSI(closes, PERIOD);
    const atr = ATR(highs, lows, closes, 14);
    const bollinger = calculateBollingerBands(closes);
    const macd = calculateMACD(closes);

    // Valida indicadores
    if (
      isNaN(rsi) ||
      isNaN(atr) ||
      bollinger.upper === null || bollinger.lower === null ||
      isNaN(bollinger.upper) || isNaN(bollinger.lower) ||
      isNaN(macd.line) || isNaN(macd.signal)
    ) {
      console.error("Erro: Indicadores retornaram valores inválidos.");
      return;
    }

    console.log(`RSI: ${rsi.toFixed(2)}`);
    console.log(`ATR: ${atr.toFixed(2)}`);
    console.log(`Bollinger: Up=${bollinger.upper.toFixed(2)}, Low=${bollinger.lower.toFixed(2)}`);
    console.log(`MACD: Line=${macd.line.toFixed(2)}, Signal=${macd.signal.toFixed(2)}`);
    console.log(`Já comprei? ${isOpened}, Preço atual: ${lastPrice}`);

    // Lógica de compra: RSI < 35
    if (rsi < RSI_BUY_THRESHOLD && !isOpened) {
      console.log("RSI abaixo de 35 => compra");
      const orderSuccess = await placeOrder(SYMBOL, "BUY", lastPrice);
      if (orderSuccess) {
        isOpened = true;
        buyPrice = lastPrice;
        saveState({ isOpened, buyPrice });
        console.log("Compra realizada com sucesso!");

        // Enviar notificação de compra via Telegram
        telegramNotifier.notifyBuy({
          quantity: 0.001, // Quantidade fixa para teste
          price: lastPrice,
          rsi: rsi.toFixed(2)
        })
        .then(result => {
          if (result) console.log("Notificação de compra enviada com sucesso!");
        })
        .catch(err => console.error("Erro ao enviar notificação Telegram:", err.message));
      } else {
        console.log("Compra falhou. Tentará novamente na próxima verificação.");
      }
    }

    // Lógica de venda: jamais vender com prejuízo
    else if (isOpened) {
      const profit = ((lastPrice - buyPrice) / buyPrice) - TOTAL_FEE;
      console.log(`Lucro estimado: ${(profit * 100).toFixed(2)}%`);

      // Se o lucro for menor que zero, não vende (não aceita prejuízo)
      if (profit < MIN_PROFIT_MARGIN) {
        console.log("Lucro negativo ou abaixo do mínimo. Mantendo posição para não ter prejuízo.");
        return;
      }

      // Checa se RSI está > 65 (sobrecomprado) ou se chegou no TAKE_PROFIT
      const rsiHigh = (rsi > RSI_SELL_THRESHOLD);
      const priceHighEnough = (lastPrice >= buyPrice * (1 + TAKE_PROFIT_PERCENT));

      // Verifica se atingiu o stop loss (preço caiu abaixo do limite definido)
      const hitStopLoss = (lastPrice <= buyPrice * (1 - STOP_LOSS_PERCENT));

      if (rsiHigh || priceHighEnough || hitStopLoss) {
        // Mensagem diferente dependendo do motivo da venda
        if (hitStopLoss) {
          console.log("Stop Loss acionado. Vendendo para limitar perdas.");
        } else {
          console.log("Condições de venda atendidas (RSI alto ou take profit).");
        }

        const sellSuccess = await placeOrder(SYMBOL, "SELL", lastPrice);
        if (sellSuccess) {
          isOpened = false;
          buyPrice = 0;
          saveState({ isOpened, buyPrice });
          console.log("Venda realizada com sucesso!");

          // Enviar notificação de venda via Telegram
          telegramNotifier.notifySell({
            quantity: 0.001, // Quantidade fixa para teste
            price: lastPrice,
            profit: profit
          })
          .then(result => {
            if (result) console.log("Notificação de venda enviada com sucesso!");
          })
          .catch(err => console.error("Erro ao enviar notificação Telegram:", err.message));
        } else {
          console.log("Venda falhou. Tentará novamente na próxima verificação.");
        }
      }
    }
  } catch (error) {
    console.error("Erro ao buscar dados da Binance:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);

    // Enviar notificação de erro via Telegram
    telegramNotifier.notifyError(`Erro ao buscar dados da Binance: ${error.message}`)
      .catch(err => console.error("Erro ao enviar notificação Telegram:", err.message));
  }
}

// Ajusta quantidade de acordo com stepSize
function quantizeQuantity(amount, stepSize) {
  const decimals = (stepSize.toString().split('.')[1] || '').length;
  return parseFloat(Math.floor(amount * Math.pow(10, decimals)) / Math.pow(10, decimals));
}

// placeOrder, sem check de global.buyPrice
async function placeOrder(symbol, side, price) {
  try {
    const filters = await getSymbolFilters(symbol);
    if (!filters) return false;

    const minQty = filters.LOT_SIZE.minQty;
    const stepSize = filters.LOT_SIZE.stepSize;

    let quantity = 0;

    if (side === "BUY") {
      // Obter saldo em USDT
      const usdtBalance = await getBalance("USDT");

      // Verificar se tem saldo suficiente
      if (usdtBalance < 10) { // Mínimo de 10 USDT para operar
        console.log("Saldo USDT insuficiente para comprar.");

        // Notificar sobre carteira vazia
        telegramNotifier.notifyEmptyWallet()
          .catch(err => console.error("Erro ao enviar notificação Telegram:", err.message));

        return false;
      }

      // Usar 95% do saldo para comprar (deixar margem para taxas)
      const investAmount = usdtBalance * 0.95;
      quantity = investAmount / price;
    } else { // SELL
      // Obter saldo em BTC
      const btcBalance = await getBalance("BTC");

      // Verificar se tem saldo suficiente
      if (btcBalance < minQty) {
        console.log("Saldo BTC insuficiente para vender.");

        // Notificar sobre carteira vazia
        telegramNotifier.notifyEmptyWallet()
          .catch(err => console.error("Erro ao enviar notificação Telegram:", err.message));

        return false;
      }

      // Vender 100% do saldo
      quantity = btcBalance;
    }

    // Ajustar quantidade de acordo com stepSize
    quantity = quantizeQuantity(quantity, stepSize);

    // Verificar se a quantidade é maior que o mínimo
    if (quantity < minQty) {
      console.log(`Quantidade ${quantity} abaixo do mínimo ${minQty}`);
      return false;
    }

    console.log(`Tentando ${side} ${quantity} BTC a ${price} USDT`);

    // Executar ordem
    const order = await newOrder(symbol, side, quantity);
    return order;
  } catch (error) {
    console.error("Erro ao colocar ordem:", error.message);

    // Notificar sobre erro na ordem
    telegramNotifier.notifyError(`Erro ao colocar ordem ${side}: ${error.message}`)
      .catch(err => console.error("Erro ao enviar notificação Telegram:", err.message));

    return false;
  }
}

// Inicia o bot
initializeBot().then(() => {
  setInterval(start, 3000);
  start();
});
