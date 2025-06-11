import React, { useEffect, useState } from 'react';
import { useVoting } from '../../hooks/useVoting';
import CandidateList from '../Voting/CandidateList';
import VoteButton from '../Voting/VoteButton';
import { InfoEleccion } from '../../types';

const VotingPanel: React.FC = () => {
    const { candidates, currentElection, fetchCandidates, castVote } = useVoting();
    const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

    useEffect(() => {
        fetchCandidates();
    }, [fetchCandidates]);

    const handleVote = () => {
        if (selectedCandidate) {
            castVote(selectedCandidate);
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Panel de Votación</h2>
            {currentElection && (
                <div className="mb-4">
                    <h3 className="text-lg font-semibold">{currentElection.nombre}</h3>
                    <p>ID de Elección: {currentElection.id}</p>
                    <p>Finaliza en: {new Date(currentElection.fechaFinalizacion * 1000).toLocaleString()}</p>
                </div>
            )}
            <CandidateList candidates={candidates} onSelect={setSelectedCandidate} />
            <VoteButton onClick={handleVote} disabled={!selectedCandidate} />
        </div>
    );
};

export default VotingPanel;