import React from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
        // variants
        variant === 'primary' && 'bg-accent-blue text-white hover:bg-blue-500 active:scale-95 focus-visible:ring-accent-blue',
        variant === 'secondary' && 'bg-card border border-border text-text-primary hover:border-border-glow active:scale-95 focus-visible:ring-[var(--border-glow)]',
        variant === 'ghost' && 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-card active:scale-95 focus-visible:ring-accent-blue',
        variant === 'danger' && 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 active:scale-95 focus-visible:ring-red-500',
        // sizes
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
