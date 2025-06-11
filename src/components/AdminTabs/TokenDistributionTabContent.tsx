import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import Input from '../ui/Input'; // Assuming default export

interface TokenDistributionTabContentProps {
  contract: ethers.Contract | null;
  isConnected: boolean;
  isAdmin: boolean;
  account: string | null;
  ethersProvider: ethers.providers.Web3Provider | null;
  fetchContractData: () => Promise<void>;
  fetchAdminEthBalance: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  loading: boolean;
  ownerBalance: string;
  tokensNeeded: string;
  autoMintEnabled: boolean;
  tokenSymbol: string;
  adminSepoliaEthBalance: string; // For displaying current balance in the SepoliaETH card
  checkOwnerBalance: () => boolean; // For bulk operations
}

export const TokenDistributionTabContent: React.FC<TokenDistributionTabContentProps> = ({
  contract,
  isConnected,
  isAdmin,
  account,
  ethersProvider,
  fetchContractData,
  fetchAdminEthBalance,
  setLoading,
  loading,
  ownerBalance,
  tokensNeeded,
  autoMintEnabled,
  tokenSymbol,
  adminSepoliaEthBalance,
  checkOwnerBalance,
}) => {
  // States for SepoliaETH transfer
  const [sendEthAddress, setSendEthAddress] = useState<string>('');
  const [sendEthAmount, setSendEthAmount] = useState<string>('0.001');
  const [isSendingEth, setIsSendingEth] = useState<boolean>(false);

  // States for manual token minting
  const [mintAddress, setMintAddress] = useState<string>('');
  const [mintAmount, setMintAmount] = useState<string>('1');

  // States for bulk token minting (e.g., from a CSV or list)
  const [bulkMintData, setBulkMintData] = useState<string>(''); // Could be CSV data

  // States for automatic token system
  const [tokensPerUserAuto, setTokensPerUserAuto] = useState<string>('0.0003'); // Default or fetched

  const handleSendSepoliaEth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();    if (!isAdmin || !isConnected || !ethersProvider || !account || !sendEthAddress.trim() || !sendEthAmount.trim()) {
      alert('Por favor, asegúrate de estar conectado como administrador y de que todos los campos estén correctamente llenados (dirección y cantidad).');
      return;
    }
    const amount = parseFloat(sendEthAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, ingresa una cantidad positiva válida de SepoliaETH para enviar.');
      return;
    }
    setIsSendingEth(true);
    setLoading(true);
    try {
      const signer = ethersProvider.getSigner();
      const amountInWei = ethers.utils.parseEther(sendEthAmount);
      const txResponse = await signer.sendTransaction({
        to: sendEthAddress,
        value: amountInWei
      });      await txResponse.wait();
      alert(`Se enviaron exitosamente ${sendEthAmount} SepoliaETH a ${sendEthAddress}`);
      await fetchAdminEthBalance(); // Refresh admin's ETH balance
      setSendEthAddress('');
      // setSendEthAmount('0.001'); // Optionally reset amount
    } catch (error: any) {
      console.error("Error sending SepoliaETH:", error);
      alert(`Error al enviar SepoliaETH: ${error.message || 'Por favor, revisa la consola para más detalles.'}`);
    } finally {
      setIsSendingEth(false);
      setLoading(false);
    }
  }, [isAdmin, isConnected, ethersProvider, account, sendEthAddress, sendEthAmount, fetchAdminEthBalance, setLoading]);

  const handleMintTokens = async (e: React.FormEvent) => {
    e.preventDefault();    if (!contract || !isConnected || !isAdmin || !mintAddress.trim() || !mintAmount.trim()) {
      alert('Por favor, llena todos los campos y asegúrate de ser administrador.');
      return;
    }
    if (!checkOwnerBalance()) return; // Check if owner has enough tokens if distributing from owner balance

    setLoading(true);
    try {
      // Assuming 'distribuirTokens' takes address and amount (in wei)
      // Or 'mint' if the admin is minting new tokens directly to the user
      const amountInWei = ethers.utils.parseEther(mintAmount);
      // const tx = await contract.mint(mintAddress, amountInWei); // If minting new tokens
      const tx = await contract.distribuirTokens(mintAddress, amountInWei); // If distributing from owner's balance      await tx.wait();
      alert(`Se enviaron exitosamente ${mintAmount} ${tokenSymbol} a ${mintAddress}`);
      await fetchContractData(); // Refresh balances
      setMintAddress('');
      setMintAmount('1');
    } catch (error: any) {
      console.error('Error minting tokens:', error);
      alert(`Error al acuñar tokens: ${error.message || 'Revisa la consola'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMintTokens = async (e: React.FormEvent) => {
    e.preventDefault();    if (!contract || !isConnected || !isAdmin || !bulkMintData.trim()) {
      alert('Los datos masivos están vacíos o no eres administrador.');
      return;
    }
    if (!checkOwnerBalance()) return; // Important check

    // Basic CSV parsing: address,amount
    const lines = bulkMintData.split('\n').filter(line => line.trim() !== '');
    const addresses: string[] = [];
    const amounts: ethers.BigNumber[] = [];

    try {
      for (const line of lines) {
        const [address, amountStr] = line.split(',').map(s => s.trim());
        if (!ethers.utils.isAddress(address) || isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0) {
          throw new Error(`Invalid line: ${line}. Ensure format is address,amount and amount is positive.`);
        }
        addresses.push(address);
        amounts.push(ethers.utils.parseEther(amountStr));
      }    } catch (parseError: any) {
      alert(`Error al procesar datos masivos: ${parseError.message}`);
      return;
    }
    
    if (addresses.length === 0) {
      alert('No se encontraron entradas válidas en los datos masivos.');
      return;
    }

    setLoading(true);
    try {
      // Assuming 'distribucionMasiva' takes arrays of addresses and amounts
      // Or multiple 'mint' calls if that's the contract design
      const tx = await contract.distribucionMasiva(addresses, amounts);      await tx.wait();
      alert(`Distribución masiva de tokens procesada exitosamente para ${addresses.length} direcciones.`);
      await fetchContractData(); // Refresh balances
      setBulkMintData('');
    } catch (error: any) {
      console.error('Error in bulk minting tokens:', error);
      alert(`Error en la acuñación masiva: ${error.message || 'Revisa la consola'}`);
    } finally {
      setLoading(false);
    }
  };
  const handleToggleAutoMint = async () => {
    if (!contract || !isConnected || !isAdmin) {
      alert('No autorizado o contrato no disponible.');
      return;
    }
    setLoading(true);
    try {
      const tx = await contract.toggleAutoMint();
      await tx.wait();
      await fetchContractData(); // Refresh auto-mint status
      alert(`Sistema de distribución automática de tokens ${!autoMintEnabled ? 'habilitado' : 'deshabilitado'}.`);
    } catch (error: any) {
      console.error('Error toggling auto-mint:', error);
      alert(`Error: ${error.message || 'Revisa la consola'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSetTokensPerUser = async (e: React.FormEvent) => {
    e.preventDefault();
          if (!contract || !isConnected || !isAdmin || !tokensPerUserAuto.trim()) {
      alert('La cantidad está vacía o no eres administrador.');
      return;
    }
    const amount = parseFloat(tokensPerUserAuto);
    if (isNaN(amount) || amount <= 0) {
        alert('Por favor, ingresa una cantidad positiva válida para tokens por usuario.');
        return;
    }
    setLoading(true);
    try {
        const amountInWei = ethers.utils.parseEther(tokensPerUserAuto);
        const tx = await contract.setTokensPorUsuario(amountInWei);        await tx.wait();
        await fetchContractData(); // Refresh data
        alert(`Tokens por usuario para el sistema automático establecidos a ${tokensPerUserAuto} ${tokenSymbol}.`);
    } catch (error: any) {
        console.error('Error setting tokens per user:', error);
        alert(`Error: ${error.message || 'Revisa la consola'}`);
    } finally {
        setLoading(false);
    }
  };

  const handleResetTokenStatus = async () => {
    if (!contract || !isConnected || !isAdmin) {
      alert('No autorizado o contrato no disponible.');
      return;
    }
    const confirmed = window.confirm("¿Estás seguro de que quieres reiniciar el estado de distribución de tokens para todos los usuarios? Esto les permitirá recibir tokens nuevamente a través del sistema automático si está habilitado. Esta acción no se puede deshacer.");
    if (!confirmed) return;

    setLoading(true);
    try {
      const tx = await contract.resetTokenDistributionStatus();
      await tx.wait();
      await fetchContractData(); // Refresh any relevant data
      alert('Estado de distribución de tokens reiniciado para todos los usuarios.');
    } catch (error: any) {
      console.error('Error resetting token status:', error);
      alert(`Error: ${error.message || 'Revisa la consola'}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="row">
      {/* Token Distribution Overview */}
      {/* <div className="col-12 mb-4">
        <Card title={<><i className="bi bi-info-circle-fill me-2"></i>Token Distribution Overview</>}>
          <div className="row">
            <div className="col-md-4">
              <p className="mb-1"><strong className="text-primary"><i className="bi bi-wallet2 me-1"></i>Owner's VOTE Balance:</strong></p>
              <p className="fs-5">{parseFloat(ownerBalance).toFixed(4)} {tokenSymbol}</p>
            </div>
            <div className="col-md-4">
              <p className="mb-1"><strong className="text-primary"><i className="bi bi-people-fill me-1"></i>Tokens Needed (All Users):</strong></p>
              <p className="fs-5">{parseFloat(tokensNeeded).toFixed(4)} {tokenSymbol}</p>
            </div>
            <div className="col-md-4">
              <p className="mb-1"><strong className="text-primary"><i className="bi bi-gear-wide-connected me-1"></i>Auto-Distribution System:</strong></p>
              <p className={`fs-5 badge bg-${autoMintEnabled ? 'success' : 'danger'}`}>{autoMintEnabled ? 'ENABLED' : 'DISABLED'}</p>
            </div>
          </div>
           {parseFloat(tokensNeeded) > parseFloat(ownerBalance) && (
            <div className="alert alert-warning mt-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <strong>Warning:</strong> The owner does not have enough {tokenSymbol} tokens to distribute to all registered users if needed.
              Owner needs an additional <strong>{(parseFloat(tokensNeeded) - parseFloat(ownerBalance)).toFixed(4)} {tokenSymbol}</strong>.
            </div>
          )}
        </Card>
      </div> */}

      {/* Subsidize Gas (Send SepoliaETH) */}
      <div className="col-md-6 mb-4">
        <Card title={<><i className="bi bi-fuel-pump-fill me-2"></i>Subsidize Gas (Send SepoliaETH)</>}>
          <form onSubmit={handleSendSepoliaEth}>            <div className="mb-3">
              <label htmlFor="sendEthAddressAdmin" className="form-label">Dirección del Destinatario</label>
              <Input
                type="text"
                id="sendEthAddressAdmin"
                placeholder="0x... dirección del usuario"
                value={sendEthAddress}
                onChange={(e) => setSendEthAddress(e.target.value)}
                required
                className="form-control-sm"
              />
              <small className="text-muted">Dirección de la billetera del usuario para recibir SepoliaETH.</small>
            </div>
            <div className="mb-3">
              <label htmlFor="sendEthAmountAdmin" className="form-label">Cantidad de SepoliaETH</label>
              <div className="input-group input-group-sm">
                <Input
                  type="number"
                  id="sendEthAmountAdmin"
                  step="0.0001"
                  min="0.0001"
                  value={sendEthAmount}
                  onChange={(e) => setSendEthAmount(e.target.value)}
                  required
                  className="form-control-sm"
                />
                <span className="input-group-text">ETH</span>
              </div>              <small className="text-muted">ej., 0.001 ETH. Balance Actual: {parseFloat(adminSepoliaEthBalance).toFixed(4)} ETH</small>
            </div>
            <div className="d-grid">
              <Button type="submit" variant="info" disabled={isSendingEth || !sendEthAddress.trim() || !sendEthAmount.trim() || loading}>
                {isSendingEth ? (<><span className="spinner-border spinner-border-sm me-2"></span>Enviando ETH...</>) : (<><i className="bi bi-send-check me-2"></i>Enviar SepoliaETH</>) }
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Manual Token Minting/Distribution */}
      <div className="col-md-6 mb-4">
        <Card title={<><i className="bi bi-plus-circle-dotted me-2"></i>Manual Token Distribution</>}>
          <form onSubmit={handleMintTokens}>            <div className="mb-3">
              <label htmlFor="mintAddressAdmin" className="form-label">Dirección del Destinatario</label>
              <Input
                type="text"
                id="mintAddressAdmin"
                placeholder="0x... dirección del votante"
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value)}
                required
                className="form-control-sm"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="mintAmountAdmin" className="form-label">Cantidad de {tokenSymbol}</label>
              <div className="input-group input-group-sm">
                <Input
                  type="number"
                  id="mintAmountAdmin"
                  step="0.0001"
                  min="0.0001"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  required
                  className="form-control-sm"
                />
                <span className="input-group-text">{tokenSymbol}</span>
              </div>
            </div>            <div className="d-grid">
              <Button type="submit" variant="primary" disabled={loading || !mintAddress.trim() || !mintAmount.trim()}>
                {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Distribuyendo...</>) : (<><i className="bi bi-gift me-2"></i>Distribuir Tokens</>) }
              </Button>
            </div>
          </form>
        </Card>
      </div>
      
      {/* Bulk Token Minting/Distribution */}
      {/* <div className="col-md-6 mb-4">
        <Card title={<><i className="bi bi-people-fill me-2"></i>Bulk Token Distribution</>}>
          <form onSubmit={handleBulkMintTokens}>
            <div className="mb-3">
              <label htmlFor="bulkMintDataAdmin" className="form-label">Recipient Data (CSV: address,amount)</label>
              <textarea
                id="bulkMintDataAdmin"
                className="form-control form-control-sm"
                rows={4}
                placeholder={"0xaddress1,1.5\n0xaddress2,0.5\n0xaddress3,10"}
                value={bulkMintData}
                onChange={(e) => setBulkMintData(e.target.value)}
                required
              />
              <small className="text-muted">One entry per line. Example: <code>0x123...,2.5</code></small>
            </div>
            <div className="d-grid">
              <Button type="submit" variant="success" disabled={loading || !bulkMintData.trim()}>
                {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Processing Bulk...</>) : (<><i className="bi bi-lightning-charge-fill me-2"></i>Process Bulk Distribution</>) }
              </Button>
            </div>
          </form>
        </Card>
      </div> */}

      {/* Automatic Token System Configuration */}
      {/* <div className="col-md-6 mb-4">
        <Card title={<><i className="bi bi-robot me-2"></i>Automatic Token System</>}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span>Enable Automatic Distribution:</span>
            <div className="form-check form-switch">
              <input 
                className="form-check-input" 
                type="checkbox" 
                role="switch" 
                id="autoMintToggleAdmin"
                checked={autoMintEnabled}
                onChange={handleToggleAutoMint}
                disabled={loading}
              />              <label className="form-check-label" htmlFor="autoMintToggleAdmin">
                {autoMintEnabled ? 'Habilitado' : 'Deshabilitado'}
              </label>
            </div>
          </div>
          <form onSubmit={handleSetTokensPerUser} className="mt-3">
            <div className="mb-3">
                <label htmlFor="tokensPerUserAutoAdmin" className="form-label">Tokens por Usuario (para Sistema Automático)</label>
                 <div className="input-group input-group-sm">
                    <Input
                    type="number"
                    id="tokensPerUserAutoAdmin"
                    step="0.0001"
                    min="0.0001"
                    value={tokensPerUserAuto}
                    onChange={(e) => setTokensPerUserAuto(e.target.value)}
                    required
                    className="form-control-sm"
                    />
                    <span className="input-group-text">{tokenSymbol}</span>
                </div>
                <small className="text-muted">Cantidad que cada nuevo votante recibe si la distribución automática está activada.</small>
            </div>
            <div className="d-grid">
                <Button type="submit" variant="outline-primary" size="sm" disabled={loading || !tokensPerUserAuto.trim()}>
                    {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>) : (<><i className="bi bi-save me-2"></i>Establecer Tokens por Usuario</>) }
                </Button>
            </div>
          </form>
        </Card>
      </div> */}
      
      {/* Reset Token Status */}
      <div className="col-12 mb-4">
        <Card title={<><i className="bi bi-arrow-counterclockwise me-2"></i>Reset Token Distribution Status</>} cardClassName="border-danger">          <p className="text-danger">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Advertencia:</strong> Esta acción reiniciará el estado 'hasReceivedTokens' para TODOS los usuarios registrados.
            Podrán recibir tokens nuevamente a través del sistema automático (si está habilitado) o distribución manual.
            Esto es útil si necesitas re-emitir tokens o corregir una distribución pasada. <strong>Esta acción no se puede deshacer.</strong>
          </p>
          <div className="d-grid">
            <Button variant="danger" onClick={handleResetTokenStatus} disabled={loading}>
              {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Reiniciando...</>) : (<><i className="bi bi-bootstrap-reboot me-2"></i>Reiniciar Estado de Tokens de Todos los Usuarios</>) }
            </Button>
          </div>
        </Card>
      </div>

    </div>
  );
};
