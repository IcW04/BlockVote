import React from 'react';
import { useVoting } from '../../hooks/useVoting';
import { Card } from '../ui/Card';

const Overview: React.FC = () => {
    const { totalVotes, totalCandidates, electionStatus } = useVoting();

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Resumen del Sistema de Votación</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card title="Total de Votos">
                    <p className="text-xl">{totalVotes}</p>
                </Card>
                <Card title="Total de Candidatos">
                    <p className="text-xl">{totalCandidates}</p>
                </Card>
                <Card title="Estado de la Elección">
                    <p className="text-xl">{electionStatus ? 'Activa' : 'Inactiva'}</p>
                </Card>
            </div>
        </div>
    );
};

export default Overview;