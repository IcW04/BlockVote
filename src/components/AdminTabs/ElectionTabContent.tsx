import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import Input from '../ui/Input'; // Corrected: Default import

interface Election {
  id: number;
  name: string;
  isActive: boolean;
  totalVotes: number;
}

interface ElectionTabContentProps {
  contract: ethers.Contract | null;
  isConnected: boolean;
  isAdmin: boolean;
  currentElection: Election;
  fetchContractData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

export const ElectionTabContent: React.FC<ElectionTabContentProps> = ({
  contract,
  isConnected,
  isAdmin,
  currentElection,
  fetchContractData,
  setLoading,
  loading,
}) => {
  const [newElectionName, setNewElectionName] = useState('');

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !isConnected || !isAdmin || !newElectionName.trim()) {
      alert('Unauthorized access or election name is empty. Only admin can create elections.');
      return;
    }

    setLoading(true);
    try {
      const tx = await contract.iniciarNuevaEleccion(newElectionName.trim());
      await tx.wait();
      setNewElectionName('');
      await fetchContractData();
      alert('Election created successfully!');
    } catch (error) {
      console.error('Error creating election:', error);
      alert('Error creating election. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVoting = async () => {
    if (!contract || !isConnected || !isAdmin) {
      alert('Unauthorized access. Only admin can toggle voting.');
      return;
    }

    setLoading(true);
    try {
      const tx = await contract.activarVotacion(!currentElection.isActive);
      await tx.wait();
      await fetchContractData();
      alert(`Voting ${!currentElection.isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error toggling voting:', error);
      alert('Error toggling voting status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row">
      {/* Create New Election */}
      <div className="col-md-6 mb-4">
        <Card title="Create New Election">
          <form onSubmit={handleCreateElection}>
            <div className="mb-3">
              <label htmlFor="electionName" className="form-label">
                <i className="bi bi-flag-fill me-2"></i>
                Election Name
              </label>
              <Input
                type="text"
                id="electionName"
                placeholder="e.g., Presidential Election 2024"
                value={newElectionName}
                onChange={(e) => setNewElectionName(e.target.value)}
                required
              />
              <small className="text-muted">
                Enter a descriptive name for the new election.
              </small>
            </div>
            <div className="d-grid">
              <Button 
                type="submit" 
                variant="primary" 
                disabled={loading || !newElectionName.trim()}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Creating...</>
                ) : (
                  <><i className="bi bi-plus-circle-fill me-2"></i>Create Election</>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Current Election Status */}
      <div className="col-md-6 mb-4">
        <Card title="Current Election Status">
          {currentElection && currentElection.id > 0 ? (
            <>
              <h5>
                <i className={`bi ${currentElection.isActive ? 'bi-play-circle-fill text-success' : 'bi-pause-circle-fill text-warning'} me-2`}></i>
                {currentElection.name} (ID: {currentElection.id})
              </h5>
              <p>
                Status: 
                <span className={`badge bg-${currentElection.isActive ? 'success' : 'warning'} ms-2`}>
                  {currentElection.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
              <p>Total Votes Cast: {currentElection.totalVotes}</p>
              <div className="d-grid">
                <Button 
                  variant={currentElection.isActive ? 'danger' : 'success'} 
                  onClick={handleToggleVoting} 
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...</>
                  ) : currentElection.isActive ? (
                    <><i className="bi bi-stop-circle-fill me-2"></i>Deactivate Voting</>
                  ) : (
                    <><i className="bi bi-play-circle-fill me-2"></i>Activate Voting</>
                  )}
                </Button>
              </div>
              <small className="text-muted d-block mt-2">
                Activate or deactivate voting for the current election.
              </small>
            </>
          ) : (
            <div className="alert alert-info" role="alert">
              <i className="bi bi-info-circle-fill me-2"></i>
              No election is currently active or set up. Create one to begin.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
