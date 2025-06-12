import React from 'react';
import Overview from '../components/Dashboard/Overview';
import Statistics from '../components/Dashboard/Statistics';
import Charts from '../components/Dashboard/Charts';
import VotingPanel from '../components/Dashboard/VotingPanel';
import Layout from '../components/Layout/Layout';

const Dashboard: React.FC = () => {
    return (
        <Layout>
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Panel de Control</h1>
                <Overview />
                <Statistics />
                <Charts />
                <VotingPanel />
            </div>
        </Layout>
    );
};

export default Dashboard;