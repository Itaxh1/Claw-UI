"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, Gamepad2, Eye, Code } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useEffect } from "react"

export default function LoginPage() {
  const router = useRouter()
  const { login, register, isLoading, error, isAuthenticated } = useAuth()
  
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [formError, setFormError] = useState("")

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  if (isAuthenticated) {
    return null
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (isLogin) {
      // Login
      if (!formData.email || !formData.password) {
        setFormError("Please fill in all fields")
        return
      }

      const success = await login(formData.email, formData.password)
      if (success) {
        router.push("/dashboard")
      }
    } else {
      // Register
      if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        setFormError("Please fill in all fields")
        return
      }

      if (formData.password !== formData.confirmPassword) {
        setFormError("Passwords do not match")
        return
      }

      if (formData.password.length < 6) {
        setFormError("Password must be at least 6 characters")
        return
      }

      const success = await register(formData.username, formData.email, formData.password)
      if (success) {
        router.push("/dashboard")
      }
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setFormError("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-900">CLAW</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to CLAW</h1>
          <p className="text-gray-600">AI-powered game development platform</p>
        </div>

        {/* Login/Register Card */}
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Get Started</CardTitle>
            <CardDescription>
              {isLogin ? "Sign in to your account" : "Create a new account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? "login" : "register"} onValueChange={(value) => setIsLogin(value === "login")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Choose a password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Error Display */}
            {(error || formError) && (
              <Alert className="mt-4">
                <AlertDescription className="text-red-600">
                  {error || formError}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <Gamepad2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold text-sm">AI Game Generation</h3>
            <p className="text-xs text-gray-600">Create games with natural language</p>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <Code className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold text-sm">Code Editor</h3>
            <p className="text-xs text-gray-600">Edit and customize your games</p>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <Eye className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold text-sm">Live Preview</h3>
            <p className="text-xs text-gray-600">See your games in action</p>
          </div>
        </div>
      </div>
    </div>
  )
}
