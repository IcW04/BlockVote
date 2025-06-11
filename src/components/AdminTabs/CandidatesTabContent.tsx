import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import Input from '../ui/Input'; // Default import

interface CandidatesTabContentProps {
  contract: ethers.Contract | null;
  isConnected: boolean;
  isAdmin: boolean;
  candidates: string[];
  fetchContractData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

export const CandidatesTabContent: React.FC<CandidatesTabContentProps> = ({
  contract,
  isConnected,
  isAdmin,
  candidates,
  fetchContractData,
  setLoading,
  loading,
}) => {
  const [newCandidateName, setNewCandidateName] = useState('');

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();    if (!contract || !isConnected || !isAdmin || !newCandidateName.trim()) {
      alert('Acceso no autorizado o nombre del candidato vacío. Solo el administrador puede agregar candidatos.');
      return;
    }

    setLoading(true);
    try {
      const tx = await contract.agregarCandidato(newCandidateName.trim());
      await tx.wait();
      setNewCandidateName('');      await fetchContractData(); // Refresh candidates list and other data
      alert('¡Candidato agregado exitosamente!');
    } catch (error) {
      console.error('Error adding candidate:', error);
      alert('Error al agregar candidato. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCandidate = async (candidateName: string) => {    if (!contract || !isConnected || !isAdmin) {
      alert('Acceso no autorizado. Solo el administrador puede eliminar candidatos.');
      return;
    }

    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar al candidato "${candidateName}"?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const tx = await contract.eliminarCandidato(candidateName);
      await tx.wait();      await fetchContractData(); // Refresh candidates list and other data
      alert('¡Candidato eliminado exitosamente!');
    } catch (error) {
      console.error('Error removing candidate:', error);
      alert('Error al eliminar candidato. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row">      {/* Add New Candidate */}
      <div className="col-md-6 mb-4">
        <Card title="Agregar Nuevo Candidato">
          <form onSubmit={handleAddCandidate}>
            <div className="mb-3">
              <label htmlFor="candidateName" className="form-label">
                <i className="bi bi-person-plus-fill me-2"></i>
                Nombre del Candidato
              </label>
              <Input
                type="text"
                id="candidateName"
                placeholder="Ingresa el nombre completo del candidato"
                value={newCandidateName}
                onChange={(e) => setNewCandidateName(e.target.value)}
                required
              />
              <small className="text-muted">
                El nombre del candidato para agregar a la elección actual.
              </small>
            </div>
            <div className="d-grid">
              <Button 
                type="submit" 
                variant="success" 
                disabled={loading || !newCandidateName.trim()}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Agregando...</>
                ) : (
                  <><i className="bi bi-plus-lg me-2"></i>Agregar Candidato</>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>      {/* Current Candidates */}
      <div className="col-md-6 mb-4">
        <Card title="Candidatos Actuales">
          {candidates.length > 0 ? (
            <ul className="list-group">
              {candidates.map((candidate, index) => (
                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>
                    <i className="bi bi-person-check-fill me-2"></i>
                    {candidate}
                  </span>
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={() => handleRemoveCandidate(candidate)} 
                    disabled={loading}
                  >
                    {loading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-trash-fill"></i>}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="alert alert-light" role="alert">
              <i className="bi bi-people me-2"></i>
              Aún no se han agregado candidatos a la elección actual.
            </div>
          )}
          {currentElection && currentElection.id === 0 && (
             <small className="text-muted d-block mt-2">
                Nota: Los candidatos están asociados a una elección activa. Por favor, crea o asegúrate de que una elección esté activa.
             </small>
          )}
        </Card>
      </div>
    </div>
  );
};

// Helper to get current election details if needed, though candidates are global for now
// This might be adjusted if candidates become election-specific in the contract
const currentElection = {
    id: 0 // Placeholder, this should come from props if candidates are election-specific
};
