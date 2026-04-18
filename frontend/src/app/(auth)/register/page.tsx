'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.register(form.email, form.password, form.full_name)
      toast.success('注册成功，请登录')
      router.push('/login')
    } catch {
      toast.error('注册失败，该邮箱可能已被使用')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-geo-500">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">GEO</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-foreground mb-1">创建账号</h1>
          <p className="text-sm text-muted-foreground mb-6">开始你的跨境运营优化之旅</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'full_name', label: '姓名', type: 'text', placeholder: '你的姓名' },
              { key: 'email', label: '邮箱', type: 'email', placeholder: 'seller@example.com' },
              { key: 'password', label: '密码', type: 'password', placeholder: '至少8位' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              立即注册
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            已有账号？{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              直接登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
