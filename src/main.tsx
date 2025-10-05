import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { LocationProvider } from "./contexts/LocationContext.tsx";
import "./index.css";
import { NotificationProvider } from "./notifications/NotificationsContext.tsx";
import { AnimationProvider } from "./providers/TextAnimProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NotificationProvider>
      <AnimationProvider>
        <LocationProvider>
          <App />
        </LocationProvider>
      </AnimationProvider>
    </NotificationProvider>
  </StrictMode>
);
