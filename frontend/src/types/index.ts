export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserRead {
  id: string
  email: string
  full_name: string
  is_active: boolean
  amazon_marketplace_id: string | null
}

export interface ProductRead {
  id: string
  asin: string
  marketplace_id: string
  title: string | null
  brand: string | null
  category: string | null
  price: number | null
  bsr_rank: number | null
  review_count: number | null
  review_rating: number | null
  // aliases / computed fields from backend
  rating?: number | null
  opportunity_score?: number | null
  image_url: string | null
}

export interface ProductResearchResult {
  asin: string
  title: string
  price: number | null
  bsr_rank: number | null
  review_count: number | null
  review_rating: number | null
  estimated_monthly_sales: number | null
  opportunity_score: number | null
}

export interface KeywordRead {
  id: string
  keyword: string
  search_volume: number | null
  competition_score: number | null
  relevance_score: number | null
  suggested_bid: number | null
  current_rank?: number | null
}

export interface KeywordResearchResult extends KeywordRead {
  related_keywords: string[]
}

export interface KeywordRankingRead {
  id: string
  keyword_id: string
  rank_date: string
  checked_at?: string
  organic_rank: number | null
  rank?: number | null
  sponsored_rank: number | null
  page: number | null
}

export interface ListingRead {
  id: string
  product_id: string
  language: string
  locale?: string
  version?: number
  created_at?: string
  title: string | null
  bullet_points: string[] | null
  description: string | null
  search_terms: string | null
  status: string
}

export interface ListingOptimizeResult {
  title: string
  bullet_points: string[]
  description: string
  search_terms: string
  keyword_coverage: string[]
  optimization_score: number
}

export interface ComplianceIssue {
  field: string
  issue?: string
  severity?: 'error' | 'warning' | 'info'
  suggestion: string
}

export interface ListingComplianceResult {
  listing_id: string
  verdict?: 'APPROVED' | 'REQUEST_CHANGES'
  passed?: boolean
  blockers?: ComplianceIssue[]
  major_issues?: ComplianceIssue[]
  minor_suggestions?: ComplianceIssue[]
  issues?: ComplianceIssue[]
  keyword_coverage_pct?: number
  overall_score?: number
}

export interface CampaignRead {
  id: string
  amazon_campaign_id: string | null
  name: string
  campaign_type: string
  targeting_type: string
  status: string
  daily_budget: number | null
  total_spend: number
  total_sales: number
  impressions: number
  clicks: number
  acos: number | null
  roas: number | null
}

export interface CampaignKeywordRead {
  id: string
  campaign_id: string
  keyword_text: string
  match_type: string
  bid: number | null
  status: string
  spend: number
  sales: number
  clicks: number
  impressions: number
  acos?: number | null
}

export interface CampaignAnalysisResult {
  campaign_id: string
  period_days: number
  spend: number
  sales: number
  acos: number | null
  roas: number | null
  ctr: number | null
  cvr: number | null
  top_performing_keywords: string[]
  underperforming_keywords: string[]
  recommendations: string[]
}

export interface BidExecutionResult {
  task_id: string
  adjustments_queued: number
}

export interface ChatResponse {
  message?: string
  reply?: string
  suggestions?: string[]
  related_actions?: string[]
}

export interface UserMarketplaceRead {
  id: string
  marketplace_id: string
  name: string
  region: string
  currency: string
  is_default: boolean
}

export interface MarketplaceInfo {
  marketplace_id: string
  name: string
  region: string
  currency: string
  locale: string
}
