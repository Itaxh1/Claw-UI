"use client"

import React, { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { api, type User } from "@/lib/api"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, email: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing user session
    const savedUser = localStorage.getItem("claw-user")
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
      } catch (error) {
        console.error("Error parsing saved user:", error)
        localStorage.removeItem("claw-user")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, email: string): Promise<boolean> => {
    setIsLoading(true)

    // For demo purposes, we'll use the register endpoint
    // In a real app, you'd have separate login/register flows
    const response = await api.register(username, email)

    if (response.success && response.data) {
      const userData = response.data.user
      setUser(userData)
      localStorage.setItem("claw-user", JSON.stringify(userData))
      localStorage.setItem("claw-auth", "true")
      setIsLoading(false)
      return true
    }

    setIsLoading(false)
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("claw-user")
    localStorage.removeItem("claw-auth")
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
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
