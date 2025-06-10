import React from 'react';
import { useVoting } from '../../hooks/useVoting';
import { Button } from '../ui/Button';

interface VoteButtonProps {
    candidate: string;
}

const VoteButton: React.FC<VoteButtonProps> = ({ candidate }) => {
    const { castVote, loading } = useVoting();

    const handleVote = async () => {
        await castVote(candidate);
    };

    return (
        <Button
            onClick={handleVote}
            label={loading ? 'Voting...' : 'Vote'}
            disabled={loading}
        />
    );
};

export default VoteButton;