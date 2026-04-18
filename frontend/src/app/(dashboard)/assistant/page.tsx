'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, Sparkles, RefreshCw, Package, Tag, Megaphone } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { assistantApi } from '@/lib/api'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: Date
}

const STARTERS = [
  { icon: Package, text: '分析我的商品竞争态势，给出定价建议' },
  { icon: Tag, text: '哪些关键词排名有上升机会，应该加大投放？' },
  { icon: Megaphone, text: '广告 ACoS 偏高，有哪些优化思路？' },
  { icon: Sparkles, text: '帮我生成一份完整的亚马逊选品分析报告' },
]

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-primary text-white' : 'bg-secondary text-primary border'}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-primary text-white rounded-tr-sm' : 'bg-white border rounded-tl-sm shadow-sm'}`}>
        {msg.content}
        <p className={`text-[10px] mt-1.5 ${isUser ? 'text-white/60 text-right' : 'text-muted-foreground'}`}>
          {msg.ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-secondary text-primary border">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-white border rounded-2xl rounded-tl-sm shadow-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 GEO AI 助手，专注于亚马逊跨境电商运营分析。\n\n我可以帮你分析商品竞争、关键词策略、广告优化、选品方向等问题。有什么我可以帮你的吗？',
      ts: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const content = text.trim()
    if (!content || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, ts: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content })

      const r = await assistantApi.chat(history)
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: r.data.reply ?? r.data.message ?? '（无回应）',
        ts: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      toast.error('AI 助手暂时不可用，请稍后重试')
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '抱歉，我暂时无法回应，请稍后重试。',
          ts: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  function clearChat() {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '对话已清除。有什么我可以帮你的吗？',
      ts: new Date(),
    }])
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="AI 助手"
        subtitle="亚马逊跨境运营专家"
        actions={
          <button
            onClick={clearChat}
            className="p-2 border rounded-lg hover:bg-secondary/50 transition-colors"
            title="清除对话"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        }
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Starter prompts (shown when only welcome message) */}
        {messages.length === 1 && !loading && (
          <div className="px-6 pb-3 grid grid-cols-2 gap-2">
            {STARTERS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={() => send(text)}
                className="flex items-start gap-2 text-left p-3 rounded-xl border bg-white hover:bg-secondary/30 transition-colors text-xs text-muted-foreground hover:text-foreground"
              >
                <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                <span>{text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t bg-white px-6 py-4">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 border rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-primary/30 bg-secondary/20">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKey}
                placeholder="输入问题… (Enter 发送，Shift+Enter 换行)"
                rows={1}
                className="w-full bg-transparent resize-none text-sm focus:outline-none leading-relaxed"
              />
            </div>
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            AI 回答仅供参考，重要决策请结合实际数据综合判断
          </p>
        </div>
      </div>
    </div>
  )
}
