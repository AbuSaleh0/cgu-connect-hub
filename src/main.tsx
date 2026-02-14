import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initConsoleWarning } from "./lib/console-warning";

initConsoleWarning();

createRoot(document.getElementById("root")!).render(<App />);
