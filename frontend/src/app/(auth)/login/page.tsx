'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function LoginPage() {
  const router = useRouter()
  const { setToken, setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      setToken(data.access_token)
      setUser({ email, full_name: email.split('@')[0] })
      router.push('/dashboard')
    } catch {
      toast.error('邮箱或密码错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-geo-500">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">GEO</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-foreground mb-1">欢迎回来</h1>
          <p className="text-sm text-muted-foreground mb-6">登录你的 GEO 账号</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seller@example.com"
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              登录
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            还没有账号？{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              免费注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
