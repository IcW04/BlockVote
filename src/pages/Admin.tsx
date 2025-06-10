import React, { useEffect, useState } from 'react';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ethers } from 'ethers';

// Dirección del admin autorizado
const ADMIN_ADDRESS = '0xca527d55d311C39168677dbDce565edBd4e32D80';

const Admin: React.FC = () => {
  const { contract } = useContract();
  const { account, isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState('elections');
  const [newElection, setNewElection] = useState({
    name: ''
  });
  const [newCandidate, setNewCandidate] = useState({
    name: ''
  });
  const [candidates, setCandidates] = useState<string[]>([]);
  const [currentElection, setCurrentElection] = useState({
    id: 0,
    name: '',
    isActive: false,
    totalVotes: 0
  });
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  const [voterAddress, setVoterAddress] = useState('');
  const [autoMintEnabled, setAutoMintEnabled] = useState(false);
  const [tokensPerUser, setTokensPerUser] = useState('0.000003');
  const [registeredVoters, setRegisteredVoters] = useState<string[]>([]);
  const [ownerBalance, setOwnerBalance] = useState<string>('0');
  const [tokensNeeded, setTokensNeeded] = useState<string>('0');

  // ✅ NUEVO: Estado para historial de elecciones
  const [electionHistory, setElectionHistory] = useState<any[]>([]);

  // Verificar si el usuario conectado es el admin
  const isAdmin = account && account.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  useEffect(() => {
    if (contract && isConnected) {
      fetchContractData();
    }
  }, [contract, isConnected]);

  const fetchContractData = async () => {
    if (!contract) {
      console.log('❌ No contract available');
      return;
    }

    try {
      console.log('🔄 Fetching contract data...');
      
      // Obtener información del token
      const name = await contract.name();
      const symbol = await contract.symbol();
      console.log('📄 Token:', name, symbol);
      setTokenName(name);
      setTokenSymbol(symbol);

      // Obtener balance del usuario
      if (account) {
        const balance = await contract.balanceOf(account);
        console.log('💰 Balance:', ethers.utils.formatEther(balance));
        setTokenBalance(ethers.utils.formatEther(balance));
      }

      // Verificar si auto-mint está habilitado
      try {
        const autoMintStatus = await contract.autoMintEnabled();
        setAutoMintEnabled(autoMintStatus);
        console.log('🤖 Auto-mint enabled:', autoMintStatus);
      } catch (error) {
        console.log('⚠️ Auto-mint not supported by contract');
      }

      // Obtener información de la elección actual
      try {
        const electionId = await contract.idEleccionActual();
        const electionName = await contract.nombreEleccionActual();
        const isActive = await contract.votacionActiva();
        const totalVotes = await contract.obtenerVotosTotales();

        console.log('🗳️ Election data:', {
          id: electionId.toNumber(),
          name: electionName,
          active: isActive,
          votes: totalVotes.toNumber()
        });

        setCurrentElection({
          id: electionId.toNumber(),
          name: electionName,
          isActive: isActive,
          totalVotes: totalVotes.toNumber()
        });
      } catch (electionError) {
        console.log('⚠️ No election data available:', electionError);
        setCurrentElection({
          id: 0,
          name: '',
          isActive: false,
          totalVotes: 0
        });
      }

      // Obtener candidatos
      try {
        const candidatesList = await contract.obtenerCandidatos();
        console.log('👥 Candidates:', candidatesList);
        setCandidates(candidatesList);
      } catch (candidatesError) {
        console.log('⚠️ No candidates available:', candidatesError);
        setCandidates([]);
      }

      // Obtener lista de votantes registrados
      try {
        const votersList = await contract.obtenerVotantesRegistrados();
        console.log('👤 Registered voters:', votersList.length);
        setRegisteredVoters(votersList);
      } catch (votersError) {
        console.log('⚠️ No voters data available:', votersError);
        setRegisteredVoters([]);
      }

      // ✅ NUEVO: Obtener historial de elecciones
      try {
        console.log('📚 Fetching election history...');
        
        // Intentar obtener el historial (puede que necesites agregar esta función al contrato)
        // Por ahora, vamos a simular obteniendo datos de la elección actual y anteriores
        const currentId = await contract.idEleccionActual();
        const historialData = [];
        
        // Obtener información de elecciones anteriores (del 1 hasta la actual)
        for (let i = 1; i <= currentId.toNumber(); i++) {
          try {
            if (i === currentId.toNumber()) {
              // Elección actual
              const electionName = await contract.nombreEleccionActual();
              const isActive = await contract.votacionActiva();
              const totalVotes = await contract.obtenerVotosTotales();
              
              historialData.push({
                id: i,
                name: electionName,
                isActive: isActive,
                totalVotes: totalVotes.toNumber(),
                isCurrent: true
              });
            } else {
              // Elecciones anteriores - agregar datos básicos
              historialData.push({
                id: i,
                name: `Elección ${i}`,
                isActive: false,
                totalVotes: 0, // No podemos obtener votos de elecciones pasadas fácilmente
                isCurrent: false
              });
            }
          } catch (error) {
            console.log(`⚠️ No data for election ${i}`);
          }
        }
        
        console.log('📚 Election history:', historialData);
        setElectionHistory(historialData);
        
      } catch (historyError) {
        console.log('⚠️ No election history available:', historyError);
        setElectionHistory([]);
      }

      // ✅ NUEVO: Obtener información del balance del propietario
      try {
        const ownerBal = await contract.balancePropietario();
        const tokensNeed = await contract.tokensNecesariosParaTodos();
        
        console.log('💰 Owner balance:', ethers.utils.formatEther(ownerBal));
        console.log('🎯 Tokens needed for all users:', ethers.utils.formatEther(tokensNeed));
        
        setOwnerBalance(ethers.utils.formatEther(ownerBal));
        setTokensNeeded(ethers.utils.formatEther(tokensNeed));
        
      } catch (ownerError) {
        console.log('⚠️ No owner balance data available:', ownerError);
        setOwnerBalance('0');
        setTokensNeeded('0');
      }

    } catch (error) {
      console.error('❌ Error fetching contract data:', error);
    }
  };

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !isConnected || !isAdmin) {
      alert('Unauthorized access. Only admin can create elections.');
      return;
    }

    setLoading(true);
    try {
      const tx = await contract.iniciarNuevaEleccion(newElection.name);
      await tx.wait();
      
      setNewElection({ name: '' });
      await fetchContractData();
      
      alert('Election created successfully!');
    } catch (error) {
      console.error('Error creating election:', error);
      alert('Error creating election. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !isConnected || !isAdmin) {
      alert('Unauthorized access. Only admin can add candidates.');
      return;
    }

    setLoading(true);
    try {
      const tx = await contract.agregarCandidato(newCandidate.name);
      await tx.wait();
      
      setNewCandidate({ name: '' });
      await fetchContractData();
      
      alert('Candidate added successfully!');
    } catch (error) {
      console.error('Error adding candidate:', error);
      alert('Error adding candidate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCandidate = async (candidateName: string) => {
    if (!contract || !isConnected || !isAdmin) {
      alert('Unauthorized access. Only admin can remove candidates.');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to remove candidate "${candidateName}"?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const tx = await contract.eliminarCandidato(candidateName);
      await tx.wait();
      
      await fetchContractData();
      alert('Candidate removed successfully!');
    } catch (error) {
      console.error('Error removing candidate:', error);
      alert('Error removing candidate. Please try again.');
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

  const handleMintTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !isConnected || !voterAddress.trim() || !isAdmin) {
      alert('Please provide a valid voter address.');
      return;
    }

    setLoading(true);
    try {
      const amount = ethers.utils.parseEther(tokensPerUser);
      const tx = await contract.mint(voterAddress.trim(), amount);
      await tx.wait();
      
      setVoterAddress('');
      await fetchContractData();
      
      alert(`Successfully minted ${tokensPerUser} tokens to ${voterAddress}!`);
    } catch (error) {
      console.error('Error minting tokens:', error);
      alert('Error minting tokens. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMintTokens = async () => {
    if (!contract || !isConnected || registeredVoters.length === 0 || !isAdmin) {
      alert('Unauthorized access or no registered voters found.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send ${tokensPerUser} tokens to all ${registeredVoters.length} registered voters? This will cost gas for ${registeredVoters.length} transactions.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const amount = ethers.utils.parseEther(tokensPerUser);
      
      // Enviar tokens en lotes de 20 para evitar problemas de gas
      const batchSize = 20;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < registeredVoters.length; i += batchSize) {
        const batch = registeredVoters.slice(i, i + batchSize);
        
        const promises = batch.map(async (voterAddress) => {
          try {
            const tx = await contract.mint(voterAddress, amount);
            await tx.wait();
            successCount++;
            console.log(`✅ Tokens sent to ${voterAddress}`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Failed to send tokens to ${voterAddress}:`, error);
          }
        });

        await Promise.all(promises);
        
        // Pequeña pausa entre lotes
        if (i + batchSize < registeredVoters.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      await fetchContractData();
      alert(`Bulk mint completed!\n✅ Success: ${successCount}\n❌ Errors: ${errorCount}`);
      
    } catch (error) {
      console.error('Error in bulk mint:', error);
      alert('Error in bulk token distribution.');
    } finally {
      setLoading(false);
    }
  };

  // Nuevas funciones para auto-mint automático
  const handleBulkAutoDistribution = async () => {
    if (!contract || !isConnected || registeredVoters.length === 0 || !isAdmin) {
      alert('Unauthorized access or no registered voters found.');
      return;
    }

    // Verificar balance del propietario antes de proceder
    if (!checkOwnerBalance()) {
      return;
    }

    const confirmed = window.confirm(
      `¿Quieres distribuir tokens automáticamente a todos los usuarios registrados que no tienen tokens?\n\nCantidad por usuario: ${tokensPerUser} tokens\nUsuarios registrados: ${registeredVoters.length}`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const amount = ethers.utils.parseEther(tokensPerUser);
      
      let successCount = 0;
      let errorCount = 0;
      let alreadyHasTokensCount = 0;

      for (const voterAddress of registeredVoters) {
        try {
          // Verificar si el usuario puede recibir tokens
          const canReceiveTokens = await contract.puedeRecibirTokens(voterAddress);
          
          if (canReceiveTokens) {
            // Usar distribuirTokens en lugar de mint para un mejor control
            const tx = await contract.distribuirTokens(voterAddress, amount);
            await tx.wait();
            successCount++;
            console.log(`✅ Tokens distribuidos a ${voterAddress}`);
          } else {
            alreadyHasTokensCount++;
            console.log(`⚠️ ${voterAddress} ya tiene tokens o ya recibió tokens iniciales`);
          }
          
          // Pausa para evitar problemas de gas
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          errorCount++;
          console.error(`❌ Error distribuyendo tokens a ${voterAddress}:`, error);
        }
      }

      await fetchContractData();
      alert(`Distribución automática completada!\n✅ Exitosos: ${successCount}\n⚠️ Ya tenían tokens: ${alreadyHasTokensCount}\n❌ Errores: ${errorCount}`);
      
    } catch (error) {
      console.error('Error en distribución automática:', error);
      alert('Error en la distribución automática de tokens.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableAutoMintForAll = async () => {
    if (!contract || !isConnected || !isAdmin) {
      alert('Unauthorized access. Only admin can enable auto-mint.');
      return;
    }

    // Verificar balance del propietario antes de habilitar auto-mint
    if (!checkOwnerBalance()) {
      const confirmed = window.confirm(
        '⚠️ El propietario no tiene suficientes tokens, pero ¿quieres habilitar el auto-mint de todas formas?\n\n' +
        'Nota: Los usuarios no podrán recibir tokens hasta que el propietario tenga suficiente balance.'
      );
      if (!confirmed) return;
    }

    const confirmed = window.confirm(
      '¿Quieres habilitar las transferencias automáticas y configurar la distribución?\n\n' +
      'Esto permitirá que nuevos usuarios reciban tokens automáticamente desde la cuenta del propietario al conectarse.\n\n' +
      `Cantidad por usuario: ${tokensPerUser} tokens\n` +
      `Balance del propietario: ${parseFloat(ownerBalance).toFixed(6)} tokens`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      // 1. Habilitar auto-mint si no está habilitado
      if (!autoMintEnabled) {
        console.log('🤖 Habilitando auto-mint...');
        const toggleTx = await contract.toggleAutoMint(true);
        await toggleTx.wait();
      }

      // 2. Configurar la cantidad de tokens por usuario
      console.log(`🎯 Configurando cantidad: ${tokensPerUser} tokens por usuario...`);
      const amount = ethers.utils.parseEther(tokensPerUser);
      const setAmountTx = await contract.setAutoMintAmount(amount);
      await setAmountTx.wait();

      await fetchContractData();
      alert(`Sistema de transferencias habilitado exitosamente!\n\n✅ Transferencias automáticas: Habilitado\n🎯 Cantidad por usuario: ${tokensPerUser} tokens\n💰 Balance del propietario: ${parseFloat(ownerBalance).toFixed(6)} tokens\n\nLos nuevos usuarios recibirán tokens automáticamente desde la cuenta del propietario al conectarse.`);
      
    } catch (error) {
      console.error('Error habilitando auto-mint:', error);
      alert('Error habilitando el auto-mint. Verifica que eres el propietario del contrato.');
    } finally {
      setLoading(false);
    }
  };

  // Nuevas funciones para resetear el estado de tokens iniciales
  const handleResetTokenStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !isConnected || !voterAddress.trim() || !isAdmin) {
      alert('Please provide a valid voter address.');
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres resetear el estado de tokens iniciales para la dirección:\n\n${voterAddress.trim()}\n\nEsto permitirá al usuario solicitar tokens nuevamente.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const tx = await contract.resetearEstadoTokensIniciales(voterAddress.trim());
      await tx.wait();
      
      setVoterAddress('');
      await fetchContractData();
      
      alert(`✅ Estado de tokens resetado exitosamente para ${voterAddress.trim()}!\n\nEste usuario ahora puede solicitar tokens nuevamente.`);
    } catch (error) {
      console.error('Error resetting token status:', error);
      alert('Error resetting token status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkResetTokenStatus = async () => {
    if (!contract || !isConnected || registeredVoters.length === 0 || !isAdmin) {
      alert('Unauthorized access or no registered voters found.');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ ATENCIÓN: ¿Quieres resetear el estado de tokens iniciales para TODOS los usuarios registrados?\n\nUsuarios afectados: ${registeredVoters.length}\n\nEsto permitirá que todos puedan solicitar tokens nuevamente, incluso si ya los habían recibido antes.\n\n¿Estás seguro?`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      console.log('🔄 Reseteando estado de tokens para todos los usuarios...');
      
      const tx = await contract.resetearEstadoTokensInicialsesMasivo(registeredVoters);
      await tx.wait();

      await fetchContractData();
      alert(`✅ Estado de tokens resetado exitosamente para todos los usuarios!\n\n${registeredVoters.length} usuarios ahora pueden solicitar tokens nuevamente.`);
      
    } catch (error) {
      console.error('Error in bulk token status reset:', error);
      alert('Error resetting token status for all users.');
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar si el propietario tiene suficientes tokens
  const checkOwnerBalance = () => {
    const ownerBal = parseFloat(ownerBalance);
    const needed = parseFloat(tokensNeeded);
    
    if (needed > ownerBal) {
      alert(`⚠️ Advertencia: El propietario no tiene suficientes tokens!\n\n` +
            `Balance actual: ${ownerBal.toFixed(6)} tokens\n` +
            `Tokens necesarios: ${needed.toFixed(6)} tokens\n` +
            `Faltante: ${(needed - ownerBal).toFixed(6)} tokens\n\n` +
            `El propietario necesita más tokens para distribuir a todos los usuarios.`);
      return false;
    }
    return true;
  };

  // Pantalla de acceso no autorizado
  if (!isConnected) {
    return (
      <div className="container">
        <div className="row">
          <div className="col-md-6 mx-auto">
            <Card title="Admin Access Required">
              <div className="text-center">
                <i className="bi bi-shield-lock fs-1 text-muted mb-3"></i>
                <p className="lead">Please connect your wallet to access the admin dashboard</p>
                <small className="text-muted">
                  Only authorized admin accounts can access this area
                </small>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de acceso denegado para usuarios no autorizados
  if (isConnected && !isAdmin) {
    return (
      <div className="container">
        <div className="row">
          <div className="col-md-8 mx-auto">
            <Card title="Access Denied">
              <div className="text-center">
                <i className="bi bi-shield-exclamation fs-1 text-danger mb-3"></i>
                <h4 className="text-danger">Unauthorized Access</h4>
                <p className="lead">
                  You don't have permission to access the Admin Dashboard.
                </p>
                <div className="alert alert-warning" role="alert">
                  <strong>Current Account:</strong> <code>{account}</code><br/>
                  <strong>Required Account:</strong> <code>{ADMIN_ADDRESS}</code>
                </div>
                <p className="text-muted">
                  Only the authorized admin account can manage elections, candidates, and token distribution.
                  Please connect with the correct admin wallet.
                </p>
                <div className="d-grid gap-2 col-md-6 mx-auto">
                  <Button 
                    variant="primary" 
                    onClick={() => window.location.href = '/voting'}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Go to Voting Page
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => window.location.href = '/'}
                  >
                    <i className="bi bi-house me-2"></i>
                    Go to Home
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard normal solo para admin autorizado
  return (
    <div className="container">
      <div className="row">
        <div className="col-12 mb-4">
          <h1 className="display-5 fw-bold text-center">Admin Dashboard</h1>
          <div className="text-center">
            <small className="text-muted">Connected as: {account}</small>
            <span className="badge bg-success ms-2">✅ AUTHORIZED ADMIN</span>
            <br />
            <small className="text-muted">{tokenName} ({tokenSymbol}) Balance: {parseFloat(tokenBalance).toFixed(2)}</small>
          </div>
        </div>
      </div>

      {/* Token Transfer System Status - Solo visible para admin */}
      <div className="row mb-4">
        <div className="col-12">
          <Card title="Automatic Token Transfer System">
            <div className="alert alert-success" role="alert">
              <div className="d-flex align-items-center">
                <i className="bi bi-shield-check fs-4 me-3"></i>
                <div>
                  <h6 className="alert-heading mb-1">Admin Access Confirmed</h6>
                  <p className="mb-0">
                    You are logged in as the authorized administrator ({ADMIN_ADDRESS}).
                    The system automatically transfers tokens to users when they access the voting page.
                  </p>
                </div>
              </div>
            </div>

            <div className="row">
              {/* System Status */}
              <div className="col-md-6">
                <h6 className="text-primary">
                  <i className="bi bi-robot me-2"></i>
                  Automatic Transfer Status
                </h6>
                
                <div className="mb-3">
                  <div className="mb-2">
                    <small className="text-muted">System Status: </small>
                    {autoMintEnabled ? 
                      <span className="badge bg-success">✅ Active - Transferring 0.000003 tokens per user</span> : 
                      <span className="badge bg-secondary">❌ Disabled</span>
                    }
                  </div>
                  
                  <div className="mb-2">
                    <small className="text-muted">Admin Balance: </small>
                    <span className="badge bg-info">{parseFloat(ownerBalance).toFixed(6)} tokens</span>
                  </div>
                  
                  <div className="mb-2">
                    <small className="text-muted">Tokens needed for pending users: </small>
                    <span className="badge bg-warning">{parseFloat(tokensNeeded).toFixed(6)} tokens</span>
                  </div>

                  <div className="alert alert-info mt-3" role="alert">
                    <small>
                      <i className="bi bi-info-circle me-1"></i>
                      <strong>How it works:</strong> When users click "Go to Voting", they automatically receive 0.000003 tokens from your admin account if they haven't received tokens before.
                    </small>
                  </div>
                </div>
                
                <div className="d-grid gap-2">
                  <Button 
                    variant={autoMintEnabled ? "outline-secondary" : "primary"}
                    onClick={handleEnableAutoMintForAll}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Configuring...
                      </>
                    ) : autoMintEnabled ? (
                      <>
                        <i className="bi bi-gear-fill me-2"></i>
                        Reconfigure System
                      </>
                    ) : (
                      <>
                        <i className="bi bi-gear-fill me-2"></i>
                        Enable Automatic Transfers
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Emergency Token Reset */}
              <div className="col-md-6">
                <h6 className="text-danger">
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Emergency Token Reset
                </h6>
                <small className="text-muted d-block mb-3">
                  Reset token status for users who get "already received tokens" errors.
                </small>
                
                <form onSubmit={handleResetTokenStatus}>
                  <div className="input-group mb-3">
                    <span className="input-group-text">🔄</span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="User address to reset (0x...)"
                      value={voterAddress}
                      onChange={(e) => setVoterAddress(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="d-grid gap-2">
                    <Button 
                      type="submit" 
                      variant="danger"
                      disabled={loading || !voterAddress.trim()}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Resetting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-arrow-clockwise me-2"></i>
                          Reset Single User
                        </>
                      )}
                    </Button>

                    <Button 
                      variant="outline-danger"
                      onClick={handleBulkResetTokenStatus}
                      disabled={loading || registeredVoters.length === 0}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          Reset All Users ({registeredVoters.length})
                        </>
                      )}
                    </Button>
                  </div>
                </form>
                
                <div className="alert alert-warning mt-3" role="alert">
                  <small>
                    <strong>⚠️ Warning:</strong> Resetting allows users to request tokens again. Only use if a user reports they can't get tokens.
                  </small>
                </div>
              </div>
            </div>

            {/* Registered Voters Statistics */}
            {registeredVoters.length > 0 && (
              <div className="row mt-4">
                <div className="col-12">
                  <div className="alert alert-info" role="alert">
                    <h6 className="alert-heading">📊 System Statistics</h6>
                    <div className="row">
                      <div className="col-md-4">
                        <strong>Total Registered Users:</strong> {registeredVoters.length}
                      </div>
                      <div className="col-md-4">
                        <strong>Admin Balance:</strong> {parseFloat(ownerBalance).toFixed(6)} tokens
                      </div>
                      <div className="col-md-4">
                        <strong>Pending Tokens Needed:</strong> {parseFloat(tokensNeeded).toFixed(6)} tokens
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>      {/* Navigation Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'elections' ? 'active' : ''}`}
                onClick={() => setActiveTab('elections')}
              >
                <i className="bi bi-ballot me-2"></i>
                Elections
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'candidates' ? 'active' : ''}`}
                onClick={() => setActiveTab('candidates')}
              >
                <i className="bi bi-people me-2"></i>
                Candidates
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'voters' ? 'active' : ''}`}
                onClick={() => setActiveTab('voters')}
              >
                <i className="bi bi-wallet2 me-2"></i>
                Voters & Tokens
              </button>
            </li>
            {/* ✅ NUEVO: Tab para historial */}
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <i className="bi bi-clock-history me-2"></i>
                Election History
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Elections Tab - MEJORADO */}
      {activeTab === 'elections' && (
        <div className="row">
          <div className="col-md-6">
            <Card title="Create New Election">
              <form onSubmit={handleCreateElection}>
                <div className="mb-3">
                  <label className="form-label">Election Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newElection.name}
                    onChange={(e) => setNewElection({...newElection, name: e.target.value})}
                    placeholder="Enter election name"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading || !newElection.name.trim()}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Election
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>

          <div className="col-md-6">
            <Card title="Current Election">
              {currentElection.name ? (
                <div>
                  <h5>{currentElection.name}</h5>
                  <p className="text-muted">ID: {currentElection.id}</p>
                  <p className="text-muted">Total Votes: {currentElection.totalVotes}</p>
                  <p>
                    Status: 
                    <span className={`badge ms-2 ${currentElection.isActive ? 'bg-success' : 'bg-danger'}`}>
                      {currentElection.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                  
                  <Button 
                    variant={currentElection.isActive ? 'danger' : 'success'}
                    onClick={handleToggleVoting}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : (
                      <i className={`bi ${currentElection.isActive ? 'bi-stop-circle' : 'bi-play-circle'} me-2`}></i>
                    )}
                    {currentElection.isActive ? 'Stop Voting' : 'Start Voting'}
                  </Button>
                </div>
              ) : (
                <p className="text-muted">No election created yet.</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ✅ NUEVO: Election History Tab */}
      {activeTab === 'history' && (
        <div className="row">
          <div className="col-12">
            <Card title="Election History">
              {electionHistory.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Total Votes</th>
                        <th>Type</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {electionHistory.map((election) => (
                        <tr key={election.id} className={election.isCurrent ? 'table-primary' : ''}>
                          <td>
                            <strong>#{election.id}</strong>
                          </td>
                          <td>
                            <strong>{election.name}</strong>
                            {election.isCurrent && (
                              <span className="badge bg-info ms-2">Current</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${election.isActive ? 'bg-success' : 'bg-secondary'}`}>
                              {election.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <strong>{election.totalVotes}</strong> votes
                          </td>
                          <td>
                            {election.isCurrent ? (
                              <span className="text-primary">
                                <i className="bi bi-lightning-charge me-1"></i>
                                Current Election
                              </span>
                            ) : (
                              <span className="text-muted">
                                <i className="bi bi-archive me-1"></i>
                                Historical
                              </span>
                            )}
                          </td>
                          <td>
                            {election.isCurrent ? (
                              <Button 
                                variant={election.isActive ? 'danger' : 'success'}
                                size="sm"
                                onClick={handleToggleVoting}
                                disabled={loading}
                              >
                                {election.isActive ? (
                                  <>
                                    <i className="bi bi-stop-circle me-1"></i>
                                    Stop
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-play-circle me-1"></i>
                                    Start
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="text-muted">
                                <i className="bi bi-check-circle me-1"></i>
                                Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-clock-history fs-1 text-muted mb-3"></i>
                  <h5>No Election History</h5>
                  <p className="text-muted">Election history will appear here as you create and manage elections.</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div className="row">
          <div className="col-md-6">
            <Card title="Add Candidate">
              <form onSubmit={handleAddCandidate}>
                <div className="mb-3">
                  <label className="form-label">Candidate Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({...newCandidate, name: e.target.value})}
                    placeholder="Enter candidate name"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading || !newCandidate.name.trim()}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-plus me-2"></i>
                      Add Candidate
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>          <div className="col-md-6">
            <Card title="Current Candidates">
              {candidates.length > 0 ? (
                <div className="list-group">
                  {candidates.map((candidate, index) => (
                    <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{candidate}</span>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleRemoveCandidate(candidate)}
                        disabled={loading || currentElection.isActive}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No candidates added yet.</p>
              )}
              
              {currentElection.isActive && candidates.length > 0 && (
                <div className="alert alert-warning mt-3" role="alert">
                  <small>Cannot modify candidates while voting is active.</small>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Voters & Token Distribution Tab */}
      {activeTab === 'voters' && (
        <div className="row">
          {/* Token Distribution Controls */}
          <div className="col-12 mb-4">            <Card title="🪙 Token Distribution for Election">
              <div className="alert alert-info" role="alert">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Automatic Registration System:</strong> Users automatically register when they connect their wallets to vote. 
                Distribute tokens to all registered voters before each election.
              </div>

              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="text-center p-3 border rounded">
                    <h4 className="text-primary">{registeredVoters.length}</h4>
                    <small className="text-muted">Registered Voters</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 border rounded">
                    <h4 className="text-success">{parseFloat(ownerBalance).toFixed(6)}</h4>
                    <small className="text-muted">Admin Balance</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 border rounded">
                    <h4 className="text-warning">{tokensPerUser}</h4>
                    <small className="text-muted">Tokens per Voter</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 border rounded">
                    <h4 className="text-info">{(registeredVoters.length * parseFloat(tokensPerUser)).toFixed(6)}</h4>
                    <small className="text-muted">Total Needed</small>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <h6>Distribute Tokens to All Voters</h6>
                  <p className="small text-muted">
                    Send voting tokens to all registered voters at once. Do this before each election.
                  </p>
                  
                  <div className="mb-3">
                    <label className="form-label">Tokens per voter:</label>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        value={tokensPerUser}
                        onChange={(e) => setTokensPerUser(e.target.value)}
                        step="0.000001"
                        min="0"
                      />
                      <span className="input-group-text">VOTE</span>
                    </div>
                  </div>

                  <div className="d-grid gap-2">
                    <Button 
                      variant="success" 
                      onClick={handleBulkMintTokens}
                      disabled={loading || registeredVoters.length === 0 || parseFloat(ownerBalance) < (registeredVoters.length * parseFloat(tokensPerUser))}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Distributing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send-fill me-2"></i>
                          Send Tokens to All Voters ({registeredVoters.length})
                        </>
                      )}
                    </Button>

                    {parseFloat(ownerBalance) < (registeredVoters.length * parseFloat(tokensPerUser)) && (
                      <small className="text-danger">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Insufficient admin balance. Need {((registeredVoters.length * parseFloat(tokensPerUser)) - parseFloat(ownerBalance)).toFixed(6)} more tokens.
                      </small>
                    )}
                  </div>
                </div>

                <div className="col-md-6">
                  <h6>Send Tokens to Individual Voter</h6>
                  <p className="small text-muted">
                    Send tokens to a specific voter address manually.
                  </p>
                  
                  <form onSubmit={handleMintTokens}>
                    <div className="mb-3">
                      <label className="form-label">Voter Address:</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="0x..."
                        value={voterAddress}
                        onChange={(e) => setVoterAddress(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="d-grid">
                      <Button 
                        type="submit" 
                        variant="primary"
                        disabled={loading || !voterAddress.trim()}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Sending...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-send me-2"></i>
                            Send {tokensPerUser} Tokens
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </Card>
          </div>

          {/* Registered Voters List */}
          <div className="col-12">
            <Card title="👥 Registered Voters">
              {registeredVoters.length > 0 ? (
                <>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Total: {registeredVoters.length} voters</h6>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => fetchContractData()}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Refresh
                      </Button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th>Wallet Address</th>
                          <th>Token Balance</th>
                          <th>Registration Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registeredVoters.map((voterAddr, index) => (
                          <VoterRow 
                            key={voterAddr} 
                            index={index + 1}
                            address={voterAddr}
                            contract={contract}
                            onSendTokens={(addr) => {
                              setVoterAddress(addr);
                              setActiveTab('voters');
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="alert alert-success mt-3" role="alert">
                    <i className="bi bi-lightbulb me-2"></i>
                    <strong>Tip:</strong> Before each election, use "Send Tokens to All Voters" to ensure everyone can participate.
                  </div>
                </>
              ) : (                <div className="text-center py-4">
                  <i className="bi bi-people fs-1 text-muted mb-3"></i>
                  <h5>No Registered Voters Yet</h5>
                  <p className="text-muted">
                    Users will automatically register when they connect their wallets to the voting page. 
                    Once they connect, they'll appear here for token distribution.
                  </p>
                  <div className="alert alert-info" role="alert">
                    <i className="bi bi-lightbulb me-2"></i>
                    <strong>How it works:</strong> When users visit the voting page and connect their MetaMask, 
                    they'll be prompted to register automatically. No manual forms needed!
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for voter rows
const VoterRow: React.FC<{
  index: number;
  address: string;
  contract: any;
  onSendTokens: (address: string) => void;
}> = ({ index, address, contract, onSendTokens }) => {
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, [address, contract]);

  const fetchBalance = async () => {
    if (!contract || !address) return;
    
    try {
      const bal = await contract.balanceOf(address);
      setBalance(ethers.utils.formatEther(bal));
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('Error');
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <tr>
      <td>{index}</td>
      <td>
        <code className="small">{truncateAddress(address)}</code>
        <br />
        <small className="text-muted">{address}</small>
      </td>
      <td>
        {loading ? (
          <span className="spinner-border spinner-border-sm"></span>
        ) : (
          <span className={`badge ${parseFloat(balance) > 0 ? 'bg-success' : 'bg-warning'}`}>
            {parseFloat(balance).toFixed(6)} VOTE
          </span>
        )}
      </td>
      <td>
        <span className="badge bg-info">
          <i className="bi bi-check-circle me-1"></i>
          Registered
        </span>
      </td>
      <td>
        <Button 
          variant="outline-primary" 
          size="sm"
          onClick={() => onSendTokens(address)}
        >
          <i className="bi bi-send me-1"></i>
          Send Tokens
        </Button>
      </td>
    </tr>
  );
};

export default Admin;