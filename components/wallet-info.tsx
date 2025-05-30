"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Shield, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  const securityStatus = web3Service.getSecurityStatus()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Connected Wallet
          {securityStatus.encrypted && (
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Encrypted
            </Badge>
          )}
        </CardTitle>
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

        {/* Security Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Security Status</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div
              className={`p-2 rounded ${securityStatus.encrypted ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
            >
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Encryption: {securityStatus.encrypted ? "Active" : "Inactive"}
              </div>
            </div>
            <div
              className={`p-2 rounded ${securityStatus.secureContext ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
            >
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                HTTPS: {securityStatus.secureContext ? "Secure" : "Insecure"}
              </div>
            </div>
            <div
              className={`p-2 rounded ${securityStatus.sessionActive ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}`}
            >
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Session: {securityStatus.sessionActive ? "Active" : "Inactive"}
              </div>
            </div>
            <div
              className={`p-2 rounded ${securityStatus.integrityVerified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
            >
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Integrity: {securityStatus.integrityVerified ? "Verified" : "Failed"}
              </div>
            </div>
          </div>
        </div>

        {/* Security Warnings */}
        {!securityStatus.secureContext && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Not running on HTTPS. Encryption may be less effective.
            </AlertDescription>
          </Alert>
        )}

        {!securityStatus.integrityVerified && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Encryption integrity check failed. Data may be corrupted.
            </AlertDescription>
          </Alert>
        )}

        {securityStatus.encrypted && securityStatus.secureContext && securityStatus.integrityVerified && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your wallet connection is secured with AES-256-GCM encryption and stored safely.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-slate-500">
          This wallet is connected to the TEA Sepolia testnet (Chain ID: 10218)
          {securityStatus.encrypted && (
            <div className="mt-1 text-green-600">
              🔐 Private key is encrypted with military-grade AES-256-GCM encryption
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
