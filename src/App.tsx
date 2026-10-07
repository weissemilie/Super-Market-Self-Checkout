import { useCallback } from 'react'
import { AdminPanel } from './admin/AdminPanel'
import { PosthusAdminPanel } from './admin/PosthusAdminPanel'
import { useAdminShortcut } from './admin/useAdminShortcut'
import './App.css'
import { getDepartment } from './department'
import { useCheckout } from './checkout/useCheckout'
import { useErrorEngine } from './errors/useErrorEngine'
import { useErrorGeneratorConfig } from './errors/useErrorGeneratorConfig'
import { LampProvider } from './lamp/LampProvider'
import { useLampSync } from './lamp/useLampSync'
import { parseCode } from './posthus/codes'
import { usePosthus } from './posthus/usePosthus'
import { ScanDebug } from './scanner/ScanDebug'
import { DoneScreen } from './screens/DoneScreen'
import { ErrorOverlay } from './screens/ErrorOverlay'
import { FlashBanner } from './screens/FlashBanner'
import { PayingScreen } from './screens/PayingScreen'
import { PostSydLogo } from './screens/posthus/PostSydLogo'
import themeStyles from './screens/posthus/PostSydTheme.module.css'
import topBarStyles from './screens/TopBar.module.css'
import { PosthusScreen } from './screens/posthus/PosthusScreen'
import { ShoppingScreen } from './screens/ShoppingScreen'
import { TopBar } from './screens/TopBar'
import { WelcomeScreen } from './screens/WelcomeScreen'

function App() {
  const department = getDepartment(window.location.search)
  // PostSyd har ingen lampe og skal ikke kende til Arduino.
  if (department === 'posthus') {
    return <PosthusApp />
  }
  return (
    <LampProvider>
      <AppContent />
    </LampProvider>
  )
}

function parcelCodeKind(code: string): string {
  const parsed = parseCode(code)
  if (parsed) return parsed.kind === 'parcel' ? 'Pakke' : 'Seddel'
  if (code === 'MESTER') return 'Personalekort'
  return 'Ukendt'
}

function PosthusApp() {
  const { state, handleScan, recentScans, dispatch } = usePosthus()
  const adminOpen = state.adminOpen
  useAdminShortcut(
    useCallback(
      () => dispatch({ type: adminOpen ? 'CLOSE_ADMIN' : 'OPEN_ADMIN' }),
      [dispatch, adminOpen],
    ),
  )

  return (
    <div className={`app ${themeStyles.theme}`}>
      <TopBar
        title="PostSyd"
        logo={<PostSydLogo className={topBarStyles.cartIcon} />}
        showLamp={false}
      />
      <div className="screenArea">
        <PosthusScreen state={state} dispatch={dispatch} />
      </div>
      <ScanDebug recentScans={recentScans} simulateScan={handleScan} classify={parcelCodeKind} />
      <PosthusAdminPanel state={state} dispatch={dispatch} />
    </div>
  )
}

function AppContent() {
  const { state, handleScan, recentScans, dispatch } = useCheckout()
  useLampSync(state)

  const errorGenerator = useErrorGeneratorConfig()
  useErrorEngine(state, dispatch, errorGenerator.effectiveConfig)

  const adminOpen = state.adminOpen
  useAdminShortcut(
    useCallback(
      () => dispatch({ type: adminOpen ? 'CLOSE_ADMIN' : 'OPEN_ADMIN' }),
      [dispatch, adminOpen],
    ),
  )

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
