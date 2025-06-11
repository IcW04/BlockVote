import React from 'react';
import { useVoting } from '../../hooks/useVoting';
import { Card } from '../ui/Card';

const CandidateList: React.FC = () => {
    const { candidates, loading, error } = useVoting();

    if (loading) {
        return <div>Cargando candidatos...</div>;
    }

    if (error) {
        return <div>Error cargando candidatos: {error.message}</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((candidate) => (
                <Card key={candidate.id} title={candidate.name} className="p-4">
                    <p>Votos: {candidate.votes}</p>
                </Card>
            ))}
        </div>
    );
};

export default CandidateList;