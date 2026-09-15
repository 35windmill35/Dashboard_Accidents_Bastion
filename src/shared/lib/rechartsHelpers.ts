// Recharts типизирует onClick-обработчики Bar/Pie слишком строго под
// generic-props самого компонента, а не под наши данные — практический
// способ обойти это, не теряя типизацию исходных данных, один общий
// хелпер вместо `as any` в каждом графике.
export function barPayload<T>(entry: unknown): T {
  return (entry as { payload: T }).payload
}
