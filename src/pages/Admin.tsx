import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ethers } from 'ethers';
import { ElectionTabContent } from '../components/AdminTabs/ElectionTabContent';
import { CandidatesTabContent } from '../components/AdminTabs/CandidatesTabContent'; // Import CandidatesTabContent
import { ElectionHistoryTabContent } from '../components/AdminTabs/ElectionHistoryTabContent'; // Import ElectionHistoryTabContent
import { TokenDistributionTabContent } from '../components/AdminTabs/TokenDistributionTabContent'; // Import TokenDistributionTabContent

// Dirección del admin autorizado
const ADMIN_ADDRESS = '0x991857199BD2aE867AbCf240716493D4ef370426';

interface Election {
  id: number;
  name: string;
  isActive: boolean;
  totalVotes: number;
  isCurrent?: boolean; // Added for ElectionHistoryTab
}

const Admin: React.FC = () => {
  const { contract } = useContract();
  const { account, isConnected, web3 } = useWallet();
  const [activeTab, setActiveTab] = useState('elections');

  const [loading, setLoading] = useState(false);
  const [currentElection, setCurrentElection] = useState<Election>({
    id: 0,
    name: '',
    isActive: false,
    totalVotes: 0
  });
  const [candidates, setCandidates] = useState<string[]>([]);
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  // const [voterAddress, setVoterAddress] = useState(''); // Will be moved to TokenTab
  const [autoMintEnabled, setAutoMintEnabled] = useState(false); // May move to TokenTab
  // const [tokensPerUser, setTokensPerUser] = useState('0.0003'); // Will be moved to TokenTab
  const [registeredVoters, setRegisteredVoters] = useState<string[]>([]); // May move to TokenTab
  const [ownerBalance, setOwnerBalance] = useState<string>('0'); // May move to TokenTab
  // const [tokensNeeded, setTokensNeeded] = useState<string>('0'); // Will be moved to TokenTab
  const [electionHistory, setElectionHistory] = useState<Election[]>([]);
  const [adminSepoliaEthBalance, setAdminSepoliaEthBalance] = useState<string>('0');
  // const [sendEthAddress, setSendEthAddress] = useState<string>(''); // Will be moved to TokenTab
  // const [sendEthAmount, setSendEthAmount] = useState<string>('0.001'); // Will be moved to TokenTab
  // const [isSendingEth, setIsSendingEth] = useState<boolean>(false); // Will be moved to TokenTab

  // State for tokensNeeded, as it's fetched in Admin.tsx but used in TokenDistributionTabContent
  const [tokensNeeded, setTokensNeeded] = useState<string>('0');

  const isAdmin = useMemo(() => !!(account && account.toLowerCase() === ADMIN_ADDRESS.toLowerCase()), [account]);

  const ethersProvider = useMemo(() => {
    if (web3?.currentProvider) {
      return new ethers.providers.Web3Provider(web3.currentProvider as any);
    }
    if (window.ethereum) {
      return new ethers.providers.Web3Provider(window.ethereum as any);
    }
    return null;
  }, [web3]);

  const fetchAdminEthBalance = useCallback(async () => {
    if (isAdmin && isConnected && ethersProvider && account) {
      try {
        const balance = await ethersProvider.getBalance(account);
        setAdminSepoliaEthBalance(ethers.utils.formatEther(balance));
      } catch (error) {
        console.error("Error fetching admin ETH balance:", error);
        setAdminSepoliaEthBalance('Error');
      }
    } else {
      setAdminSepoliaEthBalance('0');
    }
  }, [isAdmin, isConnected, ethersProvider, account]);

  const checkOwnerBalance = useCallback(() => {
    const ownerBal = parseFloat(ownerBalance);
    const needed = parseFloat(tokensNeeded);
    if (needed > ownerBal && registeredVoters.length > 0) { // Also check if there are registered voters
      alert(`⚠️ Advertencia: El propietario no tiene suficientes tokens VOTE para distribuir a todos los usuarios registrados!\n\nBalance actual del propietario: ${ownerBal.toFixed(6)} ${tokenSymbol}\nTokens necesarios para todos los usuarios: ${needed.toFixed(6)} ${tokenSymbol}\nFaltante: ${(needed - ownerBal).toFixed(6)} ${tokenSymbol}\n\nEl propietario necesita más tokens VOTE para poder usar las funciones de distribución masiva o individual si se depende del balance del propietario.`);
      return false;
    }
    return true;
  }, [ownerBalance, tokensNeeded, tokenSymbol, registeredVoters.length]);

  const fetchContractData = useCallback(async () => {
    if (!contract) {
      console.log('❌ No contract available');
      return;
    }
    setLoading(true);
    try {
      console.log('🔄 Fetching contract data...');
      
      const name = await contract.name();
      const symbol = await contract.symbol();
      setTokenName(name);
      setTokenSymbol(symbol);

      if (account) {
        const balance = await contract.balanceOf(account);
        setTokenBalance(ethers.utils.formatEther(balance));
      }

      try {
        const autoMintStatus = await contract.autoMintEnabled();
        setAutoMintEnabled(autoMintStatus);
      } catch (error) {
        console.log('⚠️ Auto-mint status not available or contract version mismatch');
      }

      // Variables locales para los detalles de la elección actual en vivo
      let liveElectionId = 0;
      let liveElectionName = '';
      let liveElectionIsActive = false;
      let liveElectionTotalVotes = 0;

      try {
        const electionIdBigNum = await contract.idEleccionActual();
        liveElectionId = electionIdBigNum.toNumber();

        if (liveElectionId > 0) {
          liveElectionName = await contract.nombreEleccionActual();
          liveElectionIsActive = await contract.votacionActiva();
          const totalVotesBigNum = await contract.obtenerVotosTotales(); // Obtiene votos para la elección actual
          liveElectionTotalVotes = totalVotesBigNum.toNumber();
        }
      } catch (e) {
        console.error("Error fetching live details for current election:", e);
      }
      
      setCurrentElection({
        id: liveElectionId,
        name: liveElectionName,
        isActive: liveElectionIsActive,
        totalVotes: liveElectionTotalVotes,
        isCurrent: liveElectionId > 0 
      });

      try {
        const candidatesList = await contract.obtenerCandidatos();
        setCandidates(candidatesList);
      } catch (candidatesError) {
        console.log('⚠️ No candidates available:', candidatesError);
        setCandidates([]);
      }

      try {
        const votersList = await contract.obtenerVotantesRegistrados();
        setRegisteredVoters(votersList);
      } catch (votersError) {
        console.log('⚠️ No voters data available:', votersError);
        setRegisteredVoters([]);
      }

      try {
        const historialData: Election[] = [];
        const maxElectionIdToIterate = liveElectionId; // Usar el ID de la elección actual obtenida

        for (let i = 1; i <= maxElectionIdToIterate; i++) {
          let electionEntryName = `Elección ${i}`;
          let electionEntryIsActive = false;
          let electionEntryTotalVotes = 0;
          const isCurrentLoop = (i === liveElectionId);

          if (isCurrentLoop && liveElectionId > 0) {
            electionEntryName = liveElectionName;
            electionEntryIsActive = liveElectionIsActive;
            electionEntryTotalVotes = liveElectionTotalVotes;
          } else {
            // Para elecciones pasadas, necesitarías una forma de obtener sus detalles del contrato.
            // Esto es una limitación si el contrato no guarda/expone nombres y votos finales por ID.
            // Por ahora, usaremos marcadores de posición.
            try {
              // Ejemplo si tu contrato tuviera `nombreEleccionPorId`:
              // const pastElectionNameFromContract = await contract.nombreEleccionPorId(i);
              // electionEntryName = pastElectionNameFromContract || `Elección ${i} (Histórica)`;
              // const pastVotesBigNum = await contract.obtenerVotosEleccionPasada(i); // Necesitarías esta función
              // electionEntryTotalVotes = pastVotesBigNum.toNumber();
              electionEntryName = `Elección ${i} (Histórica)`; // Marcador de posición
              electionEntryIsActive = false; // Las elecciones pasadas están inactivas
              electionEntryTotalVotes = 0;   // Marcador de posición - el contrato necesita proveer esto
            } catch (pastError) {
              console.log(`⚠️ No se pudieron obtener datos completos para la elección pasada ${i}.`, pastError);
              electionEntryName = `Elección ${i} (Error)`;
              electionEntryIsActive = false;
              electionEntryTotalVotes = 0;
            }
          }

          historialData.push({
            id: i,
            name: electionEntryName,
            isActive: electionEntryIsActive,
            totalVotes: electionEntryTotalVotes,
            isCurrent: isCurrentLoop
          });
        }
        setElectionHistory(historialData.sort((a, b) => b.id - a.id)); // Mostrar las más nuevas primero
      } catch (historyError) {
        console.log('⚠️ Error fetching election history details:', historyError);
        setElectionHistory([]);
      }

      try {
        const ownerBal = await contract.balancePropietario();
        setOwnerBalance(ethers.utils.formatEther(ownerBal));
        const tokensNeed = await contract.tokensNecesariosParaTodos();
        setTokensNeeded(ethers.utils.formatEther(tokensNeed));
      } catch (ownerError) {
        console.log('⚠️ No owner balance data available:', ownerError);
        setOwnerBalance('0');
        setTokensNeeded('0');
      }

    } catch (error) {
      console.error('❌ Error fetching contract data:', error);
      // Reset states if there's a major error
      setCurrentElection({ id: 0, name: '', isActive: false, totalVotes: 0, isCurrent: false });
      setCandidates([]);
      setRegisteredVoters([]);
      setElectionHistory([]);
      setTokenBalance('0');
      setTokenName('');
      setTokenSymbol('');
      setAutoMintEnabled(false);
      setOwnerBalance('0');
      setTokensNeeded('0');
    } finally {
      setLoading(false);
    }
  }, [contract, account, ethersProvider, fetchAdminEthBalance]); // Asegúrate de que las dependencias sean correctas

  useEffect(() => {
    if (contract && isConnected) {
      fetchContractData();
    }
  }, [contract, isConnected, fetchContractData]);

  useEffect(() => {
    if (isAdmin && isConnected && account && ethersProvider) {
      fetchAdminEthBalance();
      // Consider making this interval configurable or less frequent if performance is an issue
      const intervalId = setInterval(fetchAdminEthBalance, 7000); // e.g., every 7 seconds
      return () => clearInterval(intervalId);
    } else {
      setAdminSepoliaEthBalance('0');
    }
  }, [isAdmin, isConnected, account, ethersProvider, fetchAdminEthBalance]);


  // REMOVE: handleSendSepoliaEth - moved to TokenDistributionTabContent
  // const handleSendSepoliaEth = async (e: React.FormEvent) => { ... };

  // ... Other handlers like handleAddCandidate, handleMintTokens, etc., will be moved to their respective tab components later
  // For example, handleCreateElection and handleToggleVoting are now in ElectionTabContent.tsx
  if (!isConnected) {
    return (
      <div className="container">
        <div className="row">
          <div className="col-md-6 mx-auto">
            <Card title="Acceso de Administrador Requerido">
              <div className="text-center">
                <i className="bi bi-shield-lock fs-1 text-muted mb-3"></i>
                <p className="lead">Por favor, conecta tu billetera para acceder al panel de administración</p>
                <small className="text-muted">Solo las cuentas de administrador autorizadas pueden acceder a esta área</small>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  if (isConnected && !isAdmin) {
    return (
      <div className="container">
        <div className="row">
          <div className="col-md-8 mx-auto">
            <Card title="Acceso Denegado">
              <div className="text-center">
                <i className="bi bi-shield-exclamation fs-1 text-danger mb-3"></i>
                <h4 className="text-danger">Acceso no Autorizado</h4>
                <p className="lead">No tienes permiso para acceder al Panel de Administración.</p>
                <div className="alert alert-warning" role="alert">
                  <strong>Cuenta Actual:</strong> <code>{account}</code><br/>
                  <strong>Cuenta Requerida:</strong> <code>{ADMIN_ADDRESS}</code>
                </div>
                <p className="text-muted">Solo la cuenta de administrador autorizada puede gestionar elecciones, candidatos y la distribución de tokens. Por favor, conéctate con la billetera de administrador correcta.</p>
                <div className="d-grid gap-2 col-md-6 mx-auto">
                  <Button variant="primary" onClick={() => window.location.href = '/voting'}><i className="bi bi-arrow-left me-2"></i>Ir a la Página de Votación</Button>
                  <Button variant="outline-secondary" onClick={() => window.location.href = '/'}><i className="bi bi-house me-2"></i>Ir al Inicio</Button>
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
      <div className="row">        <div className="col-12 mb-4">
          <h1 className="display-5 fw-bold text-center">Panel de Administración</h1>
          <div className="text-center">
            <small className="text-muted">Conectado como: {account}</small>
            <span className="badge bg-success ms-2">✅ ADMINISTRADOR AUTORIZADO</span>
            {/* <br />
            <small className="text-muted">{tokenName} ({tokenSymbol}) Balance: {parseFloat(tokenBalance).toFixed(2)}</small> */}
            <br />
            <small className="text-muted">Balance SepoliaETH: {parseFloat(adminSepoliaEthBalance).toFixed(4)} ETH</small>
          </div>
        </div>
      </div>      {/* Tab Navigation */}
      <ul className="nav nav-tabs nav-fill mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'elections' ? 'active' : ''}`} 
            onClick={() => setActiveTab('elections')}
          >
            <i className="bi bi-ui-checks-grid me-2"></i>Elecciones
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'candidates' ? 'active' : ''}`} 
            onClick={() => setActiveTab('candidates')}
          >
            <i className="bi bi-people-fill me-2"></i>Candidatos
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'tokens' ? 'active' : ''}`} 
            onClick={() => setActiveTab('tokens')}
          >
            <i className="bi bi-coin me-2"></i>Distribución de Tokens
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} 
            onClick={() => setActiveTab('history')}
          >
            <i className="bi bi-clock-history me-2"></i>Historial de Elecciones
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      {activeTab === 'elections' && (
        <ElectionTabContent 
          contract={contract}
          isConnected={isConnected}
          isAdmin={isAdmin} // Now correctly a boolean
          currentElection={currentElection}
          fetchContractData={fetchContractData} // Pass the memoized version
          setLoading={setLoading}
          loading={loading}
        />
      )}

      {activeTab === 'candidates' && (
        <CandidatesTabContent
          contract={contract}
          isConnected={isConnected}
          isAdmin={isAdmin}
          candidates={candidates}
          fetchContractData={fetchContractData}
          setLoading={setLoading}
          loading={loading}
        />
      )}

      {activeTab === 'tokens' && (
        <TokenDistributionTabContent
          contract={contract}
          isConnected={isConnected}
          isAdmin={isAdmin}
          account={account}
          ethersProvider={ethersProvider}
          fetchContractData={fetchContractData}
          fetchAdminEthBalance={fetchAdminEthBalance}
          setLoading={setLoading}
          loading={loading}
          ownerBalance={ownerBalance}
          tokensNeeded={tokensNeeded}
          autoMintEnabled={autoMintEnabled}
          tokenSymbol={tokenSymbol}
          adminSepoliaEthBalance={adminSepoliaEthBalance}
          checkOwnerBalance={checkOwnerBalance} // Pass the checkOwnerBalance function
        />
      )}

      {activeTab === 'history' && (
        <ElectionHistoryTabContent 
          electionHistory={electionHistory}
          loading={loading} // Pass loading state
          fetchContractData={fetchContractData} // Pass refresh function
        />
      )}

    </div>
  );
};

export default Admin;