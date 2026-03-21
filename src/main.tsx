import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// StrictMode is disabled because SeqViz 3.x uses class components with
// render-phase side effects (inputRef mutating idToRange) that are
// incompatible with React 19's StrictMode double-rendering, causing
// event delegation to silently fail on InfiniteScroll-managed SeqBlocks.
// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed to exist in index.html
createRoot(document.getElementById("root")!).render(<App />);
