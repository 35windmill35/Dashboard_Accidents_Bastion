// Градиентные заливки графиков по эталону. Кладутся в <defs> внутри
// графика Recharts; id — уникальный на экземпляр графика (useId).

interface GradientProps {
  id: string
  color: string
}

// Заливка под линией: цвет серии сверху → прозрачный к оси. При двух
// сериях заливка слабее, чтобы области не перекрывали друг друга.
export function AreaGradient({ id, color, strong = true }: GradientProps & { strong?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={strong ? 0.3 : 0.14} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  )
}

// Заливка столбца по эталону: насыщенный верх → почти прозрачное основание
export function BarGradient({ id, color }: GradientProps) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={1} />
      <stop offset="40%" stopColor={color} stopOpacity={0.65} />
      <stop offset="100%" stopColor={color} stopOpacity={0.12} />
    </linearGradient>
  )
}
