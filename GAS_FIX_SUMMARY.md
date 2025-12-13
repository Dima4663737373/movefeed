# Виправлення конфігурації газу для Movement Bardock Testnet

## Проблема
Чайові не надсилались через підпис транзакції в мережі Movement Bardock Testnet через Razor Wallet, оскільки не було визначеного газу.

## Виконані зміни

### 1. Оновлено RPC endpoint на Bardock Testnet
**Файл**: `src/lib/movement.ts`
- Змінено з `https://testnet.movementnetwork.xyz/v1` 
- На `https://aptos.testnet.bardock.movementlabs.xyz/v1`
- Оновлено назву мережі на "Movement Bardock Testnet"
- Оновлено URL faucet на `https://faucet.testnet.bardock.movementlabs.xyz/`

### 2. Додано функцію для отримання gas estimation
**Файл**: `src/lib/movementClient.ts`
- Додано функцію `getGasEstimation()` яка отримує актуальні значення газу з мережі
- Використовує `client.getGasPriceEstimation()` з Aptos SDK
- Має fallback на дефолтні значення якщо запит не вдається

### 3. Оновлено конфігурацію газу в транзакціях
**Файл**: `src/lib/movementTx.ts`
- `buildTipPostPayload()` тепер асинхронна і отримує gas estimation
- `buildCreatePostPayload()` тепер асинхронна і отримує gas estimation
- `sendTipToPost()` та `createPost()` використовують динамічний газ
- Додано логування gas estimation для дебагу

### 4. Оновлено useMovementTransaction hook
**Файл**: `src/hooks/useMovementTransaction.ts`
- Додано отримання gas estimation перед побудовою транзакції
- Gas options передаються в `client.transaction.build.simple()`
- Додано логування gas параметрів

### 5. Оновлено конфігурацію Privy
**Файл**: `src/lib/privy.ts`
- Оновлено RPC URLs на Bardock testnet
- Оновлено назву мережі
- Оновлено explorer URL

## Технічні деталі

### Gas Configuration
```typescript
// Дефолтні значення (fallback)
const DEFAULT_GAS_CONFIG = {
    maxGasAmount: 100000,  // Максимальна кількість gas units
    gasUnitPrice: 100,     // Ціна за gas unit в octas
};
```

### Gas Estimation Flow
1. Викликається `getGasEstimation()` з `movementClient.ts`
2. Отримується `gas_estimate` з мережі (gas unit price)
3. Використовується `maxGasAmount: 100000` з запасом
4. Значення передаються в опції транзакції

### Приклад використання
```typescript
// Отримання gas estimation
const gasEstimation = await getGasEstimation();
// { gasEstimate: 100, gasUnitPrice: 100, maxGasAmount: 100000 }

// Побудова транзакції з газом
const payload = await buildTipPostPayload(params, {
    maxGasAmount: gasEstimation.maxGasAmount,
    gasUnitPrice: gasEstimation.gasUnitPrice,
});
```

## Перевірка роботи

### Що перевірити:
1. ✅ RPC endpoint вказує на Bardock testnet
2. ✅ Gas estimation отримується з мережі
3. ✅ Транзакції використовують динамічний газ
4. ✅ Razor Wallet може підписати транзакції

### Логи для дебагу:
При відправці транзакції ви побачите в консолі:
```
⛽ Gas estimation: { gasEstimate: 100, gasUnitPrice: 100, maxGasAmount: 100000 }
🔨 Building tip transaction: { ... }
✅ Transaction built with gas: { maxGasAmount: 100000, gasUnitPrice: 100 }
```

## Наступні кроки

Якщо транзакції все ще не працюють:
1. Перевірте, чи Razor Wallet підключений до Movement Bardock Testnet
2. Перевірте баланс MOVE токенів (потрібні для газу)
3. Перевірте логи в консолі браузера на наявність помилок
4. Перевірте транзакцію в explorer: https://explorer.movementnetwork.xyz/

## Документація
- Movement Network Docs: https://docs.movementnetwork.xyz/general
- Explorer: https://explorer.movementnetwork.xyz/
- Faucet: https://faucet.testnet.bardock.movementlabs.xyz/

