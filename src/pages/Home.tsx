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
      </div>
      
      <div className="row g-4">
        <div className="col-md-6">
          <Card title="Cast Your Vote">
            <p className="card-text">Participate in the current election and make your voice heard.</p>
            <Link to="/voting">
              <Button variant="primary" size="lg" className="w-100">
                Go to Voting
              </Button>
            </Link>
          </Card>
        </div>
        
        <div className="col-md-6">
          <Card title="Administration">
            <p className="card-text">Manage elections, view results, and system administration.</p>
            <Link to="/admin">
              <Button variant="secondary" size="lg" className="w-100">
                Go to Admin
              </Button>
            </Link>
          </Card>
        </div>
      </div>
      
      <div className="row mt-5">
        <div className="col-12">
          <Card title="How It Works">
            <div className="row">
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-wallet2 fs-1 text-primary"></i>
                </div>
                <h5>Connect Wallet</h5>
                <p>Connect your MetaMask wallet to participate</p>
              </div>
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-check-circle fs-1 text-success"></i>
                </div>
                <h5>Cast Vote</h5>
                <p>Select your candidate and submit your vote</p>
              </div>
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-graph-up fs-1 text-info"></i>
                </div>
                <h5>View Results</h5>
                <p>See transparent and immutable results</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;