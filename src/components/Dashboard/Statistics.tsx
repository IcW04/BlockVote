import React from 'react';

const Statistics: React.FC = () => {
    // Sample data for statistics
    const totalVotes = 1000;
    const totalCandidates = 5;
    const totalVoters = 800;

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Estadísticas de Votación</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-100 p-4 rounded-lg">
                    <h3 className="text-lg font-medium">Total de Votos</h3>
                    <p className="text-2xl font-bold">{totalVotes}</p>
                </div>
                <div className="bg-green-100 p-4 rounded-lg">
                    <h3 className="text-lg font-medium">Total de Candidatos</h3>
                    <p className="text-2xl font-bold">{totalCandidates}</p>
                </div>
                <div className="bg-yellow-100 p-4 rounded-lg">
                    <h3 className="text-lg font-medium">Total de Votantes</h3>
                    <p className="text-2xl font-bold">{totalVoters}</p>
                </div>
            </div>
        </div>
    );
};

export default Statistics;