import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { useVotingTokens } from '../hooks/useVotingTokens';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ethers } from 'ethers';

interface Candidate {
  name: string;
  voteCount: number;
}

const Voting: React.FC = () => {
  const { contract } = useContract();
  const { account, isConnected } = useWallet();
  const { ensureUserHasTokens, isTransferringTokens } = useVotingTokens();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [currentElection, setCurrentElection] = useState({
    name: '',
    isActive: false,
    totalVotes: 0
  });
  const [userBalance, setUserBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contract && isConnected && account) {
      loadElectionData();
      checkUserStatus();
    }
  }, [contract, isConnected, account]);

  const loadElectionData = async () => {
    if (!contract) return;
    
    setLoading(true);
    try {
      console.log('🔄 Cargando datos de la elección...');
      
      // Obtener información de la elección actual
      const electionName = await contract.nombreEleccionActual();
      const isActive = await contract.votacionActiva();
      const totalVotes = await contract.obtenerVotosTotales();
      
      setCurrentElection({
        name: electionName,
        isActive: isActive,
        totalVotes: totalVotes.toNumber()
      });
      
      console.log('🗳️ Elección:', { name: electionName, active: isActive, votes: totalVotes.toNumber() });
      
      // Obtener candidatos y sus votos
      await loadCandidates();
      
    } catch (error) {
      console.error('Error cargando datos de elección:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async () => {
    if (!contract) return;
    
    try {
      console.log('👥 Cargando candidatos...');
      
      // Obtener lista de candidatos
      const candidatesList = await contract.obtenerCandidatos();
      console.log('Candidatos obtenidos:', candidatesList);
      
      // Obtener resultados (nombres y votos)
      const [nombres, votos] = await contract.obtenerResultados();
      
      const candidatesData: Candidate[] = nombres.map((name: string, index: number) => ({
        name: name,
        voteCount: votos[index].toNumber()
      }));
      
      setCandidates(candidatesData);
      console.log('✅ Candidatos cargados:', candidatesData);
      
    } catch (error) {
      console.error('Error cargando candidatos:', error);
      setCandidates([]);
    }
  };

  const checkUserStatus = async () => {
    if (!contract || !account) return;
    
    try {
      // Verificar si el usuario ya votó en esta elección
      const electionId = await contract.idEleccionActual();
      const voted = await contract.haVotadoEnEleccion(electionId, account);
      setHasVoted(voted);
      
      // Obtener balance del usuario
      const balance = await contract.balanceOf(account);
      const balanceFormatted = ethers.utils.formatEther(balance);
      setUserBalance(balanceFormatted);
      
      console.log('👤 Estado del usuario:', { voted, balance: balanceFormatted });
      
    } catch (error) {
      console.error('Error verificando estado del usuario:', error);
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate || !contract || !isConnected || !account) {
      alert('Por favor selecciona un candidato.');
      return;
    }

    if (hasVoted) {
      alert('Ya has votado en esta elección.');
      return;
    }

    if (!currentElection.isActive) {
      alert('La votación no está activa actualmente.');
      return;
    }

    setIsVoting(true);
    
    try {
      // Verificar que el usuario tenga tokens suficientes
      const balance = await contract.balanceOf(account);
      const costoVoto = await contract.COSTO_VOTO();
      
      if (balance.lt(costoVoto)) {
        console.log('⚠️ Usuario no tiene suficientes tokens, solicitando...');
        
        try {
          const tokensReceived = await ensureUserHasTokens();
          if (!tokensReceived) {
            alert('No se pudieron obtener tokens para votar. Contacta al administrador.');
            return;
          }
        } catch (tokenError: any) {
          alert(tokenError.message || 'Error al obtener tokens para votar.');
          return;
        }
      }
      
      console.log('🗳️ Enviando voto por:', selectedCandidate);
      
      // Estimar gas
      const gasEstimate = await contract.estimateGas.emitirVoto(selectedCandidate);
      console.log('⛽ Gas estimado:', gasEstimate.toString());
      
      // Enviar transacción de voto
      const tx = await contract.emitirVoto(selectedCandidate, {
        gasLimit: gasEstimate.mul(120).div(100) // 20% extra gas
      });
      
      console.log('📝 Transacción enviada:', tx.hash);
      alert('🔄 Procesando voto... Por favor espera la confirmación.');
      
      // Esperar confirmación
      const receipt = await tx.wait();
      console.log('✅ Voto confirmado:', receipt);
      
      // Actualizar estado
      setHasVoted(true);
      setSelectedCandidate('');
      await loadElectionData();
      await checkUserStatus();
      
      alert('✅ ¡Voto registrado exitosamente!');
      
    } catch (error: any) {
      console.error('❌ Error votando:', error);
      
      let errorMessage = 'Error al votar. Por favor intenta nuevamente.';
      if (error.message) {
        if (error.message.includes('Ya has votado')) {
          errorMessage = 'Ya has votado en esta elección.';
        } else if (error.message.includes('No tienes suficientes tokens')) {
          errorMessage = 'No tienes suficientes tokens para votar.';
        } else if (error.message.includes('La votacion no esta activa')) {
          errorMessage = 'La votación no está activa actualmente.';
        } else if (error.message.includes('user rejected transaction')) {
          errorMessage = 'Transacción cancelada por el usuario.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Fondos insuficientes para pagar el gas.';
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsVoting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <Card title="🗳️ Sistema de Votación Blockchain">
              <div className="text-center">
                <p className="mb-3">Conecta tu wallet para participar en la votación</p>
                <p className="text-muted">Necesitas MetaMask para votar</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-12 mb-4">
          <h1 className="display-5 fw-bold text-center">🗳️ Sistema de Votación Blockchain</h1>
        </div>
      </div>

      {/* Estado de la elección */}
      <div className="row mb-4">
        <div className="col-12">
          <Card title="📊 Estado de la Elección">
            <div className="row">
              <div className="col-md-6">
                <h5 className="text-primary">{currentElection.name || 'Cargando...'}</h5>
                <p className="mb-2">
                  <span className={`badge ${currentElection.isActive ? 'bg-success' : 'bg-secondary'}`}>
                    {currentElection.isActive ? '🟢 Activa' : '🔴 Inactiva'}
                  </span>
                </p>
                <p className="mb-0">Total de votos: <strong>{currentElection.totalVotes}</strong></p>
              </div>
              <div className="col-md-6">
                <p className="mb-1">
                  <strong>Tu cuenta:</strong> {account?.substring(0, 8)}...{account?.substring(account.length - 6)}
                </p>
                <p className="mb-1">
                  <strong>Balance:</strong> {parseFloat(userBalance).toFixed(4)} VOTE tokens
                </p>
                <p className="mb-0">
                  <span className={`badge ${hasVoted ? 'bg-warning' : 'bg-info'}`}>
                    {hasVoted ? '✅ Ya votaste' : '🗳️ Puedes votar'}
                  </span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Lista de candidatos */}
      {currentElection.isActive && (
        <div className="row mb-4">
          <div className="col-12">
            <Card title="👥 Candidatos">
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : candidates.length > 0 ? (
                <div className="row">
                  {candidates.map((candidate, index) => (
                    <div key={index} className="col-md-6 mb-3">
                      <div 
                        className={`card h-100 ${selectedCandidate === candidate.name ? 'border-primary border-3' : ''} ${hasVoted ? 'opacity-50' : ''}`}
                        style={{ 
                          cursor: hasVoted ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => !hasVoted && setSelectedCandidate(candidate.name)}
                      >
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <h5 className="card-title">
                                {candidate.name}
                                {selectedCandidate === candidate.name && ' ✓'}
                              </h5>
                            </div>
                            <div className="text-center">
                              <div className="badge bg-light text-dark fs-6 p-2">
                                <div className="fw-bold">{candidate.voteCount}</div>
                                <div style={{ fontSize: '0.8em' }}>votos</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted">
                  <p>No hay candidatos disponibles</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Botón de votación */}
      {currentElection.isActive && !hasVoted && (
        <div className="row">
          <div className="col-12 text-center">
            <Button
              onClick={handleVote}
              disabled={!selectedCandidate || isVoting || isTransferringTokens}
              variant={selectedCandidate ? 'success' : 'secondary'}
              size="lg"
            >
              {isVoting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Procesando voto...
                </>
              ) : isTransferringTokens ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Obteniendo tokens...
                </>
              ) : (
                '🗳️ Votar'
              )}
            </Button>
            {selectedCandidate && (
              <p className="mt-3 text-muted">
                Has seleccionado: <strong>{selectedCandidate}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Información */}
      <div className="row mt-4">
        <div className="col-12">
          <Card title="ℹ️ Información del Sistema">
            <ul className="list-unstyled mb-0">
              <li className="mb-2">🔹 Cada voto consume 1 VOTE token</li>
              <li className="mb-2">🔹 Solo puedes votar una vez por elección</li>
              <li className="mb-2">🔹 Los votos son inmutables y transparentes</li>
              <li className="mb-2">🔹 Los resultados se actualizan en tiempo real</li>
              <li className="mb-0">🔹 Si no tienes tokens, el sistema te los proporcionará automáticamente</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Voting;