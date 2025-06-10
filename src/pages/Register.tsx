import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ethers } from 'ethers';

const Register: React.FC = () => {
  const { contract } = useContract();
  const { account, isConnected, connectWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'checking' | 'registered' | 'not_registered'>('checking');
  const [userBalance, setUserBalance] = useState<string>('0');
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');

  useEffect(() => {
    if (contract && isConnected && account) {
      checkRegistrationStatus();
      getTokenInfo();
    }
  }, [contract, isConnected, account]);

  const getTokenInfo = async () => {
    if (!contract) return;
    
    try {
      const name = await contract.name();
      const symbol = await contract.symbol();
      setTokenName(name);
      setTokenSymbol(symbol);
    } catch (error) {
      console.error('Error getting token info:', error);
    }
  };

  const checkRegistrationStatus = async () => {
    if (!contract || !account) return;
    
    setLoading(true);
    try {
      // Check if user is registered as a voter
      const registeredVoters = await contract.obtenerVotantesRegistrados();
      const isRegistered = registeredVoters.includes(account);
      
      // Get user's token balance
      const balance = await contract.balanceOf(account);
      const balanceFormatted = ethers.utils.formatEther(balance);
      setUserBalance(balanceFormatted);
      
      setRegistrationStatus(isRegistered ? 'registered' : 'not_registered');
      
      console.log('👤 Registration status:', { isRegistered, balance: balanceFormatted });
      
    } catch (error) {
      console.error('Error checking registration status:', error);
      setRegistrationStatus('not_registered');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!contract || !isConnected || !account) {
      alert('Please connect your wallet first.');
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Registering user:', account);
      
      // Register the current connected wallet
      const tx = await contract.registrarVotante(account);
      await tx.wait();
      
      console.log('✅ User registered successfully');
      alert('🎉 Registration successful! You are now registered to receive voting tokens.');
      
      // Refresh registration status
      await checkRegistrationStatus();
      
    } catch (error: any) {
      console.error('❌ Error registering user:', error);
      
      let errorMessage = 'Error during registration. Please try again.';
      if (error.message) {
        if (error.message.includes('Ya esta registrado')) {
          errorMessage = 'You are already registered.';
        } else if (error.message.includes('user rejected transaction')) {
          errorMessage = 'Transaction cancelled by user.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds to pay transaction gas.';
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTokens = async () => {
    if (!contract || !isConnected || !account) {
      alert('Please connect your wallet first.');
      return;
    }

    setLoading(true);
    try {
      console.log('🪙 Requesting tokens for:', account);
      
      // Try to get tokens automatically
      const tx = await contract.solicitarTokensIniciales();
      await tx.wait();
      
      console.log('✅ Tokens requested successfully');
      alert('🎉 Tokens received! You can now participate in voting.');
      
      // Refresh balance
      await checkRegistrationStatus();
      
    } catch (error: any) {
      console.error('❌ Error requesting tokens:', error);
      
      let errorMessage = 'Error requesting tokens. Please contact the administrator.';
      if (error.message) {
        if (error.message.includes('Ya recibiste tokens iniciales')) {
          errorMessage = 'You have already received your initial tokens.';
        } else if (error.message.includes('No estas registrado')) {
          errorMessage = 'You need to register first before requesting tokens.';
        } else if (error.message.includes('user rejected transaction')) {
          errorMessage = 'Transaction cancelled by user.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds to pay transaction gas.';
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container">
        <div className="row">
          <div className="col-md-8 mx-auto">
            <Card title="🗳️ Voter Registration">
              <div className="text-center">
                <i className="bi bi-wallet2 fs-1 text-primary mb-4"></i>
                <h4 className="mb-3">Connect Your Wallet to Register</h4>
                <p className="text-muted mb-4">
                  To participate in voting, you need to connect your wallet and register as a voter. 
                  Once registered, the admin can distribute voting tokens to your wallet.
                </p>
                
                <div className="d-grid gap-2 col-md-6 mx-auto">
                  <Button variant="primary" onClick={connectWallet}>
                    <i className="bi bi-wallet2 me-2"></i>
                    Connect Wallet
                  </Button>
                </div>
                
                <div className="alert alert-info mt-4" role="alert">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>How it works:</strong>
                  <ol className="text-start mt-2 mb-0">
                    <li>Connect your wallet</li>
                    <li>Register as a voter</li>
                    <li>Admin distributes tokens to registered voters</li>
                    <li>Use tokens to vote in elections</li>
                  </ol>
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
        <div className="col-md-8 mx-auto">
          <Card title="🗳️ Voter Registration">
            <div className="text-center mb-4">
              <i className="bi bi-person-check fs-1 text-success mb-3"></i>
              <h4>Voting System Registration</h4>
              <p className="text-muted">
                Register your wallet to receive voting tokens from the admin
              </p>
            </div>

            {/* Current Wallet Info */}
            <div className="alert alert-primary" role="alert">
              <div className="d-flex align-items-center">
                <i className="bi bi-wallet2 fs-5 me-3"></i>
                <div>
                  <strong>Connected Wallet:</strong><br/>
                  <code>{account}</code>
                </div>
              </div>
            </div>

            {/* Token Balance */}
            <div className="row mb-4">
              <div className="col-md-6">
                <Card title="Your Token Balance">
                  <div className="text-center">
                    <h3 className="text-primary">{parseFloat(userBalance).toFixed(6)}</h3>
                    <small className="text-muted">{tokenSymbol || 'VOTE'} Tokens</small>
                  </div>
                </Card>
              </div>
              <div className="col-md-6">
                <Card title="Registration Status">
                  <div className="text-center">
                    {loading && registrationStatus === 'checking' ? (
                      <div>
                        <div className="spinner-border spinner-border-sm text-primary"></div>
                        <p className="mt-2 small">Checking...</p>
                      </div>
                    ) : registrationStatus === 'registered' ? (
                      <div>
                        <i className="bi bi-check-circle fs-3 text-success"></i>
                        <p className="mt-2 small text-success">Registered</p>
                      </div>
                    ) : (
                      <div>
                        <i className="bi bi-x-circle fs-3 text-warning"></i>
                        <p className="mt-2 small text-warning">Not Registered</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Registration Actions */}
            {registrationStatus === 'not_registered' && (
              <div className="text-center">
                <h5 className="mb-3">Register as Voter</h5>
                <p className="text-muted mb-4">
                  Register your wallet address so the admin can send you voting tokens before each election.
                </p>
                
                <div className="d-grid gap-2 col-md-6 mx-auto">
                  <Button 
                    variant="success" 
                    onClick={handleRegister}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Registering...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus me-2"></i>
                        Register as Voter
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {registrationStatus === 'registered' && (
              <div className="text-center">
                <div className="alert alert-success" role="alert">
                  <i className="bi bi-check-circle me-2"></i>
                  <strong>You are registered!</strong> You can now receive voting tokens from the admin.
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <h6>Request Initial Tokens</h6>
                    <p className="small text-muted">
                      If you haven't received your initial tokens, you can request them here.
                    </p>
                    <Button 
                      variant="primary" 
                      onClick={handleRequestTokens}
                      disabled={loading || parseFloat(userBalance) > 0}
                      className="w-100"
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Requesting...
                        </>
                      ) : parseFloat(userBalance) > 0 ? (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Tokens Received
                        </>
                      ) : (
                        <>
                          <i className="bi bi-coin me-2"></i>
                          Request Tokens
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="col-md-6">
                    <h6>Ready to Vote?</h6>
                    <p className="small text-muted">
                      Once you have tokens, you can participate in active elections.
                    </p>
                    <Button 
                      variant="success" 
                      onClick={() => window.location.href = '/voting'}
                      disabled={parseFloat(userBalance) === 0}
                      className="w-100"
                    >
                      <i className="bi bi-ballot me-2"></i>
                      Go to Voting
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="alert alert-info mt-4" role="alert">
              <h6><i className="bi bi-info-circle me-2"></i>How Token Distribution Works:</h6>
              <ol className="mb-0">
                <li><strong>Register:</strong> Submit your wallet address to become a registered voter</li>
                <li><strong>Wait for Tokens:</strong> The admin will distribute tokens to all registered voters before each election</li>
                <li><strong>Vote:</strong> Use your tokens to vote in active elections</li>
                <li><strong>Repeat:</strong> Receive new tokens for each new election</li>
              </ol>
            </div>

            {/* Admin Contact */}
            <div className="text-center mt-4">
              <small className="text-muted">
                <i className="bi bi-question-circle me-1"></i>
                Need help? Contact the election administrator for token distribution.
              </small>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
