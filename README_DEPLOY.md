# ✅ РОБОЧИЙ ГАЙД ДЛЯ MOVEMENT TESTNET (Bardock)

> **Контекст:**
> ти юзаєш **Movement network**, CLI — `aptos`, код **вже задеплоєний**, ти **викликаєш функції**, а не публікуєш фреймворк.

---

## 🔗 RPC (єдиний потрібний)

```
https://testnet.movementnetwork.xyz/v1
```

---

## 1️⃣ Перехід у пакет (ОБОВʼЯЗКОВО)

```bash
cd move_new
```

---

## 2️⃣ ОСНОВНА РОБОЧА КОМАНДА (100% працює)

**Шаблон**

```bash
aptos move run --profile mines_v12_fresh \
 --function-id <ADDRESS>::<module>::<function> \
 --assume-yes
```

---

## 3️⃣ Реальні команди, які ВЖЕ СПРАЦЮВАЛИ

### 🔹 Ініціалізації

```bash
aptos move run --profile mines_v12_fresh \
 --function-id 0xca4cdf80ef00aa5582149f5797908abb0903727e22d53f26c3cffe7aaaadb47c::donations_v12::initialize \
 --assume-yes
```

```bash
aptos move run --profile mines_v12_fresh \
 --function-id 0xca4cdf80ef00aa5582149f5797908abb0903727e22d53f26c3cffe7aaaadb47c::badges_v12::initialize \
 --assume-yes
```

```bash
aptos move run --profile mines_v12_fresh \
 --function-id 0xca4cdf80ef00aa5582149f5797908abb0903727e22d53f26c3cffe7aaaadb47c::red_packet_v12::initialize \
 --assume-yes
```

---

### 🔹 Створення бейджів

```bash
aptos move run --profile mines_v12_fresh \
 --function-id 0xca4cdf80ef00aa5582149f5797908abb0903727e22d53f26c3cffe7aaaadb47c::badges_v12::create_badge \
 --args u64:1 "string:7-Day Streak" "string:Checked in for 7 consecutive days" "string:https://example.com/badge1.png" \
 --assume-yes
```

```bash
aptos move run --profile mines_v12_fresh \
 --function-id 0xca4cdf80ef00aa5582149f5797908abb0903727e22d53f26c3cffe7aaaadb47c::badges_v12::create_badge \
 --args u64:3 "string:30-Day Streak" "string:Checked in for 30 consecutive days" "string:https://example.com/badge3.png" \
 --assume-yes
```

```bash
aptos move run --profile mines_v12_fresh \
 --function-id 0xca4cdf80ef00aa5582149f5797908abb0903727e22d53f26c3cffe7aaaadb47c::badges_v12::create_badge \
 --args u64:4 "string:90-Day Streak" "string:Checked in for 90 consecutive days" "string:https://example.com/badge4.png" \
 --assume-yes
```

---

## 4️⃣ Локальна перевірка (НЕ обовʼязково)

```bash
aptos move compile --skip-fetch-latest-git-deps
```

✔ можна
❌ якщо падає — ігноруєш

---

## ❌ ЧОГО НЕ РОБИТИ (це ламає тобі все)

### 🚫 НЕ використовуй

```bash
aptos move publish
```

Причина: `CODE_DESERIALIZATION_ERROR` (VM incompatibility)

---

### 🚫 НЕ роби

```bash
aptos move clean
```

Причина: зносить кеш → тягне інший `aptos-core` → spec-помилки

---

### 🚫 НЕ юзай

```bash
aptos move compile --profile ...
aptos move compile --bytecode-version ...
```

Причина: `compile` не працює з профілями, а байткод тут не лікує

---

## 🧭 ПРАВИЛЬНА ПОСЛІДОВНІСТЬ ДІЙ

1. `cd move_new`
2. `aptos move run ...::initialize` (один раз)
3. `aptos move run ...::create_*`
4. Перевірка в explorer
5. **НЕ чіпаєш clean / publish**

---

## 🧠 ГОЛОВНЕ ПРАВИЛО

> **Movement Testnet = виклики функцій, а не деплой фреймворку**
