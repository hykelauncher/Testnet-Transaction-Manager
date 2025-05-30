"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, RefreshCw, CheckCircle, XCircle, Timer, Play, Pause, Square } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { TeaWeb3Service } from "@/lib/tea-web3"

interface MultiTransactionProps {
  web3Service: TeaWeb3Service | null
  walletConnected: boolean
}

export function MultiTransaction({ web3Service, walletConnected }: MultiTransactionProps) {
  const [totalStake, setTotalStake] = useState<string>("10")
  const [numTransactions, setNumTransactions] = useState<number>(4)
  const [isGenerating, setIsGenerating] = useState(false)
  const [transactionPlan, setTransactionPlan] = useState<any>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [executionStatus, setExecutionStatus] = useState<"idle" | "running" | "paused" | "completed" | "failed">("idle")

  // Load saved execution plan on component mount
  useEffect(() => {
    if (walletConnected && web3Service) {
      const walletAddress = web3Service.getWalletAddress()
      const savedPlan = web3Service.loadExecutionPlan(walletAddress)

      if (savedPlan && savedPlan.status !== "completed") {
        setTransactionPlan(savedPlan)
        setCurrentTransactionIndex(savedPlan.currentIndex || 0)
        setExecutionStatus(savedPlan.status)

        if (savedPlan.status === "executing" || savedPlan.status === "running") {
          // Resume execution if it was running
          setIsExecuting(true)
          console.log("📂 Resumed execution plan from localStorage")
        }
      }
    }
  }, [walletConnected, web3Service])

  // Save execution plan whenever it changes
  useEffect(() => {
    if (transactionPlan && web3Service && walletConnected) {
      const updatedPlan = {
        ...transactionPlan,
        currentIndex: currentTransactionIndex,
        status: executionStatus,
      }
      web3Service.saveExecutionPlan(updatedPlan)
    }
  }, [transactionPlan, currentTransactionIndex, executionStatus, web3Service, walletConnected])

  const handleGeneratePlan = async () => {
    if (!web3Service || !walletConnected) return

    // Validate inputs to prevent negative values
    const validatedStake = Math.max(0.001, Number.parseFloat(totalStake) || 1)
    const validatedTx = Math.max(2, Math.min(20, numTransactions))
    const evenTx = validatedTx % 2 === 0 ? validatedTx : validatedTx - 1

    // Update state with validated values
    setTotalStake(validatedStake.toString())
    setNumTransactions(evenTx)

    setIsGenerating(true)
    try {
      const result = await web3Service.runMultipleTransactions(validatedStake.toString(), evenTx)
      if (result.success && result.data) {
        setTransactionPlan(result.data)
        setCurrentTransactionIndex(0)
        setExecutionStatus("idle")
      } else {
        setTransactionPlan({ error: result.error || "Failed to generate plan" })
      }
    } catch (error: any) {
      setTransactionPlan({ error: error.message })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprovePlan = () => {
    if (transactionPlan) {
      const approvedPlan = { ...transactionPlan, status: "approved" }
      setTransactionPlan(approvedPlan)
      setExecutionStatus("approved")
    }
  }

  const handleRejectPlan = () => {
    if (web3Service && walletConnected) {
      web3Service.clearExecutionPlan(web3Service.getWalletAddress())
    }
    setTransactionPlan(null)
    setExecutionStatus("idle")
    setCurrentTransactionIndex(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  // Countdown and execution logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (countdown > 0 && executionStatus === "running") {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    } else if (countdown === 0 && executionStatus === "running" && transactionPlan) {
      // Execute the current transaction
      executeCurrentTransaction()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [countdown, executionStatus, currentTransactionIndex])

  const executeCurrentTransaction = async () => {
    if (!transactionPlan || !web3Service || currentTransactionIndex >= transactionPlan.transactionSequence.length) {
      setExecutionStatus("completed")
      setIsExecuting(false)
      return
    }

    const currentTx = transactionPlan.transactionSequence[currentTransactionIndex]

    try {
      console.log(
        `🔄 Executing transaction ${currentTransactionIndex + 1}/${transactionPlan.transactionSequence.length}:`,
        currentTx,
      )

      let result
      if (currentTx.type === "stake") {
        result = await web3Service.stake(currentTx.amount)
      } else {
        // For unstake, calculate the actual amount based on current staked amount
        const currentStaked = await web3Service.getStakedAmount()
        const unstakeAmount = (
          (Number.parseFloat(currentStaked) * Number.parseFloat(currentTx.percentage)) /
          100
        ).toString()
        result = await web3Service.unstake(unstakeAmount)
      }

      if (result.success) {
        console.log(`✅ Transaction ${currentTransactionIndex + 1} completed:`, result.hash)

        // Update the transaction plan with execution results
        const updatedSequence = [...transactionPlan.transactionSequence]
        updatedSequence[currentTransactionIndex] = {
          ...currentTx,
          executed: true,
          hash: result.hash,
          executedAt: Date.now(),
        }

        const updatedPlan = {
          ...transactionPlan,
          transactionSequence: updatedSequence,
        }
        setTransactionPlan(updatedPlan)

        // Move to next transaction
        const nextIndex = currentTransactionIndex + 1
        if (nextIndex < transactionPlan.transactionSequence.length) {
          setCurrentTransactionIndex(nextIndex)
          const nextDelay = transactionPlan.transactionSequence[nextIndex].delay
          setCountdown(nextDelay)
        } else {
          setExecutionStatus("completed")
          setIsExecuting(false)
          console.log("🎉 All transactions completed!")

          // Clear the saved plan since it's completed
          if (web3Service) {
            web3Service.clearExecutionPlan(web3Service.getWalletAddress())
          }
        }
      } else {
        console.error(`❌ Transaction ${currentTransactionIndex + 1} failed:`, result.error)
        setExecutionStatus("failed")
        setIsExecuting(false)
      }
    } catch (error: any) {
      console.error(`❌ Transaction ${currentTransactionIndex + 1} error:`, error)
      setExecutionStatus("failed")
      setIsExecuting(false)
    }
  }

  const startExecution = () => {
    if (!transactionPlan || transactionPlan.transactionSequence.length === 0) return

    setExecutionStatus("running")
    setIsExecuting(true)

    // Start with the current transaction's delay (in case we're resuming)
    const currentDelay = transactionPlan.transactionSequence[currentTransactionIndex].delay
    setCountdown(currentDelay)
  }

  const pauseExecution = () => {
    setExecutionStatus("paused")
    setIsExecuting(false)
  }

  const resumeExecution = () => {
    setExecutionStatus("running")
    setIsExecuting(true)
  }

  const stopExecution = () => {
    setExecutionStatus("idle")
    setIsExecuting(false)
    setCurrentTransactionIndex(0)
    setCountdown(0)

    // Clear the saved plan
    if (web3Service && walletConnected) {
      web3Service.clearExecutionPlan(web3Service.getWalletAddress())
    }
    setTransactionPlan(null)
  }

  if (!walletConnected || !web3Service) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Human-like Transaction Planning
        </CardTitle>
        <CardDescription>
          Generate realistic transaction patterns with random intervals - Plans persist across page refreshes!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="totalStake">Total TEA to Stake</Label>
          <Input
            id="totalStake"
            type="number"
            min="0.001"
            step="0.001"
            value={totalStake}
            onChange={(e) => {
              const value = Math.max(0.001, Number.parseFloat(e.target.value) || 0.001)
              setTotalStake(value.toString())
            }}
            disabled={executionStatus === "running" || executionStatus === "paused"}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="numTransactions">Number of Transactions</Label>
            <Badge variant="outline">{numTransactions}</Badge>
          </div>
          <Slider
            id="numTransactions"
            min={2}
            max={20}
            step={2}
            value={[numTransactions]}
            onValueChange={(value) => setNumTransactions(value[0])}
            disabled={executionStatus === "running" || executionStatus === "paused"}
          />
          <p className="text-xs text-slate-500">
            This will create {numTransactions / 2} stake and {numTransactions / 2} unstake operations with random timing
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGeneratePlan}
            disabled={isGenerating || executionStatus === "running" || executionStatus === "paused"}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate New Plan"
            )}
          </Button>

          {transactionPlan && transactionPlan.status === "pending_approval" && (
            <>
              <Button onClick={handleApprovePlan} variant="default" size="sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button onClick={handleRejectPlan} variant="destructive" size="sm">
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}

          {transactionPlan &&
            (transactionPlan.status === "approved" || transactionPlan.status === "paused") &&
            executionStatus !== "running" &&
            executionStatus !== "completed" && (
              <Button onClick={startExecution} variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-1" />
                {executionStatus === "paused" ? "Resume" : "Start"}
              </Button>
            )}

          {executionStatus === "running" && (
            <>
              <Button onClick={pauseExecution} variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
              <Button onClick={stopExecution} variant="destructive" size="sm">
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </>
          )}

          {(executionStatus === "completed" || executionStatus === "failed") && (
            <Button
              onClick={() => {
                setTransactionPlan(null)
                setExecutionStatus("idle")
                setCurrentTransactionIndex(0)
              }}
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>

        {transactionPlan && (
          <div className="mt-4 space-y-4">
            <Alert
              className={
                transactionPlan.status === "approved" || executionStatus === "running" || executionStatus === "paused"
                  ? "border-green-200 bg-green-50"
                  : executionStatus === "completed"
                    ? "border-blue-200 bg-blue-50"
                    : executionStatus === "failed"
                      ? "border-red-200 bg-red-50"
                      : ""
              }
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {executionStatus === "running"
                  ? "🔄 Plan is executing - will continue even if you refresh the page!"
                  : executionStatus === "paused"
                    ? "⏸️ Plan is paused - you can resume anytime, even after page refresh!"
                    : executionStatus === "completed"
                      ? "✅ Plan completed successfully!"
                      : executionStatus === "failed"
                        ? "❌ Plan execution failed!"
                        : transactionPlan.status === "approved"
                          ? "✅ Plan approved and ready for execution!"
                          : "⏳ Plan generated - please review and approve or reject"}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Transaction Plan Summary</h4>
              <div className="text-sm space-y-1 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between">
                  <span>Plan ID:</span>
                  <span className="font-mono text-xs">{transactionPlan.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total stake:</span>
                  <span className="font-medium text-blue-700">{transactionPlan.totalStake} TEA</span>
                </div>
                <div className="flex justify-between">
                  <span>Number of transactions:</span>
                  <span className="font-medium">{transactionPlan.numTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total execution time:</span>
                  <span className="font-medium">{transactionPlan.totalExecutionTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated gas cost:</span>
                  <span className="font-medium">{transactionPlan.estimatedGasCost} TEA</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge
                    variant={
                      executionStatus === "running"
                        ? "default"
                        : executionStatus === "paused"
                          ? "secondary"
                          : executionStatus === "completed"
                            ? "outline"
                            : executionStatus === "failed"
                              ? "destructive"
                              : transactionPlan.status === "approved"
                                ? "default"
                                : "secondary"
                    }
                  >
                    {executionStatus === "running"
                      ? "Running"
                      : executionStatus === "paused"
                        ? "Paused"
                        : executionStatus === "completed"
                          ? "Completed"
                          : executionStatus === "failed"
                            ? "Failed"
                            : transactionPlan.status === "approved"
                              ? "Approved"
                              : "Pending Review"}
                  </Badge>
                </div>
              </div>
            </div>

            {(executionStatus === "running" ||
              executionStatus === "paused" ||
              executionStatus === "completed" ||
              executionStatus === "failed") && (
              <div className="space-y-2">
                <h4 className="font-medium">Execution Status</h4>
                <div className="text-sm space-y-2 p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Progress:</span>
                    <span className="font-medium">
                      {executionStatus === "completed"
                        ? transactionPlan.transactionSequence.length
                        : currentTransactionIndex}{" "}
                      / {transactionPlan.transactionSequence.length}
                    </span>
                  </div>

                  {countdown > 0 && executionStatus === "running" && (
                    <div className="flex justify-between items-center">
                      <span>Next transaction in:</span>
                      <Badge variant="outline" className="font-mono">
                        {formatTime(countdown)}
                      </Badge>
                    </div>
                  )}

                  {executionStatus === "running" &&
                    currentTransactionIndex < transactionPlan.transactionSequence.length && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                        <div className="text-xs font-medium text-blue-900">
                          Next: {transactionPlan.transactionSequence[currentTransactionIndex].type}{" "}
                          {transactionPlan.transactionSequence[currentTransactionIndex].type === "stake"
                            ? transactionPlan.transactionSequence[currentTransactionIndex].amount
                            : transactionPlan.transactionSequence[currentTransactionIndex].percentage + "%"}{" "}
                          TEA
                        </div>
                      </div>
                    )}

                  {executionStatus === "paused" && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <div className="text-xs font-medium text-yellow-900">
                        ⏸️ Execution paused. You can resume anytime, even after refreshing the page!
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Detailed Transaction Sequence</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {transactionPlan.transactionSequence.map((tx: any, index: number) => (
                  <div
                    key={`tx-${index}`}
                    className={`flex items-center justify-between text-sm p-3 rounded border-l-4 ${
                      tx.executed
                        ? "bg-green-50 border-l-green-400"
                        : index === currentTransactionIndex &&
                            (executionStatus === "running" || executionStatus === "paused")
                          ? "bg-blue-50 border-l-blue-400"
                          : "bg-slate-50 border-l-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono bg-slate-200 px-1 rounded">#{index + 1}</span>
                        {tx.executed ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : index === currentTransactionIndex &&
                          (executionStatus === "running" || executionStatus === "paused") ? (
                          <Timer className="h-3 w-3 text-blue-500 animate-pulse" />
                        ) : (
                          <Timer className="h-3 w-3 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium capitalize">
                          {tx.type} {tx.type === "stake" ? tx.amount : `${tx.percentage}%`} TEA
                        </div>
                        <div className="text-xs text-slate-500">
                          {tx.executed ? (
                            <>Executed at {new Date(tx.executedAt).toLocaleTimeString()}</>
                          ) : (
                            <>
                              Execute after {formatTime(tx.delay)} delay
                              {tx.type === "unstake" && ` (≈${tx.estimatedAmount} TEA)`}
                            </>
                          )}
                        </div>
                        {tx.hash && (
                          <div className="text-xs text-green-600 font-mono">{tx.hash.substring(0, 10)}...</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tx.type === "stake" ? "default" : "secondary"}>{tx.type}</Badge>
                      {tx.executed && (
                        <Badge variant="outline" className="text-green-600">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Persistence Features</h4>
              <div className="text-xs text-slate-600 space-y-1 p-3 bg-purple-50 rounded-lg">
                <p>
                  💾 <strong>Auto-Save:</strong> Plans are automatically saved to your browser
                </p>
                <p>
                  🔄 <strong>Page Refresh Safe:</strong> Execution continues even after refreshing
                </p>
                <p>
                  ⏸️ <strong>Pause & Resume:</strong> Stop and continue execution anytime
                </p>
                <p>
                  📱 <strong>Offline Resilient:</strong> Plans resume when you come back online
                </p>
                <p>
                  🎯 <strong>Smart Recovery:</strong> Automatically detects and resumes interrupted plans
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Randomization Features</h4>
              <div className="text-xs text-slate-600 space-y-1 p-3 bg-yellow-50 rounded-lg">
                <p>
                  🎲 <strong>Random amounts:</strong> Stake amounts use realistic decimal places (0-3 digits)
                </p>
                <p>
                  ⏰ <strong>Variable timing:</strong> Delays range from 30 seconds to 10 minutes
                </p>
                <p>
                  📊 <strong>Human percentages:</strong> Mix of round numbers (25%, 50%) and random values
                </p>
                <p>
                  🔄 <strong>Natural distribution:</strong> Amounts vary between 5-40% of total stake
                </p>
                <p>
                  ⚡ <strong>Realistic patterns:</strong> Mimics human trading behavior
                </p>
              </div>
            </div>

            {transactionPlan.status === "pending_approval" && (
              <Alert className="bg-orange-50 border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-800" />
                <AlertDescription className="text-orange-800">
                  Please review the transaction sequence above. You can approve to proceed or reject to generate a new
                  plan with different randomization.
                </AlertDescription>
              </Alert>
            )}

            {transactionPlan.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>Error: {transactionPlan.error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
