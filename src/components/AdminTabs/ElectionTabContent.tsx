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
    e.preventDefault();    if (!contract || !isConnected || !isAdmin || !newElectionName.trim()) {
      alert('Acceso no autorizado o el nombre de la elección está vacío. Solo el administrador puede crear elecciones.');
      return;
    }

    setLoading(true);
    try {
      const tx = await contract.iniciarNuevaEleccion(newElectionName.trim());
      await tx.wait();
      setNewElectionName('');
      await fetchContractData();
      alert('¡Elección creada exitosamente!');
    } catch (error) {
      console.error('Error creating election:', error);
      alert('Error al crear la elección. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVoting = async () => {    if (!contract || !isConnected || !isAdmin) {
      alert('Acceso no autorizado. Solo el administrador puede alternar la votación.');
      return;
    }

    setLoading(true);
    try {
      const tx = await contract.activarVotacion(!currentElection.isActive);
      await tx.wait();
      await fetchContractData();
      alert(`Votación ${!currentElection.isActive ? 'activada' : 'desactivada'} exitosamente!`);
    } catch (error) {
      console.error('Error toggling voting:', error);
      alert('Error al cambiar el estado de la votación. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row">
      {/* Create New Election */}
      <div className="col-md-6 mb-4">
        <Card title="Crear Nueva Elección">
          <form onSubmit={handleCreateElection}>
            <div className="mb-3">              <label htmlFor="electionName" className="form-label">
                <i className="bi bi-flag-fill me-2"></i>
                Nombre de la Elección
              </label>
              <Input
                type="text"
                id="electionName"
                placeholder="ej., Elección Presidencial 2024"
                value={newElectionName}
                onChange={(e) => setNewElectionName(e.target.value)}
                required
              />              <small className="text-muted">
                Ingresa un nombre descriptivo para la nueva elección.
              </small>
            </div>
            <div className="d-grid">
              <Button 
                type="submit" 
                variant="primary" 
                disabled={loading || !newElectionName.trim()}
              >                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Creando...</>
                ) : (
                  <><i className="bi bi-plus-circle-fill me-2"></i>Crear Elección</>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Current Election Status */}
      <div className="col-md-6 mb-4">
        <Card title="Estado de la Elección Actual">
          {currentElection && currentElection.id > 0 ? (
            <>
              <h5>
                <i className={`bi ${currentElection.isActive ? 'bi-play-circle-fill text-success' : 'bi-pause-circle-fill text-warning'} me-2`}></i>
                {currentElection.name} (ID: {currentElection.id})
              </h5>              <p>
                Estado: 
                <span className={`badge bg-${currentElection.isActive ? 'success' : 'warning'} ms-2`}>
                  {currentElection.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </p>
              <p>Total de Votos Emitidos: {currentElection.totalVotes}</p>
              <div className="d-grid">
                <Button 
                  variant={currentElection.isActive ? 'danger' : 'success'} 
                  onClick={handleToggleVoting} 
                  disabled={loading}
                >                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Procesando...</>
                  ) : currentElection.isActive ? (
                    <><i className="bi bi-stop-circle-fill me-2"></i>Desactivar Votación</>
                  ) : (
                    <><i className="bi bi-play-circle-fill me-2"></i>Activar Votación</>
                  )}
                </Button>
              </div>              <small className="text-muted d-block mt-2">
                Activa o desactiva la votación para la elección actual.
              </small>
            </>
          ) : (            <div className="alert alert-info" role="alert">
              <i className="bi bi-info-circle-fill me-2"></i>
              No hay ninguna elección activa o configurada actualmente. Crea una para comenzar.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
