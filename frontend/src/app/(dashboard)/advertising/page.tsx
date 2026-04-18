'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Header } from '@/components/layout/Header'
import { MetricCard, MetricCardSkeleton } from '@/components/ui/MetricCard'
import { advertisingApi } from '@/lib/api'
import { fmtUsd, fmtPct, fmtK, acosClass } from '@/lib/utils'
import type { CampaignRead, CampaignKeywordRead } from '@/types'
import { toast } from 'sonner'

const PAGE_SIZE = 20

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ENABLED: 'bg-emerald-100 text-emerald-700',
    PAUSED: 'bg-amber-100 text-amber-700',
    ARCHIVED: 'bg-secondary text-muted-foreground',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-secondary text-muted-foreground'}`}>
      {status === 'ENABLED' ? '投放中' : status === 'PAUSED' ? '已暂停' : '已归档'}
    </span>
  )
}

function KeywordsPanel({ campaignId }: { campaignId: string }) {
  const [keywords, setKeywords] = useState<CampaignKeywordRead[]>([])
  const [loading, setLoading] = useState(true)
  const [adjustments, setAdjustments] = useState<Record<string, number>>({})
  const [executing, setExecuting] = useState(false)

  useEffect(() => {
    advertisingApi.campaignKeywords(campaignId).then((r) => {
      setKeywords(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [campaignId])

  const pendingCount = Object.values(adjustments).filter((v) => v !== 0).length

  async function executeBids() {
    const items = Object.entries(adjustments)
      .filter(([, delta]) => delta !== 0)
      .map(([keywordId, bid_adjustment_pct]) => ({ keyword_id: keywordId, bid_adjustment_pct }))

    if (!items.length) return
    setExecuting(true)
    try {
      await advertisingApi.executeBids(campaignId, items)
      toast.success(`已调整 ${items.length} 个关键词出价`)
      setAdjustments({})
      const r = await advertisingApi.campaignKeywords(campaignId)
      setKeywords(r.data)
    } catch {
      toast.error('出价调整失败')
    } finally {
      setExecuting(false)
    }
  }

  if (loading) return (
    <tr>
      <td colSpan={7} className="px-5 py-6">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-8 w-full rounded" />)}
        </div>
      </td>
    </tr>
  )

  return (
    <>
      {keywords.length === 0 ? (
        <tr>
          <td colSpan={7} className="px-5 py-6 text-center text-xs text-muted-foreground">暂无关键词数据</td>
        </tr>
      ) : (
        <>
          {keywords.map((kw) => {
            const delta = adjustments[kw.id] ?? 0
            const newBid = kw.bid ? kw.bid * (1 + delta / 100) : null
            return (
              <tr key={kw.id} className="bg-secondary/10 border-t border-secondary/50">
                <td className="px-8 py-2 text-xs font-mono text-muted-foreground">{kw.keyword_text}</td>
                <td className="px-4 py-2 text-xs text-right">{kw.match_type ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-right">{kw.bid ? fmtUsd(kw.bid) : '—'}</td>
                <td className="px-4 py-2 text-xs text-right">{kw.impressions ? fmtK(kw.impressions) : '—'}</td>
                <td className="px-4 py-2 text-xs text-right">{kw.clicks ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-right">
                  {kw.acos != null
                    ? <span className={acosClass(kw.acos)}>{fmtPct(kw.acos)}</span>
                    : '—'}
                </td>
                <td className="px-4 py-2 text-xs">
                  <div className="flex items-center gap-2 justify-end">
                    <select
                      value={delta}
                      onChange={(e) => setAdjustments((prev) => ({ ...prev, [kw.id]: +e.target.value }))}
                      className={`border rounded px-1.5 py-0.5 text-xs focus:outline-none ${delta !== 0 ? 'border-primary text-primary' : ''}`}
                    >
                      {[-30, -20, -10, -5, 0, 5, 10, 20, 30].map((v) => (
                        <option key={v} value={v}>{v > 0 ? `+${v}%` : v === 0 ? '不调整' : `${v}%`}</option>
                      ))}
                    </select>
                    {newBid && delta !== 0 && (
                      <span className={`text-xs ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        → {fmtUsd(newBid)}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
          {pendingCount > 0 && (
            <tr className="bg-primary/5">
              <td colSpan={7} className="px-8 py-3 text-right">
                <button
                  onClick={executeBids}
                  disabled={executing}
                  className="inline-flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {executing ? '执行中…' : `执行 ${pendingCount} 项出价调整`}
                </button>
              </td>
            </tr>
          )}
        </>
      )}
    </>
  )
}

function CampaignRow({ campaign }: { campaign: CampaignRead }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="hover:bg-secondary/20 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <p className="font-medium text-sm truncate max-w-[220px]">{campaign.name}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 pl-3.5">
            {campaign.campaign_type} · {campaign.targeting_type}
          </p>
        </td>
        <td className="px-4 py-3 text-center">
          <StatusBadge status={campaign.status} />
        </td>
        <td className="px-4 py-3 text-right text-sm">{campaign.daily_budget ? fmtUsd(campaign.daily_budget) : '—'}</td>
        <td className="px-4 py-3 text-right text-sm font-medium">{fmtUsd(campaign.total_spend)}</td>
        <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">{fmtUsd(campaign.total_sales)}</td>
        <td className="px-4 py-3 text-right text-sm font-semibold">
          <span className={acosClass(campaign.acos)}>
            {campaign.acos != null ? fmtPct(campaign.acos) : '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
          {campaign.roas != null ? `${campaign.roas.toFixed(2)}x` : '—'}
        </td>
        <td className="px-4 py-3 text-right">
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
        </td>
      </tr>
      {expanded && <KeywordsPanel campaignId={campaign.id} />}
    </>
  )
}

export default function AdvertisingPage() {
  const [campaigns, setCampaigns] = useState<CampaignRead[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(async (off = 0) => {
    setLoading(true)
    try {
      const r = await advertisingApi.campaigns(off, PAGE_SIZE)
      setCampaigns(off === 0 ? r.data : (prev) => [...prev, ...r.data])
      setHasMore(r.data.length === PAGE_SIZE)
      setOffset(off + r.data.length)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(0) }, [load])

  const totalSpend = campaigns.reduce((s, c) => s + c.total_spend, 0)
  const totalSales = campaigns.reduce((s, c) => s + c.total_sales, 0)
  const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : null
  const avgRoas = totalSpend > 0 ? totalSales / totalSpend : null

  const chartData = campaigns
    .filter((c) => c.total_spend > 0)
    .sort((a, b) => b.total_spend - a.total_spend)
    .slice(0, 8)
    .map((c) => ({
      name: c.name.slice(0, 14),
      spend: c.total_spend,
      sales: c.total_sales,
      acos: c.acos ?? 0,
    }))

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="广告分析"
        subtitle="实时监控广告效果，智能调整出价"
        actions={
          <button
            onClick={() => load(0)}
            className="p-2 border rounded-lg hover:bg-secondary/50 transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-4">

        {/* Metrics */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {loading && campaigns.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (<>
            <MetricCard label="广告活动" value={campaigns.length} sub="个活动" icon={TrendingUp} />
            <MetricCard label="总花费" value={fmtUsd(totalSpend)} sub="当前数据" icon={TrendingDown} />
            <MetricCard label="广告销售" value={fmtUsd(totalSales)} sub="归因销售" icon={TrendingUp} valueClass="text-emerald-600" />
            <MetricCard
              label="综合 ACoS"
              value={avgAcos != null ? fmtPct(avgAcos) : '—'}
              sub={avgRoas != null ? `ROAS ${avgRoas.toFixed(2)}x` : '目标 ≤ 25%'}
              icon={TrendingUp}
              valueClass={avgAcos != null ? (avgAcos <= 25 ? 'text-emerald-600' : avgAcos <= 40 ? 'text-amber-600' : 'text-red-500') : undefined}
            />
          </>)}
        </div>

        {/* Chart + Table */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-semibold mb-4">广告花费 vs 销售（Top 8 活动）</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${fmtK(v)}`} />
                <Tooltip formatter={(v: number, name: string) => [fmtUsd(v), name === 'spend' ? '花费' : '销售']} />
                <Bar dataKey="spend" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.acos <= 25 ? 'hsl(224 76% 48%)' : entry.acos <= 40 ? 'hsl(38 92% 50%)' : 'hsl(0 84% 60%)'} />
                  ))}
                </Bar>
                <Bar dataKey="sales" fill="hsl(142 76% 36%)" fillOpacity={0.7} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Campaigns table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">活动名称</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">状态</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">日预算</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">花费</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">销售</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">ACoS</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">ROAS</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && campaigns.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-48" /><div className="skeleton h-3 w-32 mt-1" /></td>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3 text-right"><div className="skeleton h-3.5 w-16 ml-auto" /></td>
                    ))}
                    <td className="px-4 py-3" />
                  </tr>
                ))
                : campaigns.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
                        暂无广告活动数据，请先连接 Amazon 广告账户
                      </td>
                    </tr>
                  )
                  : campaigns.map((c) => <CampaignRow key={c.id} campaign={c} />)
              }
            </tbody>
          </table>
          {hasMore && !loading && (
            <div className="px-5 py-3 border-t text-center">
              <button onClick={() => load(offset)} className="text-xs text-primary hover:underline">
                加载更多
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
