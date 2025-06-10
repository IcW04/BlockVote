import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const Home: React.FC = () => {
  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-12 text-center mb-5">
          <h1 className="display-4 fw-bold text-primary">Blockchain Voting System</h1>
          <p className="lead">Secure, transparent, and decentralized voting platform</p>
        </div>
      </div>      <div className="row g-4">
        <div className="col-md-4">
          <Card title="🗳️ Start Voting">
            <p className="card-text">Connect your wallet and automatically register to participate in elections.</p>
            <Link to="/voting">
              <Button variant="primary" size="lg" className="w-100">
                <i className="bi bi-ballot me-2"></i>
                Connect & Vote
              </Button>
            </Link>
          </Card>
        </div>

        <div className="col-md-4">
          <Card title="🔗 Blockchain Explorer">
            <p className="card-text">View all transactions and blocks with complete transparency and hash verification.</p>
            <Link to="/blockchain">
              <Button variant="info" size="lg" className="w-100">
                <i className="bi bi-diagram-3 me-2"></i>
                Explore Blockchain
              </Button>
            </Link>
          </Card>
        </div>
        
        <div className="col-md-4">
          <Card title="⚙️ Administration">
            <p className="card-text">Admin only: Manage elections, distribute tokens, and view registered voters.</p>
            <Link to="/admin">
              <Button variant="secondary" size="lg" className="w-100">
                <i className="bi bi-gear me-2"></i>
                Admin Panel
              </Button>
            </Link>
          </Card>
        </div>
      </div>      <div className="row mt-5">
        <div className="col-12">
          <Card title="🚀 Simplified Voting Process">
            <div className="row">
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-wallet2 fs-1 text-primary"></i>
                </div>
                <h5>1. Connect Wallet</h5>
                <p className="small">Connect MetaMask and automatically register your wallet address with the admin</p>
              </div>
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-coin fs-1 text-warning"></i>
                </div>
                <h5>2. Receive Tokens</h5>
                <p className="small">Admin distributes voting tokens to all registered voters before elections</p>
              </div>
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-check-circle fs-1 text-success"></i>
                </div>
                <h5>3. Vote Securely</h5>
                <p className="small">Use your tokens to vote for candidates in active elections</p>
              </div>
            </div>

            <div className="alert alert-success mt-4" role="alert">
              <div className="row align-items-center">
                <div className="col-md-1 text-center">
                  <i className="bi bi-shield-check fs-4"></i>
                </div>
                <div className="col-md-11">
                  <strong>🎯 Automatic Registration:</strong> 
                  No complex forms! Just connect your wallet and agree to share your address with the admin. 
                  Your wallet will be automatically registered for token distribution.
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;