import Web3 from 'web3';
import { useEffect, useState } from 'react';
import { Contract } from 'web3-eth-contract';
import VotingContractABI from '../abis/VotingContract.json'; // Adjust the path as necessary

const CONTRACT_ADDRESS = '0xcb6ea44e5790ca6e95302881759e2fc7c805625d';

let web3: Web3;
let votingContract: Contract;

export const initializeWeb3 = async () => {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        votingContract = new web3.eth.Contract(VotingContractABI, CONTRACT_ADDRESS);
    } else {
        console.error('Please install MetaMask!');
    }
};

export const getCandidates = async () => {
    const candidates = await votingContract.methods.getCandidates().call();
    return candidates;
};

export const voteForCandidate = async (candidate: string, account: string) => {
    await votingContract.methods.emitirVoto(candidate).send({ from: account });
};

export const getVoteCount = async (candidate: string) => {
    const count = await votingContract.methods.conteoVotos(candidate).call();
    return count;
};

export const useVotingContract = () => {
    const [account, setAccount] = useState<string | null>(null);

    useEffect(() => {
        const loadAccount = async () => {
            await initializeWeb3();
            const accounts = await web3.eth.getAccounts();
            setAccount(accounts[0]);
        };

        loadAccount();
    }, []);

    return { account, getCandidates, voteForCandidate, getVoteCount };
};