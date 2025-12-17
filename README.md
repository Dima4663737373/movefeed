# MicroThreads + Tips

A decentralized social tipping platform built on **Movement Network** (Aptos-compatible blockchain).

Creators can share posts and receive tips in MOVE tokens from their supporters. Built with **Next.js** and **Petra Wallet** for on-chain transactions.

---

## 🏗️ Architecture

### Wallet System

- **Petra Wallet**: On-chain transaction signing for Movement Network

Users connect their wallet directly to interact with the dApp.

### Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Blockchain**: Movement Bardock Testnet (Aptos-compatible)
- **Wallet**: Petra Wallet via `@aptos-labs/wallet-adapter-react`
- **Smart Contract**: Move language (TipJar module)

---

## 🚀 Features

✅ **Post Creation** - Create posts with 3 style variants (minimal, gradient, bold)
✅ **Tipping System** - Send MOVE tokens to support creators
✅ **Public Creator Pages** - Each creator gets a `/u/[handle]` page
✅ **Tip History** - View all tips received with transaction links
✅ **Movement Network Integration** - Real on-chain transactions on Movement testnet

---

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Petra Wallet browser extension ([Install here](https://petra.app/))

### Setup

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd microthreads-tips
```

2. **Install dependencies**

```bash
npm install
```

3. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎮 Demo Flow

### For Judges/Testers

1. **Connect Petra Wallet**
   - Install Petra Wallet extension if you haven't
   - Click "Connect Petra Wallet" in the dashboard
   - Approve the connection

2. **Get Test Tokens**
   - Visit [Movement Faucet](https://faucet.movementnetwork.xyz/)
   - Enter your Petra wallet address
   - Request test MOVE tokens

3. **Create a Post**
   - Go to Dashboard
   - Fill in the "Create a Post" form
   - Choose a style variant
   - Click "Publish Post" and approve in Petra

4.88. **View Public Profile**
89.    - Navigate to `/your-handle`
90.    - See your posts displayed publicly
5. **Send a Tip**
   - On any post, click "Send Tip"
   - Enter amount or select preset
   - Approve transaction in Petra wallet

6. **View Tip History**
   - Return to Dashboard
   - See "Recent Tips" section
   - Click transaction hashes to view on explorer

---

## 🔧 How It Works

### Transaction Flow

1. **User connects** Petra wallet (for signing)
2. **User creates post** → Transaction built with `@aptos-labs/ts-sdk`
3. **Petra signs** the transaction
4. **Transaction submitted** to Movement Network RPC
5. **Confirmation** received and displayed

### Move Smart Contract

The `TipJar` module (deployed on Movement) handles:

- `create_post(content, style)` - Creates a new post
- `tip_post(creator, post_id, amount)` - Sends tip to a post
- Events emitted for indexing

**Module Address**: `0x7e218b2d60d7415e97d11aa67841f2b93948b78060eedb102fb0bf118efad0e4`

---

## 📁 Project Structure

```
src/
├── components/
│   ├── WalletConnectButton.tsx    # Petra wallet connection
│   ├── CreatePostForm.tsx         # Post creation form
│   ├── PostCard.tsx               # Post display with tipping
│   ├── TipHistoryTable.tsx        # Tip history display
│   └── ...
├── pages/
│   ├── index.tsx                  # Landing page
│   ├── dashboard.tsx              # Creator dashboard
│   ├── [handle]/
│   │   ├── index.tsx              # Public creator page
│   │   └── status/[id].tsx        # Post detail page
├── lib/
│   ├── movementTx.ts              # Transaction helpers
│   ├── movement.ts                # Network config
│   └── movementClient.ts          # Aptos client
└── types/
    ├── post.ts                    # Post types
    └── tip.ts                     # Tip types
```

---

## 🌐 Movement Network

### RPC Endpoint
```
https://testnet.movementnetwork.xyz/v1
```

### Chain ID
```
250
```

### Explorer
```
https://explorer.movementnetwork.xyz/
```

### Faucet
```
https://faucet.movementnetwork.xyz/
```

---

## ⚠️ Known Limitations

### Mock Data
- **Tip History**: Currently returns mock data. Real implementation requires indexing Move events.
- **Post Fetching**: Posts are mocked. Production needs on-chain storage or indexer.

### Future Improvements
- Real-time event indexing
- Post editing/deletion
- User profiles with bios
- Follower system
- Notifications
- Mobile app

---

## 🔧 Wallet Setup (Razor Wallet Recommended)

For the best experience on Movement Network, we recommend using **Razor Wallet**.

1. **Install Razor Wallet** extension for your browser.
2. **Create/Import Wallet** and switch to **Movement Testnet** (Chain ID 250).
3. **Get Test Tokens** from the faucet inside the wallet or via [Movement Faucet](https://faucet.movementnetwork.xyz/).
4. **Connect** in the dApp and select "Razor".

*Note: Petra Wallet is also supported but may require manual network configuration for Movement.*

---

## 🛠️ Development

### Build for Production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

---

## 📝 Move Module Deployment

The TipJar module is deployed manually to Movement testnet. To deploy your own:

1. Write Move code in `move/` directory
2. Compile with Movement CLI
3. Deploy to testnet
4. Update `TIPJAR_MODULE_ADDRESS` in `src/lib/movement.ts`

See `DEPLOYMENT.md` for detailed instructions.

---

## 🤝 Contributing

This is a hackathon project. Contributions welcome!

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Push and create a PR

---

## 📄 License

MIT License - see LICENSE file

---

## 🙏 Acknowledgments

- **Movement Network** - For the Aptos-compatible L2
- **Aptos Labs** - For the wallet adapter
- **Petra Wallet** - For the best Aptos wallet experience

---

**Built with ❤️ for Movement Network Hackathon**
