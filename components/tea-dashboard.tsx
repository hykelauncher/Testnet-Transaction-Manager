"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, Wallet, Clock, Award } from "lucide-react"
import type { TeaWeb3Service } from "@/lib/tea-web3"

interface TeaDashboardProps {
  web3Service: TeaWeb3Service | null
  walletConnected: boolean
  refreshTrigger?: number
}

export function TeaDashboard({ web3Service, walletConnected, refreshTrigger = 0 }: TeaDashboardProps) {
  const [balance, setBalance] = useState<string>("0")
  const [stakedAmount, setStakedAmount] = useState<string>("0")
  const [stakingInfo, setStakingInfo] = useState<any>(null)
  const [rewardAmount, setRewardAmount] = useState<string>("0")
  const [canUnstake, setCanUnstake] = useState<boolean>(false)
  const [canClaimRewards, setCanClaimRewards] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)

  const refreshData = async () => {
    if (!web3Service || !walletConnected) return

    setLoading(true)
    try {
      // Add a small delay to ensure the blockchain state has updated
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const balanceResult = await web3Service.getBalance()
      setBalance(balanceResult)

      const stakedResult = await web3Service.getStakedAmount()
      setStakedAmount(stakedResult)

      const infoResult = await web3Service.getStakingInfo()
      setStakingInfo(infoResult)

      // Get additional information
      try {
        const rewardResult = await web3Service.getRewardAmount()
        setRewardAmount(rewardResult)
      } catch (e) {
        console.log("Could not get reward amount:", e)
      }

      try {
        const canUnstakeResult = await web3Service.canUnstake()
        setCanUnstake(canUnstakeResult)
      } catch (e) {
        console.log("Could not check if can unstake:", e)
      }

      try {
        const canClaimResult = await web3Service.canClaimRewards()
        setCanClaimRewards(canClaimResult)
      } catch (e) {
        console.log("Could not check if can claim rewards:", e)
      }

      console.log("Dashboard data refreshed:", {
        balance: balanceResult,
        staked: stakedResult,
        info: infoResult,
        rewards: rewardAmount,
        canUnstake,
        canClaimRewards,
      })
    } catch (error) {
      console.error("Failed to refresh dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Initial load and refresh when triggered
  useEffect(() => {
    if (walletConnected) {
      refreshData()
    }
  }, [walletConnected, refreshTrigger])

  if (!walletConnected) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">TEA Wallet Dashboard</h3>
        <Button onClick={refreshData} disabled={loading} size="sm" variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TEA Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number.parseFloat(balance).toFixed(4)} TEA</div>
            <p className="text-xs text-muted-foreground">Available for transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staked Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number.parseFloat(stakedAmount).toFixed(4)} TEA</div>
            <p className="text-xs text-muted-foreground">{canUnstake ? "Available to unstake" : "Currently locked"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rewards</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number.parseFloat(rewardAmount).toFixed(4)} TEA</div>
            <p className="text-xs text-muted-foreground">{canClaimRewards ? "Available to claim" : "Accumulating"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Staking Status</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Status:</span>
            {Number.parseFloat(stakedAmount) > 0 ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>

          {stakingInfo && stakingInfo.startTime !== "0" && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Start Time:</span>
              <span className="text-sm font-medium">
                {new Date(Number.parseInt(stakingInfo.startTime) * 1000).toLocaleString()}
              </span>
            </div>
          )}

          {stakingInfo && stakingInfo.endTime !== "0" && (
            <div className="flex items-center justify-between">
              <span className="text-sm">End Time:</span>
              <span className="text-sm font-medium">
                {new Date(Number.parseInt(stakingInfo.endTime) * 1000).toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
