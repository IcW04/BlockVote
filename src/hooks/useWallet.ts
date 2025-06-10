import { useEffect, useState } from 'react';
import Web3 from 'web3';

interface UseWalletReturn {
    account: string | null;
    isConnected: boolean;
    web3: Web3 | null;
    disconnectWallet: () => void;
    connectWallet: () => Promise<string>;
    registerWithAdmin: (contract: any) => Promise<boolean>;
}

const useWallet = (): UseWalletReturn => {
    const [account, setAccount] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [web3, setWeb3] = useState<Web3 | null>(null);

    useEffect(() => {
        const initWeb3 = async () => {
            if (window.ethereum) {
                const web3Instance = new Web3(window.ethereum);
                setWeb3(web3Instance);

                try {
                    // Check if already connected (don't auto-request)
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        setAccount(accounts[0]);
                        setIsConnected(true);
                    }
                } catch (error) {
                    console.error("Error checking wallet connection:", error);
                }

                // Listen for account changes
                window.ethereum.on('accountsChanged', (accounts: string[]) => {
                    if (accounts.length > 0) {
                        setAccount(accounts[0]);
                        setIsConnected(true);
                    } else {
                        disconnectWallet();
                    }
                });

                // Listen for chain changes
                window.ethereum.on('chainChanged', () => {
                    window.location.reload();
                });
            } else {
                console.error("Please install MetaMask!");
            }
        };

        initWeb3();
    }, []);

    const disconnectWallet = () => {
        setAccount(null);
        setIsConnected(false);
        setWeb3(null);
    };

    const connectWallet = async (): Promise<string> => {
        if (window.ethereum) {
            try {
                const web3Instance = new Web3(window.ethereum);
                setWeb3(web3Instance);
                
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setAccount(accounts[0]);
                setIsConnected(true);
                
                return accounts[0];
            } catch (error) {
                console.error("Error connecting to wallet:", error);
                throw error;
            }
        } else {
            throw new Error("Please install MetaMask!");
        }
    };

    const registerWithAdmin = async (contract: any): Promise<boolean> => {
        if (!account || !contract) {
            throw new Error("Wallet not connected or contract not available");
        }

        try {
            console.log('🔄 Registering wallet with admin...', account);
            
            // Check if already registered
            const registeredVoters = await contract.obtenerVotantesRegistrados();
            const isAlreadyRegistered = registeredVoters.includes(account);
            
            if (isAlreadyRegistered) {
                console.log('✅ Already registered');
                return true;
            }

            // Try to register using the automatic registration
            console.log('🔄 Attempting automatic registration...');
            const tx = await contract.solicitarTokensIniciales();
            await tx.wait();
            
            console.log('✅ Successfully registered with admin');
            return true;
            
        } catch (error: any) {
            console.error('❌ Error registering with admin:', error);
            
            // More user-friendly error handling
            if (error.message && error.message.includes('Ya recibiste tokens iniciales')) {
                console.log('✅ Already registered (tokens already received)');
                return true;
            }
            
            throw new Error("Unable to register wallet with admin. You may already be registered or need to contact the administrator.");
        }
    };

    return { account, isConnected, web3, disconnectWallet, connectWallet, registerWithAdmin };
};

export { useWallet };