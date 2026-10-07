import { useEffect } from 'react'

// Ctrl+Shift+A åbner og lukker instruktørpanelet.
export function useAdminShortcut(toggleAdmin: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isAdminToggle =
        event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a'
      if (!isAdminToggle) {
        return
      }

      const target = event.target
      const isInputFocused =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      if (!isInputFocused) {
        event.preventDefault()
      }

      toggleAdmin()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleAdmin])
}
