"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Wallet, Send, Settings, History, Network, ExternalLink, Shield } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TeaWeb3Service } from "@/lib/tea-web3"
import { TeaDashboard } from "@/components/tea-dashboard"
import { ConnectionDebug } from "@/components/connection-debug"
import { WalletInfo } from "@/components/wallet-info"
import { TransactionHistory } from "@/components/transaction-history"
import { MultiTransaction } from "@/components/multi-transaction"
import { ContractInfo } from "@/components/contract-info"
import { BotDetector } from "@/components/bot-detector"

// All testnet data including TEA and others
const testnets = [
  {
    id: "tea-sepolia",
    name: "TEA Sepolia",
    chainId: 10218,
    rpcUrl: "https://tea-sepolia.g.alchemy.com/public",
    explorer: "https://sepolia.tea.xyz",
    contracts: [
      {
        name: "TEA Staking Contract (v1)",
        address: "0x4F580f84A3079247A5fC8c874BeA651654313dc6",
        functions: [
          "stake",
          "unstake",
          "claimReward",
          "getStakedAmount",
          "getStakingInfo",
          "getRewardAmount",
          "canUnstake",
          "canClaimRewards",
          "runMultipleTransactions",
        ],
      },
      {
        name: "TEA Staking 2.0",
        address: "0x819436EE4bFc6cc587E01939f9fc60065D1a63DF",
        functions: ["stake", "unstake", "getStakedAmount", "claimReward", "runMultipleTransactions"],
      },
    ],
  },
  {
    id: "ethereum-sepolia",
    name: "Ethereum Sepolia",
    chainId: 11155111,
    rpcUrl: "https://sepolia.infura.io/v3/...",
    explorer: "https://sepolia.etherscan.io",
    contracts: [
      {
        name: "ERC20 Token",
        address: "0x1234...5678",
        functions: ["transfer", "approve", "mint", "burn"],
      },
      {
        name: "NFT Contract",
        address: "0xabcd...efgh",
        functions: ["mint", "transfer", "setApprovalForAll"],
      },
      {
        name: "DeFi Protocol",
        address: "0x9876...5432",
        functions: ["stake", "unstake", "claimRewards", "compound"],
      },
    ],
  },
  {
    id: "polygon-mumbai",
    name: "Polygon Mumbai",
    chainId: 80001,
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    explorer: "https://mumbai.polygonscan.com",
    contracts: [
      {
        name: "DeFi Protocol",
        address: "0x9876...5432",
        functions: ["stake", "unstake", "claimRewards", "compound"],
      },
      {
        name: "Marketplace",
        address: "0xfedc...ba98",
        functions: ["listItem", "buyItem", "cancelListing"],
      },
      {
        name: "Gaming Token",
        address: "0x1111...2222",
        functions: ["mint", "burn", "transfer", "approve"],
      },
    ],
  },
  {
    id: "arbitrum-goerli",
    name: "Arbitrum Goerli",
    chainId: 421613,
    rpcUrl: "https://goerli-rollup.arbitrum.io/rpc",
    explorer: "https://goerli.arbiscan.io",
    contracts: [
      {
        name: "Bridge Contract",
        address: "0x1111...2222",
        functions: ["deposit", "withdraw", "bridgeTokens"],
      },
      {
        name: "L2 Token",
        address: "0x3333...4444",
        functions: ["transfer", "approve", "mint"],
      },
    ],
  },
  {
    id: "base-goerli",
    name: "Base Goerli",
    chainId: 84531,
    rpcUrl: "https://goerli.base.org",
    explorer: "https://goerli.basescan.org",
    contracts: [
      {
        name: "Base NFT",
        address: "0x5555...6666",
        functions: ["mint", "transfer", "setApprovalForAll"],
      },
      {
        name: "Base DeFi",
        address: "0x7777...8888",
        functions: ["stake", "unstake", "harvest"],
      },
    ],
  },
  {
    id: "optimism-goerli",
    name: "Optimism Goerli",
    chainId: 420,
    rpcUrl: "https://goerli.optimism.io",
    explorer: "https://goerli-optimism.etherscan.io",
    contracts: [
      {
        name: "OP Token",
        address: "0x9999...aaaa",
        functions: ["transfer", "approve", "delegate"],
      },
      {
        name: "Liquidity Pool",
        address: "0xbbbb...cccc",
        functions: ["addLiquidity", "removeLiquidity", "swap"],
      },
    ],
  },
]

