import { useState } from "react"
import { isInstalledApp, isIOS, isMacSafari, useOnline } from "../utils"

const DISMISSED_KEY = 'install-notice-dismissed'

/**
 * Warns Safari users who are using the app in a browser tab: Safari deletes a website's
 * storage (saved workouts and offline files) after 7 days without a visit.
 * Installed apps (Home Screen / Dock) are exempt, so the notice explains how to install.
 * Hidden once installed or dismissed.
 */
export function InstallNotice() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')

  const ios = isIOS()
  if (dismissed || isInstalledApp() || !(ios || isMacSafari())) return null

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <aside aria-label="Install the app" className="w-full max-w-2xl rounded-2xl border-2 border-primary bg-surface p-4 text-left">
      <h2 className="text-lg">{ios ? 'Add WorkMeOut to your Home Screen' : 'Add WorkMeOut to your Dock'}</h2>
      <p className="mt-1 text-sm">
        In a browser tab, Safari deletes your saved workouts if you don't open WorkMeOut for 7 days.
        Once it's installed, they're kept, and the app works offline.
      </p>
      <p className="mt-2 text-sm">
        {ios
          ? <>Tap the <strong>Share</strong> button (in Safari it may be under <strong>⋯</strong>), then <strong>Add to Home Screen</strong>. Open WorkMeOut from there from now on.</>
          : <>In Safari's menu bar choose <strong>File → Add to Dock</strong>, then open WorkMeOut from your Dock.</>}
      </p>
      <button type="button" onClick={dismiss} className="mt-3 rounded-full border-2 border-outline px-4 py-1 text-sm hover:border-primary">
        Got it
      </button>
    </aside>
  )
}

/** Where workouts live and what deletes them. Shown on the Workouts screen. */
export function DataNote() {
  return (
    <p className="mx-auto mt-4 max-w-md text-center text-sm text-white/75">
      Workouts are saved on this device only. Clearing your browser's website data, or deleting the app
      from your Home Screen, deletes them.
    </p>
  )
}

/**
 * Small "Offline" label pinned to the top-right corner of every screen. Nothing shows while online.
 * The live region stays mounted either way, so screen readers announce the change when it happens.
 */
export function OfflineStatus() {
  const online = useOnline()
  return (
    <p
      role="status"
      className="pointer-events-none fixed right-[max(0.5rem,env(safe-area-inset-right))] top-[max(0.5rem,env(safe-area-inset-top))] z-50 text-sm"
    >
      {!online && (
        <span className="flex items-center gap-1.5 rounded-full bg-bg/90 px-2 py-0.5">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          Offline
        </span>
      )}
    </p>
  )
}
