# TEA Testnet Transaction Manager

A comprehensive testnet transaction manager with advanced features for TEA Staking contracts and multi-testnet support.

## 🚀 Features

### Core Functionality
- 🔗 **Multi-testnet Support** - TEA Sepolia, Ethereum, Polygon, Arbitrum, Base, Optimism
- 🎯 **Human-like Transaction Planning** - Anti-bot detection with realistic patterns
- 📊 **Real-time Staking Dashboard** - Live balance, staking, and rewards tracking
- 🔍 **Bot Activity Scanner** - Analyze wallet patterns for automated behavior
- 📈 **Transaction History** - Complete transaction tracking with explorer links
- ⚡ **Dual Contract Support** - Both v1 and v2 TEA staking contracts

### Advanced Features
- 🤖 **Anti-Bot Randomization** - Variable timing, amounts, and realistic behavior
- 🎲 **Smart Transaction Planning** - Generate human-like transaction sequences
- 📱 **Responsive Design** - Works on desktop and mobile
- 🔒 **Secure Local Storage** - Private keys never leave your browser
- 🌐 **Multi-Network** - Easy switching between different testnets

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Blockchain**: ethers.js v6
- **Styling**: Tailwind CSS with custom components
- **State Management**: React hooks

## 🏗️ Project Structure

\`\`\`
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Main application
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── tea-dashboard.tsx  # Staking dashboard
│   ├── multi-transaction.tsx # Transaction planning
│   ├── bot-detector.tsx   # Bot analysis tool
│   ├── wallet-info.tsx    # Wallet information
│   ├── transaction-history.tsx # Transaction tracking
│   ├── contract-info.tsx  # Contract details
│   └── connection-debug.tsx # Debug tools
├── lib/
│   └── tea-web3.ts       # Web3 service layer
└── hooks/                # Custom React hooks
\`\`\`

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- A testnet wallet with private key

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/YOUR_USERNAME/testnet-transaction-manager.git
   cd testnet-transaction-manager
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   
   Add your environment variables:
   \`\`\`env
   CONTRACT_ADDRESS=0x819436EE4bFc6cc587E01939f9fc60065D1a63DF
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x819436EE4bFc6cc587E01939f9fc60065D1a63DF
   \`\`\`

4. **Run the development server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### 1. Connect Your Wallet
- Select "TEA Sepolia" testnet
- Choose your staking contract (v1 or v2)
- Enter your private key (stored locally only)
- Click "Connect Wallet"

### 2. Basic Staking Operations
- **Stake TEA**: Enter amount and stake tokens
- **Unstake TEA**: Partial or full unstaking
- **Claim Rewards**: Collect accumulated rewards (v1 only)
- **Check Balances**: View staked amounts and rewards

### 3. Human-like Transaction Planning
- Set total TEA amount to stake
- Choose number of transactions (2-20, even numbers)
- Generate randomized transaction plan
- Review and approve the sequence
- Execute with automatic timing

### 4. Bot Detection Analysis
- Enter any wallet address to analyze
- Get risk assessment and pattern analysis
- Receive recommendations for improvement
- Use insights to optimize your own patterns

## 🔧 Configuration

### Supported Networks

| Network | Chain ID | Contract Versions |
|---------|----------|-------------------|
| TEA Sepolia | 10218 | v1, v2 |
| Ethereum Sepolia | 11155111 | Demo |
| Polygon Mumbai | 80001 | Demo |
| Arbitrum Goerli | 421613 | Demo |
| Base Goerli | 84531 | Demo |
| Optimism Goerli | 420 | Demo |

### TEA Staking Contracts

- **v1 Contract**: `0x4F580f84A3079247A5fC8c874BeA651654313dc6`
  - Full feature set with detailed staking info
  - Reward tracking and claiming
  - Advanced analytics

- **v2 Contract**: `0x819436EE4bFc6cc587E01939f9fc60065D1a63DF`
  - Simplified interface
  - Gas optimized
  - Enhanced security

## 🤖 Anti-Bot Features

### Randomization Elements
- **Variable Timing**: 30 seconds to 10 minutes between transactions
- **Realistic Amounts**: Mix of round numbers and decimals
- **Human Patterns**: Mimics natural trading behavior
- **Gas Variation**: Different gas prices to avoid detection
- **Sequence Randomization**: Unpredictable transaction ordering

### Detection Avoidance
- **Pattern Breaking**: Irregular intervals and amounts
- **Behavioral Mimicking**: Human-like decision patterns
- **Risk Assessment**: Built-in bot detection analysis
- **Adaptive Strategies**: Multiple randomization algorithms

## 🔒 Security

### Best Practices
- ✅ Private keys stored locally only
- ✅ No server-side key storage
- ✅ Testnet use only
- ✅ Open source and auditable
- ✅ No external API dependencies for keys

### Important Notes
- 🚨 **Never use mainnet private keys**
- 🚨 **This is for testnet use only**
- 🚨 **Always verify contract addresses**
- 🚨 **Keep your private keys secure**

## 🐛 Troubleshooting

### Common Issues

**Wallet Connection Failed**
- Verify private key format (64 hex characters)
- Check TEA testnet RPC accessibility
- Ensure you have testnet TEA for gas

**Transaction Failed**
- Check wallet balance
- Verify contract address
- Increase gas limit if needed

**Dashboard Not Updating**
- Click the refresh button
- Wait for blockchain confirmation
- Check transaction status in explorer

### Debug Tools
- Use the built-in connection debugger
- Check browser console for errors
- Verify network connectivity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [https://vercel.com/joshuas-projects-1f0167f5/v0-my-testnets](https://vercel.com/joshuas-projects-1f0167f5/v0-my-testnets)
- **v0.dev Project**: [https://v0.dev/chat/projects/Napw2gQWYR9](https://v0.dev/chat/projects/Napw2gQWYR9)
- **TEA Explorer**: [https://sepolia.tea.xyz](https://sepolia.tea.xyz)

## 🙏 Acknowledgments

- Built with [v0.dev](https://v0.dev)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Blockchain integration with [ethers.js](https://ethers.org)
- Deployed on [Vercel](https://vercel.com)

---

**⚠️ Disclaimer**: This tool is for educational and testing purposes only. Never use real funds or mainnet private keys. Always verify contract addresses and transactions before execution.
