'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Tag, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Header } from '@/components/layout/Header'
import { productsApi, keywordsApi } from '@/lib/api'
import { fmtK } from '@/lib/utils'
import type { ProductRead, KeywordRead, KeywordRankingRead } from '@/types'
import { toast } from 'sonner'

function RankingChart({ rankings }: { rankings: KeywordRankingRead[] }) {
  const data = [...rankings]
    .sort((a, b) => new Date(a.rank_date).getTime() - new Date(b.rank_date).getTime())
    .slice(-30)
    .map((r) => ({
      date: new Date(r.rank_date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      rank: r.organic_rank ?? r.rank,
    }))

  if (data.length === 0) return <p className="text-xs text-muted-foreground py-4 text-center">暂无排名数据</p>

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis reversed tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <ReferenceLine y={10} stroke="hsl(142 76% 36%)" strokeDasharray="4 4" strokeOpacity={0.6} />
        <Tooltip formatter={(v: number) => [`#${v}`, '排名']} />
        <Line type="monotone" dataKey="rank" stroke="hsl(224 76% 48%)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function KeywordRow({ kw }: { kw: KeywordRead }) {
  const [expanded, setExpanded] = useState(false)
  const [rankings, setRankings] = useState<KeywordRankingRead[]>([])
  const [loadingRank, setLoadingRank] = useState(false)

  async function loadRankings() {
    if (rankings.length > 0) { setExpanded((v) => !v); return }
    setLoadingRank(true)
    try {
      const r = await keywordsApi.rankings(kw.id)
      setRankings(r.data)
      setExpanded(true)
    } catch {
      toast.error('加载排名历史失败')
    } finally {
      setLoadingRank(false)
    }
  }

  const latestRank = kw.current_rank ?? (rankings.length > 0 ? (rankings[rankings.length - 1].organic_rank ?? rankings[rankings.length - 1].rank) : null)
  const trend = rankings.length >= 2
    ? ((rankings[rankings.length - 2].organic_rank ?? rankings[rankings.length - 2].rank ?? 0) - (rankings[rankings.length - 1].organic_rank ?? rankings[rankings.length - 1].rank ?? 0))
    : null

  return (
    <>
      <tr
        className="hover:bg-secondary/20 transition-colors cursor-pointer group"
        onClick={loadRankings}
      >
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{kw.keyword}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground text-xs">
          {kw.search_volume ? fmtK(kw.search_volume) : '—'}
        </td>
        <td className="px-4 py-3 text-right">
          {latestRank != null ? (
            <span className={`font-semibold ${latestRank <= 10 ? 'text-emerald-600' : latestRank <= 50 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              #{latestRank}
            </span>
          ) : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-4 py-3 text-right">
          {trend != null ? (
            trend > 0
              ? <span className="flex items-center justify-end gap-0.5 text-emerald-600 text-xs"><TrendingUp className="w-3 h-3" />+{trend}</span>
              : trend < 0
                ? <span className="flex items-center justify-end gap-0.5 text-red-500 text-xs"><TrendingDown className="w-3 h-3" />{trend}</span>
                : <span className="text-muted-foreground text-xs">—</span>
          ) : <span className="text-muted-foreground text-xs">—</span>}
        </td>
        <td className="px-4 py-3 text-right">
          {kw.competition_score != null
            ? <span className="text-xs">{(kw.competition_score * 100).toFixed(0)}%</span>
            : <span className="text-muted-foreground text-xs">—</span>}
        </td>
        <td className="px-4 py-3 text-right">
          {loadingRank
            ? <span className="text-xs text-muted-foreground">加载中…</span>
            : expanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-5 pb-4 bg-secondary/10">
            <p className="text-xs font-medium text-muted-foreground mb-2 pt-2">近30天排名趋势</p>
            <RankingChart rankings={rankings} />
          </td>
        </tr>
      )}
    </>
  )
}

export default function KeywordsPage() {
  const [products, setProducts] = useState<ProductRead[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [keywords, setKeywords] = useState<KeywordRead[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [trackInput, setTrackInput] = useState('')
  const [tracking, setTracking] = useState(false)

  useEffect(() => {
    productsApi.list(0, 50).then((r) => {
      setProducts(r.data)
      if (r.data.length > 0) setSelectedProduct(r.data[0].id)
    })
  }, [])

  const loadKeywords = useCallback(async (productId: string) => {
    if (!productId) return
    setLoading(true)
    try {
      const r = await keywordsApi.list(productId, 0, 100)
    // list() is an alias for byProduct() in the API module
      setKeywords(r.data)
    } catch {
      toast.error('加载关键词失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedProduct) loadKeywords(selectedProduct)
  }, [selectedProduct, loadKeywords])

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault()
    const words = trackInput.split(/[,，\n]/).map((w) => w.trim()).filter(Boolean)
    if (!words.length || !selectedProduct) return
    setTracking(true)
    try {
      await Promise.all(
        words.map((kw) => keywordsApi.track(selectedProduct, kw)),
      )
      toast.success(`已追踪 ${words.length} 个关键词`)
      setTrackInput('')
      loadKeywords(selectedProduct)
    } catch {
      toast.error('追踪失败')
    } finally {
      setTracking(false)
    }
  }

  const filtered = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(search.toLowerCase()),
  )

  const currentProduct = products.find((p) => p.id === selectedProduct)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="关键词追踪" subtitle="监控排名趋势，发现优化机会" />
      <div className="flex-1 overflow-auto p-6 space-y-4">

        {/* Product selector */}
        <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
          <span className="text-sm font-medium shrink-0">选择商品</span>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.asin} {p.title ? `— ${p.title.slice(0, 40)}` : ''}
              </option>
            ))}
            {products.length === 0 && <option disabled>暂无追踪商品</option>}
          </select>
          {currentProduct && (
            <span className="text-xs text-muted-foreground shrink-0">
              {keywords.length} 个关键词
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Keyword table */}
          <div className="xl:col-span-3 bg-white rounded-xl border overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索关键词"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/30">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">关键词</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">月搜索量</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">当前排名</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">趋势</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">竞争度</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3"><div className="skeleton h-3.5 w-40" /></td>
                      <td className="px-4 py-3 text-right"><div className="skeleton h-3.5 w-16 ml-auto" /></td>
                      <td className="px-4 py-3 text-right"><div className="skeleton h-3.5 w-12 ml-auto" /></td>
                      <td className="px-4 py-3 text-right"><div className="skeleton h-3.5 w-10 ml-auto" /></td>
                      <td className="px-4 py-3 text-right"><div className="skeleton h-3.5 w-12 ml-auto" /></td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                  : filtered.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          {keywords.length === 0 ? '暂无关键词，在右侧添加' : '没有匹配的关键词'}
                        </td>
                      </tr>
                    )
                    : filtered.map((kw) => <KeywordRow key={kw.id} kw={kw} />)
                }
              </tbody>
            </table>
          </div>

          {/* Add keyword panel */}
          <div className="bg-white rounded-xl border p-5 flex flex-col gap-4 h-fit">
            <h3 className="text-sm font-semibold">添加追踪关键词</h3>
            <form onSubmit={handleTrack} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">关键词（多个用逗号分隔）</label>
                <textarea
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  placeholder="wireless earbuds&#10;bluetooth headphones&#10;..."
                  rows={6}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!trackInput.trim() || !selectedProduct || tracking}
                className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {tracking ? '追踪中…' : '开始追踪'}
              </button>
            </form>

            {/* Tips */}
            <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">追踪技巧</p>
              <p>• 排名 ≤ 10 为首页核心位</p>
              <p>• 关注排名上升的长尾词</p>
              <p>• 竞争度 &lt; 40% 适合新品切入</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
