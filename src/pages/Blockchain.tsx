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
  electionName: string;
  gasUsed: string;
  blockHash: string;
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

  useEffect(() => {
    if (window.ethereum && contract) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
      fetchVotingTransactions(web3Provider);
      fetchTokenTransactions(web3Provider);
    }
  }, [contract]);

  const fetchVotingTransactions = async (web3Provider?: ethers.providers.Web3Provider) => {
    if (!contract) return;

    const activeProvider = web3Provider || provider;
    if (!activeProvider) return;

    setLoading(true);
    try {
      console.log('🗳️ Fetching voting transactions...');

      // Obtener eventos de votación desde el contrato
      const filter = contract.filters.VotoCastado();
      const events = await contract.queryFilter(filter, -2000); // Últimos 2000 bloques

      const voteData: VoteTransaction[] = [];

      for (const event of events) {
        try {
          const block = await activeProvider.getBlock(event.blockNumber);
          const receipt = await activeProvider.getTransactionReceipt(event.transactionHash);
          
          // Obtener información adicional del evento
          const parsedEvent = contract.interface.parseLog(event);
          
          voteData.push({
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block.timestamp,
            voter: parsedEvent.args.votante,
            candidate: parsedEvent.args.candidato,
            electionName: parsedEvent.args.eleccion || 'Unknown Election',
            gasUsed: ethers.utils.formatUnits(receipt.gasUsed, 'gwei'),
            blockHash: block.hash
          });
        } catch (error) {
          console.error('Error processing vote event:', error);
        }
      }

      // Ordenar por bloque más reciente primero
      voteData.sort((a, b) => b.blockNumber - a.blockNumber);
      setVoteTransactions(voteData);

    } catch (error) {
      console.error('❌ Error fetching voting transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenTransactions = async (web3Provider?: ethers.providers.Web3Provider) => {
    if (!contract) return;

    const activeProvider = webProvider || provider;
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

  return (
    <div className="container">
      <div className="row">
        <div className="col-12 mb-4">
          <h1 className="display-5 fw-bold text-center">Voting Blockchain Explorer</h1>
          <p className="text-center text-muted">
            Track all voting transactions and token distributions on the blockchain
          </p>
        </div>
      </div>

      {/* Stats Header */}
      <div className="row mb-4">
        <div className="col-md-3">
          <Card title="Total Votes Cast">
            <div className="text-center">
              <h3 className="text-primary">{voteTransactions.length}</h3>
              <small className="text-muted">Votes Recorded</small>
            </div>
          </Card>
        </div>
        <div className="col-md-3">
          <Card title="Token Transfers">
            <div className="text-center">
              <h3 className="text-success">{tokenTransactions.length}</h3>
              <small className="text-muted">Token Movements</small>
            </div>
          </Card>
        </div>
        <div className="col-md-3">
          <Card title="Contract Address">
            <div className="text-center">
              <h6 className="text-info">{truncateAddress(CONTRACT_ADDRESS)}</h6>
              <small className="text-muted">Voting Contract</small>
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
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Refreshing...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Refresh Data
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
              >
                <i className="bi bi-check-circle me-2"></i>
                Vote Transactions ({voteTransactions.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'tokens' ? 'active' : ''}`}
                onClick={() => setActiveTab('tokens')}
              >
                <i className="bi bi-coin me-2"></i>
                Token Transactions ({tokenTransactions.length})
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Vote Transactions Tab */}
      {activeTab === 'votes' && (
        <div className="row">
          <div className="col-12">
            <Card title="Voting Transaction History">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading voting transactions...</p>
                </div>
              ) : voteTransactions.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-ballot fs-1 text-muted mb-3"></i>
                  <h5>No Votes Cast Yet</h5>
                  <p className="text-muted">When users cast votes, they will appear here with full blockchain transparency.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>Block #</th>
                        <th>Transaction Hash</th>
                        <th>Timestamp</th>
                        <th>Voter</th>
                        <th>Candidate</th>
                        <th>Election</th>
                        <th>Gas Used</th>
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
            <Card title="Token Distribution History">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading token transactions...</p>
                </div>
              ) : tokenTransactions.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-coin fs-1 text-muted mb-3"></i>
                  <h5>No Token Transactions Yet</h5>
                  <p className="text-muted">Token minting and transfers will appear here.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>Block #</th>
                        <th>Transaction Hash</th>
                        <th>Timestamp</th>
                        <th>Type</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Amount</th>
                        <th>Gas Used</th>
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
                          </td>
                          <td>
                            <span className={`badge ${token.type === 'mint' ? 'bg-success' : 'bg-primary'}`}>
                              {token.type === 'mint' ? 'MINT' : 'TRANSFER'}
                            </span>
                          </td>
                          <td>
                            <code className="text-secondary">
                              {token.from === ethers.constants.AddressZero ? 'SYSTEM' : truncateAddress(token.from)}
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
            <Card title="Vote Flow Visualization">
              <div className="d-flex overflow-auto pb-3" style={{ minHeight: '200px' }}>
                {voteTransactions.slice(0, 5).map((vote, index) => (
                  <div key={vote.transactionHash} className="d-flex align-items-center flex-shrink-0">
                    <div 
                      className="border rounded p-3 text-center border-success bg-success-subtle"
                      style={{ minWidth: '250px' }}
                    >
                      <div className="fw-bold">Vote #{voteTransactions.length - index}</div>
                      <div className="small text-muted mb-2">{formatTimestamp(vote.timestamp)}</div>
                      <div className="small">
                        <div><strong>Block:</strong> #{vote.blockNumber}</div>
                        <div><strong>Voter:</strong> {truncateAddress(vote.voter)}</div>
                        <div><strong>Candidate:</strong> {vote.candidate}</div>
                      </div>
                      <div className="mt-2">
                        <code className="small">{truncateHash(vote.transactionHash, 10, 6)}</code>
                      </div>
                    </div>
                    
                    {index < Math.min(4, voteTransactions.length - 1) && (
                      <div className="mx-3">
                        <i className="bi bi-arrow-right fs-4 text-success"></i>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  This shows the chronological flow of votes cast in your election system.
                  Each vote is permanently recorded on the blockchain for transparency.
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