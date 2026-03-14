'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface ScannerSettings {
  colorMode: 'color' | 'grayscale' | 'bw'
  resolution: number // DPI
  format: 'png' | 'jpeg'
  quality: number // 0.1 - 1.0 for jpeg
}

export interface UserPreferences {
  sidebarExpanded: boolean
  darkMode: boolean
  documentsView: 'cards' | 'list'
  scanner: ScannerSettings
}

const defaultPrefs: UserPreferences = {
  sidebarExpanded: true,
  darkMode: false,
  documentsView: 'cards',
  scanner: {
    colorMode: 'color',
    resolution: 200,
    format: 'jpeg',
    quality: 0.85,
  },
}

interface PrefsContextType {
  prefs: UserPreferences
  updatePrefs: (partial: Partial<UserPreferences>) => void
  updateScanner: (partial: Partial<ScannerSettings>) => void
}

const PrefsContext = createContext<PrefsContextType>({
  prefs: defaultPrefs,
  updatePrefs: () => {},
  updateScanner: () => {},
})

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(defaultPrefs)
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('amo-prefs')
      if (saved) {
        const parsed = JSON.parse(saved)
        setPrefs({ ...defaultPrefs, ...parsed, scanner: { ...defaultPrefs.scanner, ...parsed?.scanner } })
      }
    } catch { /* use defaults */ }
    setLoaded(true)
  }, [])

  // Apply dark mode to <html>
  useEffect(() => {
    if (!loaded) return
    document.documentElement.setAttribute('data-theme', prefs.darkMode ? 'dark' : 'light')
  }, [prefs.darkMode, loaded])

  // Save to localStorage whenever prefs change
  useEffect(() => {
    if (!loaded) return
    localStorage.setItem('amo-prefs', JSON.stringify(prefs))
  }, [prefs, loaded])

  const updatePrefs = useCallback((partial: Partial<UserPreferences>) => {
    setPrefs(prev => ({ ...prev, ...partial }))
  }, [])

  const updateScanner = useCallback((partial: Partial<ScannerSettings>) => {
    setPrefs(prev => ({ ...prev, scanner: { ...prev.scanner, ...partial } }))
  }, [])

  return (
    <PrefsContext.Provider value={{ prefs, updatePrefs, updateScanner }}>
      {children}
    </PrefsContext.Provider>
  )
}

export function usePreferences() {
  return useContext(PrefsContext)
}
