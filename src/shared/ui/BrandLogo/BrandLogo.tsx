import styles from './BrandLogo.module.css'

interface BrandLogoProps {
  // Размер плитки в px; иконка внутри — ~80 % от неё, как в эталоне
  size?: number
}

// Логотип дашборда из эталона: автобус спереди на белой плитке с мигающими
// «аварийками». Плитка белая и штрих тёмный в обеих темах — это
// фирменный знак, а не элемент темы, поэтому цвета в самом SVG, а не в
// токенах (кроме цвета «аварийки» — --color-hazard). Мигание отключается
// системной настройкой «уменьшить движение» (index.css).
export function BrandLogo({ size = 40 }: BrandLogoProps) {
  const icon = Math.round(size * 0.8)
  return (
    <span
      className={styles.tile}
      style={{ width: size, height: size, borderRadius: size >= 56 ? 10 : 8 }}
      aria-hidden="true"
    >
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        stroke="#111418"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.svg}
      >
        <path
          d="M15 4.5h18a5 5 0 0 1 5 5V38a1.5 1.5 0 0 1-1.5 1.5h-25A1.5 1.5 0 0 1 10 38V9.5a5 5 0 0 1 5-5Z"
          fill="#ffffff"
        />
        <path d="M16.5 8.5h15" />
        <path d="M14 13.5h20a1 1 0 0 1 1 1V24a1 1 0 0 1-1 1H14a1 1 0 0 1-1-1v-9.5a1 1 0 0 1 1-1Z" />
        <path d="M24 13.5V25" />
        <path d="M10 13v6.5H7.5M38 13v6.5h2.5" />
        <path d="M20 33.5h8" />
        <path d="M13 35.5h22" />
        <path d="M14 39.5v3.5M34 39.5v3.5" />
        <rect className={styles.hazard} x="12.6" y="28.6" width="4.4" height="3.2" rx=".8" />
        <rect className={styles.hazard} x="31" y="28.6" width="4.4" height="3.2" rx=".8" />
      </svg>
    </span>
  )
}
