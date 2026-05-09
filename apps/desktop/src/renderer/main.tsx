import React from "react";
import { createRoot } from "react-dom/client";
import { PetShell } from "./pet-shell";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PetShell />
  </React.StrictMode>,
);

