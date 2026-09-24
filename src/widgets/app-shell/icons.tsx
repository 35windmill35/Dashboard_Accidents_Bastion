import type { SVGProps } from 'react'

// Инлайн-иконки для навигации и шапки — без сторонней иконочной библиотеки,
// в стиле эталона: тонкий штрих (1.6–1.7), stroke=currentColor.
interface IconProps {
  size?: number
}

function base(size: number, strokeWidth = 1.7): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
}

export function IconGrid({ size = 18 }: IconProps) {
  return (
    <svg {...base(size, 1.6)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function IconBus({ size = 18 }: IconProps) {
  return (
    <svg {...base(size, 1.6)}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M3 12h18" />
      <circle cx="7.5" cy="19" r="1.4" />
      <circle cx="16.5" cy="19" r="1.4" />
    </svg>
  )
}

export function IconChart({ size = 18 }: IconProps) {
  return (
    <svg {...base(size, 1.6)}>
      <path d="M4 20V10" />
      <path d="M11 20V4" />
      <path d="M18 20v-7" />
    </svg>
  )
}

export function IconMenu({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

export function IconRefresh({ size = 15 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

// Документ со стрелкой «скачать» — кнопка PDF-отчёта
export function IconPdf({ size = 15 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M15 2v5h5" />
      <path d="M12 11v6" />
      <path d="M9.5 14.5 12 17l2.5-2.5" />
    </svg>
  )
}

export function IconChevronDown({ size = 12 }: IconProps) {
  return (
    <svg {...base(size, 2)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function IconLogout({ size = 15 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}
