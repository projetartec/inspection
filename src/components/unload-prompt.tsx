"use client";

import { useEffect } from 'react';

/**
 * Este componente adiciona um listener de evento `beforeunload` para mostrar um 
 * prompt de confirmação do navegador quando o usuário tenta recarregar ou fechar a página.
 * Isso ajuda a prevenir a perda de dados não salvos.
 */
export function UnloadPrompt() {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // A string personalizada não é mais exibida na maioria dos navegadores modernos por motivos de segurança.
      // No entanto, definir `returnValue` é necessário para acionar o prompt de confirmação padrão do navegador.
      const confirmationMessage = "Você realmente deseja atualizar a pagina?";
      event.returnValue = confirmationMessage; // Padrão para a maioria dos navegadores
      return confirmationMessage; // Para navegadores mais antigos
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Limpa o listener quando o componente é desmontado
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // O array de dependências vazio garante que isso rode apenas uma vez

  return null; // Este componente não renderiza nada na tela
}
