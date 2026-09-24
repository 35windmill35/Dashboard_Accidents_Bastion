import { makeAutoObservable, observableRef, reaction } from 'mobx'
import type { AccidentRow } from '@/entities/accident/model/types'
import { authStore } from '@/entities/user/model/authStore'

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

    // Выход, истечение сессии, 401 или вход под другим пользователем —
    // модалка закрывается, строки с ФИО и суммами выбрасываются из памяти.
    reaction(
      () => authStore.sessionEpoch,
      () => this.reset()
    )
  }

  open(title: string, rows: AccidentRow[]): void {
    this.title = title
    this.rows = rows
    this.isOpen = true
  }

  // Строки не держим после закрытия — незачем хранить ПДн в памяти.
  close(): void {
    this.reset()
  }

  reset(): void {
    this.isOpen = false
    this.title = ''
    this.rows = []
  }
}

export const drilldownStore = new DrilldownStore()