// Transaction templates for all networks
const transactionTemplates = {
  // TEA Staking functions
  stake: {
    name: "Stake TEA",
    description: "Stake TEA tokens to earn rewards",
    params: [{ name: "amount", type: "number", placeholder: "Amount of TEA to stake" }],
  },
  unstake: {
    name: "Unstake TEA",
    description: "Unstake your TEA tokens (specify amount or leave empty for full unstake)",
    params: [
      { name: "amount", type: "number", placeholder: "Amount to unstake (optional - leave empty for full unstake)" },
    ],
  },
  getStakedAmount: {
    name: "Check Staked Amount",
    description: "View your current staked TEA amount",
    params: [{ name: "address", type: "address", placeholder: "Wallet address to check (optional)" }],
  },
  // Reward functions
  claimReward: {
    name: "Claim Rewards",
    description: "Claim your accumulated staking rewards",
    params: [],
  },
  getStakingInfo: {
    name: "Get Staking Info",
    description: "Get detailed staking information (v1 only)",
    params: [{ name: "address", type: "address", placeholder: "Wallet address to check (optional)" }],
  },
  getRewardAmount: {
    name: "Check Reward Amount",
    description: "View your current reward amount (v1 only)",
    params: [{ name: "address", type: "address", placeholder: "Wallet address to check (optional)" }],
  },
  canUnstake: {
    name: "Check If Can Unstake",
    description: "Check if you can unstake your TEA tokens (v1 only)",
    params: [{ name: "address", type: "address", placeholder: "Wallet address to check (optional)" }],
  },
  canClaimRewards: {
    name: "Check If Can Claim Rewards",
    description: "Check if you can claim rewards (v1 only)",
    params: [{ name: "address", type: "address", placeholder: "Wallet address to check (optional)" }],
  },
  // General functions for other testnets
  transfer: {
    name: "Transfer Tokens",
    description: "Send tokens to another address",
    params: [
      { name: "to", type: "address", placeholder: "Recipient address (0x...)" },
      { name: "amount", type: "number", placeholder: "Amount to transfer" },
    ],
  },
  approve: {
    name: "Approve Spending",
    description: "Approve another address to spend tokens",
    params: [
      { name: "spender", type: "address", placeholder: "Spender address (0x...)" },
      { name: "amount", type: "number", placeholder: "Amount to approve" },
    ],
  },
  mint: {
    name: "Mint Tokens/NFT",
    description: "Create new tokens or NFTs",
    params: [
      { name: "to", type: "address", placeholder: "Recipient address (0x...)" },
      { name: "amount", type: "number", placeholder: "Amount to mint" },
    ],
  },
  burn: {
    name: "Burn Tokens",
    description: "Destroy tokens permanently",
    params: [{ name: "amount", type: "number", placeholder: "Amount to burn" }],
  },
  claimRewards: {
    name: "Claim Rewards",
    description: "Claim accumulated rewards",
    params: [],
  },
  compound: {
    name: "Compound Rewards",
    description: "Reinvest rewards automatically",
    params: [],
  },
  listItem: {
    name: "List Item",
    description: "List an item for sale on marketplace",
    params: [
      { name: "tokenId", type: "number", placeholder: "Token ID" },
      { name: "price", type: "number", placeholder: "Price in ETH" },
    ],
  },
  buyItem: {
    name: "Buy Item",
    description: "Purchase an item from marketplace",
    params: [{ name: "tokenId", type: "number", placeholder: "Token ID to buy" }],
  },
  cancelListing: {
    name: "Cancel Listing",
    description: "Remove item from marketplace",
    params: [{ name: "tokenId", type: "number", placeholder: "Token ID to cancel" }],
  },
  deposit: {
    name: "Bridge Deposit",
    description: "Deposit tokens to bridge",
    params: [{ name: "amount", type: "number", placeholder: "Amount to deposit" }],
  },
  withdraw: {
    name: "Bridge Withdraw",
    description: "Withdraw tokens from bridge",
    params: [{ name: "amount", type: "number", placeholder: "Amount to withdraw" }],
  },
  bridgeTokens: {
    name: "Bridge Tokens",
    description: "Bridge tokens to another chain",
    params: [
      { name: "amount", type: "number", placeholder: "Amount to bridge" },
      { name: "destinationChain", type: "number", placeholder: "Destination chain ID" },
    ],
  },
  setApprovalForAll: {
    name: "Set Approval For All",
    description: "Approve operator for all NFTs",
    params: [
      { name: "operator", type: "address", placeholder: "Operator address (0x...)" },
      { name: "approved", type: "checkbox", placeholder: "Approved" },
    ],
  },
  addLiquidity: {
    name: "Add Liquidity",
    description: "Add liquidity to pool",
    params: [
      { name: "tokenA", type: "address", placeholder: "Token A address" },
      { name: "tokenB", type: "address", placeholder: "Token B address" },
      { name: "amountA", type: "number", placeholder: "Amount A" },
      { name: "amountB", type: "number", placeholder: "Amount B" },
    ],
  },
  removeLiquidity: {
    name: "Remove Liquidity",
    description: "Remove liquidity from pool",
    params: [{ name: "liquidity", type: "number", placeholder: "LP tokens to remove" }],
  },
  swap: {
    name: "Swap Tokens",
    description: "Swap one token for another",
    params: [
      { name: "tokenIn", type: "address", placeholder: "Input token address" },
      { name: "tokenOut", type: "address", placeholder: "Output token address" },
      { name: "amountIn", type: "number", placeholder: "Amount to swap" },
    ],
  },
  delegate: {
    name: "Delegate Voting Power",
    description: "Delegate governance voting power",
    params: [{ name: "delegatee", type: "address", placeholder: "Delegatee address (0x...)" }],
  },
  harvest: {
    name: "Harvest Rewards",
    description: "Harvest farming rewards",
    params: [],
  },
  runMultipleTransactions: {
    name: "Human-like Transaction Planning",
    description: "Generate realistic transaction patterns with random intervals and amounts",
    params: [
      { name: "totalStake", type: "number", placeholder: "Total TEA to stake (minimum 0.001)" },
      { name: "numTransactions", type: "number", placeholder: "Number of transactions (2-20, even numbers)" },
    ],
  },
}

