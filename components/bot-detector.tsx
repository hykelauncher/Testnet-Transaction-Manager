"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Search, Shield, TrendingUp, Clock, Zap, Target } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { TeaWeb3Service } from "@/lib/tea-web3"

interface BotDetectorProps {
  web3Service: TeaWeb3Service | null
  walletConnected: boolean
}

interface TransactionPattern {
  hash: string
  timestamp: number
  value: string
  gasPrice: string
  gasUsed: string
  type: "stake" | "unstake" | "transfer" | "other"
  blockNumber: number
}

interface BotAnalysis {
  riskScore: number
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  patterns: {
    timingRegularity: number
    amountPatterns: number
    gasOptimization: number
    transactionFrequency: number
    roundNumbers: number
    humanBehavior: number
  }
  flags: string[]
  recommendations: string[]
  transactionCount: number
  analysisDate: number
}

export function BotDetector({ web3Service, walletConnected }: BotDetectorProps) {
  const [targetAddress, setTargetAddress] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<BotAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Mock transaction data for demonstration (in real implementation, this would fetch from blockchain)
  const generateMockTransactions = (address: string, botLikelihood: number): TransactionPattern[] => {
    const transactions: TransactionPattern[] = []
    const now = Date.now()
    const txCount = Math.floor(Math.random() * 50) + 20 // 20-70 transactions

    for (let i = 0; i < txCount; i++) {
      const isBot = Math.random() < botLikelihood

      // Bot-like patterns vs human patterns
      const timestamp = isBot
        ? now - i * (300000 + Math.random() * 60000) // Regular 5-6 min intervals
        : now - i * (Math.random() * 3600000 + 300000) // Random 5min-1hour intervals

      const value = isBot
        ? (Math.floor(Math.random() * 5) + 1).toString() // Round numbers 1-5
        : (Math.random() * 10 + 0.1).toFixed(Math.floor(Math.random() * 4)).toString() // Random decimals

      const gasPrice = isBot
        ? "20000000000" // Always same gas price
        : Math.floor(Math.random() * 10000000000 + 15000000000).toString() // Variable gas

      transactions.push({
        hash: "0x" + Math.random().toString(16).substr(2, 64),
        timestamp,
        value,
        gasPrice,
        gasUsed: Math.floor(Math.random() * 100000 + 21000).toString(),
        type: Math.random() > 0.5 ? "stake" : "unstake",
        blockNumber: 1000000 + i,
      })
    }

    return transactions.sort((a, b) => b.timestamp - a.timestamp)
  }

  const analyzeTransactionPatterns = (transactions: TransactionPattern[]): BotAnalysis => {
    if (transactions.length === 0) {
      return {
        riskScore: 0,
        riskLevel: "LOW",
        patterns: {
          timingRegularity: 0,
          amountPatterns: 0,
          gasOptimization: 0,
          transactionFrequency: 0,
          roundNumbers: 0,
          humanBehavior: 100,
        },
        flags: [],
        recommendations: ["No transactions found to analyze"],
        transactionCount: 0,
        analysisDate: Date.now(),
      }
    }

    const flags: string[] = []
    const recommendations: string[] = []

    // 1. Timing Regularity Analysis
    const timeIntervals = []
    for (let i = 1; i < transactions.length; i++) {
      timeIntervals.push(transactions[i - 1].timestamp - transactions[i].timestamp)
    }

    const avgInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length
    const intervalVariance =
      timeIntervals.reduce((acc, interval) => acc + Math.pow(interval - avgInterval, 2), 0) / timeIntervals.length
    const timingRegularity = Math.max(0, 100 - (Math.sqrt(intervalVariance) / avgInterval) * 100)

    if (timingRegularity > 80) {
      flags.push("🤖 Highly regular transaction timing detected")
      recommendations.push("Consider varying transaction intervals to appear more human-like")
    }

    // 2. Amount Pattern Analysis
    const amounts = transactions.map((tx) => Number.parseFloat(tx.value))
    const roundAmounts = amounts.filter((amount) => amount === Math.floor(amount)).length
    const roundNumberPercentage = (roundAmounts / amounts.length) * 100

    if (roundNumberPercentage > 70) {
      flags.push("🎯 Excessive use of round numbers detected")
      recommendations.push("Use more varied decimal amounts to mimic human behavior")
    }

    // 3. Gas Optimization Analysis
    const gasPrices = transactions.map((tx) => Number.parseInt(tx.gasPrice))
    const uniqueGasPrices = new Set(gasPrices).size
    const gasOptimization = Math.max(0, 100 - (uniqueGasPrices / gasPrices.length) * 100)

    if (gasOptimization > 60) {
      flags.push("⛽ Consistent gas price optimization detected")
      recommendations.push("Vary gas prices to avoid detection patterns")
    }

    // 4. Transaction Frequency Analysis
    const last24h = transactions.filter((tx) => Date.now() - tx.timestamp < 86400000).length
    const transactionFrequency = Math.min(100, (last24h / 50) * 100) // Normalize to 50 tx/day = 100%

    if (last24h > 20) {
      flags.push("📈 High transaction frequency in last 24 hours")
      recommendations.push("Consider reducing transaction frequency to avoid suspicion")
    }

    // 5. Amount Pattern Variance
    const amountVariance =
      amounts.reduce(
        (acc, amount) => acc + Math.pow(amount - amounts.reduce((a, b) => a + b, 0) / amounts.length, 2),
        0,
      ) / amounts.length
    const amountPatterns = Math.max(0, 100 - Math.sqrt(amountVariance) * 10)

    if (amountPatterns > 70) {
      flags.push("💰 Similar transaction amounts detected")
      recommendations.push("Increase variation in transaction amounts")
    }

    // 6. Human Behavior Score
    const humanBehavior = Math.max(0, 100 - (timingRegularity + gasOptimization + amountPatterns) / 3)

    // Calculate overall risk score
    const riskScore = Math.min(
      100,
      (timingRegularity + gasOptimization + amountPatterns + transactionFrequency + roundNumberPercentage) / 5,
    )

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    if (riskScore < 25) riskLevel = "LOW"
    else if (riskScore < 50) riskLevel = "MEDIUM"
    else if (riskScore < 75) riskLevel = "HIGH"
    else riskLevel = "CRITICAL"

    // Add general recommendations
    if (riskScore > 50) {
      recommendations.push("Consider implementing more randomization in your transaction patterns")
      recommendations.push("Add random delays between transactions")
      recommendations.push("Use varied transaction amounts with realistic decimal places")
    }

    return {
      riskScore: Math.round(riskScore),
      riskLevel,
      patterns: {
        timingRegularity: Math.round(timingRegularity),
        amountPatterns: Math.round(amountPatterns),
        gasOptimization: Math.round(gasOptimization),
        transactionFrequency: Math.round(transactionFrequency),
        roundNumbers: Math.round(roundNumberPercentage),
        humanBehavior: Math.round(humanBehavior),
      },
      flags,
      recommendations,
      transactionCount: transactions.length,
      analysisDate: Date.now(),
    }
  }

  const handleAnalyzeWallet = async () => {
    if (!targetAddress) {
      setError("Please enter a wallet address")
      return
    }

    if (!targetAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Invalid wallet address format")
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setAnalysis(null)

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Generate mock data based on address (for demo)
      const addressSum = targetAddress.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
      const botLikelihood = (addressSum % 100) / 100 // Pseudo-random based on address

      const transactions = generateMockTransactions(targetAddress, botLikelihood)
      const analysisResult = analyzeTransactionPatterns(transactions)

      setAnalysis(analysisResult)
    } catch (error: any) {
      setError(`Analysis failed: ${error.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "text-green-600 bg-green-50 border-green-200"
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "HIGH":
        return "text-orange-600 bg-orange-50 border-orange-200"
      case "CRITICAL":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getPatternIcon = (pattern: string) => {
    switch (pattern) {
      case "timingRegularity":
        return <Clock className="h-4 w-4" />
      case "amountPatterns":
        return <Target className="h-4 w-4" />
      case "gasOptimization":
        return <Zap className="h-4 w-4" />
      case "transactionFrequency":
        return <TrendingUp className="h-4 w-4" />
      case "roundNumbers":
        return <Target className="h-4 w-4" />
      case "humanBehavior":
        return <Shield className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getPatternName = (pattern: string) => {
    switch (pattern) {
      case "timingRegularity":
        return "Timing Regularity"
      case "amountPatterns":
        return "Amount Patterns"
      case "gasOptimization":
        return "Gas Optimization"
      case "transactionFrequency":
        return "Transaction Frequency"
      case "roundNumbers":
        return "Round Numbers Usage"
      case "humanBehavior":
        return "Human Behavior Score"
      default:
        return pattern
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Bot Activity Scanner
        </CardTitle>
        <CardDescription>Analyze wallet transaction patterns to detect automated behavior</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="targetAddress">Wallet Address to Analyze</Label>
          <div className="flex gap-2">
            <Input
              id="targetAddress"
              type="text"
              placeholder="0x... (Enter wallet address)"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAnalyzeWallet} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Search className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </div>
          {walletConnected && web3Service && (
            <Button variant="outline" size="sm" onClick={() => setTargetAddress(web3Service.getWalletAddress())}>
              Use My Wallet
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysis && (
          <div className="space-y-4">
            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Analysis Results</h4>
              <div className={`p-4 rounded-lg border ${getRiskColor(analysis.riskLevel)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Bot Risk Assessment</span>
                  <Badge variant="outline" className={getRiskColor(analysis.riskLevel)}>
                    {analysis.riskLevel} RISK
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">Risk Score:</span>
                  <Progress value={analysis.riskScore} className="flex-1 h-2" />
                  <span className="text-sm font-medium">{analysis.riskScore}/100</span>
                </div>
                <div className="text-xs opacity-75">Based on analysis of {analysis.transactionCount} transactions</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Pattern Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(analysis.patterns).map(([pattern, score]) => (
                  <div key={pattern} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {getPatternIcon(pattern)}
                      <span className="text-sm font-medium">{getPatternName(pattern)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={score} className="flex-1 h-2" />
                      <span className="text-xs font-medium w-8">{score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {analysis.flags.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-orange-700">⚠️ Detected Patterns</h4>
                <div className="space-y-1">
                  {analysis.flags.map((flag, index) => (
                    <div key={index} className="text-sm p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                      {flag}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium text-blue-700">💡 Recommendations</h4>
              <div className="space-y-1">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="text-sm p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                    {rec}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded">
              <strong>Analysis Details:</strong>
              <br />• Timing patterns: Measures regularity in transaction intervals
              <br />• Amount patterns: Detects repetitive or overly similar amounts
              <br />• Gas optimization: Identifies consistent gas price usage
              <br />• Transaction frequency: Monitors unusual activity levels
              <br />• Round numbers: Flags excessive use of whole numbers
              <br />• Human behavior: Overall assessment of natural trading patterns
              <br />
              <br />
              Analysis completed on {new Date(analysis.analysisDate).toLocaleString()}
            </div>
          </div>
        )}

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Privacy Notice:</strong> This tool analyzes publicly available blockchain data. No private
            information is accessed or stored. Use responsibly and in compliance with applicable laws.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
