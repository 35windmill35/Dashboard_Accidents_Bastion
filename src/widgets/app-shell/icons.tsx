import type { SVGProps } from 'react'

// Инлайн-иконки для навигации и шапки — без сторонней иконочной библиотеки,
// тот же стиль (20x20, stroke=currentColor), что и в первом дашборде.
const common: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconGrid() {
  return (
    <svg {...common}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function IconBus() {
  return (
    <svg {...common}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M3 12h18" />
      <circle cx="7.5" cy="19" r="1.4" />
      <circle cx="16.5" cy="19" r="1.4" />
    </svg>
  )
}

export function IconChart() {
  return (
    <svg {...common}>
      <path d="M4 20V10" />
      <path d="M11 20V4" />
      <path d="M18 20v-7" />
    </svg>
  )
}

export function IconMenu() {
  return (
    <svg {...common}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

export function IconRefresh() {
  return (
    <svg {...common}>
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

export function IconPdf() {
  return (
    <svg {...common}>
      <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M15 2v5h5" />
    </svg>
  )
}
