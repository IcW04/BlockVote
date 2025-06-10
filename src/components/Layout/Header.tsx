import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-blue-600 text-white p-4">
            <h1 className="text-2xl font-bold">Blockchain Voting System</h1>
            <nav className="mt-2">
                <ul className="flex space-x-4">
                    <li><a href="/" className="hover:underline">Home</a></li>
                    <li><a href="/voting" className="hover:underline">Vote</a></li>
                    <li><a href="/dashboard" className="hover:underline">Dashboard</a></li>
                    <li><a href="/admin" className="hover:underline">Admin</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;