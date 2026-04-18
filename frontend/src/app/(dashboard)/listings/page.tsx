'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sparkles, ShieldCheck, ChevronRight, AlertTriangle, CheckCircle, XCircle, Copy, RefreshCw } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { productsApi, listingsApi } from '@/lib/api'
import type { ProductRead, ListingRead, ListingComplianceResult } from '@/types'
import { toast } from 'sonner'

type Tab = 'optimize' | 'compliance'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-secondary transition-colors" title="复制">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  )
}

function ComplianceItem({ issue }: { issue: { field: string; issue: string; suggestion: string; severity: string } }) {
  const icon = issue.severity === 'error'
    ? <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
    : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${issue.severity === 'error' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      {icon}
      <div className="text-xs space-y-0.5">
        <p className="font-semibold text-foreground">{issue.field}</p>
        <p className="text-muted-foreground">{issue.issue}</p>
        <p className="text-foreground/80">💡 {issue.suggestion}</p>
      </div>
    </div>
  )
}

export default function ListingsPage() {
  const [products, setProducts] = useState<ProductRead[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [listings, setListings] = useState<ListingRead[]>([])
  const [selectedListing, setSelectedListing] = useState<ListingRead | null>(null)
  const [tab, setTab] = useState<Tab>('optimize')
  const [compliance, setCompliance] = useState<ListingComplianceResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [loadingListings, setLoadingListings] = useState(false)
  const [targetLocale, setTargetLocale] = useState('en_US')
  const [marketplace, setMarketplace] = useState('ATVPDKIKX0DER')

  useEffect(() => {
    productsApi.list(0, 50).then((r) => {
      setProducts(r.data)
      if (r.data.length > 0) setSelectedProduct(r.data[0].id)
    })
  }, [])

  const loadListings = useCallback(async (productId: string) => {
    if (!productId) return
    setLoadingListings(true)
    try {
      const r = await listingsApi.list(productId)
      const items = Array.isArray(r.data) ? r.data : (r.data ? [r.data] : [])
      setListings(items)
      setSelectedListing(items[0] ?? null)
      setCompliance(null)
    } finally {
      setLoadingListings(false)
    }
  }, [])

  useEffect(() => { if (selectedProduct) loadListings(selectedProduct) }, [selectedProduct, loadListings])

  async function handleOptimize() {
    if (!selectedProduct) return
    setOptimizing(true)
    try {
      const r = await listingsApi.optimize(selectedProduct, { locale: targetLocale, marketplace_id: marketplace })
      // optimize() returns a ListingRead
      toast.success('Listing 优化完成')
      await loadListings(selectedProduct)
      setSelectedListing(r.data)
    } catch {
      toast.error('优化失败，请稍后重试')
    } finally {
      setOptimizing(false)
    }
  }

  async function handleCompliance() {
    if (!selectedListing) return
    setChecking(true)
    try {
      const r = await listingsApi.compliance(selectedListing.id, marketplace)
      // compliance() posts to /listings/{id}/compliance-check
      setCompliance(r.data)
      setTab('compliance')
    } catch {
      toast.error('合规检查失败')
    } finally {
      setChecking(false)
    }
  }

  // Check if ?action=optimize in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('action=optimize')) {
      setTab('optimize')
    }
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Listing 优化" subtitle="AI 驱动的文案生成与合规检查" />
      <div className="flex-1 overflow-auto p-6 space-y-4">

        {/* Product selector */}
        <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-sm font-medium shrink-0">选择商品</span>
            <select
              value={selectedProduct}
              onChange={(e) => { setSelectedProduct(e.target.value) }}
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.asin}{p.title ? ` — ${p.title.slice(0, 40)}` : ''}
                </option>
              ))}
              {products.length === 0 && <option disabled>暂无追踪商品</option>}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={targetLocale}
              onChange={(e) => setTargetLocale(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="en_US">英语 (美国)</option>
              <option value="zh_CN">中文</option>
              <option value="de_DE">德语</option>
              <option value="fr_FR">法语</option>
              <option value="ja_JP">日语</option>
            </select>
            <button
              onClick={handleOptimize}
              disabled={!selectedProduct || optimizing}
              className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {optimizing ? 'AI 生成中…' : 'AI 优化'}
            </button>
            <button
              onClick={handleCompliance}
              disabled={!selectedListing || checking}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {checking ? '检查中…' : '合规检查'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Listing versions sidebar */}
          <div className="bg-white rounded-xl border overflow-hidden h-fit">
            <div className="px-4 py-3 border-b text-xs font-semibold text-muted-foreground">历史版本</div>
            {loadingListings
              ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b">
                  <div className="skeleton h-3.5 w-32 mb-1" />
                  <div className="skeleton h-3 w-20" />
                </div>
              ))
              : listings.length === 0
                ? <p className="px-4 py-6 text-xs text-muted-foreground text-center">暂无版本</p>
                : listings.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setSelectedListing(l); setCompliance(null); setTab('optimize') }}
                    className={`w-full text-left px-4 py-3 border-b text-xs flex items-center justify-between hover:bg-secondary/30 transition-colors ${selectedListing?.id === l.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{l.locale ?? l.language}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {l.version ? `v${l.version} · ` : ''}{l.created_at ? new Date(l.created_at).toLocaleDateString('zh-CN') : l.status}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                ))
            }
          </div>

          {/* Main content */}
          <div className="xl:col-span-3 space-y-4">
            {/* Tabs */}
            <div className="flex border-b bg-white rounded-t-xl border overflow-hidden">
              {([['optimize', 'Listing 内容'], ['compliance', '合规结果']] as [Tab, string][]).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {label}
                  {t === 'compliance' && compliance && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${(compliance.passed ?? compliance.verdict === 'APPROVED') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {(compliance.passed ?? compliance.verdict === 'APPROVED') ? '通过' : `${(compliance.issues ?? []).length}项`}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'optimize' && (
              <div className="space-y-4">
                {selectedListing ? (
                  <>
                    {/* Title */}
                    <div className="bg-white rounded-xl border p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">标题</h3>
                        <CopyButton text={selectedListing.title ?? ''} />
                      </div>
                      <p className="text-sm leading-relaxed">{selectedListing.title || '—'}</p>
                      {selectedListing.title && (
                        <p className={`text-xs mt-2 ${(selectedListing.title?.length ?? 0) > 200 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {selectedListing.title?.length ?? 0} / 200 字符
                        </p>
                      )}
                    </div>

                    {/* Bullet points */}
                    <div className="bg-white rounded-xl border p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">卖点要点</h3>
                        <CopyButton text={(selectedListing.bullet_points ?? []).join('\n')} />
                      </div>
                      {(selectedListing.bullet_points ?? []).length > 0
                        ? (
                          <ul className="space-y-2">
                            {(selectedListing.bullet_points ?? []).map((bp, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <span className="text-primary font-bold shrink-0">•</span>
                                <span className="leading-relaxed">{bp}</span>
                              </li>
                            ))}
                          </ul>
                        )
                        : <p className="text-sm text-muted-foreground">—</p>
                      }
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-xl border p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">商品描述</h3>
                        <CopyButton text={selectedListing.description ?? ''} />
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{selectedListing.description || '—'}</p>
                    </div>

                    {/* Search terms */}
                    {selectedListing.search_terms && (
                      <div className="bg-white rounded-xl border p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">搜索词</h3>
                          <CopyButton text={selectedListing.search_terms} />
                        </div>
                        <p className="text-sm font-mono text-muted-foreground leading-relaxed">{selectedListing.search_terms}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-xl border p-12 text-center">
                    <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {products.length === 0
                        ? '请先在商品追踪页面添加 ASIN'
                        : '点击「AI 优化」生成专业 Listing 文案'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'compliance' && (
              <div className="space-y-4">
                {checking ? (
                  <div className="bg-white rounded-xl border p-12 text-center">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">AI 正在进行合规检查…</p>
                  </div>
                ) : compliance ? (
                  <>
                    {(() => {
                      const passed = compliance.passed ?? (compliance.verdict === 'APPROVED')
                      const issues = compliance.issues ?? [
                        ...(compliance.blockers ?? []).map((i) => ({ ...i, severity: 'error' as const })),
                        ...(compliance.major_issues ?? []).map((i) => ({ ...i, severity: 'warning' as const })),
                        ...(compliance.minor_suggestions ?? []).map((i) => ({ ...i, severity: 'info' as const })),
                      ]
                      return (
                        <>
                          <div className={`bg-white rounded-xl border p-5 flex items-center gap-4 ${passed ? 'border-emerald-200' : 'border-red-200'}`}>
                            {passed
                              ? <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
                              : <XCircle className="w-8 h-8 text-red-500 shrink-0" />}
                            <div>
                              <p className="font-semibold">{passed ? '合规检查通过' : '发现合规问题'}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {passed
                                  ? '该 Listing 符合亚马逊政策要求'
                                  : `共 ${issues.length} 项需要处理`}
                              </p>
                            </div>
                          </div>
                          {issues.length > 0 && (
                            <div className="space-y-3">
                              {issues.map((issue, i) => (
                                <ComplianceItem key={i} issue={issue as { field: string; issue: string; suggestion: string; severity: string }} />
                              ))}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </>
                ) : (
                  <div className="bg-white rounded-xl border p-12 text-center">
                    <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">点击「合规检查」验证 Listing 是否符合亚马逊政策</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
