import React from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  style?: React.CSSProperties
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ 
  children, 
  className, 
  hover, 
  onClick, 
  style,
  padding = 'md',
}: CardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }[padding]

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-[var(--bg-card)] border border-[var(--border)] rounded-xl',
        paddingClass,
        hover && 'cursor-pointer transition-colors duration-150 hover:border-[var(--border-glow)] hover:bg-[var(--bg-elevated)]',
        onClick && 'cursor-pointer',
        className
      )}
      style={style}
    >
      {children}
    </div>
  )
}
