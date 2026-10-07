import { Text, type YAxisTickContentProps } from 'recharts'

interface TickStyle {
  fill: string
  fontSize: number
}

// Подпись оси Y одной строкой: стандартный тик Recharts получает ширину оси
// и переносит длинную сумму на вторую строку, которая обрезается сверху
export function renderYAxisTick(props: YAxisTickContentProps, style: TickStyle) {
  const { x, y, textAnchor, verticalAnchor, className, payload, index, tickFormatter } = props
  const value = tickFormatter ? tickFormatter(payload.value, index) : String(payload.value ?? '')
  return (
    <Text
      x={x}
      y={y}
      textAnchor={textAnchor}
      verticalAnchor={verticalAnchor}
      fill={style.fill}
      fontSize={style.fontSize}
      className={className}
    >
      {value}
    </Text>
  )
}
