import { useEffect, useState } from 'react';
import { useContract } from './useContract';
import { useWallet } from './useWallet';
import { ethers } from 'ethers';

export const useAutoTokens = () => {
  const { contract } = useContract();
  const { account, isConnected } = useWallet();
  const [isCheckingTokens, setIsCheckingTokens] = useState(false);
  const [hasRequestedTokens, setHasRequestedTokens] = useState(false);

  const checkAndRequestTokens = async () => {
    if (!contract || !account || !isConnected) {
      console.log('❌ Faltan datos para verificar tokens:', { contract: !!contract, account, isConnected });
      return false;
    }

    if (hasRequestedTokens) {
      console.log('ℹ️ Ya se solicitaron tokens anteriormente');
      return false;
    }

    setIsCheckingTokens(true);
    try {
      console.log('🔍 Verificando si el usuario puede recibir tokens...');
      console.log('👤 Usuario actual:', account);
      
      // 1. Verificar si auto-mint está habilitado
      const autoMintEnabled = await contract.autoMintEnabled();
      console.log('🤖 Auto-mint habilitado:', autoMintEnabled);
      
      if (!autoMintEnabled) {
        console.log('⚠️ Auto-mint no está habilitado en el contrato');
        alert('❌ El auto-mint no está habilitado. Contacta al administrador para recibir tokens.');
        return false;
      }

      // 2. Verificar si el usuario puede recibir tokens
      const canReceiveTokens = await contract.puedeRecibirTokens(account);
      console.log('✅ Puede recibir tokens:', canReceiveTokens);
      
      // 3. Verificar balance actual
      const currentBalance = await contract.balanceOf(account);
      const balanceFormatted = ethers.utils.formatEther(currentBalance);
      console.log('💰 Balance actual:', balanceFormatted);
      
      if (!canReceiveTokens) {
        console.log('ℹ️ El usuario ya tiene tokens o ya recibió tokens iniciales');
        if (parseFloat(balanceFormatted) > 0) {
          console.log('✅ Usuario ya tiene tokens suficientes');
        }
        return false;
      }
      
      // 4. Solicitar tokens iniciales
      console.log('🎯 Solicitando tokens iniciales...');
      
      try {
        // Estimar gas primero
        const gasEstimate = await contract.estimateGas.solicitarTokensIniciales();
        console.log('⛽ Gas estimado:', gasEstimate.toString());
        
        const tx = await contract.solicitarTokensIniciales({
          gasLimit: gasEstimate.mul(120).div(100) // 20% extra gas
        });
        
        console.log('📝 Transacción enviada:', tx.hash);
        
        // Mostrar loading al usuario
        alert('🔄 Solicitando tokens... La transacción se está procesando.');
        
        const receipt = await tx.wait();
        console.log('✅ Transacción confirmada:', receipt);
        
        // Verificar el nuevo balance
        const newBalance = await contract.balanceOf(account);
        const newBalanceFormatted = ethers.utils.formatEther(newBalance);
        console.log('💰 Nuevo balance:', newBalanceFormatted);
        
        setHasRequestedTokens(true);
        
        // Notificar al usuario
        alert(`✅ ¡Tokens recibidos exitosamente!\n\nNuevo balance: ${newBalanceFormatted} VOTE tokens\nYa puedes votar en las elecciones.`);
        
        return true;
        
      } catch (tokenError: any) {
        console.error('❌ Error solicitando tokens iniciales:', tokenError);
        
        let errorMessage = 'Error al solicitar tokens iniciales.';
        if (tokenError.message) {
          if (tokenError.message.includes('Ya has recibido tokens iniciales')) {
            errorMessage = 'Ya has recibido tokens iniciales anteriormente.';
          } else if (tokenError.message.includes('Ya tienes tokens')) {
            errorMessage = 'Ya tienes tokens en tu cuenta.';
          } else if (tokenError.message.includes('Auto-mint no esta habilitado')) {
            errorMessage = 'El auto-mint no está habilitado. Contacta al administrador.';
          } else if (tokenError.message.includes('user rejected transaction')) {
            errorMessage = 'Transacción cancelada por el usuario.';
          } else if (tokenError.message.includes('insufficient funds')) {
            errorMessage = 'Fondos insuficientes para pagar el gas de la transacción.';
          }
        }
        
        alert(`❌ ${errorMessage}\n\nContacta al administrador si el problema persiste.`);
        return false;
      }
      
    } catch (error: any) {
      console.error('❌ Error verificando tokens:', error);
      alert('❌ Error al verificar tokens. Intenta nuevamente o contacta al administrador.');
    } finally {
      setIsCheckingTokens(false);
    }
    
    return false;
  };

  // Verificar automáticamente cuando el usuario se conecta
  useEffect(() => {
    if (isConnected && account && contract && !hasRequestedTokens) {
      console.log('🚀 Usuario conectado, verificando tokens automáticamente...');
      
      // Esperar un poco para que el contrato esté completamente listo
      const timer = setTimeout(() => {
        checkAndRequestTokens();
      }, 3000); // Aumentar a 3 segundos

      return () => clearTimeout(timer);
    }
  }, [isConnected, account, contract]);

  return {
    isCheckingTokens,
    hasRequestedTokens,
    checkAndRequestTokens
  };
};