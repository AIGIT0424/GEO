'use client'

import { Bell, Globe } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-16 border-b bg-white flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground">
          <Globe className="w-3.5 h-3.5" />
          Amazon US
        </div>
      </div>
    </header>
  )
}
