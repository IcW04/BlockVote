import { useState } from 'react';
import { useContract } from './useContract';
import { useWallet } from './useWallet';
import { ethers } from 'ethers';

export const useVotingTokens = () => {
  const { contract } = useContract();
  const { account, isConnected } = useWallet();
  const [isTransferringTokens, setIsTransferringTokens] = useState(false);

  const ensureUserHasTokens = async (): Promise<boolean> => {
    if (!contract || !account || !isConnected) {
      console.log('❌ Faltan datos para verificar tokens:', { contract: !!contract, account, isConnected });
      return false;
    }

    setIsTransferringTokens(true);
    
    try {
      console.log('🔍 Verificando tokens del usuario para votar...');
      
      // 1. Verificar balance actual
      const currentBalance = await contract.balanceOf(account);
      const balanceFormatted = ethers.utils.formatEther(currentBalance);
      console.log('💰 Balance actual:', balanceFormatted);
      
      // Si ya tiene tokens, no necesita más
      if (parseFloat(balanceFormatted) > 0) {
        console.log('✅ Usuario ya tiene tokens suficientes para votar');
        return true;
      }
      
      // 2. Verificar si puede recibir tokens
      const canReceiveTokens = await contract.puedeRecibirTokens(account);
      console.log('✅ Puede recibir tokens:', canReceiveTokens);
      
      if (!canReceiveTokens) {
        console.log('ℹ️ El usuario ya recibió tokens iniciales pero tiene balance 0');
        return false;
      }
      
      // 3. Verificar si auto-mint está habilitado
      const autoMintEnabled = await contract.autoMintEnabled();
      console.log('🤖 Auto-transfer habilitado:', autoMintEnabled);
      
      if (!autoMintEnabled) {
        console.log('⚠️ Auto-transfer no está habilitado en el contrato');
        return false;
      }
      
      // 4. Verificar que el propietario tenga suficientes tokens
      const ownerBalance = await contract.balancePropietario();
      const autoMintAmount = await contract.autoMintAmount();
      
      if (ownerBalance.lt(autoMintAmount)) {
        console.log('⚠️ El propietario no tiene suficientes tokens');
        return false;
      }
      
      // 5. Solicitar tokens automáticamente
      console.log('🎯 Solicitando tokens automáticamente para votar...');
      
      try {
        const gasEstimate = await contract.estimateGas.solicitarTokensIniciales();
        console.log('⛽ Gas estimado:', gasEstimate.toString());
        
        const tx = await contract.solicitarTokensIniciales({
          gasLimit: gasEstimate.mul(120).div(100) // 20% extra gas
        });
        
        console.log('📝 Transacción enviada:', tx.hash);
        
        const receipt = await tx.wait();
        console.log('✅ Transacción confirmada:', receipt);
        
        // Verificar el nuevo balance
        const newBalance = await contract.balanceOf(account);
        const newBalanceFormatted = ethers.utils.formatEther(newBalance);
        console.log('💰 Nuevo balance:', newBalanceFormatted);
        
        if (parseFloat(newBalanceFormatted) > 0) {
          console.log('✅ Tokens recibidos exitosamente para votar');
          return true;
        }
        
        return false;
        
      } catch (tokenError: any) {
        console.error('❌ Error solicitando tokens para votar:', tokenError);
        
        let errorMessage = 'Error al obtener tokens para votar.';
        if (tokenError.message) {
          if (tokenError.message.includes('Ya has recibido tokens iniciales')) {
            errorMessage = 'Ya recibiste tokens anteriormente. Contacta al administrador.';
          } else if (tokenError.message.includes('Ya tienes tokens')) {
            errorMessage = 'Ya tienes tokens en tu cuenta.';
          } else if (tokenError.message.includes('Auto-mint no esta habilitado')) {
            errorMessage = 'El sistema de tokens automáticos no está habilitado.';
          } else if (tokenError.message.includes('user rejected transaction')) {
            errorMessage = 'Transacción cancelada por el usuario.';
          } else if (tokenError.message.includes('insufficient funds')) {
            errorMessage = 'Fondos insuficientes para pagar el gas.';
          } else if (tokenError.message.includes('Propietario no tiene suficientes tokens')) {
            errorMessage = 'El sistema no tiene suficientes tokens. Contacta al administrador.';
          }
        }
        
        throw new Error(errorMessage);
      }
      
    } catch (error: any) {
      console.error('❌ Error verificando tokens para votar:', error);
      throw error;
    } finally {
      setIsTransferringTokens(false);
    }
  };

  return {
    isTransferringTokens,
    ensureUserHasTokens
  };
};
