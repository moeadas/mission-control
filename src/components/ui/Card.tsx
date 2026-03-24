import React from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: string
  onClick?: () => void
  style?: React.CSSProperties
}

export function Card({ children, className, hover, glow, onClick, style }: CardProps) {
  const glowStyle = glow
    ? { boxShadow: `0 0 0 1px ${glow}40, 0 0 20px ${glow}20`, ...style }
    : style

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-card border border-border rounded-card p-5',
        hover && 'cursor-pointer transition-all duration-150 hover:border-border-glow hover:shadow-lg',
        glow && 'shadow-[0_0_20px_rgba(0,0,0,0.3)]',
        onClick && 'cursor-pointer',
        className
      )}
      style={glowStyle}
    >
      {children}
    </div>
  )
}
