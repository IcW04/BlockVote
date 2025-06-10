import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '../utils/constants';

interface Transaction {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  type: 'vote' | 'token';
  data: any;
  gasUsed: string;
  from: string;
  to: string;
}

interface Block {
  blockNumber: number;
  timestamp: number;
  blockHash: string;
  previousHash?: string;
  transactions: Transaction[];
  nonce: number;
  difficulty: number;
  miner: string;
}

const Blockchain: React.FC = () => {
  const { contract } = useContract();
  const { account, isConnected } = useWallet();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'blocks' | 'transactions'>('blocks');
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);

  useEffect(() => {
    if (window.ethereum && contract) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
      fetchBlockchainData(web3Provider);
    }
  }, [contract]);

  const generateBlockHash = (block: Omit<Block, 'blockHash'>): string => {
    // Create a hash based on block content
    const content = `${block.blockNumber}${block.timestamp}${block.previousHash || ''}${JSON.stringify(block.transactions)}${block.nonce}`;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
  };
  const fetchBlockchainData = async (web3Provider?: ethers.providers.Web3Provider) => {
    if (!contract) return;

    const activeProvider = web3Provider || provider;
    if (!activeProvider) return;

    setLoading(true);
    try {
      console.log('🔗 Fetching blockchain data...');

      // Get all vote events
      const voteFilter = contract.filters.VotoCastado();
      const voteEvents = await contract.queryFilter(voteFilter, -2000);

      // Get all token transfer events
      const transferFilter = contract.filters.Transfer();
      const transferEvents = await contract.queryFilter(transferFilter, -2000);

      // Combine all transactions
      const allTxs: Transaction[] = [];

      // Process vote transactions
      for (const event of voteEvents) {
        try {
          const block = await activeProvider.getBlock(event.blockNumber);
          const receipt = await activeProvider.getTransactionReceipt(event.transactionHash);
          const tx = await activeProvider.getTransaction(event.transactionHash);
          const parsedEvent = contract.interface.parseLog(event);
          
          allTxs.push({
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block.timestamp,
            type: 'vote',
            data: {
              voter: parsedEvent.args.votante,
              candidate: parsedEvent.args.candidato,
              electionName: parsedEvent.args.eleccion || 'Unknown Election',
            },
            gasUsed: ethers.utils.formatUnits(receipt.gasUsed, 'gwei'),
            from: tx.from,
            to: tx.to || CONTRACT_ADDRESS
          });
        } catch (error) {
          console.error('Error processing vote event:', error);
        }
      }

      // Process token transactions
      for (const event of transferEvents) {
        try {
          const block = await activeProvider.getBlock(event.blockNumber);
          const receipt = await activeProvider.getTransactionReceipt(event.transactionHash);
          const tx = await activeProvider.getTransaction(event.transactionHash);
          const parsedEvent = contract.interface.parseLog(event);

          const from = parsedEvent.args.from;
          const to = parsedEvent.args.to;
          const amount = ethers.utils.formatEther(parsedEvent.args.value);
          const isMint = from === ethers.constants.AddressZero;
          
          allTxs.push({
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block.timestamp,
            type: 'token',
            data: {
              from: from,
              to: to,
              amount: amount,
              tokenType: isMint ? 'mint' : 'transfer'
            },
            gasUsed: ethers.utils.formatUnits(receipt.gasUsed, 'gwei'),
            from: tx.from,
            to: tx.to || CONTRACT_ADDRESS
          });
        } catch (error) {
          console.error('Error processing token event:', error);
        }
      }

      // Sort all transactions by block number
      allTxs.sort((a, b) => a.blockNumber - b.blockNumber);
      setAllTransactions(allTxs);

      // Group transactions by block number and create block structure
      const blockMap = new Map<number, Transaction[]>();
      
      for (const tx of allTxs) {
        if (!blockMap.has(tx.blockNumber)) {
          blockMap.set(tx.blockNumber, []);
        }
        blockMap.get(tx.blockNumber)!.push(tx);
      }

      // Create blocks with proper hashing
      const blockArray: Block[] = [];
      let previousHash: string | undefined = undefined;

      // Sort block numbers
      const sortedBlockNumbers = Array.from(blockMap.keys()).sort((a, b) => a - b);

      for (const blockNumber of sortedBlockNumbers) {
        const blockTransactions = blockMap.get(blockNumber)!;
        const firstTx = blockTransactions[0];
        
        // Get additional block info from the blockchain
        const blockInfo = await activeProvider.getBlock(blockNumber);
          const blockData: Omit<Block, 'blockHash'> = {
          blockNumber,
          timestamp: firstTx.timestamp,
          previousHash: blockNumber === sortedBlockNumbers[0] ? undefined : previousHash, // Genesis block has no previous hash
          transactions: blockTransactions,
          nonce: parseInt(blockInfo.nonce.toString()),
          difficulty: blockInfo.difficulty,
          miner: blockInfo.miner
        };

        const blockHash = generateBlockHash(blockData);
        
        const block: Block = {
          ...blockData,
          blockHash
        };

        blockArray.push(block);
        previousHash = blockHash; // Set this block's hash as previous for next block
      }

      setBlocks(blockArray);
      console.log(`🔗 Processed ${blockArray.length} blocks with ${allTxs.length} transactions`);

    } catch (error) {
      console.error('❌ Error fetching blockchain data:', error);
    } finally {
      setLoading(false);
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

  const getTransactionTypeIcon = (type: string, data: any) => {
    if (type === 'vote') {
      return <i className="bi bi-check-circle text-success"></i>;
    } else if (type === 'token') {
      return data.tokenType === 'mint' 
        ? <i className="bi bi-plus-circle text-primary"></i>
        : <i className="bi bi-arrow-right-circle text-info"></i>;
    }
    return <i className="bi bi-circle text-muted"></i>;
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-12 mb-4">
          <h1 className="display-5 fw-bold text-center">🔗 Blockchain Explorer</h1>
          <p className="text-center text-muted">
            Complete blockchain visualization with blocks, transactions, and cryptographic hashes
          </p>
        </div>
      </div>

      {/* Stats Header */}
      <div className="row mb-4">
        <div className="col-md-3">
          <Card title="Total Blocks">
            <div className="text-center">
              <h3 className="text-primary">{blocks.length}</h3>
              <small className="text-muted">Mined Blocks</small>
            </div>
          </Card>
        </div>
        <div className="col-md-3">
          <Card title="Total Transactions">
            <div className="text-center">
              <h3 className="text-success">{allTransactions.length}</h3>
              <small className="text-muted">All Transactions</small>
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
              onClick={() => fetchBlockchainData()}
              disabled={loading}
              className="h-100"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Scanning...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Refresh Blockchain
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
                className={`nav-link ${activeTab === 'blocks' ? 'active' : ''}`}
                onClick={() => setActiveTab('blocks')}
              >
                <i className="bi bi-box me-2"></i>
                Blockchain Blocks ({blocks.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`}
                onClick={() => setActiveTab('transactions')}
              >
                <i className="bi bi-list-ul me-2"></i>
                All Transactions ({allTransactions.length})
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Blocks Tab - Blockchain Visualization */}
      {activeTab === 'blocks' && (
        <div className="row">
          <div className="col-12">
            {loading ? (
              <Card title="Loading Blockchain...">
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Scanning blockchain for blocks and transactions...</p>
                </div>
              </Card>
            ) : blocks.length === 0 ? (
              <Card title="No Blockchain Data">
                <div className="text-center py-4">
                  <i className="bi bi-box fs-1 text-muted mb-3"></i>
                  <h5>No Blocks Found</h5>
                  <p className="text-muted">When transactions are made, they will be organized into blocks here.</p>
                </div>
              </Card>
            ) : (
              <div className="d-flex flex-column gap-4">
                {blocks.map((block, index) => (
                  <Card key={block.blockNumber} title={`Block #${block.blockNumber}`}>
                    <div className="row">
                      {/* Block Header */}
                      <div className="col-md-4">
                        <div className="border-end pe-3">
                          <h6 className="text-primary mb-3">
                            <i className="bi bi-box me-2"></i>
                            Block Information
                          </h6>
                          
                          <div className="mb-2">
                            <small className="text-muted">Block Number:</small><br/>
                            <strong className="text-primary">#{block.blockNumber}</strong>
                          </div>
                          
                          <div className="mb-2">
                            <small className="text-muted">Timestamp:</small><br/>
                            <small>{formatTimestamp(block.timestamp)}</small>
                          </div>
                          
                          <div className="mb-2">
                            <small className="text-muted">Block Hash:</small><br/>
                            <code className="small text-success">{truncateHash(block.blockHash, 10, 10)}</code>
                          </div>
                          
                          {block.previousHash ? (
                            <div className="mb-2">
                              <small className="text-muted">Previous Hash:</small><br/>
                              <code className="small text-warning">{truncateHash(block.previousHash, 10, 10)}</code>
                            </div>
                          ) : (
                            <div className="mb-2">
                              <small className="text-muted">Previous Hash:</small><br/>
                              <span className="badge bg-info">Genesis Block</span>
                            </div>
                          )}
                          
                          <div className="mb-2">
                            <small className="text-muted">Transactions:</small><br/>
                            <span className="badge bg-secondary">{block.transactions.length}</span>
                          </div>
                          
                          <div className="mb-2">
                            <small className="text-muted">Miner:</small><br/>
                            <code className="small">{truncateAddress(block.miner)}</code>
                          </div>
                        </div>
                      </div>
                      
                      {/* Block Transactions */}
                      <div className="col-md-8">
                        <h6 className="text-secondary mb-3">
                          <i className="bi bi-list-ul me-2"></i>
                          Transactions in Block ({block.transactions.length})
                        </h6>
                        
                        {block.transactions.length === 0 ? (
                          <p className="text-muted">No transactions in this block</p>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-sm">
                              <thead className="table-light">
                                <tr>
                                  <th>Type</th>
                                  <th>Hash</th>
                                  <th>From</th>
                                  <th>Details</th>
                                  <th>Gas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {block.transactions.map((tx) => (
                                  <tr key={tx.transactionHash}>
                                    <td>
                                      {getTransactionTypeIcon(tx.type, tx.data)}
                                      <span className="ms-2 small">
                                        {tx.type === 'vote' ? 'VOTE' : 
                                         tx.data.tokenType === 'mint' ? 'MINT' : 'TRANSFER'}
                                      </span>
                                    </td>
                                    <td>
                                      <code className="small">{truncateHash(tx.transactionHash, 6, 4)}</code>
                                    </td>
                                    <td>
                                      <code className="small">{truncateAddress(tx.from)}</code>
                                    </td>
                                    <td>
                                      {tx.type === 'vote' ? (
                                        <span className="small">
                                          <strong>{tx.data.candidate}</strong> by {truncateAddress(tx.data.voter)}
                                        </span>
                                      ) : (
                                        <span className="small">
                                          {tx.data.amount} tokens to {truncateAddress(tx.data.to)}
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      <small>{parseFloat(tx.gasUsed).toFixed(2)} Gwei</small>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Block Chain Visualization */}
                    {index < blocks.length - 1 && (
                      <div className="text-center mt-3">
                        <div className="d-flex align-items-center justify-content-center">
                          <div className="flex-grow-1">
                            <hr className="border-2 border-primary"/>
                          </div>
                          <div className="mx-3">
                            <i className="bi bi-arrow-down fs-4 text-primary"></i>
                          </div>
                          <div className="flex-grow-1">
                            <hr className="border-2 border-primary"/>
                          </div>
                        </div>
                        <small className="text-muted">
                          Next block references hash: <code>{truncateHash(block.blockHash, 8, 8)}</code>
                        </small>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="row">
          <div className="col-12">
            <Card title="All Transactions">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading all transactions...</p>
                </div>
              ) : allTransactions.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-list-ul fs-1 text-muted mb-3"></i>
                  <h5>No Transactions Found</h5>
                  <p className="text-muted">When users vote or receive tokens, all transactions will appear here.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>Block #</th>
                        <th>Type</th>
                        <th>Transaction Hash</th>
                        <th>Timestamp</th>
                        <th>From</th>
                        <th>Details</th>
                        <th>Gas Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTransactions.map((tx) => (
                        <tr key={tx.transactionHash}>
                          <td>
                            <strong className="text-primary">#{tx.blockNumber}</strong>
                          </td>
                          <td>
                            {getTransactionTypeIcon(tx.type, tx.data)}
                            <span className="ms-2">
                              {tx.type === 'vote' ? (
                                <span className="badge bg-success">VOTE</span>
                              ) : tx.data.tokenType === 'mint' ? (
                                <span className="badge bg-primary">MINT</span>
                              ) : (
                                <span className="badge bg-info">TRANSFER</span>
                              )}
                            </span>
                          </td>
                          <td>
                            <code className="text-secondary">{truncateHash(tx.transactionHash)}</code>
                          </td>
                          <td>
                            <small>{formatTimestamp(tx.timestamp)}</small>
                          </td>
                          <td>
                            <code className="small">{truncateAddress(tx.from)}</code>
                          </td>
                          <td>
                            {tx.type === 'vote' ? (
                              <div>
                                <strong>{tx.data.candidate}</strong><br/>
                                <small className="text-muted">by {truncateAddress(tx.data.voter)}</small>
                              </div>
                            ) : (
                              <div>
                                <strong>{parseFloat(tx.data.amount).toFixed(6)} VOTE</strong><br/>
                                <small className="text-muted">
                                  {tx.data.from === ethers.constants.AddressZero ? 'MINTED' : 'TRANSFERRED'} 
                                  {' to '}
                                  {truncateAddress(tx.data.to)}
                                </small>
                              </div>
                            )}
                          </td>
                          <td>
                            <small>{parseFloat(tx.gasUsed).toFixed(2)} Gwei</small>
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

      {/* Blockchain Statistics */}
      {blocks.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <Card title="📊 Blockchain Statistics">
              <div className="row">
                <div className="col-md-3">
                  <div className="text-center">
                    <h4 className="text-primary">{blocks.length}</h4>
                    <small className="text-muted">Total Blocks</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <h4 className="text-success">{allTransactions.filter(tx => tx.type === 'vote').length}</h4>
                    <small className="text-muted">Vote Transactions</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <h4 className="text-info">{allTransactions.filter(tx => tx.type === 'token').length}</h4>
                    <small className="text-muted">Token Transactions</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <h4 className="text-warning">{blocks.filter(b => !b.previousHash).length}</h4>
                    <small className="text-muted">Genesis Blocks</small>
                  </div>
                </div>
              </div>
              
              <div className="alert alert-info mt-3" role="alert">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Hash Chain Integrity:</strong> Each block contains a hash of the previous block, 
                creating an immutable chain. The genesis block (first block) has no previous hash, 
                while all subsequent blocks reference their predecessor's hash.
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blockchain;