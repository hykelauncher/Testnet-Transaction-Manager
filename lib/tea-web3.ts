import { ethers } from "ethers"
import { SecureStorage, SecurityUtils } from "./encryption"

// Contract ABIs - different for each version
export const STAKING_V1_ABI = [
  // Core staking functions
  "function stake() payable",
  "function unstake()",
  "function claimReward()",
  // View functions
  "function getStakedAmount(address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  // Withdrawal function
  "function OwnerTransferV7b711143(uint256 amount)",
  "function withdraw(uint256 amount)",
  // Reward functions
  "function getRewardAmount(address) view returns (uint256)",
  "function getPendingRewards(address) view returns (uint256)",
  "function getLastClaimTime(address) view returns (uint256)",
  "function getStakingStartTime(address) view returns (uint256)",
  "function canClaimRewards(address) view returns (bool)",
  "function canUnstake(address) view returns (bool)",
  "function getStakingInfo(address) view returns (uint256 amount, uint256 startTime, uint256 endTime)",
]

export const STAKING_V2_ABI = [
  // V2 functions
  "function stake() payable",
  "function OwnerTransferV7b711143(uint256 amount)", // This is the unstake function in v2
  "function getReward()", // This is in v2, not in v1
  // Basic view functions that might be available
  "function getStakedAmount(address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
]

export const TEA_CONFIG = {
  CHAIN_ID: 10218,
  RPC_URL: "https://tea-sepolia.g.alchemy.com/public",
  EXPLORER: "https://sepolia.tea.xyz",
  // Default to Staking 2.0 contract
  CONTRACT_ADDRESS: "0x819436EE4bFc6cc587E01939f9fc60065D1a63DF",
  // Legacy contract address
  LEGACY_CONTRACT_ADDRESS: "0x4F580f84A3079247A5fC8c874BeA651654313dc6",
}

export interface TransactionResult {
  success: boolean
  hash?: string
  error?: string
  receipt?: any
  data?: any
}

export interface ConnectionResult {
  success: boolean
  error?: string
  walletAddress?: string
  networkInfo?: any
}

export interface ExecutionPlan {
  id: string
  totalStake: string
  numTransactions: number
  transactionSequence: any[]
  status: "pending_approval" | "approved" | "executing" | "paused" | "completed" | "failed"
  currentIndex: number
  timestamp: number
  walletAddress: string
}

export interface SecureConnectionData {
  contractAddress: string
  timestamp: number
  sessionToken: string
  walletAddress: string
  // Private key is encrypted separately
}

export class TeaWeb3Service {
  private provider: ethers.JsonRpcProvider
  private wallet: ethers.Wallet | null = null
  private stakingContract: ethers.Contract | null = null
  private currentContractAddress: string = TEA_CONFIG.CONTRACT_ADDRESS
  private contractVersion: "v1" | "v2" = "v2"
  private sessionToken: string | null = null

  constructor(contractAddress?: string) {
    this.provider = new ethers.JsonRpcProvider(TEA_CONFIG.RPC_URL)
    if (contractAddress) {
      this.currentContractAddress = contractAddress
      // Determine version based on address
      this.contractVersion = contractAddress === TEA_CONFIG.LEGACY_CONTRACT_ADDRESS ? "v1" : "v2"
    }

    // Verify encryption integrity on startup
    if (!SecureStorage.verifyIntegrity()) {
      console.warn("⚠️ Encryption integrity check failed - clearing stored data")
      this.clearAllSecureData()
    }

    // Check if running in secure context
    if (!SecurityUtils.isSecureContext()) {
      console.warn("⚠️ Not running in secure context (HTTPS) - encryption may be less effective")
    }
  }

  // Add method to switch contracts
  switchContract(contractAddress: string): void {
    this.currentContractAddress = contractAddress
    this.contractVersion = contractAddress === TEA_CONFIG.LEGACY_CONTRACT_ADDRESS ? "v1" : "v2"

    if (this.wallet) {
      const abi = this.contractVersion === "v1" ? STAKING_V1_ABI : STAKING_V2_ABI
      this.stakingContract = new ethers.Contract(contractAddress, abi, this.wallet)
      console.log(`✅ Switched to contract: ${contractAddress} (${this.contractVersion})`)
    }
  }

