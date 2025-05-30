"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink } from "lucide-react"
import type { TeaWeb3Service } from "@/lib/tea-web3"

interface WalletInfoProps {
  web3Service: TeaWeb3Service | null
  walletConnected: boolean
}

export function WalletInfo({ web3Service, walletConnected }: WalletInfoProps) {
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    if (!web3Service) return

    const address = web3Service.getWalletAddress()
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openExplorer = () => {
    if (!web3Service) return

    const address = web3Service.getWalletAddress()
    window.open(`https://sepolia.tea.xyz/address/${address}`, "_blank")
  }

  if (!walletConnected || !web3Service) {
    return null
  }

  const address = web3Service.getWalletAddress()
  const shortAddress = address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Connected Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {shortAddress}
            </Badge>
            <Badge variant="secondary">TEA Sepolia</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={copyAddress}>
              {copied ? "Copied!" : <Copy className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={openExplorer}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          This wallet is connected to the TEA Sepolia testnet (Chain ID: 10218)
        </div>
      </CardContent>
    </Card>
  )
}