export default function TestnetManager() {
  const [selectedTestnet, setSelectedTestnet] = useState("")
  const [selectedContract, setSelectedContract] = useState("")
  const [selectedFunction, setSelectedFunction] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [transactionParams, setTransactionParams] = useState({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [web3Service, setWeb3Service] = useState<TeaWeb3Service | null>(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [transactionResult, setTransactionResult] = useState<any>(null)
  const [refreshDashboard, setRefreshDashboard] = useState(0)

  const currentTestnet = testnets.find((t) => t.id === selectedTestnet)
  const currentContract = currentTestnet?.contracts.find((c) => c.name === selectedContract)
  const currentTemplate = transactionTemplates[selectedFunction as keyof typeof transactionTemplates]

  // Auto-refresh dashboard after successful transactions (only for TEA)
  useEffect(() => {
    if (transactionResult?.success && selectedTestnet === "tea-sepolia") {
      // Add a longer delay to ensure blockchain state has updated
      setTimeout(() => {
        setRefreshDashboard((prev) => prev + 1)
      }, 3000)
    }
  }, [transactionResult, selectedTestnet])

  const handleExecuteTransaction = async () => {
    if (!walletConnected) {
      setTransactionResult({ success: false, error: "Please connect your wallet first" })
      return
    }

    setIsExecuting(true)
    setTransactionResult(null)

    try {
      let result

      // Handle TEA-specific functions
      if (selectedTestnet === "tea-sepolia" && web3Service) {
        switch (selectedFunction) {
          case "stake":
            result = await web3Service.stake(transactionParams.amount || "0")
            break
          case "unstake":
            // Pass the amount if specified, otherwise undefined for full unstake
            const unstakeAmount =
              transactionParams.amount && transactionParams.amount !== "" ? transactionParams.amount : undefined
            result = await web3Service.unstake(unstakeAmount)
            break
          case "claimReward":
            result = await web3Service.claimReward()
            break
          case "getStakedAmount":
            const stakedAmount = await web3Service.getStakedAmount(transactionParams.address)
            result = { success: true, data: `Staked Amount: ${stakedAmount} TEA` }
            break
          case "getStakingInfo":
            const stakingInfo = await web3Service.getStakingInfo(transactionParams.address)
            result = { success: true, data: stakingInfo }
            break
          case "getRewardAmount":
            const rewardAmount = await web3Service.getRewardAmount(transactionParams.address)
            result = { success: true, data: `Reward Amount: ${rewardAmount} TEA` }
            break
          case "canUnstake":
            const canUnstake = await web3Service.canUnstake(transactionParams.address)
            result = { success: true, data: `Can Unstake: ${canUnstake}` }
            break
          case "canClaimRewards":
            const canClaimRewards = await web3Service.canClaimRewards(transactionParams.address)
            result = { success: true, data: `Can Claim Rewards: ${canClaimRewards}` }
            break
          case "runMultipleTransactions":
            const totalStake = Math.max(0.001, Number.parseFloat(transactionParams.totalStake) || 1)
            const numTx = Math.max(
              2,
              Math.min(20, Math.floor(Number.parseFloat(transactionParams.numTransactions) || 4)),
            )
            result = await web3Service.runMultipleTransactions(totalStake.toString(), numTx)
            break
          default:
            result = { success: false, error: "Function not implemented for TEA testnet" }
        }
      } else {
        // Handle other testnets (mock implementation)
        result = {
          success: true,
          hash: "0x" + Math.random().toString(16).substr(2, 64),
          data: `Mock transaction for ${selectedFunction} on ${currentTestnet?.name}`,
        }
      }

      setTransactionResult(result)
    } catch (error: any) {
      setTransactionResult({ success: false, error: error.message })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleConnectWallet = async () => {
    if (!privateKey) {
      setTransactionResult({ success: false, error: "Please enter your private key" })
      return
    }

    // Only use real Web3 service for TEA testnet
    if (selectedTestnet === "tea-sepolia") {
      // Get the selected contract address
      const contractAddress = currentContract?.address || "0x819436EE4bFc6cc587E01939f9fc60065D1a63DF"

      const service = new TeaWeb3Service(contractAddress)
      const result = await service.connectWallet(privateKey)

      if (result.success) {
        setWeb3Service(service)
        setWalletConnected(true)
        setTransactionResult({
          success: true,
          data: `Wallet connected successfully!\nAddress: ${result.walletAddress}\nNetwork: ${result.networkInfo?.name} (Chain ID: ${result.networkInfo?.chainId})\nContract: ${currentContract?.name || "TEA Staking 2.0"} (${service.getContractVersion()})`,
        })
      } else {
        setTransactionResult({ success: false, error: `Failed to connect wallet: ${result.error}` })
        console.error("Connection failed:", result.error)
      }
    } else {
      // Mock connection for other testnets
      setWalletConnected(true)
      setTransactionResult({ success: true, data: `Mock wallet connected for ${currentTestnet?.name}` })
    }
  }

  // Add effect to handle contract switching
  useEffect(() => {
    if (web3Service && currentContract && selectedTestnet === "tea-sepolia") {
      web3Service.switchContract(currentContract.address)
      // Refresh dashboard when contract changes
      setRefreshDashboard((prev) => prev + 1)
    }
  }, [currentContract, web3Service, selectedTestnet])

  const isTeaTestnet = selectedTestnet === "tea-sepolia"
  const isV2Contract = currentContract?.address === "0x819436EE4bFc6cc587E01939f9fc60065D1a63DF"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Testnet Transaction Manager
          </h1>
          <p className="text-slate-600">Execute transactions across multiple testnets with ease</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Network Configuration
                </CardTitle>
                <CardDescription>Select your testnet and contract</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testnet">Testnet</Label>
                  <Select value={selectedTestnet} onValueChange={setSelectedTestnet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a testnet" />
                    </SelectTrigger>
                    <SelectContent>
                      {testnets.map((testnet) => (
                        <SelectItem key={testnet.id} value={testnet.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {testnet.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {currentTestnet && (
                  <div className="space-y-2">
                    <Label>Network Details</Label>
                    <div className="text-sm space-y-1 p-3 bg-slate-50 rounded-lg">
                      <div>
                        Chain ID: <Badge variant="secondary">{currentTestnet.chainId}</Badge>
                      </div>
                      <div className="text-slate-600">Explorer: {currentTestnet.explorer}</div>
                    </div>
                  </div>
                )}

                {currentTestnet && (
                  <div className="space-y-2">
                    <Label htmlFor="contract">Contract</Label>
                    <Select value={selectedContract} onValueChange={setSelectedContract}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contract" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentTestnet.contracts.map((contract) => (
                          <SelectItem key={contract.name} value={contract.name}>
                            <div className="flex items-center gap-2">
                              {contract.name}
                              {contract.address === "0x819436EE4bFc6cc587E01939f9fc60065D1a63DF" && (
                                <Badge variant="outline" className="text-xs">
                                  v2
                                </Badge>
                              )}
                              {contract.address === "0x4F580f84A3079247A5fC8c874BeA651654313dc6" && (
                                <Badge variant="secondary" className="text-xs">
                                  v1
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {currentContract && (
                  <div className="space-y-2">
                    <Label>Contract Address</Label>
                    <div className="text-sm p-2 bg-slate-50 rounded font-mono">{currentContract.address}</div>
                    {isV2Contract && (
                      <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        ⚡ Simplified v2: Only stake(), unstake(), and getReward() functions available
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Wallet Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {!walletConnected ? (
                    <>
                      <Label htmlFor="privateKey">Private Key</Label>
                      <Input
                        id="privateKey"
                        type="password"
                        placeholder="Enter your private key"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                      />
                      <Button
                        onClick={handleConnectWallet}
                        disabled={!privateKey || !selectedTestnet}
                        className="w-full"
                      >
                        Connect Wallet
                      </Button>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {isTeaTestnet
                            ? "Never share your private key. This is for testnet use only."
                            : "Mock connection for demo purposes. Select TEA testnet for real transactions."}
                        </AlertDescription>
                      </Alert>
                      {isTeaTestnet && <ConnectionDebug web3Service={web3Service} />}
                    </>
                  ) : (
                    <>
                      {isTeaTestnet ? (
                        <WalletInfo web3Service={web3Service} walletConnected={walletConnected} />
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <Badge variant="outline">Mock Wallet Connected</Badge>
                          <p className="text-sm text-slate-600 mt-2">Connected to {currentTestnet?.name} (Demo Mode)</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* TEA-specific components */}
            {isTeaTestnet && walletConnected && (
              <>
                <TeaDashboard
                  web3Service={web3Service}
                  walletConnected={walletConnected}
                  refreshTrigger={refreshDashboard}
                />
                <ContractInfo
                  web3Service={web3Service}
                  walletConnected={walletConnected}
                  selectedContract={currentContract}
                />
                <TransactionHistory web3Service={web3Service} walletConnected={walletConnected} />
                <MultiTransaction web3Service={web3Service} walletConnected={walletConnected} />
                <BotDetector web3Service={web3Service} walletConnected={walletConnected} />
              </>
            )}
          </div>

          {/* Transaction Panel */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Transaction Builder
                </CardTitle>
                <CardDescription>
                  {isTeaTestnet
                    ? `Interact with TEA Staking contracts ${isV2Contract ? "(v2 - Simplified)" : "(v1 - Full Features)"}`
                    : "Configure and execute transactions (Demo mode for non-TEA testnets)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentContract ? (
                  <Tabs defaultValue="execute" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="execute">Execute</TabsTrigger>
                      <TabsTrigger value="scanner">
                        <Shield className="h-4 w-4 mr-1" />
                        Bot Scanner
                      </TabsTrigger>
                      <TabsTrigger value="history">{isTeaTestnet ? "History" : "Info"}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="execute" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="function">Function</Label>
                        <Select value={selectedFunction} onValueChange={setSelectedFunction}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a function" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentContract.functions.map((func) => (
                              <SelectItem key={func} value={func}>
                                <div className="flex items-center gap-2">
                                  {transactionTemplates[func as keyof typeof transactionTemplates]?.name || func}
                                  {!isV2Contract &&
                                    ["getStakingInfo", "getRewardAmount", "canUnstake", "canClaimRewards"].includes(
                                      func,
                                    ) && (
                                      <Badge variant="outline" className="text-xs">
                                        v1 only
                                      </Badge>
                                    )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {currentTemplate && (
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-medium text-blue-900">{currentTemplate.name}</h4>
                            <p className="text-sm text-blue-700">{currentTemplate.description}</p>
                            {!isTeaTestnet && (
                              <Badge variant="outline" className="mt-2">
                                Demo Mode
                              </Badge>
                            )}
                            {isV2Contract && selectedFunction === "unstake" && (
                              <div className="mt-2 text-xs text-blue-800 bg-blue-100 p-2 rounded">
                                💡 Tip: Leave amount empty to unstake all your TEA, or enter a specific amount for
                                partial unstake
                              </div>
                            )}
                            {isV2Contract && selectedFunction === "claimReward" && (
                              <div className="mt-2 text-xs text-blue-800 bg-blue-100 p-2 rounded">
                                💡 Note: This will call the getReward() function in the v2 contract
                              </div>
                            )}
                            {selectedFunction === "runMultipleTransactions" && (
                              <div className="mt-2 text-xs text-blue-800 bg-blue-100 p-2 rounded">
                                🎯 Generate human-like transaction patterns with randomized timing, amounts, and
                                realistic behavior to avoid bot detection
                              </div>
                            )}
                          </div>

                          {currentTemplate.params.map((param) => (
                            <div key={param.name} className="space-y-2">
                              <Label htmlFor={param.name} className="capitalize">
                                {param.name}
                                {selectedFunction === "unstake" && param.name === "amount" && (
                                  <span className="text-xs text-slate-500 ml-1">(optional)</span>
                                )}
                              </Label>
                              {param.type === "checkbox" ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={param.name}
                                    onChange={(e) =>
                                      setTransactionParams((prev) => ({
                                        ...prev,
                                        [param.name]: e.target.checked,
                                      }))
                                    }
                                  />
                                  <Label htmlFor={param.name}>{param.placeholder}</Label>
                                </div>
                              ) : (
                                <Input
                                  id={param.name}
                                  type={param.type}
                                  placeholder={param.placeholder}
                                  onChange={(e) =>
                                    setTransactionParams((prev) => ({
                                      ...prev,
                                      [param.name]: e.target.value,
                                    }))
                                  }
                                />
                              )}
                            </div>
                          ))}

                          <div className="space-y-2">
                            <Label htmlFor="gasLimit">Gas Limit (Optional)</Label>
                            <Input id="gasLimit" type="number" placeholder="300000" />
                          </div>

                          <Button
                            onClick={handleExecuteTransaction}
                            disabled={!walletConnected || isExecuting}
                            className="w-full"
                            size="lg"
                          >
                            {isExecuting ? "Executing..." : "Execute Transaction"}
                          </Button>
                        </div>
                      )}

                      {transactionResult && (
                        <div
                          className={`p-4 rounded-lg ${transactionResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                        >
                          <h4
                            className={`font-medium ${transactionResult.success ? "text-green-900" : "text-red-900"}`}
                          >
                            {transactionResult.success ? "Transaction Successful" : "Transaction Failed"}
                          </h4>
                          {transactionResult.hash && (
                            <div className="mt-2">
                              <p className="text-sm text-green-700">Hash: {transactionResult.hash}</p>
                              {isTeaTestnet && web3Service && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2"
                                  onClick={() =>
                                    window.open(web3Service?.getExplorerUrl(transactionResult.hash), "_blank")
                                  }
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View on Explorer
                                </Button>
                              )}
                            </div>
                          )}
                          {transactionResult.error && (
                            <p className="text-sm text-red-700 mt-2">{transactionResult.error}</p>
                          )}
                          {transactionResult.data && (
                            <pre className="text-sm text-green-700 mt-2 bg-green-100 p-2 rounded overflow-auto">
                              {JSON.stringify(transactionResult.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="scanner" className="space-y-4">
                      <BotDetector web3Service={web3Service} walletConnected={walletConnected} />
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4">
                      {isTeaTestnet ? (
                        <div className="text-center py-8 text-slate-500">
                          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Transaction history is shown in the left panel</p>
                          <p className="text-sm">Your TEA transactions will appear there</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                            <div>
                              <h4 className="font-medium">Network Information</h4>
                              <p className="text-sm mt-1">
                                <strong>Name:</strong> {currentTestnet?.name}
                              </p>
                              <p className="text-sm">
                                <strong>Chain ID:</strong> {currentTestnet?.chainId}
                              </p>
                              <p className="text-sm">
                                <strong>RPC URL:</strong> {currentTestnet?.rpcUrl}
                              </p>
                              <p className="text-sm">
                                <strong>Explorer:</strong>{" "}
                                <a
                                  href={currentTestnet?.explorer}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {currentTestnet?.explorer}
                                </a>
                              </p>
                            </div>
                          </div>

                          <div className="p-4 bg-yellow-50 rounded-lg">
                            <h4 className="font-medium text-yellow-900">Demo Mode</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              This testnet is in demo mode. For real blockchain interactions, please use the TEA Sepolia
                              testnet.
                            </p>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Select Configuration</h3>
                    <p>Choose a testnet and contract to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
