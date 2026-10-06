import { makeAutoObservable, observableRef, reaction } from 'mobx'
import type { AccidentRow } from '@/entities/accident/model/types'
import { authStore } from '@/entities/user/model/authStore'

// Модалка получает уже отфильтрованные строки и сама данные не запрашивает
class DrilldownStore {
  isOpen = false
  title = ''
  rows: AccidentRow[] = []

  constructor() {
    makeAutoObservable(this, { rows: observableRef })

    // Смена сессии закрывает модалку и очищает ПДн
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
