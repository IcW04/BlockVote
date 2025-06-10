import { useEffect, useState } from 'react';
import Web3 from 'web3';

const useWallet = () => {
    const [account, setAccount] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [web3, setWeb3] = useState<Web3 | null>(null);

    useEffect(() => {
        const initWeb3 = async () => {
            if (window.ethereum) {
                const web3Instance = new Web3(window.ethereum);
                setWeb3(web3Instance);

                try {
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    setAccount(accounts[0]);
                    setIsConnected(true);
                } catch (error) {
                    console.error("Error connecting to wallet:", error);
                }
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

    return { account, isConnected, web3, disconnectWallet };
};

export { useWallet };