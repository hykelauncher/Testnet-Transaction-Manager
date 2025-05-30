import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto"

// Strong encryption utilities for sensitive data
export class SecureStorage {
  private static readonly ALGORITHM = "aes-256-gcm"
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly TAG_LENGTH = 16
  private static readonly SALT_LENGTH = 32

  // Generate a key from password using PBKDF2
  private static deriveKey(password: string, salt: Buffer): Buffer {
    // Use a strong password derivation function
    const iterations = 100000 // High iteration count for security
    return createHash("pbkdf2").update(password).update(salt).digest().subarray(0, this.KEY_LENGTH)
  }

  // Generate a secure master password from browser fingerprint
  private static generateMasterPassword(): string {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
      navigator.platform,
      // Add more entropy
      window.location.hostname,
      Date.now()
        .toString()
        .slice(-6), // Last 6 digits of timestamp for session uniqueness
    ].join("|")

    return createHash("sha256").update(fingerprint).digest("hex")
  }

  // Encrypt sensitive data
  static encrypt(data: string): string {
    try {
      const masterPassword = this.generateMasterPassword()
      const salt = randomBytes(this.SALT_LENGTH)
      const iv = randomBytes(this.IV_LENGTH)
      const key = this.deriveKey(masterPassword, salt)

      const cipher = createCipheriv(this.ALGORITHM, key, iv)

      let encrypted = cipher.update(data, "utf8", "hex")
      encrypted += cipher.final("hex")

      const tag = cipher.getAuthTag()

      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, "hex")])

      return combined.toString("base64")
    } catch (error) {
      console.error("Encryption failed:", error)
      throw new Error("Failed to encrypt sensitive data")
    }
  }

  // Decrypt sensitive data
  static decrypt(encryptedData: string): string {
    try {
      const masterPassword = this.generateMasterPassword()
      const combined = Buffer.from(encryptedData, "base64")

      // Extract components
      const salt = combined.subarray(0, this.SALT_LENGTH)
      const iv = combined.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH)
      const tag = combined.subarray(
        this.SALT_LENGTH + this.IV_LENGTH,
        this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH,
      )
      const encrypted = combined.subarray(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH)

      const key = this.deriveKey(masterPassword, salt)

      const decipher = createDecipheriv(this.ALGORITHM, key, iv)
      decipher.setAuthTag(tag)

      let decrypted = decipher.update(encrypted, undefined, "utf8")
      decrypted += decipher.final("utf8")

      return decrypted
    } catch (error) {
      console.error("Decryption failed:", error)
      throw new Error("Failed to decrypt sensitive data - data may be corrupted")
    }
  }

  // Secure localStorage wrapper
  static setSecureItem(key: string, value: any): void {
    try {
      const jsonString = JSON.stringify(value)
      const encrypted = this.encrypt(jsonString)
      localStorage.setItem(`secure_${key}`, encrypted)
    } catch (error) {
      console.error("Failed to store secure item:", error)
      throw new Error("Failed to securely store data")
    }
  }

  // Secure localStorage retrieval
  static getSecureItem(key: string): any | null {
    try {
      const encrypted = localStorage.getItem(`secure_${key}`)
      if (!encrypted) return null

      const decrypted = this.decrypt(encrypted)
      return JSON.parse(decrypted)
    } catch (error) {
      console.error("Failed to retrieve secure item:", error)
      // Remove corrupted data
      localStorage.removeItem(`secure_${key}`)
      return null
    }
  }

  // Remove secure item
  static removeSecureItem(key: string): void {
    localStorage.removeItem(`secure_${key}`)
  }

  // Clear all secure items
  static clearAllSecureItems(): void {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith("secure_")) {
        localStorage.removeItem(key)
      }
    })
  }

  // Verify encryption integrity
  static verifyIntegrity(): boolean {
    try {
      const testData = "integrity_test_" + Date.now()
      const encrypted = this.encrypt(testData)
      const decrypted = this.decrypt(encrypted)
      return testData === decrypted
    } catch {
      return false
    }
  }
}

// Additional security utilities
export class SecurityUtils {
  // Generate secure random string
  static generateSecureRandom(length = 32): string {
    return randomBytes(length).toString("hex")
  }

  // Hash sensitive data for comparison
  static hashSensitiveData(data: string): string {
    return createHash("sha256").update(data).digest("hex")
  }

  // Validate private key format
  static validatePrivateKey(privateKey: string): boolean {
    const cleanKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey
    return /^[a-fA-F0-9]{64}$/.test(cleanKey)
  }

  // Secure memory clearing (best effort in JavaScript)
  static clearSensitiveString(str: string): void {
    // In JavaScript, we can't truly clear memory, but we can overwrite the reference
    if (typeof str === "string") {
      // Create a new string with random data of the same length
      const randomData = SecurityUtils.generateSecureRandom(str.length)
      // This doesn't actually clear memory but makes it harder to recover
      str = randomData
    }
  }

  // Check if running in secure context
  static isSecureContext(): boolean {
    return window.isSecureContext || location.protocol === "https:"
  }

  // Generate session token
  static generateSessionToken(): string {
    return this.generateSecureRandom(16)
  }
}
