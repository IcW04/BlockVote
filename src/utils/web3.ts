import Web3 from 'web3';

let web3: Web3;

const initWeb3 = async () => {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
        } catch (error) {
            console.error("User denied account access");
        }
    } else if (window.web3) {
        web3 = new Web3(window.web3.currentProvider);
    } else {
        console.error("No Ethereum browser detected. You can check out MetaMask!");
    }
};

const getWeb3 = () => {
    if (!web3) {
        throw new Error("Web3 is not initialized. Call initWeb3() first.");
    }
    return web3;
};

export { initWeb3, getWeb3 };