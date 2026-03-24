import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        panel: 'var(--bg-panel)',
        card: 'var(--bg-card)',
        border: 'var(--border)',
        'border-glow': 'var(--border-glow)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-dim': 'var(--text-dim)',
        accent: {
          blue: 'var(--accent-blue)',
          purple: 'var(--accent-purple)',
          cyan: 'var(--accent-cyan)',
          orange: 'var(--accent-orange)',
          pink: 'var(--accent-pink)',
          yellow: 'var(--accent-yellow)',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        panel: '12px',
        card: '16px',
      },
      animation: {
        'bot-idle': 'bot-idle 3s ease-in-out infinite',
        'bot-working': 'bot-working 1.2s ease-in-out infinite',
        'bot-thinking': 'bot-thinking 2s ease-in-out infinite',
        'bot-resting': 'bot-resting 4s ease-in-out infinite',
        'bot-alert': 'bot-alert 0.6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'typing-dot': 'typing-dot 1.4s infinite',
        'bubble-pop': 'bubble-pop 0.3s ease-out',
        'scan-line': 'scan-line 8s linear infinite',
      },
      keyframes: {
        'bot-idle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'bot-working': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-3px) scale(1.02)' },
        },
        'bot-thinking': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '1' },
          '50%': { transform: 'translateY(-2px)', opacity: '0.8' },
        },
        'bot-resting': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '50%': { transform: 'translateY(-2px)', opacity: '0.4' },
        },
        'bot-alert': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px var(--glow-color, rgba(79,142,247,0.3))' },
          '50%': { boxShadow: '0 0 20px var(--glow-color, rgba(79,142,247,0.6))' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'typing-dot': {
          '0%, 60%, 100%': { content: '""' },
          '30%': { content: '"."' },
        },
        'bubble-pop': {
          '0%': { transform: 'scale(0.8) translateY(4px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