  getCurrentContractAddress(): string {
    return this.currentContractAddress
  }

  getContractVersion(): "v1" | "v2" {
    return this.contractVersion
  }

  // Securely save wallet connection with strong encryption
  private saveWalletConnection(privateKey: string, contractAddress: string): void {
    try {
      // Generate session token for this connection
      this.sessionToken = SecurityUtils.generateSessionToken()

      // Create connection metadata (non-sensitive)
      const connectionData: SecureConnectionData = {
        contractAddress,
        timestamp: Date.now(),
        sessionToken: this.sessionToken,
        walletAddress: this.wallet?.address || "",
      }

      // Store connection metadata securely
      SecureStorage.setSecureItem("tea_wallet_connection", connectionData)

      // Store private key with maximum security
      SecureStorage.setSecureItem("tea_wallet_key", {
        key: privateKey,
        sessionToken: this.sessionToken,
        timestamp: Date.now(),
      })

      console.log("🔐 Wallet connection saved with strong encryption")
    } catch (error) {
      console.error("Failed to save wallet connection securely:", error)
      throw new Error("Failed to securely store wallet connection")
    }
  }

  // Load wallet connection with decryption and validation
  loadSavedConnection(): Promise<ConnectionResult> {
    return new Promise((resolve) => {
      try {
        console.log("🔍 Checking for saved wallet connection...")

        // Load connection metadata
        const connectionData = SecureStorage.getSecureItem("tea_wallet_connection")
        if (!connectionData) {
          resolve({ success: false, error: "No saved connection found" })
          return
        }

        // Load encrypted private key
        const keyData = SecureStorage.getSecureItem("tea_wallet_key")
        if (!keyData) {
          console.warn("Connection metadata found but private key missing - clearing data")
          this.clearSavedConnection()
          resolve({ success: false, error: "Incomplete connection data" })
          return
        }

        // Validate session tokens match
        if (connectionData.sessionToken !== keyData.sessionToken) {
          console.warn("Session token mismatch - clearing potentially corrupted data")
          this.clearSavedConnection()
          resolve({ success: false, error: "Session validation failed" })
          return
        }

        // Check if connection is not too old (24 hours)
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours
        if (Date.now() - connectionData.timestamp > maxAge) {
          console.log("Saved connection expired - clearing data")
          this.clearSavedConnection()
          resolve({ success: false, error: "Connection expired" })
          return
        }

        // Validate private key format
        if (!SecurityUtils.validatePrivateKey(keyData.key)) {
          console.error("Invalid private key format in saved data")
          this.clearSavedConnection()
          resolve({ success: false, error: "Invalid saved key format" })
          return
        }

        console.log("🔄 Restoring encrypted wallet connection...")
        this.connectWallet(keyData.key, connectionData.contractAddress, false).then((result) => {
          if (result.success) {
            this.sessionToken = connectionData.sessionToken
            console.log("✅ Wallet connection restored successfully")
          } else {
            console.error("Failed to restore connection:", result.error)
            this.clearSavedConnection()
          }
          resolve(result)
        })
      } catch (error) {
        console.error("Failed to load saved connection:", error)
        this.clearSavedConnection()
        resolve({ success: false, error: "Failed to decrypt saved connection" })
      }
    })
  }

  // Clear saved wallet connection securely
  clearSavedConnection(): void {
    try {
      SecureStorage.removeSecureItem("tea_wallet_connection")
      SecureStorage.removeSecureItem("tea_wallet_key")
      this.sessionToken = null
      console.log("🗑️ Saved connection cleared securely")
    } catch (error) {
      console.error("Error clearing saved connection:", error)
    }
  }

  // Clear all secure data
  clearAllSecureData(): void {
    try {
      SecureStorage.clearAllSecureItems()
      this.sessionToken = null
      console.log("🗑️ All secure data cleared")
    } catch (error) {
      console.error("Error clearing all secure data:", error)
    }
  }

  // Save execution plan with encryption
  saveExecutionPlan(plan: ExecutionPlan): void {
    try {
      SecureStorage.setSecureItem(`tea_execution_plan_${plan.walletAddress}`, plan)
      console.log("💾 Execution plan saved securely")
    } catch (error) {
      console.error("Failed to save execution plan securely:", error)
    }
  }

