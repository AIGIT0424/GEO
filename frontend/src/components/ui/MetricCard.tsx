import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  trend?: number // positive = up
  className?: string
  valueClass?: string
}

export function MetricCard({ label, value, sub, icon: Icon, trend, className, valueClass }: MetricCardProps) {
  return (
    <div className={cn('metric-card bg-white rounded-xl border p-5 flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      <div>
        <p className={cn('text-2xl font-bold text-foreground', valueClass)}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <p className={cn('text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs 上周
        </p>
      )}
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border p-5 flex flex-col gap-3">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-8 w-32" />
      <div className="skeleton h-3 w-20" />
    </div>
  )
}
