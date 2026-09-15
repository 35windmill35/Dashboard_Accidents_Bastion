import { makeAutoObservable, observableRef } from 'mobx'
import type { AccidentRow } from '@/entities/accident/model/types'

// Общее модальное окно детализации — вызывается кликами по KPI/графикам/
// таблицам на всех трёх экранах. Открывающий код просто передаёт заголовок
// и уже отфильтрованный список строк, сама модалка данные не запрашивает и
// не фильтрует по периоду/автоколонне повторно.
class DrilldownStore {
  isOpen = false
  title = ''
  rows: AccidentRow[] = []

  constructor() {
    makeAutoObservable(this, { rows: observableRef })
  }

  open(title: string, rows: AccidentRow[]): void {
    this.title = title
    this.rows = rows
    this.isOpen = true
  }

  close(): void {
    this.isOpen = false
  }
}

export const drilldownStore = new DrilldownStore()
