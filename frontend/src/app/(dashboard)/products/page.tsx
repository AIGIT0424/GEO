'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, RefreshCw, ExternalLink, TrendingUp, Star, Package } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { productsApi } from '@/lib/api'
import { fmtUsd, fmtK, opportunityColor } from '@/lib/utils'
import type { ProductRead } from '@/types'
import { toast } from 'sonner'

const PAGE_SIZE = 20

function OpportunityBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>
  const { bg, text } = opportunityColor(score)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>
      {score.toFixed(1)}
    </span>
  )
}

function AddAsinModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [asin, setAsin] = useState('')
  const [marketplace, setMarketplace] = useState('ATVPDKIKX0DER')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = asin.trim().toUpperCase()
    if (!trimmed.match(/^[A-Z0-9]{10}$/)) {
      toast.error('ASIN 格式无效（应为10位字母/数字）')
      return
    }
    setLoading(true)
    try {
      await productsApi.create({ asin: trimmed, marketplace_id: marketplace })
      toast.success(`ASIN ${trimmed} 已添加追踪`)
      onAdded()
      onClose()
    } catch {
      toast.error('添加失败，请检查 ASIN 是否正确')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold mb-4">追踪新 ASIN</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">ASIN</label>
            <input
              value={asin}
              onChange={(e) => setAsin(e.target.value)}
              placeholder="B0XXXXXXXXX"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono uppercase"
              autoFocus
              maxLength={10}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">站点</label>
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ATVPDKIKX0DER">Amazon US</option>
              <option value="A2EUQ1WTGCTBG2">Amazon CA</option>
              <option value="A1AM78C64UM0Y8">Amazon MX</option>
              <option value="A1F83G8C2ARO7P">Amazon UK</option>
              <option value="A1PA6795UKMFR9">Amazon DE</option>
              <option value="A13V1IB3VIYZZH">Amazon FR</option>
              <option value="APJ6JRA9NG5V4">Amazon IT</option>
              <option value="A1RKKUPIHCS9HS">Amazon ES</option>
              <option value="A1VC38T7YXB528">Amazon JP</option>
              <option value="A39IBJ37TRP1C6">Amazon AU</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? '添加中…' : '确认追踪'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(async (off = 0) => {
    setLoading(true)
    try {
      const r = await productsApi.list(off, PAGE_SIZE)
      setProducts(off === 0 ? r.data : (prev) => [...prev, ...r.data])
      setHasMore(r.data.length === PAGE_SIZE)
      setOffset(off + r.data.length)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(0) }, [load])

  const filtered = products.filter(
    (p) =>
      p.asin.includes(search.toUpperCase()) ||
      (p.title ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  // Check if ?action=add in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('action=add')) {
      setShowAdd(true)
    }
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {showAdd && (
        <AddAsinModal onClose={() => setShowAdd(false)} onAdded={() => load(0)} />
      )}
      <Header
        title="商品追踪"
        subtitle={`${products.length} 个 ASIN`}
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            追踪新 ASIN
          </button>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Search + refresh */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索 ASIN 或标题"
              className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => load(0)}
            className="p-2 border rounded-lg hover:bg-secondary/50 transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">商品</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">价格</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">BSR</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">评分</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">评价数</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">机会分</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && products.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="skeleton w-10 h-10 rounded" />
                        <div className="space-y-1.5">
                          <div className="skeleton h-3.5 w-48" />
                          <div className="skeleton h-3 w-24" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3 text-right">
                        <div className="skeleton h-3.5 w-16 ml-auto" />
                      </td>
                    ))}
                    <td className="px-4 py-3" />
                  </tr>
                ))
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                        {products.length === 0
                          ? <>暂无追踪商品 — <button onClick={() => setShowAdd(true)} className="text-primary hover:underline">立即添加</button></>
                          : '没有匹配的商品'}
                      </td>
                    </tr>
                  )
                  : filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-xs font-mono text-muted-foreground shrink-0">
                            {p.asin.slice(-4)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[280px]">{p.title ?? p.asin}</p>
                            <p className="text-xs text-muted-foreground font-mono">{p.asin}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{p.price ? fmtUsd(p.price) : '—'}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {p.bsr_rank ? `#${fmtK(p.bsr_rank)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(p.rating ?? p.review_rating) != null ? (
                          <span className="flex items-center justify-end gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {(p.rating ?? p.review_rating)!.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {p.review_count ? fmtK(p.review_count) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <OpportunityBadge score={p.opportunity_score} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`https://www.amazon.com/dp/${p.asin}`}
                          target="_blank"
                          rel="noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          查看
                        </a>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
          {hasMore && !loading && (
            <div className="px-5 py-3 border-t text-center">
              <button
                onClick={() => load(offset)}
                className="text-xs text-primary hover:underline"
              >
                加载更多
              </button>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {products.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: '平均价格',
                icon: Package,
                value: fmtUsd(products.reduce((s, p) => s + (p.price ?? 0), 0) / products.filter((p) => p.price).length || 0),
              },
              {
                label: '平均评分',
                icon: Star,
                value: (products.reduce((s, p) => s + (p.rating ?? p.review_rating ?? 0), 0) / products.filter((p) => p.rating ?? p.review_rating).length || 0).toFixed(1),
              },
              {
                label: '平均机会分',
                icon: TrendingUp,
                value: (products.reduce((s, p) => s + (p.opportunity_score ?? 0), 0) / products.filter((p) => p.opportunity_score != null).length || 0).toFixed(1),
              },
            ].map(({ label, icon: Icon, value }) => (
              <div key={label} className="bg-white rounded-xl border p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
