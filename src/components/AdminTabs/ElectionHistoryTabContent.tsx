import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button'; // If needed for actions like re-running a past election (future feature)

interface Election {
  id: number;
  name: string;
  isActive: boolean;
  totalVotes: number;
  isCurrent?: boolean; // Optional: to highlight the current election in history
  // Add other relevant fields like startDate, endDate if available from contract
}

interface ElectionHistoryTabContentProps {
  electionHistory: Election[];
  loading: boolean;
  fetchContractData: () => Promise<void>; // To refresh history if needed
}

export const ElectionHistoryTabContent: React.FC<ElectionHistoryTabContentProps> = ({
  electionHistory,
  loading,
  fetchContractData
}) => {  if (loading && electionHistory.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando historial de elecciones...</span>
        </div>
      </div>
    );
  }

  return (    <div className="row">
      <div className="col-12">
        <Card title="Historial de Elecciones">
          {electionHistory.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Votos Totales</th>
                    {/* Add more columns as needed, e.g., Start Date, End Date */}
                  </tr>
                </thead>
                <tbody>
                  {electionHistory.map((election) => (
                    <tr key={election.id} className={election.isCurrent ? 'table-info' : ''}>
                      <td>
                        <span className={`badge bg-${election.isCurrent ? 'primary' : 'secondary'}`}>{election.id}</span>
                      </td>
                      <td>{election.name}</td>                      <td>
                        {election.isCurrent ? (
                          <span className={`badge bg-${election.isActive ? 'success' : 'warning'}`}>
                            {election.isActive ? 'Activa (Actual)' : 'Inactiva (Actual)'}
                          </span>
                        ) : (
                          <span className="badge bg-secondary">Concluida</span>
                        )}
                      </td>
                      <td>{election.totalVotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>          ) : (
            <div className="alert alert-light text-center" role="alert">
              <i className="bi bi-archive me-2"></i>
              No se encontró historial de elecciones.
              {loading && <div className="spinner-border spinner-border-sm ms-2" role="status"></div>}
            </div>
          )}
          <div className="mt-3 text-center">
            <Button onClick={fetchContractData} variant="outline-secondary" disabled={loading} size="sm">
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Actualizando...</>
              ) : (
                <><i className="bi bi-arrow-clockwise me-2"></i>Actualizar Historial</>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
