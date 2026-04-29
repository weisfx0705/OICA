import React from "react";
import ReactDOM from "react-dom/client";
import AppIndex2 from "./AppIndex2";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppIndex2 />
  </React.StrictMode>,
);
