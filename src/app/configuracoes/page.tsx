'use client'

import { usePreferences } from '@/lib/preferences'
import { Settings, ScanLine, Palette, PanelLeftOpen, Monitor, Moon, Sun, Check, LayoutGrid, List, Sparkles, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function ConfiguracoesPage() {
  const { prefs, updatePrefs, updateScanner } = usePreferences()
  const [toast, setToast] = useState('')

  function save(msg: string = 'Configuração salva!') {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="page-container">
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm bg-green-50 text-green-800 border border-green-200 flex items-center gap-2">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings className="w-6 h-6 text-navy-500 dark:text-gray-400" />
            Configurações
          </h1>
          <p className="text-sm text-navy-500 dark:text-gray-400 mt-1">
            Personalize o sistema de acordo com suas preferências.
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-3xl">

        {/* ── Seção 1: Scanner ── */}
        <div className="card">
          <div className="-mx-6 -mt-6 px-6 py-4 mb-6 rounded-t-xl border-b border-[#7bbdb6] flex items-center gap-3" style={{ backgroundColor: '#E6F4F2' }}>
            <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-navy-700" />
            </div>
            <div>
              <h2 className="font-semibold text-navy-800">Configurações do Scanner</h2>
              <p className="text-xs text-navy-700">Ajuste a qualidade de captura de documentos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Color Mode */}
            <div className="form-group">
              <label className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 opacity-60" />
                Modo de Cor
              </label>
              <div className="flex gap-2">
                {([
                  { value: 'color', label: 'Colorido', icon: '🎨' },
                  { value: 'grayscale', label: 'Escala de Cinza', icon: '🔘' },
                  { value: 'bw', label: 'Preto e Branco', icon: '⬛' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { updateScanner({ colorMode: opt.value }); save() }}
                    className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-xs font-medium transition-all
                      ${prefs.scanner.colorMode === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-600 dark:text-gray-300'
                      }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="form-group">
              <label className="flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 opacity-60" />
                Resolução (DPI)
              </label>
              <div className="flex gap-2">
                {[100, 150, 200, 300].map(dpi => (
                  <button
                    key={dpi}
                    type="button"
                    onClick={() => { updateScanner({ resolution: dpi }); save() }}
                    className={`flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                      ${prefs.scanner.resolution === dpi
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-600 dark:text-gray-300'
                      }`}
                  >
                    {dpi}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {prefs.scanner.resolution <= 100 ? 'Rascunho — arquivo menor' :
                 prefs.scanner.resolution <= 150 ? 'Normal — bom equilíbrio' :
                 prefs.scanner.resolution <= 200 ? 'Alta qualidade — recomendado' :
                 'Máxima qualidade — arquivo maior'}
              </p>
            </div>

            {/* Format */}
            <div className="form-group">
              <label>Formato de Saída</label>
              <div className="flex gap-2">
                {([
                  { value: 'jpeg', label: 'JPEG', desc: 'Menor tamanho' },
                  { value: 'png', label: 'PNG', desc: 'Sem compressão' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { updateScanner({ format: opt.value }); save() }}
                    className={`flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                      ${prefs.scanner.format === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-600 dark:text-gray-300'
                      }`}
                  >
                    <span className="block">{opt.label}</span>
                    <span className="text-xs opacity-60">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* JPEG Quality */}
            {prefs.scanner.format === 'jpeg' && (
              <div className="form-group">
                <label>Qualidade JPEG: {Math.round(prefs.scanner.quality * 100)}%</label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={Math.round(prefs.scanner.quality * 100)}
                  onChange={e => { updateScanner({ quality: parseInt(e.target.value) / 100 }); save() }}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Menor arquivo</span>
                  <span>Maior qualidade</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Seção 2: Aparência ── */}
        <div className="card">
          <div className="-mx-6 -mt-6 px-6 py-4 mb-6 rounded-t-xl border-b border-[#7bbdb6] flex items-center gap-3" style={{ backgroundColor: '#E6F4F2' }}>
            <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center">
              <Palette className="w-5 h-5 text-navy-700" />
            </div>
            <div>
              <h2 className="font-semibold text-navy-800">Aparência</h2>
              <p className="text-xs text-navy-700">Personalize a interface do sistema.</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Sidebar State */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <PanelLeftOpen className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-sm text-navy-800 dark:text-gray-100">Menu lateral (sidebar)</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Iniciar com o menu expandido ao carregar as páginas.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { updatePrefs({ sidebarExpanded: !prefs.sidebarExpanded }); save() }}
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                  prefs.sidebarExpanded ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                  prefs.sidebarExpanded ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Dark Mode */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                {prefs.darkMode
                  ? <Moon className="w-5 h-5 text-indigo-500" />
                  : <Sun className="w-5 h-5 text-amber-500" />
                }
                <div>
                  <p className="font-medium text-sm text-navy-800 dark:text-gray-100">Tema escuro</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Alterar para o tema escuro em todas as páginas.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { updatePrefs({ darkMode: !prefs.darkMode }); save() }}
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                  prefs.darkMode ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                  prefs.darkMode ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Documents View */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                {prefs.documentsView === 'cards'
                  ? <LayoutGrid className="w-5 h-5 text-blue-500" />
                  : <List className="w-5 h-5 text-blue-500" />
                }
                <div>
                  <p className="font-medium text-sm text-navy-800 dark:text-gray-100">Visualização da Biblioteca de Documentos</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Exibir documentos em cards ou lista.</p>
                </div>
              </div>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => { updatePrefs({ documentsView: 'cards' }); save() }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    prefs.documentsView === 'cards' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Cards
                </button>
                <button
                  type="button"
                  onClick={() => { updatePrefs({ documentsView: 'list' }); save() }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    prefs.documentsView === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> Lista
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Seção 3: Relatórios com IA ── */}
        <div className="card">
          <div className="-mx-6 -mt-6 px-6 py-4 mb-6 rounded-t-xl border-b border-[#7bbdb6] flex items-center gap-3" style={{ backgroundColor: '#E6F4F2' }}>
            <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-navy-700" />
            </div>
            <div>
              <h2 className="font-semibold text-navy-800">Relatórios com IA</h2>
              <p className="text-xs text-navy-700">Comportamento ao acessar a seção de Relatórios com IA.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Abrir em nova aba */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-violet-500" />
                <div>
                  <p className="font-medium text-sm text-navy-800 dark:text-gray-100">Abrir em nova aba</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">O link de Relatórios com IA abrirá em uma nova aba do navegador.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { updatePrefs({ relatorioIaNovaAba: !prefs.relatorioIaNovaAba }); save() }}
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                  prefs.relatorioIaNovaAba ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                  prefs.relatorioIaNovaAba ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Colapsar menu */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <PanelLeftOpen className="w-5 h-5 text-violet-500" />
                <div>
                  <p className="font-medium text-sm text-navy-800 dark:text-gray-100">Colapsar menu lateral</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Recolhe automaticamente o menu ao entrar em Relatórios com IA.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { updatePrefs({ relatorioIaColapsarMenu: !prefs.relatorioIaColapsarMenu }); save() }}
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                  prefs.relatorioIaColapsarMenu ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                  prefs.relatorioIaColapsarMenu ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
