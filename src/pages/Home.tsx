import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const Home: React.FC = () => {
  return (
    <div className="container-fluid">      <div className="row justify-content-center">
        <div className="col-12 text-center mb-5">
          <h1 className="display-4 fw-bold text-primary">Sistema de Votación Blockchain</h1>
          <p className="lead">Plataforma de votación segura, transparente y descentralizada</p>
        </div>
      </div>
        <div className="row g-4">
        <div className="col-md-6">
          <Card title="Emite tu Voto">
            <p className="card-text">Participa en la elección actual y haz que tu voz sea escuchada.</p>
            <Link to="/voting">
              <Button variant="primary" size="lg" className="w-100">
                Ir a Votación
              </Button>
            </Link>
          </Card>
        </div>
        
        <div className="col-md-6">
          <Card title="Administración">
            <p className="card-text">Gestiona elecciones, ve resultados y administra el sistema.</p>
            <Link to="/admin">
              <Button variant="secondary" size="lg" className="w-100">
                Ir a Administración
              </Button>
            </Link>
          </Card>
        </div>
      </div>
        <div className="row mt-5">
        <div className="col-12">
          <Card title="Cómo Funciona">
            <div className="row">
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-wallet2 fs-1 text-primary"></i>
                </div>
                <h5>Conecta tu Billetera</h5>
                <p>Conecta tu billetera MetaMask para participar</p>
              </div>
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-check-circle fs-1 text-success"></i>
                </div>
                <h5>Emite tu Voto</h5>
                <p>Selecciona tu candidato y envía tu voto</p>
              </div>
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-graph-up fs-1 text-info"></i>
                </div>
                <h5>Ve los Resultados</h5>
                <p>Observa resultados transparentes e inmutables</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;