import "@fontsource-variable/space-grotesk"
import "@fontsource-variable/jetbrains-mono"
import "./index.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { startAuth } from "./auth/auth"
import { startPwa } from "./pwa"

startPwa()
void startAuth()

const root = document.getElementById("root")
if (root)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
