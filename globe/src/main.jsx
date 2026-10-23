import { createRoot } from "react-dom/client";
import Globe from "./Globe.jsx";

// Mounted by assets/main.js once the Path section is near the viewport
window.mountGlobe = function (el, getProgress, reduced) {
  createRoot(el).render(<Globe getProgress={getProgress} reduced={reduced} />);
};
