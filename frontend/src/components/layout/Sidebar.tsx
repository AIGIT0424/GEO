'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PackageSearch, Tag, FileText,
  Megaphone, Bot, Settings, LogOut, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

const nav = [
  { label: '概览', href: '/dashboard', icon: LayoutDashboard },
  { label: '选品研究', href: '/products', icon: PackageSearch },
  { label: '关键词', href: '/keywords', icon: Tag },
  { label: 'Listing 优化', href: '/listings', icon: FileText },
  { label: '广告管理', href: '/advertising', icon: Megaphone },
  { label: 'AI 助手', href: '/assistant', icon: Bot },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-geo-500">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <span className="text-sidebar-foreground font-bold text-lg tracking-tight">GEO</span>
        <span className="text-xs text-sidebar-foreground/40 font-medium ml-auto">Beta</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-active text-white'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-sidebar-active text-white'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground',
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          设置
        </Link>

        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-geo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-xs font-medium truncate">{user?.full_name ?? '用户'}</p>
            <p className="text-sidebar-foreground/40 text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-sidebar-foreground/40 hover:text-red-400 transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
