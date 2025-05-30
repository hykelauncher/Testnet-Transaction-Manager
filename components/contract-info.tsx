"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, CheckCircle } from "lucide-react"
import type { TeaWeb3Service } from "@/lib/tea-web3"

interface ContractInfoProps {
  web3Service: TeaWeb3Service | null
  walletConnected: boolean
  selectedContract?: { name: string; address: string }
}

export function ContractInfo({ web3Service, walletConnected, selectedContract }: ContractInfoProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const openExplorer = (address: string) => {
    window.open(`https://sepolia.tea.xyz/address/${address}`, "_blank")
  }

  if (!walletConnected || !selectedContract) {
    return null
  }

  const isStaking20 = selectedContract.address === "0x819436EE4bFc6cc587E01939f9fc60065D1a63DF"
  const currentContractAddress = web3Service?.getCurrentContractAddress()
  const isActiveContract = currentContractAddress === selectedContract.address

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isActiveContract && <CheckCircle className="h-5 w-5 text-green-500" />}
          Contract Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Contract:</span>
            <div className="flex items-center gap-2">
              <Badge variant={isStaking20 ? "default" : "secondary"}>{selectedContract.name}</Badge>
              {isStaking20 && <Badge variant="outline">Latest</Badge>}
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded font-mono text-sm">
            <span className="flex-1">{selectedContract.address}</span>
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(selectedContract.address)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openExplorer(selectedContract.address)}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isStaking20 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900">TEA Staking 2.0</h4>
            <p className="text-sm text-blue-700 mt-1">
              This is the latest staking contract with improved features and gas optimization.
            </p>
            <div className="mt-2 text-xs text-blue-600">
              <p>• Enhanced reward calculation</p>
              <p>• Lower gas fees</p>
              <p>• Better security features</p>
            </div>
          </div>
        )}

        {!isStaking20 && (
          <div className="p-3 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-900">Legacy Contract</h4>
            <p className="text-sm text-yellow-700 mt-1">
              This is the original staking contract. Consider migrating to Staking 2.0 for better features.
            </p>
          </div>
        )}

        <div className="text-xs text-slate-500 space-y-1">
          <p>
            <strong>Network:</strong> TEA Sepolia Testnet
          </p>
          <p>
            <strong>Chain ID:</strong> 10218
          </p>
          <p>
            <strong>Status:</strong> {isActiveContract ? "Active" : "Available"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
