/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Brand / App Shell ─────────────────────────────────────────────────
      colors: {
        // Semantic surface tokens
        background:  '#0a0e27',
        foreground:  '#f0f0f0',
        muted:       '#6b7280',
        brand:       '#00d9ff',
        border:      'rgba(255,255,255,0.10)',
        input:       'rgba(255,255,255,0.05)',
        ring:        '#00d9ff',

        // Surface layers
        surface: {
          DEFAULT: '#111827',
          raised:  '#1f2937',
          overlay: '#374151',
        },

        // Semantic UI tokens
        success:  '#22c55e',
        warning:  '#f59e0b',
        danger:   '#ef4444',
        info:     '#3b82f6',

        // ── Pokémon Type Colors ─────────────────────────────────────────────
        // Usage: bg-type-fire, text-type-water, border-type-dragon …
        type: {
          normal:   '#9ca3af',
          fire:     '#f97316',
          water:    '#3b82f6',
          electric: '#facc15',
          grass:    '#22c55e',
          ice:      '#67e8f9',
          fighting: '#b91c1c',
          poison:   '#a855f7',
          ground:   '#a16207',
          flying:   '#818cf8',
          psychic:  '#ec4899',
          bug:      '#65a30d',
          rock:     '#92400e',
          ghost:    '#7c3aed',
          dragon:   '#4338ca',
          dark:     '#374151',
          steel:    '#9ca3af',
          fairy:    '#f9a8d4',
        },

        // ── HP Bar Colors ───────────────────────────────────────────────────
        hp: {
          high:   '#22c55e',
          medium: '#f59e0b',
          low:    '#ef4444',
        },

        // ── Affinity Rank Colors ─────────────────────────────────────────────
        affinity: {
          1:  '#6b7280',
          2:  '#22c55e',
          3:  '#3b82f6',
          4:  '#8b5cf6',
          5:  '#f59e0b',
          6:  '#f97316',
          7:  '#ef4444',
          8:  '#ec4899',
          9:  '#06b6d4',
          10: '#fbbf24',
        },
      },

      // ── Typography ─────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      // ── Spacing ────────────────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },

      // ── Border Radius ──────────────────────────────────────────────────────
      borderRadius: {
        sm:  '0.25rem',
        md:  '0.375rem',
        lg:  '0.5rem',
        xl:  '0.75rem',
        '2xl': '1rem',
      },

      // ── Box Shadows ─────────────────────────────────────────────────────────
      boxShadow: {
        'glow-brand':  '0 0 12px rgba(0, 217, 255, 0.4)',
        'glow-danger': '0 0 12px rgba(239, 68, 68, 0.4)',
        'card':        '0 4px 6px -1px rgba(0,0,0,0.5), 0 2px 4px -2px rgba(0,0,0,0.4)',
      },

      // ── Animations ─────────────────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 217, 255, 0.4)' },
          '50%':       { boxShadow: '0 0 0 8px rgba(0, 217, 255, 0)' },
        },
        'stream-cursor': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
      },
      animation: {
        'fade-in':       'fade-in 0.2s ease-out',
        'pulse-ring':    'pulse-ring 1.5s ease-in-out infinite',
        'stream-cursor': 'stream-cursor 1s step-end infinite',
      },
    },
  },
  plugins: [],
};
