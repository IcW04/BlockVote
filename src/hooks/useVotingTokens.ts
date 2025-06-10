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
      const costoVoto = await contract.COSTO_VOTO();
      const costoVotoFormatted = ethers.utils.formatEther(costoVoto);
      
      console.log('💰 Balance actual:', balanceFormatted);
      console.log('💸 Costo del voto:', costoVotoFormatted);
      
      // Si ya tiene tokens suficientes para votar, no necesita más
      if (currentBalance.gte(costoVoto)) {
        console.log('✅ Usuario ya tiene tokens suficientes para votar');
        return true;
      }
      
      console.log('⚠️ Usuario necesita más tokens para votar');
      
      // 2. Verificar si auto-mint está habilitado
      const autoMintEnabled = await contract.autoMintEnabled();
      console.log('🤖 Auto-transfer habilitado:', autoMintEnabled);
      
      if (!autoMintEnabled) {
        console.log('⚠️ Auto-transfer no está habilitado en el contrato');
        throw new Error('El sistema de tokens automáticos no está habilitado. Contacta al administrador.');
      }
      
      // 3. Verificar que el propietario tenga suficientes tokens
      const ownerBalance = await contract.balancePropietario();
      const autoMintAmount = await contract.autoMintAmount();
      
      console.log('🏦 Balance del propietario:', ethers.utils.formatEther(ownerBalance));
      console.log('🎯 Cantidad a transferir:', ethers.utils.formatEther(autoMintAmount));
      
      if (ownerBalance.lt(autoMintAmount)) {
        console.log('⚠️ El propietario no tiene suficientes tokens');
        throw new Error('El sistema no tiene suficientes tokens. Contacta al administrador.');
      }
      
      // 4. Verificar si puede recibir tokens (solo para usuarios completamente nuevos)
      const canReceiveTokens = await contract.puedeRecibirTokens(account);
      console.log('✅ Puede recibir tokens (usuario nuevo):', canReceiveTokens);
      
      // 5. Intentar solicitar tokens
      console.log('🎯 Solicitando tokens automáticamente para votar...');
      
      try {
        let tx;
        
        if (canReceiveTokens) {
          // Usuario completamente nuevo - usar solicitarTokensIniciales
          console.log('🆕 Usuario nuevo - solicitando tokens iniciales');
          const gasEstimate = await contract.estimateGas.solicitarTokensIniciales();
          tx = await contract.solicitarTokensIniciales({
            gasLimit: gasEstimate.mul(120).div(100)
          });
        } else {
          // Usuario existente que necesita más tokens - intentar transferencia directa
          console.log('🔄 Usuario existente - solicitando tokens adicionales');
          
          // Verificar si existe una función para usuarios que ya gastaron tokens
          try {
            const gasEstimate = await contract.estimateGas.solicitarTokensAdicionales();
            tx = await contract.solicitarTokensAdicionales({
              gasLimit: gasEstimate.mul(120).div(100)
            });
          } catch (methodError) {
            // Si no existe solicitarTokensAdicionales, usar transferencia directa del admin
            console.log('ℹ️ Intentando transferencia directa del administrador...');
            throw new Error('Usuario ya recibió tokens iniciales. El administrador debe transferir tokens manualmente.');
          }
        }
        
        console.log('📝 Transacción enviada:', tx.hash);
        
        const receipt = await tx.wait();
        console.log('✅ Transacción confirmada:', receipt);
        
        // Verificar el nuevo balance
        const newBalance = await contract.balanceOf(account);
        const newBalanceFormatted = ethers.utils.formatEther(newBalance);
        console.log('💰 Nuevo balance:', newBalanceFormatted);
        
        if (newBalance.gte(costoVoto)) {
          console.log('✅ Tokens recibidos exitosamente para votar');
          return true;
        }
        
        console.log('⚠️ Balance insuficiente después de la transferencia');
        return false;
        
      } catch (tokenError: any) {
        console.error('❌ Error solicitando tokens para votar:', tokenError);
        
        let errorMessage = 'Error al obtener tokens para votar.';
        if (tokenError.message) {
          if (tokenError.message.includes('Ya has recibido tokens iniciales')) {
            // Para usuarios que ya gastaron sus tokens, sugerir contactar admin
            errorMessage = 'Ya gastaste tus tokens iniciales. El administrador debe proporcionarte más tokens para continuar votando.';
          } else if (tokenError.message.includes('Ya tienes tokens')) {
            errorMessage = 'Ya tienes tokens en tu cuenta.';
          } else if (tokenError.message.includes('Auto-mint no esta habilitado')) {
            errorMessage = 'El sistema de tokens automáticos no está habilitado.';
          } else if (tokenError.message.includes('user rejected transaction')) {
            errorMessage = 'Transacción cancelada por el usuario.';
          } else if (tokenError.message.includes('insufficient funds')) {
            errorMessage = 'Fondos insuficientes para pagar el gas de la transacción.';
          } else if (tokenError.message.includes('Propietario no tiene suficientes tokens')) {
            errorMessage = 'El sistema no tiene suficientes tokens. Contacta al administrador.';
          } else if (tokenError.message.includes('Usuario ya recibió tokens iniciales')) {
            errorMessage = 'Ya gastaste tus tokens. El administrador debe darte más tokens para votar.';
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
