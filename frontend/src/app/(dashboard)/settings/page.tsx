'use client'

import { useEffect, useState } from 'react'
import { Globe, Link2, Trash2, Star, CheckCircle, AlertCircle, ExternalLink, User } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { amazonApi, marketplacesApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { UserMarketplaceRead, MarketplaceInfo } from '@/types'
import { toast } from 'sonner'

type SettingsTab = 'amazon' | 'marketplaces' | 'account'

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary/50'}`}
    >
      {children}
    </button>
  )
}

function AmazonConnectPanel() {
  const [status, setStatus] = useState<{ connected: boolean; marketplace_id: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    amazonApi.getStatus().then((r) => { setStatus(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function handleConnect() {
    setConnecting(true)
    try {
      const r = await amazonApi.getOAuthUrl()
      window.location.href = r.data.url
    } catch {
      toast.error('无法获取授权链接')
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('确认断开 Amazon 账户连接？断开后将无法同步数据。')) return
    setDisconnecting(true)
    try {
      await amazonApi.disconnect()
      setStatus({ connected: false, marketplace_id: null })
      toast.success('已断开 Amazon 连接')
    } catch {
      toast.error('断开失败')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-amber-500">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Amazon Seller Central</h3>
              <p className="text-xs text-muted-foreground mt-0.5">通过 SP-API 授权，自动同步商品、关键词和广告数据</p>
            </div>
          </div>
          {!loading && (
            status?.connected
              ? <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" />已连接
                </span>
              : <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-secondary px-2.5 py-1 rounded-full">
                  <AlertCircle className="w-3 h-3" />未连接
                </span>
          )}
        </div>

        {loading ? (
          <div className="mt-4 skeleton h-10 w-40 rounded-lg" />
        ) : status?.connected ? (
          <div className="mt-4 flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              已授权站点：<span className="font-mono font-medium text-foreground">{status.marketplace_id ?? '—'}</span>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {disconnecting ? '断开中…' : '断开连接'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="mt-4 flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            <Link2 className="w-4 h-4" />
            {connecting ? '跳转授权页…' : '连接 Amazon 账户'}
          </button>
        )}
      </div>

      {/* Data permissions */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-3">授权权限说明</h3>
        <div className="space-y-2.5">
          {[
            { ok: true, text: '读取商品目录 (Catalog Items API)' },
            { ok: true, text: '读取关键词排名 (Merchant Listings API)' },
            { ok: true, text: '读取广告报告 (Advertising API)' },
            { ok: true, text: '写入广告出价调整 (Advertising API)' },
            { ok: false, text: '财务数据（暂未申请）' },
            { ok: false, text: '订单管理（暂未申请）' },
          ].map(({ ok, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm">
              <CheckCircle className={`w-4 h-4 shrink-0 ${ok ? 'text-emerald-500' : 'text-secondary-foreground opacity-30'}`} />
              <span className={ok ? '' : 'text-muted-foreground'}>{text}</span>
            </div>
          ))}
        </div>
        <a
          href="https://developer.amazonservices.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          了解 SP-API 权限政策
        </a>
      </div>
    </div>
  )
}

function MarketplacesPanel() {
  const [mine, setMine] = useState<UserMarketplaceRead[]>([])
  const [supported, setSupported] = useState<MarketplaceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    Promise.all([marketplacesApi.mine(), marketplacesApi.supported()]).then(([m, s]) => {
      setMine(m.data)
      setSupported(s.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const available = supported.filter((s) => !mine.find((m) => m.marketplace_id === s.marketplace_id))

  async function handleAdd() {
    if (!selectedId) return
    setAdding(true)
    try {
      await marketplacesApi.add(selectedId, mine.length === 0)
      const r = await marketplacesApi.mine()
      setMine(r.data)
      setSelectedId('')
      toast.success('站点已添加')
    } catch {
      toast.error('添加失败')
    } finally {
      setAdding(false)
    }
  }

  async function handleSetDefault(marketplace_id: string) {
    try {
      await marketplacesApi.setDefault(marketplace_id)
      setMine((prev) => prev.map((m) => ({ ...m, is_default: m.marketplace_id === marketplace_id })))
      toast.success('默认站点已更新')
    } catch {
      toast.error('设置失败')
    }
  }

  async function handleRemove(marketplace_id: string) {
    try {
      await marketplacesApi.remove(marketplace_id)
      setMine((prev) => prev.filter((m) => m.marketplace_id !== marketplace_id))
      toast.success('站点已移除')
    } catch {
      toast.error('移除失败')
    }
  }

  return (
    <div className="space-y-4">
      {/* My marketplaces */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">我的站点</h3>
          <span className="text-xs text-muted-foreground">{mine.length} 个站点</span>
        </div>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-4 border-b flex items-center gap-3">
              <div className="skeleton w-8 h-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-32" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
          ))
          : mine.length === 0
            ? <p className="px-5 py-8 text-sm text-center text-muted-foreground">暂未添加站点</p>
            : mine.map((m) => (
              <div key={m.marketplace_id} className="px-5 py-4 border-b flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                  {m.currency}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{m.name}</p>
                    {m.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" />默认
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.region} · {m.marketplace_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!m.is_default && (
                    <button
                      onClick={() => handleSetDefault(m.marketplace_id)}
                      className="text-xs text-primary hover:underline"
                    >
                      设为默认
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(m.marketplace_id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
        }
      </div>

      {/* Add marketplace */}
      {available.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-sm mb-3">添加站点</h3>
          <div className="flex gap-3">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">选择站点…</option>
              {available.map((m) => (
                <option key={m.marketplace_id} value={m.marketplace_id}>
                  {m.name} ({m.currency})
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!selectedId || adding}
              className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Globe className="w-4 h-4" />
              {adding ? '添加中…' : '添加'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AccountPanel() {
  const { user, logout } = useAuthStore()

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{user?.full_name ?? '用户'}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2.5 border-b">
            <span className="text-sm text-muted-foreground">账户状态</span>
            <span className="text-sm font-medium flex items-center gap-1.5 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              已激活
            </span>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-100 p-6">
        <h3 className="font-semibold text-sm text-red-600 mb-3">安全操作</h3>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('amazon')

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="设置" subtitle="账户、站点与 Amazon 授权管理" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-4">
          {/* Tab bar */}
          <div className="flex gap-2 bg-secondary/50 p-1 rounded-xl w-fit">
            <TabButton active={tab === 'amazon'} onClick={() => setTab('amazon')}>Amazon 连接</TabButton>
            <TabButton active={tab === 'marketplaces'} onClick={() => setTab('marketplaces')}>站点管理</TabButton>
            <TabButton active={tab === 'account'} onClick={() => setTab('account')}>账户信息</TabButton>
          </div>

          {tab === 'amazon' && <AmazonConnectPanel />}
          {tab === 'marketplaces' && <MarketplacesPanel />}
          {tab === 'account' && <AccountPanel />}
        </div>
      </div>
    </div>
  )
}
