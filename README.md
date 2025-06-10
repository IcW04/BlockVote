# Blockchain Voting System

This project is a decentralized voting system built on the Ethereum blockchain. It allows users to participate in elections securely and transparently using smart contracts.

## Features

- **User Authentication**: Connect your wallet to participate in voting.
- **Voting Mechanism**: Cast votes for candidates and view voting history.
- **Admin Panel**: Manage candidates and elections.
- **Real-time Statistics**: View statistics and charts related to the voting process.

## Technologies Used

- **React**: Frontend framework for building user interfaces.
- **TypeScript**: For type safety and better development experience.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Vite**: Build tool for fast development and optimized production builds.
- **Web3.js**: Library for interacting with the Ethereum blockchain.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/blockchain-voting-frontend.git
   cd blockchain-voting-frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

   or

   ```bash
   yarn install
   ```

3. Configure the smart contract address in `src/utils/constants.ts`:

   ```typescript
   export const CONTRACT_ADDRESS = "0xcb6ea44e5790ca6e95302881759e2fc7c805625d";
   ```

### Running the Application

To start the development server, run:

```bash
npm run dev
```

or

```bash
yarn dev
```

Open your browser and navigate to `http://localhost:3000` to view the application.

### Building for Production

To build the application for production, run:

```bash
npm run build
```

or

```bash
yarn build
```

The production files will be generated in the `dist` directory.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## License

This project is licensed under the MIT License. See the LICENSE file for details.