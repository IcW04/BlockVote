import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractAddress, abi, SEPOLIA_CHAIN_ID, SEPOLIA_CHAIN_ID_HEX, SEPOLIA_NETWORK_CONFIG } from '../utils/constants';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useContract = () => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string>('');

  useEffect(() => {
    const initContract = async () => {
      console.log('🔄 Starting contract initialization...');
      console.log('📍 Contract address:', contractAddress);
      
      if (!window.ethereum) {
        console.error('❌ MetaMask not detected');
        setNetworkError('MetaMask not detected');
        return;
      }

      try {
        setLoading(true);
        setNetworkError('');

        console.log('🔌 Requesting account access...');
        // Solicitar conexión a la wallet
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log('👤 Accounts:', accounts);

        console.log('🌐 Creating provider...');
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Verificar red
        console.log('🔍 Checking network...');
        const network = await provider.getNetwork();
        console.log('🌐 Current network:', network);
        
        if (network.chainId !== SEPOLIA_CHAIN_ID) {
          console.log(`❌ Wrong network. Expected: ${SEPOLIA_CHAIN_ID}, Got: ${network.chainId}`);
          try {
            console.log('🔄 Attempting to switch to Sepolia...');
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
            });
            
            setTimeout(() => {
              console.log('🔄 Reloading after network switch...');
              window.location.reload();
            }, 1000);
            return;
          } catch (switchError: any) {
            console.error('❌ Error switching networks:', switchError);
            if (switchError.code === 4902) {
              try {
                console.log('➕ Adding Sepolia network...');
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [SEPOLIA_NETWORK_CONFIG],
                });
              } catch (addError) {
                console.error('❌ Error adding network:', addError);
                setNetworkError('Please manually switch to Sepolia testnet in MetaMask');
                return;
              }
            } else {
              setNetworkError('Please manually switch to Sepolia testnet in MetaMask');
              return;
            }
          }
        }

        console.log('🖊️ Getting signer...');
        const signer = provider.getSigner();
        const signerAddress = await signer.getAddress();
        console.log('✅ Signer address:', signerAddress);
        
        // Verificar que el contrato existe
        console.log('🔍 Checking contract code...');
        const code = await provider.getCode(contractAddress);
        console.log('📄 Contract code length:', code.length);
        
        if (code === '0x') {
          console.error('❌ Contract not found at address:', contractAddress);
          setNetworkError('Contract not found at this address on Sepolia');
          return;
        }
        
        console.log('📜 Creating contract instance...');
        const contractInstance = new ethers.Contract(contractAddress, abi, signer);
        
        // Probar una llamada simple al contrato
        console.log('🧪 Testing contract connection...');
        try {
          const name = await contractInstance.name();
          console.log('✅ Contract name:', name);
        } catch (testError) {
          console.error('❌ Contract test call failed:', testError);
          setNetworkError('Failed to connect to contract');
          return;
        }
        
        setContract(contractInstance);
        console.log('✅ Contract successfully initialized!');
        console.log('📍 Contract address:', contractAddress);
        console.log('🌐 Network:', network.name, '- Chain ID:', network.chainId);
        
      } catch (error) {
        console.error("❌ Error initializing contract:", error);
        setNetworkError('Error connecting to contract: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    initContract();

    // Escuchar cambios de cuenta
    if (window.ethereum) {
      const handleAccountsChanged = () => {
        console.log('🔄 Account changed, reinitializing...');
        initContract();
      };

      const handleChainChanged = () => {
        console.log('🔄 Network changed, reloading...');
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const reconnectWallet = async () => {
    // Forzar nueva solicitud de cuentas
    await window.ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    });
    
    // Reinicializar contrato
    initContract();
  };

  return { contract, loading, networkError };
};