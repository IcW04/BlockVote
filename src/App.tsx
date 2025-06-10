import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Voting from './pages/Voting';
import Admin from './pages/Admin';
import Blockchain from './pages/Blockchain';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-vh-100">
        {/* Navigation */}
        <nav className="navbar navbar-expand-lg navbar-dark navbar-custom">
          <div className="container">
            <Link className="navbar-brand fw-bold" to="/">
              Blockchain Voting System
            </Link>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">              <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                  <Link className="nav-link" to="/">
                    Home
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/voting">
                    Vote
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/blockchain">
                    Blockchain
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/admin">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Main content */}        <main className="container py-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/voting" element={<Voting />} />
            <Route path="/blockchain" element={<Blockchain />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;