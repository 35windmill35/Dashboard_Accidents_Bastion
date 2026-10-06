// Градиентные заливки графиков; id уникален на экземпляр графика

interface GradientProps {
  id: string
  color: string
}

// При двух сериях заливка слабее
export function AreaGradient({ id, color, strong = true }: GradientProps & { strong?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={strong ? 0.3 : 0.14} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  )
}

export function BarGradient({ id, color }: GradientProps) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={1} />
      <stop offset="40%" stopColor={color} stopOpacity={0.65} />
      <stop offset="100%" stopColor={color} stopOpacity={0.12} />
    </linearGradient>
  )
}
