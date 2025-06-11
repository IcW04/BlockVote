import React, { useEffect, useState } from 'react';
import { useContract } from '../../hooks/useContract';
import { useWallet } from '../../hooks/useWallet';

const VotingHistory: React.FC = () => {
    const { contract } = useContract();
    const { account } = useWallet();
    const [votingHistory, setVotingHistory] = useState([]);

    useEffect(() => {
        const fetchVotingHistory = async () => {
            if (contract && account) {
                try {
                    const history = await contract.getVotingHistory(account);
                    setVotingHistory(history);
                } catch (error) {
                    console.error("Error fetching voting history:", error);
                }
            }
        };

        fetchVotingHistory();
    }, [contract, account]);

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Historial de Votación</h2>
            <div className="bg-white shadow-md rounded-lg p-4">
                {votingHistory.length > 0 ? (
                    <ul>
                        {votingHistory.map((vote, index) => (
                            <li key={index} className="border-b py-2">
                                <span className="font-semibold">Candidato:</span> {vote.candidate} <br />
                                <span className="text-gray-500">ID de Elección:</span> {vote.electionId} <br />
                                <span className="text-gray-500">Fecha:</span> {new Date(vote.date * 1000).toLocaleString()}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No hay historial de votación disponible.</p>
                )}
            </div>
        </div>
    );
};

export default VotingHistory;