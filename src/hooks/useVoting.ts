import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractAddress, abi } from '../utils/constants';

export const useVoting = () => {
  const [votes, setVotes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    const initContract = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const contractInstance = new ethers.Contract(contractAddress, abi, signer);
          setContract(contractInstance);
        } catch (error) {
          console.error("Error initializing contract:", error);
        }
      }
    };

    initContract();
  }, []);

  const vote = async () => {
    if (!contract) return;
    
    setLoading(true);
    try {
      const tx = await contract.vote();
      await tx.wait();
      console.log("Vote successful!");
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setLoading(false);
    }
  };

  return { votes, loading, vote };
};