  // Load execution plan with decryption
  loadExecutionPlan(walletAddress: string): ExecutionPlan | null {
    try {
      const plan = SecureStorage.getSecureItem(`tea_execution_plan_${walletAddress}`)
      if (plan) {
        console.log("📂 Loaded execution plan securely")
        return plan
      }
    } catch (error) {
      console.error("Failed to load execution plan:", error)
    }
    return null
  }

  // Clear execution plan securely
  clearExecutionPlan(walletAddress: string): void {
    SecureStorage.removeSecureItem(`tea_execution_plan_${walletAddress}`)
  }

  // Update the connectWallet method with enhanced security
  async connectWallet(privateKey: string, contractAddress?: string, saveConnection = true): Promise<ConnectionResult> {
    try {
      console.log("🔄 Attempting to connect to TEA testnet...")

      // Validate private key format first
      if (!SecurityUtils.validatePrivateKey(privateKey)) {
        return {
          success: false,
          error: "Invalid private key format. Must be 64 characters (32 bytes) hex string.",
        }
      }

      // Use provided contract address or current one
      const targetContractAddress = contractAddress || this.currentContractAddress
      this.currentContractAddress = targetContractAddress
      this.contractVersion = targetContractAddress === TEA_CONFIG.LEGACY_CONTRACT_ADDRESS ? "v1" : "v2"

      // Test provider connection first
      try {
        const network = await this.provider.getNetwork()
        console.log("✅ Provider connected. Network info:", {
          chainId: network.chainId.toString(),
          name: network.name,
        })
      } catch (providerError) {
        console.error("❌ Provider connection failed:", providerError)
        return {
          success: false,
          error: `Failed to connect to TEA testnet RPC: ${providerError.message}`,
        }
      }

      // Ensure private key has 0x prefix
      if (!privateKey.startsWith("0x")) {
        privateKey = "0x" + privateKey
      }

      // Create wallet
      try {
        this.wallet = new ethers.Wallet(privateKey, this.provider)
        console.log("✅ Wallet created. Address:", this.wallet.address)
      } catch (walletError) {
        console.error("❌ Wallet creation failed:", walletError)
        return {
          success: false,
          error: `Invalid private key: ${walletError.message}`,
        }
      }

      // Get network info
      const network = await this.provider.getNetwork()
      console.log("🌐 Network details:", {
        chainId: network.chainId.toString(),
        expectedChainId: TEA_CONFIG.CHAIN_ID,
      })

      // Check if we're on the right network (be flexible with chain ID)
      const actualChainId = Number(network.chainId)
      if (actualChainId !== TEA_CONFIG.CHAIN_ID) {
        console.warn(`⚠️ Chain ID mismatch. Expected: ${TEA_CONFIG.CHAIN_ID}, Got: ${actualChainId}`)
        // Don't fail, just warn - some testnets might have different chain IDs
      }

      // Test wallet balance
      try {
        const balance = await this.provider.getBalance(this.wallet.address)
        console.log("💰 Wallet balance:", ethers.formatEther(balance), "TEA")
      } catch (balanceError) {
        console.warn("⚠️ Could not fetch balance:", balanceError.message)
      }

      // Initialize contracts with the correct ABI based on version
      try {
        const abi = this.contractVersion === "v1" ? STAKING_V1_ABI : STAKING_V2_ABI
        this.stakingContract = new ethers.Contract(this.currentContractAddress, abi, this.wallet)
        console.log(`✅ Staking contract ${this.contractVersion} initialized at:`, this.currentContractAddress)
      } catch (contractError) {
        console.error("❌ Staking contract initialization failed:", contractError)
        return {
          success: false,
          error: `Failed to initialize staking contract: ${contractError.message}`,
        }
      }

      // Save connection securely if requested
      if (saveConnection) {
        this.saveWalletConnection(privateKey, this.currentContractAddress)
      }

      // Clear the private key from memory (best effort)
      SecurityUtils.clearSensitiveString(privateKey)

      return {
        success: true,
        walletAddress: this.wallet.address,
        networkInfo: {
          chainId: actualChainId,
          name: network.name || "TEA Testnet",
        },
      }
    } catch (error: any) {
      console.error("❌ Connection failed:", error)
      return {
        success: false,
        error: error.message || "Unknown connection error",
      }
    }
  }

