"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Trash2 } from "lucide-react"
import type { TeaWeb3Service } from "@/lib/tea-web3"

interface Transaction {
  id: string
  hash: string
  function: string
  timestamp: number
  status: "success" | "failed"
  params?: Record<string, any>
}

interface TransactionHistoryProps {
  web3Service: TeaWeb3Service | null
  walletConnected: boolean
}

export function TransactionHistory({ web3Service, walletConnected }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Load transactions from localStorage on component mount
  useEffect(() => {
    if (walletConnected && web3Service) {
      const address = web3Service.getWalletAddress()
      const storedTx = localStorage.getItem(`tea_transactions_${address}`)
      if (storedTx) {
        try {
          setTransactions(JSON.parse(storedTx))
        } catch (e) {
          console.error("Failed to parse transaction history:", e)
        }
      }
    }
  }, [walletConnected, web3Service])

  const clearHistory = () => {
    if (web3Service) {
      const address = web3Service.getWalletAddress()
      localStorage.removeItem(`tea_transactions_${address}`)
      setTransactions([])
    }
  }

  const openExplorer = (hash: string) => {
    if (web3Service) {
      window.open(web3Service.getExplorerUrl(hash), "_blank")
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getFunctionName = (funcName: string) => {
    switch (funcName) {
      case "stake":
        return "Stake TEA"
      case "unstake":
        return "Unstake TEA"
      case "claimReward":
        return "Claim Rewards"
      case "getStakedAmount":
        return "Check Staked Amount"
      case "getStakingInfo":
        return "Get Staking Info"
      default:
        return funcName
    }
  }

  if (!walletConnected || !web3Service) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Transaction History</CardTitle>
        {transactions.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearHistory}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <p>No transaction history yet</p>
            <p className="text-sm">Your transactions will appear here</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={tx.status === "success" ? "default" : "destructive"}>
                    {getFunctionName(tx.function)}
                  </Badge>
                  <span className="text-xs text-slate-500">{formatDate(tx.timestamp)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs truncate max-w-[180px]">{tx.hash}</span>
                  <Button size="sm" variant="outline" onClick={() => openExplorer(tx.hash)}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                {tx.params && Object.keys(tx.params).length > 0 && (
                  <div className="mt-2 text-xs text-slate-600">
                    {Object.entries(tx.params).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
