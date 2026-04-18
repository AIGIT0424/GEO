'use client'

import { useEffect, useState } from 'react'
import { Package, Tag, Megaphone, TrendingUp, TrendingDown, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Header } from '@/components/layout/Header'
import { MetricCard, MetricCardSkeleton } from '@/components/ui/MetricCard'
import { productsApi, advertisingApi } from '@/lib/api'
import { fmtUsd, fmtPct, fmtK, acosClass } from '@/lib/utils'
import type { ProductRead, CampaignRead } from '@/types'

// Mock trend data — replace with real API once time-series endpoint exists
const mockAcosTrend = Array.from({ length: 14 }, (_, i) => ({
  date: `${i + 1}日`,
  acos: 20 + Math.sin(i * 0.6) * 8 + Math.random() * 3,
  spend: 300 + Math.random() * 200,
  sales: 1200 + Math.random() * 600,
}))

export default function DashboardPage() {
  const [products, setProducts] = useState<ProductRead[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      productsApi.list(0, 5).then((r) => setProducts(r.data)),
      advertisingApi.campaigns(0, 5).then((r) => setCampaigns(r.data)),
    ]).finally(() => setLoading(false))
  }, [])

  const totalSpend = campaigns.reduce((s, c) => s + c.total_spend, 0)
  const totalSales = campaigns.reduce((s, c) => s + c.total_sales, 0)
  const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="运营概览" subtitle="今日数据截至 UTC 00:00" />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Metrics row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (<>
            <MetricCard label="追踪商品" value={products.length} sub="个 ASIN" icon={Package} trend={0} />
            <MetricCard label="广告花费" value={fmtUsd(totalSpend)} sub="当前周期" icon={TrendingDown} />
            <MetricCard
              label="广告销售"
              value={fmtUsd(totalSales)}
              sub="当前周期"
              icon={TrendingUp}
              valueClass="text-emerald-600"
            />
            <MetricCard
              label="综合 ACoS"
              value={avgAcos != null ? fmtPct(avgAcos) : '—'}
              sub="目标 ≤ 25%"
              icon={Megaphone}
              valueClass={acosClass(avgAcos ?? undefined)}
            />
          </>)}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* ACoS trend chart */}
          <div className="xl:col-span-2 bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">ACoS 趋势（近14天）</h2>
              <span className="text-xs text-muted-foreground">广告花费占比</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mockAcosTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gAcos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(224 76% 48%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(224 76% 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'ACoS']} />
                <Area
                  type="monotone" dataKey="acos" stroke="hsl(224 76% 48%)"
                  strokeWidth={2} fill="url(#gAcos)" dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold mb-1">快捷操作</h2>
            {[
              { label: '追踪新 ASIN', href: '/products?action=add', icon: Plus, color: 'bg-blue-50 text-blue-600' },
              { label: '关键词研究', href: '/keywords?action=research', icon: Tag, color: 'bg-purple-50 text-purple-600' },
              { label: 'Listing 优化', href: '/listings?action=optimize', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
              { label: '广告分析', href: '/advertising', icon: Megaphone, color: 'bg-orange-50 text-orange-600' },
            ].map(({ label, href, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium flex-1">{label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent products + campaigns */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Products */}
          <div className="bg-white rounded-xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">近期追踪商品</h2>
              <Link href="/products" className="text-xs text-primary hover:underline">查看全部</Link>
            </div>
            <div className="divide-y">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="skeleton w-10 h-10 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3.5 w-40" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                  </div>
                ))
                : products.length === 0
                  ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                      暂无追踪商品 —{' '}
                      <Link href="/products?action=add" className="text-primary hover:underline">立即添加</Link>
                    </div>
                  )
                  : products.map((p) => (
                    <Link key={p.id} href={`/products/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-xs font-mono text-muted-foreground shrink-0">
                        {p.asin.slice(-4)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title ?? p.asin}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.bsr_rank ? `BSR #${fmtK(p.bsr_rank)}` : '—'}
                          {p.review_count ? ` · ${fmtK(p.review_count)} 评价` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0">
                        {p.price ? fmtUsd(p.price) : '—'}
                      </span>
                    </Link>
                  ))
              }
            </div>
          </div>

          {/* Campaigns */}
          <div className="bg-white rounded-xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">广告活动</h2>
              <Link href="/advertising" className="text-xs text-primary hover:underline">查看全部</Link>
            </div>
            <div className="divide-y">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="skeleton h-3.5 w-48 mb-1.5" />
                    <div className="skeleton h-3 w-32" />
                  </div>
                ))
                : campaigns.length === 0
                  ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                      暂无广告活动数据
                    </div>
                  )
                  : campaigns.map((c) => (
                    <Link key={c.id} href="/advertising" className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.campaign_type} · {c.targeting_type}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${acosClass(c.acos)}`}>
                          {c.acos != null ? fmtPct(c.acos) : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">ACoS</p>
                      </div>
                    </Link>
                  ))
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
