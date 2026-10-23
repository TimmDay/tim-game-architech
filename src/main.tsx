import "@fontsource-variable/space-grotesk"
import "@fontsource-variable/jetbrains-mono"
import "./index.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import { App } from "./App"
import { startAuth } from "./auth/auth"

registerSW({ immediate: true })
void startAuth()

const root = document.getElementById("root")
if (root)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
