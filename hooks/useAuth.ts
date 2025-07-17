"use client"

import React, { useState, useEffect, createContext, useContext } from "react"
import { api, type User } from "@/lib/api"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  register: (username: string, email: string, password: string) => Promise<boolean>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check for existing user session
    const token = localStorage.getItem("claw-token")
    const savedUser = localStorage.getItem("claw-user")

    console.log("🔍 AuthProvider - Checking existing session:", {
      hasToken: !!token,
      hasSavedUser: !!savedUser,
      tokenPreview: token ? token.substring(0, 20) + "..." : "N/A",
      savedUserRaw: savedUser, // Log raw value to see if it's "undefined"
    })

    if (token && savedUser) {
      try {
        let userData: User | null = null
        if (savedUser === "undefined" || savedUser === null) {
          // Explicitly handle the string "undefined" or null which causes JSON.parse error
          console.warn(
            "⚠️ AuthProvider - Found 'undefined' or null string in localStorage for 'claw-user', clearing it.",
          )
          localStorage.removeItem("claw-user")
          localStorage.removeItem("claw-token") // Clear token too if user data is corrupted
        } else {
          userData = JSON.parse(savedUser)
        }

        if (userData) {
          console.log("✅ AuthProvider - Restoring user from localStorage:", userData)
          setUser(userData)
        } else {
          console.log("❌ AuthProvider - No valid user data found after parsing, clearing tokens.")
          localStorage.removeItem("claw-token")
          localStorage.removeItem("claw-user")
        }
        setIsLoading(false)

        // Optionally verify the token is still valid by loading profile
        // This can add an extra API call on every page load, enable if strict token validation is needed
        // loadUserProfile()
      } catch (parseError) {
        console.error("❌ AuthProvider - Error parsing saved user from localStorage:", parseError)
        localStorage.removeItem("claw-token")
        localStorage.removeItem("claw-user")
        setIsLoading(false)
      }
    } else if (token) {
      console.log("🔄 AuthProvider - Token exists but no saved user, attempting to load profile...")
      loadUserProfile()
    } else {
      console.log("❌ AuthProvider - No token found, user not authenticated. Setting isLoading to false.")
      setIsLoading(false)
    }
  }, [])

  const loadUserProfile = async () => {
    console.log("🔄 Loading user profile via API...")
    setIsLoading(true) // Ensure loading state is true during API call
    const response = await api.getProfile()
    console.log("📥 Profile API response:", response)

    if (response.success && response.data) {
      console.log("✅ User profile loaded from API:", response.data)
      setUser(response.data)
      localStorage.setItem("claw-user", JSON.stringify(response.data)) // Update localStorage with valid user data
    } else {
      console.log("❌ Failed to load profile from API, clearing tokens (token might be expired or invalid).")
      localStorage.removeItem("claw-token")
      localStorage.removeItem("claw-user")
    }
    setIsLoading(false)
  }

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    console.log("🔄 Starting registration for:", { username, email })
    setIsLoading(true)
    setError(null)

    const response = await api.register(username, email, password)
    console.log("📥 Registration API response:", response)

    if (response.success && response.data) {
      const { user: userData, token } = response.data
      console.log("✅ Registration successful:", {
        userData,
        tokenPreview: token ? token.substring(0, 20) + "..." : "N/A",
      })

      setUser(userData)
      localStorage.setItem("claw-token", token)
      localStorage.setItem("claw-user", JSON.stringify(userData))

      console.log("💾 Saved to localStorage after registration:", {
        tokenPreview: localStorage.getItem("claw-token")?.substring(0, 20) + "...",
        user: JSON.parse(localStorage.getItem("claw-user") || "{}"),
      })

      setIsLoading(false)
      return true
    }

    console.log("❌ Registration failed:", response.message || response.error)
    setError(response.message || response.error || "Registration failed")
    setIsLoading(false)
    return false
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log("🔄 Starting login for:", { email })
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.login(email, password)
      console.log("📥 Login API response:", response)

      // The `response.data` should now directly contain { user, token }
      // due to the fix in `api.ts`'s `request` method.
      if (response.success && response.data) {
        const { user: userData, token } = response.data

        // Defensive check for token (still good practice)
        if (token) {
          console.log("✅ Login successful - extracted data:", {
            userData,
            tokenPreview: token.substring(0, 20) + "...",
            tokenLength: token.length,
          })

          // Set user state
          setUser(userData)

          // Save to localStorage
          localStorage.setItem("claw-token", token)
          localStorage.setItem("claw-user", JSON.stringify(userData))

          // Verify localStorage save
          const savedToken = localStorage.getItem("claw-token")
          const savedUser = localStorage.getItem("claw-user")
          console.log("💾 Verification - saved to localStorage:", {
            tokenSaved: !!savedToken,
            userSaved: !!savedUser,
            tokenPreview: savedToken?.substring(0, 20) + "...",
            user: savedUser ? JSON.parse(savedUser) : null,
          })

          setIsLoading(false)
          console.log("🎉 Login process completed successfully")
          return true
        } else {
          console.error("❌ Login failed: Token is undefined in response.data despite success=true.", response.data)
          setError("Login failed: Authentication token missing from API response.")
          setIsLoading(false)
          return false
        }
      } else {
        console.log("❌ Login failed - API response not successful or data missing:", response)
        setError(response.message || response.error || "Login failed")
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error("💥 Login error (network or unexpected):", error)
      setError("An unexpected error occurred during login")
      setIsLoading(false)
      return false
    }
  }

  const logout = () => {
    console.log("🚪 Logging out user")
    setUser(null)
    setError(null)
    localStorage.removeItem("claw-token")
    localStorage.removeItem("claw-user")
    console.log("✅ Logout completed")
  }

  const isAuthenticated = !!user
  console.log("🔐 Auth state (current render):", {
    user: user ? { id: user._id, username: user.username } : null,
    isAuthenticated,
    isLoading,
  })

  const value = {
    user,
    isLoading,
    register,
    login,
    logout,
    isAuthenticated,
    error,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
