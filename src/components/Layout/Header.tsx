import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-blue-600 text-white p-4">
            <h1 className="text-2xl font-bold">Sistema de Votación Blockchain</h1>
            <nav className="mt-2">
                <ul className="flex space-x-4">
                    <li><a href="/" className="hover:underline">Inicio</a></li>
                    <li><a href="/voting" className="hover:underline">Votar</a></li>
                    <li><a href="/dashboard" className="hover:underline">Panel de Control</a></li>
                    <li><a href="/admin" className="hover:underline">Administrador</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;