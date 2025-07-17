"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Sparkles, AlertCircle, UserPlus, LogIn } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [activeTab, setActiveTab] = useState("login")
  const { register, login, isLoading, error, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    console.log("🏠 LoginPage - Auth state changed:", { isAuthenticated, isLoading })
    if (isAuthenticated && !isLoading) {
      console.log("✅ User is authenticated, redirecting to dashboard")
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      console.log("❌ Login form validation failed: Email or password empty.")
      return
    }

    console.log("🔄 Login form submitted for:", { email })

    const success = await login(email, password)

    console.log("📊 Login result:", success)

    if (success) {
      console.log("🎉 Login successful, useEffect should handle redirect.")
      // The useEffect above should handle the redirect
    } else {
      console.log("❌ Login failed with error:", error)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !email.trim() || !password.trim()) {
      console.log("❌ Registration form validation failed: Fields empty.")
      return
    }

    if (password !== confirmPassword) {
      console.log("❌ Password confirmation failed: Passwords do not match.")
      return
    }

    console.log("🔄 Registration form submitted for:", { username, email })

    const success = await register(username, email, password)

    console.log("📊 Registration result:", success)

    if (success) {
      console.log("🎉 Registration successful, useEffect should handle redirect.")
      // The useEffect above should handle the redirect
    } else {
      console.log("❌ Registration failed with error:", error)
    }
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render login form if already authenticated (and not loading)
  if (isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to CLAW v2</h1>
          <p className="text-gray-600 text-sm">AI-powered game development platform</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="flex items-center space-x-2">
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center space-x-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Register</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="h-11 border-gray-200 focus:border-gray-900 focus:ring-0"
                      required
                    />
                  </div>

                  <div>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="h-11 border-gray-200 focus:border-gray-900 focus:ring-0"
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Sign In</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="h-11 border-gray-200 focus:border-gray-900 focus:ring-0"
                      required
                    />
                  </div>

                  <div>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="h-11 border-gray-200 focus:border-gray-900 focus:ring-0"
                      required
                    />
                  </div>

                  <div>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="h-11 border-gray-200 focus:border-gray-900 focus:ring-0"
                      required
                    />
                  </div>

                  <div>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="h-11 border-gray-200 focus:border-gray-900 focus:ring-0"
                      required
                    />
                  </div>

                  {password !== confirmPassword && confirmPassword && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span>Passwords do not match</span>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white"
                    disabled={isLoading || password !== confirmPassword}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Create Account</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <div className="font-medium mb-1">🎮 New in v2.0:</div>
              <ul className="space-y-1">
                <li>• Multi-LLM support (Groq, HuggingFace, Ollama)</li>
                <li>• Message versioning & editing</li>
                <li>• File attachments for context</li>
                <li>• Gaming-focused AI prompts</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
