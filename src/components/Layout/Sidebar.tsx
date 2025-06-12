import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar: React.FC = () => {
    return (
        <div className="bg-gray-800 text-white w-64 h-full p-5">
            <h2 className="text-2xl font-bold mb-5">Sistema de Votación</h2>
            <ul>
                <li className="mb-3">
                    <Link to="/dashboard" className="hover:text-gray-400">Panel de Control</Link>
                </li>
                <li className="mb-3">
                    <Link to="/voting" className="hover:text-gray-400">Votar</Link>
                </li>
                <li className="mb-3">
                    <Link to="/admin" className="hover:text-gray-400">Administrador</Link>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;