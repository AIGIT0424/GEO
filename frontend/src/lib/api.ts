import axios from 'axios'
import type {
  TokenResponse, UserRead,
  ProductRead, ProductResearchResult,
  KeywordRead, KeywordResearchResult, KeywordRankingRead,
  ListingRead, ListingOptimizeResult, ListingComplianceResult,
  CampaignRead, CampaignAnalysisResult, CampaignKeywordRead, BidExecutionResult,
  ChatResponse, UserMarketplaceRead, MarketplaceInfo,
} from '@/types'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30_000,
})

// Inject token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-clear token on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/api/v1/auth/login', { email, password }),
  register: (email: string, password: string, full_name: string) =>
    api.post<UserRead>('/api/v1/auth/register', { email, password, full_name }),
}

// ── Amazon OAuth ──────────────────────────────────────────────────────────────
export const amazonApi = {
  getOAuthUrl: () => api.get<{ url: string; state: string }>('/api/v1/amazon/oauth/url'),
  getStatus: () => api.get<{ connected: boolean; marketplace_id: string | null }>('/api/v1/amazon/oauth/status'),
  disconnect: () => api.delete('/api/v1/amazon/oauth/disconnect'),
}

// ── Products ──────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (skip = 0, limit = 50) =>
    api.get<ProductRead[]>('/api/v1/products', { params: { skip, limit } }),
  get: (id: string) => api.get<ProductRead>(`/api/v1/products/${id}`),
  create: (payload: { asin: string; marketplace_id: string }) =>
    api.post<ProductRead>('/api/v1/products', payload),
  research: (params: object) => api.post<ProductResearchResult[]>('/api/v1/products/research', params),
}

// ── Keywords ──────────────────────────────────────────────────────────────────
export const keywordsApi = {
  list: (product_id: string, skip = 0, limit = 100) =>
    api.get<KeywordRead[]>('/api/v1/keywords/by-product/' + product_id, { params: { skip, limit } }),
  research: (seed_keywords: string[], asin?: string, marketplace_id = 'ATVPDKIKX0DER') =>
    api.post<KeywordResearchResult[]>('/api/v1/keywords/research', { seed_keywords, asin, marketplace_id }),
  rankings: (keyword_id: string, days = 30) =>
    api.get<KeywordRankingRead[]>(`/api/v1/keywords/${keyword_id}/rankings`, { params: { days } }),
  track: (product_id: string, keyword: string) =>
    api.post<KeywordRead>('/api/v1/keywords', { product_id, keyword }),
  triggerTracking: (product_id: string) =>
    api.post(`/api/v1/keywords/by-product/${product_id}/track`),
}

// ── Listings ──────────────────────────────────────────────────────────────────
export const listingsApi = {
  list: (product_id: string) =>
    api.get<ListingRead[]>('/api/v1/listings', { params: { product_id } }),
  byProduct: (product_id: string, language = 'en') =>
    api.get<ListingRead | null>(`/api/v1/listings/by-product/${product_id}`, { params: { language } }),
  optimize: (product_id: string, payload: { locale: string; marketplace_id: string }) =>
    api.post<ListingRead>(`/api/v1/listings/optimize`, { product_id, ...payload }),
  compliance: (listing_id: string, marketplace = 'US') =>
    api.post<ListingComplianceResult>(`/api/v1/listings/${listing_id}/compliance-check`, null, {
      params: { marketplace },
    }),
  saveVariant: (listing_id: string, payload: object) =>
    api.post('/api/v1/listings/' + listing_id + '/variants', payload),
}

// ── Advertising ───────────────────────────────────────────────────────────────
export const advertisingApi = {
  campaigns: (skip = 0, limit = 50) =>
    api.get<CampaignRead[]>('/api/v1/advertising/campaigns', { params: { skip, limit } }),
  campaignKeywords: (campaign_id: string) =>
    api.get<CampaignKeywordRead[]>(`/api/v1/advertising/campaigns/${campaign_id}/keywords`),
  analyze: (campaign_id: string, target_acos = 25, date_range_days = 30) =>
    api.post<CampaignAnalysisResult>(`/api/v1/advertising/campaigns/${campaign_id}/analyze`, null, {
      params: { target_acos, date_range_days },
    }),
  executeBids: (campaign_id: string, adjustments: object[]) =>
    api.post<BidExecutionResult>(`/api/v1/advertising/campaigns/${campaign_id}/bids/execute`, {
      adjustments,
    }),
}

// ── AI Assistant ──────────────────────────────────────────────────────────────
export const assistantApi = {
  chat: (messages: { role: string; content: string }[], context?: object) =>
    api.post<ChatResponse>('/api/v1/assistant/chat', { messages, context }),
}

// ── Marketplaces ──────────────────────────────────────────────────────────────
export const marketplacesApi = {
  supported: () => api.get<MarketplaceInfo[]>('/api/v1/marketplaces/supported'),
  mine: () => api.get<UserMarketplaceRead[]>('/api/v1/marketplaces'),
  add: (marketplace_id: string, is_default = false) =>
    api.post('/api/v1/marketplaces', { marketplace_id, is_default }),
  setDefault: (marketplace_id: string) =>
    api.post('/api/v1/marketplaces/default', { marketplace_id }),
  remove: (marketplace_id: string) => api.delete(`/api/v1/marketplaces/${marketplace_id}`),
}
