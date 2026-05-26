import { useState, useEffect, useCallback } from 'react'

let _addToast = null

export function useToast() {
  const toast = useCallback((msg, type = 'info', duration = 4000) => {
    if (_addToast) _addToast(msg, type, duration)
  }, [])
  return {
    success: (m) => toast(m, 'success'),
    error:   (m) => toast(m, 'error'),
    info:    (m) => toast(m, 'info'),
    warning: (m) => toast(m, 'warning'),
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    _addToast = (msg, type, duration) => {
      const id = Date.now()
      setToasts(t => [...t, { id, msg, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
    }
    return () => { _addToast = null }
  }, [])

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' }

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}
          onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>
          <span>{icons[t.type]}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}