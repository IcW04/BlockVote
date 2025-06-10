export interface Candidate {
    name: string;
    votes: number;
}

export interface ElectionInfo {
    name: string;
    id: number;
    totalVotes: number;
    completed: boolean;
    endDate: number;
}

export interface VotingHistory {
    candidate: string;
    electionId: number;
    timestamp: number;
}

export interface User {
    address: string;
    hasVoted: boolean;
}

export interface Contract {
    address: string;
    abi: any[];
}