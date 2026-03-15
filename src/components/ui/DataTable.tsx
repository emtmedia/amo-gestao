'use client'

import { useState } from 'react'
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T extends object> {
  key: keyof T | string
  label: string
  render?: (value: unknown, row: T) => React.ReactNode
  compact?: boolean // hide on very small screens
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<T extends object = Record<string, unknown>> {
  data: T[]
  columns: Column<T>[]
  onEdit?: (row: Record<string, unknown>) => void
  onDelete?: (row: Record<string, unknown>) => void
  searchable?: boolean
  searchKeys?: string[]
  perPage?: number
  rowClassName?: (row: T) => string
}

export default function DataTable<T extends object>({
  data,
  columns,
  onEdit,
  onDelete,
  searchable = true,
  searchKeys = [],
  perPage = 10,
  rowClassName,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = search
    ? data.filter(row =>
        searchKeys.some(key => {
          const val = (row as Record<string, unknown>)[key]
          return String(val ?? '').toLowerCase().includes(search.toLowerCase())
        })
      )
    : data

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const getNestedValue = (obj: unknown, key: string): unknown => {
    return key.split('.').reduce((acc: unknown, k) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k]
      return undefined
    }, obj)
  }

  const fmt = (v: unknown) => {
    if (v === null || v === undefined || v === '') return <span className="text-navy-300">—</span>
    return String(v)
  }

  return (
    <div>
      {searchable && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-10 pr-4 py-2 border border-cream-300 rounded-lg w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-navy-400 text-sm"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-cream-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-cream-50 border-b border-cream-200">
              {columns.map(col => (
                <th key={String(col.key)}
                  className="text-left px-3 py-2.5 text-navy-500 font-semibold whitespace-nowrap text-xs uppercase tracking-wide">
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="text-right px-3 py-2.5 text-navy-500 font-semibold text-xs uppercase tracking-wide">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-10 text-navy-400 text-sm">
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              paginated.map(row => (
                <tr key={String((row as Record<string, unknown>).id)} className={`hover:bg-cream-50/60 transition-colors group${rowClassName ? ` ${rowClassName(row)}` : ''}`}>
                  {columns.map(col => (
                    <td key={String(col.key)}
                      className="px-3 py-2 text-navy-700 max-w-[180px] truncate text-xs">
                      {col.render
                        ? col.render(getNestedValue(row, String(col.key)), row)
                        : fmt(getNestedValue(row, String(col.key)))}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row as unknown as Record<string, unknown>)}
                            className="p-1.5 rounded-lg text-navy-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row as unknown as Record<string, unknown>)}
                            className="p-1.5 rounded-lg text-navy-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-navy-400">
        <span>{filtered.length} registro(s){search && ` de ${data.length} total`}</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-cream-200 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-1 bg-cream-100 rounded-md">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-cream-200 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
