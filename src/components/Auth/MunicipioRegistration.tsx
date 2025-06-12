import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useContract } from '../../hooks/useContract';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

// Lista de municipios de la República Dominicana
const LISTA_MUNICIPIOS_RD = [
    "Santo Domingo de Guzmán",
    "Santiago de los Caballeros",
    "Santo Domingo Este",
    "Santo Domingo Norte",
    "Santo Domingo Oeste",
    "San Cristóbal",
    "La Vega",
    "San Pedro de Macorís",
    "La Romana",
    "San Francisco de Macorís",
    "Higüey",
    "Puerto Plata",
    "Moca",
    "Bonao",
    "Baní",
    "Azua de Compostela",
    "Mao",
    "Jimaní",
    "Barahona",
    "Nagua",
    "Monte Cristi",
    "Samaná",
    "Neiba",
    "Pedernales",
    "El Seibo",
    "Hato Mayor del Rey",
    "Cotuí",
    "Dajabón",
    "Monte Plata",
    "Salcedo",
    "San José de Ocoa",
    "Esperanza",
    "Constanza",
    "Jarabacoa",
    "Las Terrenas",
    "Cabarete",
    "Sosúa",
    "Bayahíbe",
    "Punta Cana",
    "Bávaro",
    "Otro"
];

const MunicipioRegistration: React.FC = () => {
    const { account, isConnected } = useWallet();
    const { contract, loading: contractLoading } = useContract();
    const [selectedMunicipio, setSelectedMunicipio] = useState<string>('');
    const [isRegistering, setIsRegistering] = useState<boolean>(false);
    const [registrationError, setRegistrationError] = useState<string | null>(null);
    const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);
    const [isAlreadyRegistered, setIsAlreadyRegistered] = useState<boolean | null>(null);

    useEffect(() => {
        // Resetear estado al cambiar de cuenta o contrato
        setSelectedMunicipio('');
        setRegistrationError(null);
        setRegistrationSuccess(null);
        setIsAlreadyRegistered(null);

        const checkRegistrationStatus = async () => {
            if (contract && account && isConnected) {
                try {
                    console.log('🔍 Verificando estado de registro del usuario...');

                    // Verificar si el usuario está registrado usando la función disponible
                    let registrado = false;
                    
                    if (typeof contract.usuarioRegistrado === 'function') {
                        registrado = await contract.usuarioRegistrado(account);
                        console.log('✅ Usuario registrado:', registrado);
                    } else if (typeof contract.haRecibidoTokensIniciales === 'function') {
                        // Alternativa: verificar si ya recibió tokens iniciales
                        registrado = await contract.haRecibidoTokensIniciales(account);
                        console.log('✅ Ha recibido tokens iniciales:', registrado);
                    } else {
                        console.log('⚠️ No se encontró función de verificación, verificando balance...');
                        // Como último recurso, verificar si tiene tokens (balance > 0)
                        const balance = await contract.balanceOf(account);
                        registrado = balance.gt(0);
                        console.log('✅ Tiene tokens (registrado):', registrado);
                    }
                    
                    setIsAlreadyRegistered(registrado);
                    
                    if (registrado) {
                        setRegistrationSuccess('Ya te encuentras registrado en el sistema y tienes tokens para votar.');
                    }
                } catch (error) {
                    console.error("Error verificando estado de registro:", error);
                    setIsAlreadyRegistered(false);
                }
            }
        };

        checkRegistrationStatus();

    }, [account, contract, isConnected]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegistrationError(null);
        setRegistrationSuccess(null);

        if (!isConnected || !account) {
            setRegistrationError("Por favor, conecta tu wallet primero.");
            return;
        }
        if (contractLoading || !contract) {
            setRegistrationError("El contrato no está cargado. Intenta de nuevo en un momento.");
            return;
        }
        if (!selectedMunicipio) {
            setRegistrationError("Por favor, selecciona un municipio.");
            return;
        }
        if (isAlreadyRegistered) {
            setRegistrationError("Ya te encuentras registrado.");
            return;
        }

        setIsRegistering(true);
        try {
            console.log(`🚀 Solicitando tokens iniciales para el usuario ${account} del municipio ${selectedMunicipio}`);
            
            // Verificar si ya ha recibido tokens iniciales (doble verificación)
            if (typeof contract.haRecibidoTokensIniciales === 'function') {
                const yaRecibio = await contract.haRecibidoTokensIniciales(account);
                if (yaRecibio) {
                    throw new Error("Ya has recibido tokens iniciales previamente");
                }
            }
            
            // Solicitar tokens iniciales como forma de "registro"
            console.log('📝 Llamando a solicitarTokensIniciales...');
            const tx = await contract.solicitarTokensIniciales();
            
            console.log('⏳ Esperando confirmación de la transacción...');
            console.log('🔗 Hash de transacción:', tx.hash);
            
            const receipt = await tx.wait();
            console.log('✅ Transacción confirmada:', receipt);
            
            console.log(`✅ Tokens iniciales recibidos exitosamente`);
            setRegistrationSuccess(`¡Registro exitoso! Has recibido tokens para votar como residente de ${selectedMunicipio}.`);
            setIsAlreadyRegistered(true);
            
        } catch (error: any) {
            console.error("❌ Error durante el registro:", error);
            
            let errorMessage = 'Error al obtener tokens iniciales. ';
            
            if (error.message) {
                if (error.message.includes("Ya has recibido") || 
                    error.message.includes("already received") ||
                    error.message.includes("Ya recibiste") ||
                    error.message.includes("limite diario") ||
                    error.message.includes("tokens iniciales previamente")) {
                    errorMessage = "Ya has recibido tus tokens iniciales. Puedes proceder a votar.";
                    setIsAlreadyRegistered(true);
                } else if (error.message.includes("user rejected transaction")) {
                    errorMessage = "La transacción fue rechazada por el usuario.";
                } else if (error.message.includes("insufficient funds")) {
                    errorMessage = "Fondos insuficientes para pagar el gas de la transacción.";
                } else if (error.message.includes("execution reverted")) {
                    // Intentar extraer el mensaje de error específico del contrato
                    if (error.message.includes("Ya recibiste")) {
                        errorMessage = "Ya has recibido tus tokens iniciales previamente.";
                        setIsAlreadyRegistered(true);
                    } else {
                        errorMessage = "El contrato rechazó la transacción. Posiblemente ya estás registrado.";
                    }
                } else {
                    errorMessage += error.message;
                }
            } else {
                errorMessage += 'Ocurrió un error desconocido.';
            }
            
            setRegistrationError(errorMessage);
        } finally {
            setIsRegistering(false);
        }
    };

    if (!isConnected) {
        return (
            <Card title="📋 Registro de Municipio">
                <div className="text-center">
                    <div className="alert alert-warning" role="alert">
                        <i className="bi bi-wallet2 me-2"></i>
                        <strong>Wallet no conectada</strong>
                    </div>
                    <p className="text-muted">Por favor, conecta tu wallet para registrar tu municipio y obtener tokens para votar.</p>
                </div>
            </Card>
        );
    }
    
    if (contractLoading) {
        return (
            <Card title="📋 Registro de Municipio">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando contrato...</span>
                    </div>
                    <p className="mt-2">Cargando contrato inteligente...</p>
                </div>
            </Card>
        );
    }
    
    if (isAlreadyRegistered === null && account) {
        return (
            <Card title="📋 Registro de Municipio">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Verificando estado...</span>
                    </div>
                    <p className="mt-2">Verificando estado de registro...</p>
                </div>
            </Card>
        );
    }

    return (
        <Card title="📋 Registro de Municipio">
            <form onSubmit={handleRegister}>
                <div className="mb-3">
                    <label htmlFor="walletAddress" className="form-label">
                        <i className="bi bi-wallet2 me-2"></i>
                        Wallet Conectada
                    </label>
                    <input
                        type="text"
                        id="walletAddress"
                        className="form-control"
                        value={account || ''}
                        readOnly
                        disabled
                        style={{ backgroundColor: '#f8f9fa', fontFamily: 'monospace', fontSize: '0.9em' }}
                    />
                </div>

                {isAlreadyRegistered ? (
                    <div className="alert alert-success">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        <strong>¡Registro completado!</strong>
                        <br />
                        {registrationSuccess || "Ya te encuentras registrado en el sistema y tienes tokens para votar."}
                        <div className="mt-2">
                            <small className="text-success">
                                ✅ Puedes proceder a la sección de votación
                            </small>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-3">
                            <label htmlFor="municipioSelect" className="form-label">
                                <i className="bi bi-geo-alt me-2"></i>
                                Selecciona tu Municipio (República Dominicana)
                            </label>
                            <select
                                id="municipioSelect"
                                className="form-select"
                                value={selectedMunicipio}
                                onChange={(e) => setSelectedMunicipio(e.target.value)}
                                required
                                disabled={isRegistering}
                            >
                                <option value="" disabled>-- Elige un municipio --</option>
                                {LISTA_MUNICIPIOS_RD.map(municipio => (
                                    <option key={municipio} value={municipio}>{municipio}</option>
                                ))}
                            </select>
                            <small className="text-muted">
                                Selecciona el municipio donde estás registrado para votar
                            </small>
                        </div>

                        {registrationError && (
                            <div className="alert alert-danger">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                {registrationError}
                            </div>
                        )}
                        
                        {registrationSuccess && (
                            <div className="alert alert-success">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                {registrationSuccess}
                            </div>
                        )}

                        <div className="d-grid">
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isRegistering || !selectedMunicipio || contractLoading || isAlreadyRegistered}
                                size="lg"
                            >
                                {isRegistering ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Obteniendo tokens...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-coin me-2"></i>
                                        Obtener Tokens de Votación
                                    </>
                                )}
                            </Button>
                        </div>
                        
                        <div className="mt-3 p-3 bg-light rounded">
                            <h6 className="mb-2">
                                <i className="bi bi-info-circle me-2"></i>
                                ¿Qué significa esto?
                            </h6>
                            <ul className="mb-0 small">
                                <li>Al registrarte, recibirás tokens iniciales para votar</li>
                                <li>Solo puedes registrarte una vez por cuenta</li>
                                <li>Necesitas estos tokens para participar en las votaciones</li>
                                <li>El proceso es seguro y se registra en la blockchain</li>
                                <li>La transacción puede tardar unos segundos en confirmarse</li>
                            </ul>
                        </div>
                    </>
                )}
            </form>
        </Card>
    );
};

export default MunicipioRegistration;