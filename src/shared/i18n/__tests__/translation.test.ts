// @vitest-environment node
/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import translation from '../../../../translation.json'
import { t } from '..'

const ROOT = fileURLToPath(new URL('../../../..', import.meta.url))
const SRC = join(ROOT, 'src')
const CYRILLIC = /[А-Яа-яЁё]/
// Обозначения валют — не перевод
const ALLOWED = new Set(['сом', 'сўм'])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      return ['__tests__', 'fonts', 'test'].includes(name) ? [] : sourceFiles(path)
    }
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

function russianLiterals(path: string): string[] {
  const text = readFileSync(path, 'utf8')
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
  const found: string[] = []
  const visit = (node: ts.Node) => {
    const isText =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node) ||
      ts.isJsxText(node)
    if (isText && CYRILLIC.test(node.getText(file))) {
      let parent: ts.Node | undefined = node.parent
      while (
        parent &&
        !(ts.isCallExpression(parent) && /^console\./.test(parent.expression.getText(file)))
      ) {
        parent = parent.parent
      }
      const value = ts.isStringLiteral(node) ? node.text : node.getText(file).trim()
      if (!parent && !ALLOWED.has(value)) {
        const { line } = file.getLineAndCharacterOfPosition(node.getStart(file))
        found.push(`${relative(ROOT, path)}:${line + 1} ${value}`)
      }
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found
}

describe('translation.json', () => {
  it('в коде нет русских строк мимо файла переводов', () => {
    expect(sourceFiles(SRC).flatMap(russianLiterals)).toEqual([])
  })

  it('каждый ключ дашборда ДТП используется в коде', () => {
    const code = sourceFiles(SRC)
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    const unused = Object.keys(translation).filter(
      (key) => key.startsWith('roadAccidents.') && !code.includes(`'${key}'`)
    )
    expect(unused).toEqual([])
  })

  it('подставляет параметры', () => {
    expect(t('roadAccidents.common.pageOf', { page: 2, total: 5 })).toBe('Страница 2 из 5')
    expect(t('roadAccidents.table.topDrivers', { count: 8 })).toBe('Топ-8 водителей по числу ДТП')
  })

  it('переиспользует общие ключи файла', () => {
    expect(t('month_8')).toBe('Сентябрь')
    expect(t('close')).toBe('Закрыть')
  })
})
