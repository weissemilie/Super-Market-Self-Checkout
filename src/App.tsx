import { useEffect } from 'react'
import { AdminPanel } from './admin/AdminPanel'
import './App.css'
import { useCheckout } from './checkout/useCheckout'
import { useErrorEngine } from './errors/useErrorEngine'
import { useErrorGeneratorConfig } from './errors/useErrorGeneratorConfig'
import { LampProvider } from './lamp/LampProvider'
import { useLampSync } from './lamp/useLampSync'
import { ScanDebug } from './scanner/ScanDebug'
import { DoneScreen } from './screens/DoneScreen'
import { ErrorOverlay } from './screens/ErrorOverlay'
import { FlashBanner } from './screens/FlashBanner'
import { PayingScreen } from './screens/PayingScreen'
import { ShoppingScreen } from './screens/ShoppingScreen'
import { TopBar } from './screens/TopBar'
import { WelcomeScreen } from './screens/WelcomeScreen'

function App() {
  return (
    <LampProvider>
      <AppContent />
    </LampProvider>
  )
}

function AppContent() {
  const { state, handleScan, recentScans, dispatch } = useCheckout()
  useLampSync(state)

  const errorGenerator = useErrorGeneratorConfig()
  useErrorEngine(state, dispatch, errorGenerator.effectiveConfig)

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

      dispatch({ type: state.adminOpen ? 'CLOSE_ADMIN' : 'OPEN_ADMIN' })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, state.adminOpen])

  // Mens mode er ERROR, skal skærmen bagved (shopping eller betaling) blive
  // stående, så ErrorOverlay kan lægge sig oven på den og vise det rigtige
  // indhold igen, når fejlen er løst.
  const baseMode =
    state.mode === 'ERROR' ? state.error?.resumeMode ?? 'SHOPPING' : state.mode

  return (
    <div className="app">
      <TopBar />
      <div className="screenArea">
        {baseMode === 'IDLE' && <WelcomeScreen />}
        {baseMode === 'SHOPPING' && (
          <ShoppingScreen cart={state.cart} recentScans={recentScans} dispatch={dispatch} />
        )}
        {baseMode === 'PAYING' && (
          <PayingScreen active={state.mode === 'PAYING'} dispatch={dispatch} />
        )}
        {baseMode === 'DONE' && <DoneScreen receipt={state.lastReceipt} />}
      </div>
      {state.mode === 'ERROR' && state.error && <ErrorOverlay error={state.error} />}
      <FlashBanner flash={state.flash} />
      <ScanDebug recentScans={recentScans} simulateScan={handleScan} />
      <AdminPanel
        open={state.adminOpen}
        state={state}
        dispatch={dispatch}
        errorGenerator={errorGenerator}
      />
    </div>
  )
}

export default App
