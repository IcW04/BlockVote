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
  const { account, isConnected, connectWallet, registerWithAdmin } = useWallet();
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
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);

  useEffect(() => {
    if (contract && isConnected && account) {
      loadElectionData();
      checkUserStatus();
      checkRegistrationStatus();
    }
  }, [contract, isConnected, account]);

  const checkRegistrationStatus = async () => {
    if (!contract || !account) return;
    
    try {
      const registeredVoters = await contract.obtenerVotantesRegistrados();
      const registered = registeredVoters.includes(account);
      setIsRegistered(registered);
    } catch (error) {
      console.error('Error checking registration:', error);
      setIsRegistered(false);
    }
  };

  const handleAutoRegistration = async () => {
    if (!contract || !account || isRegistered) return;

    const userConfirmed = window.confirm(
      "🤝 Welcome to the Voting System!\n\n" +
      "To participate in voting, we need to register your wallet address with the admin.\n\n" +
      "This will:\n" +
      "✅ Add your wallet to the voter list\n" +
      "✅ Allow you to receive voting tokens\n" +
      "✅ Enable you to participate in elections\n\n" +
      "Do you agree to share your wallet address with the admin?"
    );

    if (!userConfirmed) {
      alert("❌ Registration cancelled. You need to register to participate in voting.");
      return;
    }

    setRegistrationLoading(true);
    try {
      console.log('🔄 Auto-registering user...');
      await registerWithAdmin(contract);
      
      await checkRegistrationStatus();
      await checkUserStatus();
      
      alert("🎉 Successfully registered! The admin can now send you voting tokens.");
      
    } catch (error: any) {
      console.error('❌ Auto-registration failed:', error);
      alert("⚠️ Registration completed, but you may need to wait for the admin to distribute tokens.");
      // Don't show this as an error since the user is likely registered
      await checkRegistrationStatus();
    } finally {
      setRegistrationLoading(false);
    }
  };

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
          <div className="col-md-8">
            <Card title="🗳️ Blockchain Voting System">
              <div className="text-center">
                <i className="bi bi-wallet2 fs-1 text-primary mb-4"></i>
                <h4 className="mb-3">Connect Your Wallet to Vote</h4>
                <p className="mb-4 text-muted">
                  Connect your MetaMask wallet to participate in elections. 
                  Your wallet address will be automatically registered with the admin to receive voting tokens.
                </p>
                
                <div className="d-grid gap-2 col-md-6 mx-auto">
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={async () => {
                      try {
                        await connectWallet();
                      } catch (error) {
                        console.error('Failed to connect wallet:', error);
                        alert('Failed to connect wallet. Please make sure MetaMask is installed and try again.');
                      }
                    }}
                  >
                    <i className="bi bi-wallet2 me-2"></i>
                    Connect MetaMask Wallet
                  </Button>
                </div>

                <div className="alert alert-info mt-4" role="alert">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>What happens when you connect:</strong>
                  <ol className="text-start mt-2 mb-0">
                    <li>Your wallet connects to the voting system</li>
                    <li>You'll be asked to register your address with the admin</li>
                    <li>Admin can then send you voting tokens</li>
                    <li>You can participate in active elections</li>
                  </ol>
                </div>

                <div className="mt-4">
                  <small className="text-muted">
                    Don't have MetaMask? 
                    <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="ms-1">
                      Download it here
                    </a>
                  </small>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show registration prompt for connected but unregistered users
  if (isConnected && !isRegistered && !registrationLoading) {
    return (
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <Card title="🤝 Complete Your Registration">
              <div className="text-center">
                <i className="bi bi-person-check fs-1 text-success mb-4"></i>
                <h4 className="mb-3">Welcome to the Voting System!</h4>
                <p className="mb-4">
                  Your wallet is connected, but you need to register with the admin to receive voting tokens.
                </p>

                <div className="alert alert-primary" role="alert">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-wallet2 fs-5 me-3"></i>
                    <div className="text-start">
                      <strong>Connected Wallet:</strong><br/>
                      <code>{account}</code>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h6>Registration Benefits:</h6>
                  <div className="row text-start">
                    <div className="col-md-6">
                      <ul className="list-unstyled">
                        <li><i className="bi bi-check-circle text-success me-2"></i>Receive voting tokens from admin</li>
                        <li><i className="bi bi-check-circle text-success me-2"></i>Participate in all elections</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <ul className="list-unstyled">
                        <li><i className="bi bi-check-circle text-success me-2"></i>Transparent voting history</li>
                        <li><i className="bi bi-check-circle text-success me-2"></i>Secure blockchain voting</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="d-grid gap-2 col-md-6 mx-auto">
                  <Button 
                    variant="success" 
                    size="lg"
                    onClick={handleAutoRegistration}
                  >
                    <i className="bi bi-person-plus me-2"></i>
                    Register & Get Voting Access
                  </Button>
                </div>

                <div className="alert alert-info mt-4" role="alert">
                  <i className="bi bi-shield-check me-2"></i>
                  Your wallet address will be securely shared with the admin to enable token distribution. 
                  This is required to participate in voting.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen during registration
  if (registrationLoading) {
    return (
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <Card title="🔄 Registering Your Wallet">
              <div className="text-center">
                <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5>Please wait...</h5>
                <p className="text-muted">
                  We're registering your wallet address with the admin system. 
                  This may take a few moments.
                </p>
                <div className="alert alert-warning" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Please don't close this window or navigate away during registration.
                </div>
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
          </Card>        </div>
      </div>      {/* Token Status and Guidance - Simplified */}
      {parseFloat(userBalance) === 0 && isRegistered && (
        <div className="row mb-4">
          <div className="col-12">
            <Card title="🪙 Waiting for Voting Tokens">
              <div className="alert alert-info" role="alert">
                <div className="d-flex align-items-center">
                  <i className="bi bi-clock fs-4 me-3"></i>
                  <div>
                    <h6 className="alert-heading mb-1">You're Registered!</h6>
                    <p className="mb-0">Your wallet is registered. Wait for the admin to distribute voting tokens before elections.</p>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="text-center p-3 border rounded">
                    <i className="bi bi-check-circle fs-2 text-success mb-2"></i>
                    <h6>✅ Wallet Registered</h6>
                    <small className="text-muted">Your address: {account?.substring(0, 8)}...{account?.substring(account.length - 6)}</small>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="text-center p-3 border rounded">
                    <i className="bi bi-hourglass-split fs-2 text-warning mb-2"></i>
                    <h6>⏳ Waiting for Tokens</h6>
                    <small className="text-muted">Admin will distribute before elections</small>
                  </div>
                </div>
              </div>

              <div className="alert alert-success mt-3" role="alert">
                <i className="bi bi-lightbulb me-2"></i>
                <strong>What's Next?</strong> The admin will send voting tokens to all registered voters before each election starts. 
                You'll be able to vote once you receive tokens.
              </div>

              <div className="text-center">
                <Button 
                  variant="outline-primary"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await checkUserStatus();
                      if (parseFloat(userBalance) > 0) {
                        alert('🎉 Tokens found! You can now vote.');
                      } else {
                        alert('ℹ️ No tokens yet. Please wait for admin distribution.');
                      }
                    } catch (error) {
                      console.error(error);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Checking...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Check for Tokens
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

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