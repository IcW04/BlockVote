import React from 'react';
import { useVoting } from '../../hooks/useVoting';
import { Card } from '../ui/Card';

const Overview: React.FC = () => {
    const { totalVotes, totalCandidates, electionStatus } = useVoting();

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Overview of the Voting System</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card title="Total Votes">
                    <p className="text-xl">{totalVotes}</p>
                </Card>
                <Card title="Total Candidates">
                    <p className="text-xl">{totalCandidates}</p>
                </Card>
                <Card title="Election Status">
                    <p className="text-xl">{electionStatus ? 'Active' : 'Inactive'}</p>
                </Card>
            </div>
        </div>
    );
};

export default Overview;