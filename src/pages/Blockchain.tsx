import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '../utils/constants';

interface VoteTransaction {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  voter: string;
  candidate: string;
  electionName: string; // Will be populated more accurately
  gasUsed: string;
  blockHash: string;
  previousBlockHash: string; // True parent hash of the block
}

interface TokenTransaction {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  amount: string;
  type: 'mint' | 'transfer';
  gasUsed: string;
}

const Blockchain: React.FC = () => {
  const { contract } = useContract();
  const { account, isConnected } = useWallet();
  const [voteTransactions, setVoteTransactions] = useState<VoteTransaction[]>([]);
  const [tokenTransactions, setTokenTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'votes' | 'tokens'>('votes');
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [selectedElectionForFlow, setSelectedElectionForFlow] = useState<string>(''); // '' for All Elections

  useEffect(() => {
    if (window.ethereum && contract) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
      fetchVotingTransactions(web3Provider);
      fetchTokenTransactions(web3Provider);
    }
  }, [contract]);

  const fetchVotingTransactions = async (web3ProviderParam?: ethers.providers.Web3Provider) => {
    if (!contract) return;

    const activeProvider = web3ProviderParam || provider;
    if (!activeProvider) return;

    setLoading(true);
    try {
      console.log('🗳️ Fetching voting transactions...');

      const electionDetailsMap = new Map<string, string>();
      try {
        const currentId = await contract.idEleccionActual();
        const currentName = await contract.nombreEleccionActual();
        electionDetailsMap.set(currentId.toString(), currentName);
      } catch (e) {
        console.error("Error fetching current election details:", e);
      }

      let historyIdx = 0;
      let continueFetchingHistory = true;
      while (continueFetchingHistory && historyIdx < 20) { // Limit fetching past elections
        try {
          const pastElection = await contract.historialElecciones(historyIdx);
          if (pastElection && pastElection.id && pastElection.nombre) {
            electionDetailsMap.set(pastElection.id.toString(), pastElection.nombre);
            historyIdx++;
          } else {
            continueFetchingHistory = false; // Stop if data seems invalid
          }
        } catch (e) {
          continueFetchingHistory = false; // Stop on error (likely out of bounds)
        }
      }

      const filter = contract.filters.VotoEmitido();
      const events = await contract.queryFilter(filter, -2000);

      const voteData: VoteTransaction[] = [];

      for (const event of events) {
        try {
          const block = await activeProvider.getBlock(event.blockNumber);
          const receipt = await activeProvider.getTransactionReceipt(event.transactionHash);
          const parsedEvent = contract.interface.parseLog(event);
          
          const eventElectionId = parsedEvent.args.idEleccion.toString();
          const determinedElectionName = electionDetailsMap.get(eventElectionId) || `Election ID ${eventElectionId}`;
          
          voteData.push({
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block.timestamp,
            voter: parsedEvent.args.votante,
            candidate: parsedEvent.args.candidato,
            electionName: determinedElectionName,
            gasUsed: ethers.utils.formatUnits(receipt.gasUsed, 'gwei'),
            blockHash: block.hash,
            previousBlockHash: block.parentHash 
          });
        } catch (error) {
          console.error('Error processing vote event:', error);
        }
      }

      voteData.sort((a, b) => b.blockNumber - a.blockNumber);
      setVoteTransactions(voteData);

    } catch (error) {
      console.error('❌ Error fetching voting transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenTransactions = async (web3ProviderParam?: ethers.providers.Web3Provider) => {
    if (!contract) return;

    const activeProvider = web3ProviderParam || provider; // Corrected variable name
    if (!activeProvider) return;

    try {
      console.log('💰 Fetching token transactions...');

      // Obtener eventos de transferencia de tokens
      const transferFilter = contract.filters.Transfer();
      const transferEvents = await contract.queryFilter(transferFilter, -2000);

      const tokenData: TokenTransaction[] = [];

      for (const event of transferEvents) {
        try {
          const block = await activeProvider.getBlock(event.blockNumber);
          const receipt = await activeProvider.getTransactionReceipt(event.transactionHash);
          const parsedEvent = contract.interface.parseLog(event);

          const from = parsedEvent.args.from;
          const to = parsedEvent.args.to;
          const amount = ethers.utils.formatEther(parsedEvent.args.value);
          
          // Determinar tipo de transacción
          const isMint = from === ethers.constants.AddressZero;
          
          tokenData.push({
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block.timestamp,
            from: from,
            to: to,
            amount: amount,
            type: isMint ? 'mint' : 'transfer',
            gasUsed: ethers.utils.formatUnits(receipt.gasUsed, 'gwei')
          });
        } catch (error) {
          console.error('Error processing token event:', error);
        }
      }

      tokenData.sort((a, b) => b.blockNumber - a.blockNumber);
      setTokenTransactions(tokenData);

    } catch (error) {
      console.error('❌ Error fetching token transactions:', error);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const truncateHash = (hash: string, start = 6, end = 4): string => {
    return `${hash.slice(0, start)}...${hash.slice(-end)}`;
  };

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const uniqueElectionNames = ['', ...Array.from(new Set(voteTransactions.map(v => v.electionName))).sort()];

  // Prepare votes for the flow visualization
  const filteredFlowVotes = selectedElectionForFlow
    ? voteTransactions.filter(v => v.electionName === selectedElectionForFlow)
    : voteTransactions;
  
  // Take the 5 newest votes from the filtered list and then reverse them 
  // so the oldest of these 5 is first, and newest is last for left-to-right chronological flow.
  const displayedFlowVotes = filteredFlowVotes.slice(0, 5).reverse();

  return (
    <div className="container">
      <div className="row">
        <div className="col-12 mb-4">          <h1 className="display-5 fw-bold text-center">Explorador de Blockchain de Votación</h1>
          <p className="text-center text-muted">
            Rastrea todas las transacciones de votación y distribución de tokens en la blockchain
          </p>
        </div>
      </div>

      {/* Stats Header */}
      <div className="row mb-4">
        <div className="col-md-3">          <Card title="Total de Votos Emitidos">
            <div className="text-center">
              <h3 className="text-primary">{voteTransactions.length}</h3>
              <small className="text-muted">Votos Registrados</small>
            </div>
          </Card>
        </div>
        <div className="col-md-3">          <Card title="Transferencias de Tokens">
            <div className="text-center">
              <h3 className="text-success">{tokenTransactions.length}</h3>
              <small className="text-muted">Movimientos de Tokens</small>
            </div>
          </Card>
        </div>
        <div className="col-md-3">          <Card title="Dirección del Contrato">
            <div className="text-center">
              <h6 className="text-info">{truncateAddress(CONTRACT_ADDRESS)}</h6>
              <small className="text-muted">Contrato de Votación</small>
            </div>
          </Card>
        </div>
        <div className="col-md-3">
          <div className="d-grid">
            <Button 
              variant="primary" 
              onClick={() => {
                fetchVotingTransactions();
                fetchTokenTransactions();
              }}
              disabled={loading}
              className="h-100"
            >              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Actualizando...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Actualizar Datos
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-pills nav-justified">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'votes' ? 'active' : ''}`}
                onClick={() => setActiveTab('votes')}
              >                <i className="bi bi-check-circle me-2"></i>
                Transacciones de Votos ({voteTransactions.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'tokens' ? 'active' : ''}`}
                onClick={() => setActiveTab('tokens')}
              >                <i className="bi bi-coin me-2"></i>
                Transacciones de Tokens ({tokenTransactions.length})
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Vote Transactions Tab */}
      {activeTab === 'votes' && (
        <div className="row">
          <div className="col-12">
            <Card title="Historial de Transacciones de Votación">
              {loading ? (                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-3">Cargando transacciones de votación...</p>
                </div>
              ) : voteTransactions.length === 0 ? (                <div className="text-center py-4">
                  <i className="bi bi-ballot fs-1 text-muted mb-3"></i>
                  <h5>No se han Emitido Votos Aún</h5>
                  <p className="text-muted">Cuando los usuarios emitan votos, aparecerán aquí con total transparencia de blockchain.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">                    <thead className="table-dark">
                      <tr>
                        <th>Bloque #</th>
                        <th>Hash de Transacción</th>
                        <th>Fecha y Hora</th>
                        <th>Votante</th>
                        <th>Candidato</th>
                        <th>Elección</th>
                        <th>Gas Usado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voteTransactions.map((vote, index) => (
                        <tr key={vote.transactionHash}>
                          <td>
                            <strong className="text-primary">#{vote.blockNumber}</strong>
                          </td>
                          <td>
                            <code className="text-info">{truncateHash(vote.transactionHash)}</code>
                          </td>
                          <td>
                            <small>{formatTimestamp(vote.timestamp)}</small>
                          </td>
                          <td>
                            <code className="text-secondary">{truncateAddress(vote.voter)}</code>
                          </td>
                          <td>
                            <span className="badge bg-success">{vote.candidate}</span>
                          </td>
                          <td>
                            <span className="text-muted">{vote.electionName}</span>
                          </td>
                          <td>
                            <small>{parseFloat(vote.gasUsed).toFixed(2)} Gwei</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Token Transactions Tab */}
      {activeTab === 'tokens' && (
        <div className="row">
          <div className="col-12">
            <Card title="Historial de Distribución de Tokens">
              {loading ? (                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-3">Cargando transacciones de tokens...</p>
                </div>
              ) : tokenTransactions.length === 0 ? (                <div className="text-center py-4">
                  <i className="bi bi-coin fs-1 text-muted mb-3"></i>
                  <h5>No hay Transacciones de Tokens Aún</h5>
                  <p className="text-muted">Las acuñaciones y transferencias de tokens aparecerán aquí.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">                    <thead className="table-dark">
                      <tr>
                        <th>Bloque #</th>
                        <th>Hash de Transacción</th>
                        <th>Fecha y Hora</th>
                        <th>Tipo</th>
                        <th>De</th>
                        <th>Para</th>
                        <th>Cantidad</th>
                        <th>Gas Usado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenTransactions.map((token, index) => (
                        <tr key={token.transactionHash}>
                          <td>
                            <strong className="text-primary">#{token.blockNumber}</strong>
                          </td>
                          <td>
                            <code className="text-info">{truncateHash(token.transactionHash)}</code>
                          </td>
                          <td>
                            <small>{formatTimestamp(token.timestamp)}</small>
                          </td>                          <td>
                            <span className={`badge ${token.type === 'mint' ? 'bg-success' : 'bg-primary'}`}>
                              {token.type === 'mint' ? 'ACUÑAR' : 'TRANSFERIR'}
                            </span>
                          </td>
                          <td>
                            <code className="text-secondary">
                              {token.from === ethers.constants.AddressZero ? 'SISTEMA' : truncateAddress(token.from)}
                            </code>
                          </td>
                          <td>
                            <code className="text-secondary">{truncateAddress(token.to)}</code>
                          </td>
                          <td>
                            <strong>{parseFloat(token.amount).toFixed(2)} VOTE</strong>
                          </td>
                          <td>
                            <small>{parseFloat(token.gasUsed).toFixed(2)} Gwei</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Blockchain Flow Visualization for Votes */}
      {activeTab === 'votes' && voteTransactions.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <Card title="Visualización de Flujo de Votos">              <div className="mb-3">
                <label htmlFor="electionFlowFilter" className="form-label">Filtrar por Elección:</label>
                <select 
                  id="electionFlowFilter"
                  className="form-select"
                  value={selectedElectionForFlow}
                  onChange={(e) => setSelectedElectionForFlow(e.target.value)}
                >
                  {uniqueElectionNames.map(name => (
                    <option key={name || 'all'} value={name}>
                      {name || 'Todas las Elecciones'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="d-flex overflow-auto pb-3" style={{ minHeight: '200px' }}>
                {displayedFlowVotes.map((vote, index, arr) => {
                  // In the reversed array (oldest to newest), the chronologically previous vote is arr[index - 1]
                  const chronologicallyPreviousVoteInFlow = arr[index - 1]; 
                  return (
                    <div key={vote.transactionHash} className="d-flex align-items-center flex-shrink-0">
                      <div 
                        className="border rounded p-3 text-center border-success bg-success-subtle"
                        style={{ minWidth: '280px' }} 
                      >                        {/* Vote numbering reflects position in the displayed sequence (1 to N) */}
                        <div className="fw-bold">Voto #{index + 1} (Secuencia)</div>
                        <div className="small text-muted mb-1">{formatTimestamp(vote.timestamp)}</div>
                        <div className="small text-start"> 
                          <div><strong>Elección:</strong> {vote.electionName}</div>
                          <div><strong>Bloque:</strong> #{vote.blockNumber}</div>
                          <div><strong>Votante:</strong> {truncateAddress(vote.voter)}</div>
                          <div><strong>Candidato:</strong> {vote.candidate}</div>
                          <div><strong>Hash:</strong> {truncateHash(vote.blockHash, 6, 4)}</div>
                          <div>
                            <strong>Hash Ant. (Enlace):</strong> {chronologicallyPreviousVoteInFlow ? truncateHash(chronologicallyPreviousVoteInFlow.blockHash, 6, 4) : 'N/A'}
                          </div>
                          <div style={{ fontSize: '0.75em', opacity: 0.7 }}>
                            Hash Bloque Ant. Real: {truncateHash(vote.previousBlockHash, 6, 4)}
                          </div>
                        </div>
                        <div className="mt-2">
                          <code className="small">{truncateHash(vote.transactionHash, 10, 6)}</code>
                        </div>
                      </div>
                      
                      {/* Arrow points from current (older) to next (newer) in sequence */}
                      {index < arr.length - 1 && index < 4 && ( 
                        <div className="mx-3">
                          <i className="bi bi-arrow-right fs-4 text-success"></i>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>              <div className="mt-3 text-center">
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Esto muestra el flujo cronológico de votos emitidos en tu sistema de elecciones.
                  Cada voto queda registrado permanentemente en la blockchain para transparencia.
                </small>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blockchain;