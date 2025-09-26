import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log('🚀 Sistema GradGate iniciando...');
console.log('🚀 Elemento root encontrado:', !!document.getElementById("root"));

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error('❌ Elemento root não encontrado!');
  } else {
    console.log('✅ Elemento root encontrado, renderizando App...');
    createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('✅ App renderizado com sucesso');
  }
} catch (error) {
  console.error('❌ Erro durante render do App:', error);
}