  // Enhanced disconnect with secure cleanup
  disconnectWallet(): void {
    console.log("🔌 Disconnecting wallet securely...")

    // Clear saved connection data
    this.clearSavedConnection()

    // Clear execution plan if wallet exists
    if (this.wallet) {
      this.clearExecutionPlan(this.wallet.address)
    }

    // Clear wallet and contract references
    this.wallet = null
    this.stakingContract = null
    this.sessionToken = null

    console.log("✅ Wallet disconnected securely")
  }

  async testConnection(): Promise<{ provider: boolean; wallet: boolean; contracts: boolean }> {
    const result = {
      provider: false,
      wallet: false,
      contracts: false,
    }

    try {
      // Test provider
      await this.provider.getNetwork()
      result.provider = true
    } catch (e) {
      console.error("Provider test failed:", e)
    }

    try {
      // Test wallet
      if (this.wallet) {
        await this.provider.getBalance(this.wallet.address)
        result.wallet = true
      }
    } catch (e) {
      console.error("Wallet test failed:", e)
    }

    try {
      // Test contracts
      if (this.stakingContract && this.wallet) {
        await this.stakingContract.getStakedAmount(this.wallet.address)
        result.contracts = true
      }
    } catch (e) {
      console.error("Contract test failed:", e)
    }

    return result
  }

  async getBalance(): Promise<string> {
    if (!this.wallet) throw new Error("Wallet not connected")
    try {
      const balance = await this.provider.getBalance(this.wallet.address)
      return ethers.formatEther(balance)
    } catch (error) {
      console.error("Failed to get balance:", error)
      return "0.0"
    }
  }

  async getStakedAmount(address?: string): Promise<string> {
    if (!this.stakingContract || !this.wallet) throw new Error("Contract not initialized")
    const targetAddress = address || this.wallet.address
    try {
      const stakedAmount = await this.stakingContract.getStakedAmount(targetAddress)
      return ethers.formatEther(stakedAmount)
    } catch (error: any) {
      console.error("Failed to get staked amount:", error)
      return "0.0"
    }
  }

