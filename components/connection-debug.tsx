"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import type { TeaWeb3Service } from "@/lib/tea-web3"

interface ConnectionDebugProps {
  web3Service: TeaWeb3Service | null
}

export function ConnectionDebug({ web3Service }: ConnectionDebugProps) {
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)

  const runConnectionTest = async () => {
    if (!web3Service) return

    setTesting(true)
    try {
      const results = await web3Service.testConnection()
      setTestResults(results)
    } catch (error) {
      console.error("Test failed:", error)
      setTestResults({ error: error.message })
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Connection Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runConnectionTest} disabled={testing || !web3Service} className="w-full">
          {testing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>

        {testResults && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">RPC Provider:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.provider)}
                <Badge variant={testResults.provider ? "default" : "destructive"}>
                  {testResults.provider ? "Connected" : "Failed"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Wallet:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.wallet)}
                <Badge variant={testResults.wallet ? "default" : "destructive"}>
                  {testResults.wallet ? "Connected" : "Failed"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Contracts:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.contracts)}
                <Badge variant={testResults.contracts ? "default" : "destructive"}>
                  {testResults.contracts ? "Working" : "Failed"}
                </Badge>
              </div>
            </div>

            {testResults.error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">Error: {testResults.error}</div>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500 space-y-1">
          <p>
            <strong>Troubleshooting:</strong>
          </p>
          <p>• Make sure your private key is correct (64 hex characters)</p>
          <p>• Check if TEA testnet RPC is accessible</p>
          <p>• Verify CONTRACT_ADDRESS environment variable is set</p>
          <p>• Ensure you have TEA testnet tokens for gas</p>
        </div>
      </CardContent>
    </Card>
  )
}
