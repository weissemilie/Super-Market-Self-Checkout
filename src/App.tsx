import './App.css'
import { useCheckout } from './checkout/useCheckout'
import { ScanDebug } from './scanner/ScanDebug'
import { DoneScreen } from './screens/DoneScreen'
import { ErrorOverlay } from './screens/ErrorOverlay'
import { PayingScreen } from './screens/PayingScreen'
import { ShoppingScreen } from './screens/ShoppingScreen'
import { TopBar } from './screens/TopBar'
import { WelcomeScreen } from './screens/WelcomeScreen'

function App() {
  const { state, handleScan, recentScans, dispatch } = useCheckout()

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
      <ScanDebug recentScans={recentScans} simulateScan={handleScan} />
    </div>
  )
}

export default App
