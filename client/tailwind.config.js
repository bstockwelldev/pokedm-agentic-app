/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens from PRD
        background: '#0a0e27', // Near-black blue
        foreground: '#f0f0f0', // Off-white text
        muted: '#6b7280', // Cool gray
        brand: '#00d9ff', // Electric cyan
        // Additional semantic colors
        border: 'rgba(255, 255, 255, 0.1)',
        input: 'rgba(255, 255, 255, 0.05)',
        ring: '#00d9ff', // Focus ring color
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [],
}
