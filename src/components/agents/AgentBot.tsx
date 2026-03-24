'use client'

import React from 'react'
import { clsx } from 'clsx'
import { BotAnimation } from '@/lib/types'

const BOT_FACES: Record<string, React.ReactNode> = {
  'bot-purple': (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="32" height="26" rx="8" fill="#9b6dff" />
      <rect x="8" y="12" width="24" height="18" rx="5" fill="#0d0f14" />
      <circle cx="15" cy="20" r="3" fill="#9b6dff" className="animate-pulse" />
      <circle cx="25" cy="20" r="3" fill="#9b6dff" className="animate-pulse" />
      <rect x="14" y="26" width="12" height="2" rx="1" fill="#9b6dff" opacity="0.6" />
    </svg>
  ),
  'bot-cyan': (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="32" height="26" rx="8" fill="#00d4aa" />
      <rect x="8" y="12" width="24" height="18" rx="5" fill="#0d0f14" />
      <circle cx="15" cy="20" r="3" fill="#00d4aa" className="animate-pulse" />
      <circle cx="25" cy="20" r="3" fill="#00d4aa" className="animate-pulse" />
      <path d="M13 26 Q20 30 27 26" stroke="#00d4aa" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  ),
  'bot-orange': (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="32" height="26" rx="8" fill="#ff7c42" />
      <rect x="8" y="12" width="24" height="18" rx="5" fill="#0d0f14" />
      <rect x="12" y="18" width="6" height="4" rx="1" fill="#ff7c42" />
      <rect x="22" y="18" width="6" height="4" rx="1" fill="#ff7c42" />
      <rect x="15" y="26" width="10" height="2" rx="1" fill="#ff7c42" opacity="0.6" />
    </svg>
  ),
  'bot-pink': (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="32" height="26" rx="8" fill="#ff5fa0" />
      <rect x="8" y="12" width="24" height="18" rx="5" fill="#0d0f14" />
      <circle cx="15" cy="19" r="2.5" fill="#ff5fa0" />
      <circle cx="25" cy="19" r="2.5" fill="#ff5fa0" />
      <circle cx="15" cy="19" r="4" fill="none" stroke="#ff5fa0" strokeWidth="0.5" opacity="0.5" className="animate-ping" />
      <circle cx="25" cy="19" r="4" fill="none" stroke="#ff5fa0" strokeWidth="0.5" opacity="0.5" className="animate-ping" />
      <rect x="14" y="26" width="12" height="2" rx="1" fill="#ff5fa0" opacity="0.6" />
    </svg>
  ),
  'bot-yellow': (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="32" height="26" rx="8" fill="#ffd166" />
      <rect x="8" y="12" width="24" height="18" rx="5" fill="#0d0f14" />
      <rect x="12" y="17" width="5" height="5" rx="1" fill="#ffd166" />
      <rect x="23" y="17" width="5" height="5" rx="1" fill="#ffd166" />
      <rect x="14" y="26" width="12" height="2" rx="1" fill="#ffd166" opacity="0.6" />
    </svg>
  ),
  'bot-blue': (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="32" height="26" rx="8" fill="#4f8ef7" />
      <rect x="8" y="12" width="24" height="18" rx="5" fill="#0d0f14" />
      <circle cx="15" cy="20" r="3" fill="#4f8ef7" className="animate-pulse" />
      <circle cx="25" cy="20" r="3" fill="#4f8ef7" className="animate-pulse" />
      <path d="M14 26 Q20 29 26 26" stroke="#4f8ef7" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  ),
}

const ANIMATION_CLASSES: Record<BotAnimation, string> = {
  idle: 'animate-bot-idle',
  working: 'animate-bot-working',
  thinking: 'animate-bot-thinking',
  resting: 'animate-bot-resting',
  alert: 'animate-bot-alert',
}

interface AgentBotProps {
  name: string
  avatar: string
  color: string
  animation?: BotAnimation
  status?: 'active' | 'idle' | 'paused'
  size?: number
  showLabel?: boolean
  className?: string
  onClick?: () => void
}

export function AgentBot({
  name,
  avatar,
  color,
  animation = 'idle',
  status = 'active',
  size = 48,
  showLabel = false,
  className,
  onClick,
}: AgentBotProps) {
  const face = BOT_FACES[avatar] || BOT_FACES['bot-blue']

  return (
    <div
      className={clsx('flex flex-col items-center gap-1', className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      {/* Bot container */}
      <div
        className={clsx(
          'relative rounded-xl p-1 transition-all duration-300',
          ANIMATION_CLASSES[animation],
          status === 'paused' && 'opacity-40 grayscale',
          status === 'idle' && 'opacity-80',
          onClick && 'hover:scale-110'
        )}
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 50% 30%, ${color}30, ${color}10)`,
          boxShadow: `0 0 12px ${color}40, 0 0 24px ${color}15`,
        }}
      >
        {/* Status dot */}
        <div
          className={clsx(
            'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-panel',
            status === 'active' && 'bg-accent-cyan',
            status === 'idle' && 'bg-yellow-400',
            status === 'paused' && 'bg-text-dim'
          )}
        />
        {/* Bot face */}
        <div className="w-full h-full">{face}</div>

        {/* Working indicator */}
        {animation === 'working' && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-accent-cyan animate-typing-dot" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-accent-cyan animate-typing-dot" style={{ animationDelay: '200ms' }} />
            <span className="w-1 h-1 rounded-full bg-accent-cyan animate-typing-dot" style={{ animationDelay: '400ms' }} />
          </div>
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className="text-[10px] font-mono font-medium text-text-secondary text-center"
          style={{ color: `${color}cc` }}
        >
          {name}
        </span>
      )}
    </div>
  )
}

// Typing dot animation
const style = `
@keyframes typing-dot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
  30% { transform: translateY(-3px); opacity: 1; }
}
.animate-typing-dot {
  animation: typing-dot 1.4s infinite;
}
`
if (typeof document !== 'undefined') {
  const el = document.createElement('style')
  el.textContent = style
  document.head.appendChild(el)
}