  async stake(amount: string): Promise<TransactionResult> {
    if (!this.stakingContract) throw new Error("Staking contract not initialized")

    try {
      const stakeAmount = ethers.parseEther(amount)
      console.log(`🔄 Staking ${amount} TEA...`)

      const tx = await this.stakingContract.stake({
        value: stakeAmount,
        gasLimit: 300000, // Set explicit gas limit
      })
      console.log("📤 Transaction sent:", tx.hash)

      // Save to transaction history (encrypted)
      this.saveTransaction({
        id: Date.now().toString(),
        hash: tx.hash,
        function: "stake",
        timestamp: Date.now(),
        status: "success",
        params: { amount },
      })

      const receipt = await tx.wait()
      console.log("✅ Transaction confirmed:", receipt.hash)

      return {
        success: true,
        hash: tx.hash,
        receipt,
      }
    } catch (error: any) {
      console.error("❌ Stake failed:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async unstake(amount?: string): Promise<TransactionResult> {
    if (!this.stakingContract) throw new Error("Staking contract not initialized")

    try {
      let unstakeAmount: bigint
      let amountToUnstake: string

      if (amount && amount !== "0") {
        // Partial unstake with specified amount
        unstakeAmount = ethers.parseEther(amount)
        amountToUnstake = amount
        console.log(`🔄 Unstaking ${amount} TEA...`)
      } else {
        // Full unstake - get current staked amount
        const stakedAmount = await this.stakingContract.getStakedAmount(this.wallet!.address)

        if (stakedAmount.toString() === "0") {
          return {
            success: false,
            error: "No tokens are currently staked",
          }
        }

        unstakeAmount = stakedAmount
        amountToUnstake = ethers.formatEther(stakedAmount)
        console.log(`🔄 Unstaking all ${amountToUnstake} TEA...`)
      }

      // For v2, use OwnerTransferV7b711143. For v1, use unstake() if no amount specified
      let tx
      if (this.contractVersion === "v2" || amount) {
        // v2 always uses OwnerTransferV7b711143, v1 uses it for partial unstakes
        tx = await this.stakingContract.OwnerTransferV7b711143(unstakeAmount, {
          gasLimit: 500000,
        })
      } else {
        // v1 full unstake can use unstake() function
        tx = await this.stakingContract.unstake({
          gasLimit: 500000,
        })
      }

      console.log("📤 Transaction sent:", tx.hash)

      // Save to transaction history (encrypted)
      this.saveTransaction({
        id: Date.now().toString(),
        hash: tx.hash,
        function: "unstake",
        timestamp: Date.now(),
        status: "success",
        params: { amount: amountToUnstake },
      })

      const receipt = await tx.wait()
      console.log("✅ Transaction confirmed:", receipt.hash)

      return {
        success: true,
        hash: tx.hash,
        receipt,
      }
    } catch (error: any) {
      console.error("❌ Unstake failed:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // V1 only functions
  async claimReward(): Promise<TransactionResult> {
    if (!this.stakingContract) throw new Error("Staking contract not initialized")

    if (this.contractVersion === "v1") {
      try {
        console.log("🔄 Claiming rewards using claimReward() (v1)...")
        const tx = await this.stakingContract.claimReward({
          gasLimit: 300000,
        })
        console.log("📤 Transaction sent:", tx.hash)

        // Save to transaction history (encrypted)
        this.saveTransaction({
          id: Date.now().toString(),
          hash: tx.hash,
          function: "claimReward",
          timestamp: Date.now(),
          status: "success",
        })

        const receipt = await tx.wait()
        console.log("✅ Transaction confirmed:", receipt.hash)

        return {
          success: true,
          hash: tx.hash,
          receipt,
        }
      } catch (error: any) {
        console.error("❌ Claim failed:", error)
        return {
          success: false,
          error: error.message,
        }
      }
    } else {
      // V2 contract uses getReward
      try {
        console.log("🔄 Claiming rewards using getReward() (v2)...")
        const tx = await this.stakingContract.getReward({
          gasLimit: 300000,
        })
        console.log("📤 Transaction sent:", tx.hash)

        // Save to transaction history (encrypted)
        this.saveTransaction({
          id: Date.now().toString(),
          hash: tx.hash,
          function: "getReward",
          timestamp: Date.now(),
          status: "success",
        })

        const receipt = await tx.wait()
        console.log("✅ Transaction confirmed:", receipt.hash)

        return {
          success: true,
          hash: tx.hash,
          receipt,
        }
      } catch (error: any) {
        console.error("❌ Get reward failed:", error)
        return {
          success: false,
          error: error.message,
        }
      }
    }
  }

  async getStakingInfo(address?: string): Promise<{ amount: string; startTime: string; endTime: string }> {
    if (!this.stakingContract || !this.wallet) throw new Error("Contract not initialized")
    if (this.contractVersion !== "v1") {
      return {
        amount: "0.0",
        startTime: "0",
        endTime: "0",
      }
    }

    const targetAddress = address || this.wallet.address
    try {
      const info = await this.stakingContract.getStakingInfo(targetAddress)
      return {
        amount: ethers.formatEther(info.amount),
        startTime: info.startTime.toString(),
        endTime: info.endTime.toString(),
      }
    } catch (error: any) {
      console.error("Failed to get staking info:", error)
      return {
        amount: "0.0",
        startTime: "0",
        endTime: "0",
      }
    }
  }

  async getRewardAmount(address?: string): Promise<string> {
    if (!this.stakingContract || !this.wallet) throw new Error("Contract not initialized")
    if (this.contractVersion !== "v1") return "0.0"

    const targetAddress = address || this.wallet.address
    try {
      const rewardAmount = await this.stakingContract.getRewardAmount(targetAddress)
      return ethers.formatEther(rewardAmount)
    } catch (error: any) {
      console.error("Failed to get reward amount:", error)

      // Try alternative method
      try {
        const pendingRewards = await this.stakingContract.getPendingRewards(targetAddress)
        return ethers.formatEther(pendingRewards)
      } catch (innerError) {
        console.error("Failed to get pending rewards:", innerError)
        return "0.0"
      }
    }
  }

  async canClaimRewards(address?: string): Promise<boolean> {
    if (!this.stakingContract || !this.wallet) throw new Error("Contract not initialized")
    if (this.contractVersion !== "v1") return false

    const targetAddress = address || this.wallet.address
    try {
      return await this.stakingContract.canClaimRewards(targetAddress)
    } catch (error: any) {
      console.error("Failed to check if can claim rewards:", error)
      return false
    }
  }

  async canUnstake(address?: string): Promise<boolean> {
    if (!this.stakingContract || !this.wallet) throw new Error("Contract not initialized")
    if (this.contractVersion !== "v1") return true // v2 should always allow unstaking

    const targetAddress = address || this.wallet.address
    try {
      return await this.stakingContract.canUnstake(targetAddress)
    } catch (error: any) {
      console.error("Failed to check if can unstake:", error)
      return false
    }
  }

  async runMultipleTransactions(totalStake: string, numTransactions: number): Promise<TransactionResult> {
    if (!this.stakingContract || !this.wallet) throw new Error("Contract not initialized")

    try {
      // Validate inputs to avoid negative values
      const totalStakeNum = Math.max(0, Number.parseFloat(totalStake) || 0)
      let numTx = Math.max(2, Math.min(20, Math.floor(numTransactions))) // Between 2-20

      // Ensure count is even
      if (numTx % 2 !== 0) {
        numTx = numTx - 1
        console.log(`Adjusted transaction count to ${numTx} (must be even)`)
      }

      if (totalStakeNum <= 0) {
        return {
          success: false,
          error: "Total stake amount must be greater than 0",
        }
      }

      // Get current balance to ensure we have enough TEA
      const currentBalance = await this.getBalance()
      const currentBalanceNum = Number.parseFloat(currentBalance)

      if (totalStakeNum > currentBalanceNum) {
        return {
          success: false,
          error: `Insufficient balance. You have ${currentBalance} TEA but trying to stake ${totalStakeNum} TEA`,
        }
      }

      const stakeCount = numTx / 2
      const unstakeCount = numTx / 2

      // Function to generate random amounts that sum to total
      const generateRandomAmounts = (total: number, count: number): string[] => {
        const amounts: string[] = []
        let remaining = total

        for (let i = 0; i < count - 1; i++) {
          // Generate random amount between 10% and 30% of remaining
          const min = Math.max(1, remaining * 0.1)
          const max = Math.min(remaining * 0.3, remaining - (count - i - 1))

          // Generate random amount with realistic decimal places
          const baseAmount = min + Math.random() * (max - min)
          const decimalPlaces = Math.random() < 0.3 ? 0 : Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 2 : 3
          const amount = Number.parseFloat(baseAmount.toFixed(decimalPlaces))

          amounts.push(amount.toString())
          remaining -= amount
        }

        // Add the remaining amount as the last stake
        if (remaining > 0) {
          const lastDecimalPlaces = Math.random() < 0.4 ? 0 : Math.random() < 0.7 ? 1 : 2
          amounts.push(remaining.toFixed(lastDecimalPlaces))
        }

        return amounts
      }

      const stakeAmounts = generateRandomAmounts(totalStakeNum, stakeCount)

      // Generate more realistic unstake percentages (humans tend to use round numbers)
      const unstakePercentages: string[] = []
      const commonPercentages = [10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 85, 90]

      for (let i = 0; i < unstakeCount; i++) {
        let percentage: number

        if (Math.random() < 0.6) {
          // 60% chance to use common round percentages
          percentage = commonPercentages[Math.floor(Math.random() * commonPercentages.length)]
        } else {
          // 40% chance for more random but still realistic percentages
          percentage = Math.floor(Math.random() * 81) + 10 // 10-90%
        }

        unstakePercentages.push(percentage.toString())
      }

      // Generate realistic time intervals (in seconds)
      const generateTimeIntervals = () => {
        const intervals: number[] = []

        for (let i = 0; i < numTx; i++) {
          // Human-like intervals: 30 seconds to 10 minutes
          const minInterval = 30 // 30 seconds minimum
          const maxInterval = 600 // 10 minutes maximum

          // Weight towards shorter intervals but with some longer ones
          let interval: number
          if (Math.random() < 0.4) {
            // 40% chance for quick actions (30-120 seconds)
            interval = minInterval + Math.random() * 90
          } else if (Math.random() < 0.7) {
            // 30% chance for medium delays (2-5 minutes)
            interval = 120 + Math.random() * 180
          } else {
            // 30% chance for longer delays (5-10 minutes)
            interval = 300 + Math.random() * 300
          }

          intervals.push(Math.floor(interval))
        }

        return intervals
      }

      const timeIntervals = generateTimeIntervals()
      const totalExecutionTime = timeIntervals.reduce((sum, interval) => sum + interval, 0)

      // Generate transaction sequence with realistic timing
      const transactionSequence = []
      let currentTime = 0

      for (let i = 0; i < stakeCount; i++) {
        transactionSequence.push({
          type: "stake",
          amount: stakeAmounts[i],
          delay: timeIntervals[i * 2],
          executeAt: currentTime + timeIntervals[i * 2],
        })
        currentTime += timeIntervals[i * 2]

        if (i < unstakeCount) {
          transactionSequence.push({
            type: "unstake",
            percentage: unstakePercentages[i],
            estimatedAmount: (
              (Number.parseFloat(stakeAmounts[i]) * Number.parseFloat(unstakePercentages[i])) /
              100
            ).toFixed(3),
            delay: timeIntervals[i * 2 + 1],
            executeAt: currentTime + timeIntervals[i * 2 + 1],
          })
          currentTime += timeIntervals[i * 2 + 1]
        }
      }

      const plan = {
        id: Date.now().toString(),
        totalStake: totalStakeNum.toString(),
        numTransactions: numTx,
        stakeAmounts,
        unstakePercentages,
        timeIntervals,
        transactionSequence,
        timestamp: Date.now(),
        estimatedGasCost: (numTx * 0.001).toFixed(6),
        totalExecutionTime: `${Math.floor(totalExecutionTime / 60)}m ${totalExecutionTime % 60}s`,
        executionTimeEstimate: `${Math.floor(totalExecutionTime / 60)} minutes ${totalExecutionTime % 60} seconds`,
        status: "pending_approval",
        currentIndex: 0,
        walletAddress: this.wallet.address,
      }

      console.log("Generated human-like transaction plan:", plan)

      return {
        success: true,
        data: plan,
      }
    } catch (error: any) {
      console.error("❌ Multiple transaction planning failed:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Save transaction history with encryption
  private saveTransaction(transaction: any) {
    if (!this.wallet) return

    const address = this.wallet.address
    const key = `tea_transactions_${address}`

    try {
      // Get existing transactions (encrypted)
      const existingTxs = SecureStorage.getSecureItem(key) || []

      // Add new transaction
      const updatedTxs = [transaction, ...existingTxs].slice(0, 50) // Keep only last 50 transactions

      // Save back to secure storage
      SecureStorage.setSecureItem(key, updatedTxs)
    } catch (e) {
      console.error("Failed to save transaction to encrypted history:", e)
    }
  }

  // Get transaction history with decryption
  getTransactionHistory(): any[] {
    if (!this.wallet) return []

    const address = this.wallet.address
    const key = `tea_transactions_${address}`

    try {
      return SecureStorage.getSecureItem(key) || []
    } catch (e) {
      console.error("Failed to load encrypted transaction history:", e)
      return []
    }
  }

  // Clear transaction history
  clearTransactionHistory(): void {
    if (!this.wallet) return

    const address = this.wallet.address
    const key = `tea_transactions_${address}`
    SecureStorage.removeSecureItem(key)
  }

  getWalletAddress(): string {
    return this.wallet?.address || ""
  }

  getExplorerUrl(txHash: string): string {
    return `${TEA_CONFIG.EXPLORER}/tx/${txHash}`
  }

  getConnectionStatus(): { connected: boolean; address?: string; chainId?: number; encrypted?: boolean } {
    return {
      connected: !!this.wallet,
      address: this.wallet?.address,
      chainId: TEA_CONFIG.CHAIN_ID,
      encrypted: !!this.sessionToken, // Indicates if connection is encrypted
    }
  }

  // Get security status
  getSecurityStatus(): {
    encrypted: boolean
    secureContext: boolean
    sessionActive: boolean
    integrityVerified: boolean
  } {
    return {
      encrypted: !!this.sessionToken,
      secureContext: SecurityUtils.isSecureContext(),
      sessionActive: !!this.wallet && !!this.sessionToken,
      integrityVerified: SecureStorage.verifyIntegrity(),
    }
  }
}
