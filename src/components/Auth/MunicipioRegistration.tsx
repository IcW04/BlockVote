import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useContract } from '../../hooks/useContract';
import { Button } from '../ui/Button'; // Asumiendo que tienes un componente Button
import { Card } from '../ui/Card'; // Asumiendo que tienes un componente Card

// Lista de municipios (esto podría venir de una constante o API en el futuro)
const LISTA_MUNICIPIOS = [
    "Altamira",
    "Ciudad Madero",
    "Tampico",
    "Otro" // Opción genérica
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
                    // Suponiendo que el contrato tiene una función para verificar si un usuario está registrado
                    // y a qué municipio pertenece, o simplemente si está registrado.
                    // Por ahora, usaremos `usuarioRegistrado(address)` que devuelve bool.
                    const registrado = await contract.usuarioRegistrado(account);
                    setIsAlreadyRegistered(registrado);
                    if (registrado) {
                        // Podrías intentar obtener el municipio si el contrato lo permite
                        // const municipio = await contract.obtenerMunicipioUsuario(account);
                        // setRegistrationSuccess(`Ya estás registrado en el municipio: ${municipio}`);
                        setRegistrationSuccess('Ya te encuentras registrado en el sistema.');
                    }
                } catch (error) {
                    console.error("Error verificando estado de registro:", error);
                    // No establecer error aquí, ya que es una verificación inicial
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
            console.log(`Registrando usuario ${account} en municipio ${selectedMunicipio}`);
            // Usamos la función `registrarUsuario(address usuario, string municipio)` del contrato
            const tx = await contract.registrarUsuario(account, selectedMunicipio);
            await tx.wait();
            setRegistrationSuccess(`¡Registro exitoso! Te has registrado en el municipio de ${selectedMunicipio}.`);
            setIsAlreadyRegistered(true); // Actualizar estado local
            // Podrías querer refrescar datos o redirigir al usuario
        } catch (error: any) {
            console.error("Error durante el registro:", error);
            if (error.message && error.message.includes("Usuario ya registrado")) {
                setRegistrationError("Este usuario ya ha sido registrado previamente.");
                setIsAlreadyRegistered(true);
            } else if (error.message && error.message.includes("user rejected transaction")) {
                setRegistrationError("La transacción fue rechazada.");
            }
            else {
                setRegistrationError(`Error al registrar: ${error.message || 'Ocurrió un error desconocido.'}`);
            }
        } finally {
            setIsRegistering(false);
        }
    };

    if (!isConnected) {
        return (
            <Card title="Registro de Municipio">
                <p className="text-center text-warning">Por favor, conecta tu wallet para registrar tu municipio.</p>
            </Card>
        );
    }
    
    if (isAlreadyRegistered === null && account) {
         return (
            <Card title="Registro de Municipio">
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
        <Card title="Registro de Municipio">
            <form onSubmit={handleRegister}>
                <div className="mb-3">
                    <label htmlFor="walletAddress" className="form-label">Wallet Conectada</label>
                    <input
                        type="text"
                        id="walletAddress"
                        className="form-control"
                        value={account || ''}
                        readOnly
                        disabled
                    />
                </div>

                {isAlreadyRegistered ? (
                    <div className="alert alert-success">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        {registrationSuccess || "Ya te encuentras registrado en el sistema."}
                    </div>
                ) : (
                    <>
                        <div className="mb-3">
                            <label htmlFor="municipioSelect" className="form-label">Selecciona tu Municipio</label>
                            <select
                                id="municipioSelect"
                                className="form-select"
                                value={selectedMunicipio}
                                onChange={(e) => setSelectedMunicipio(e.target.value)}
                                required
                                disabled={isRegistering}
                            >
                                <option value="" disabled>-- Elige un municipio --</option>
                                {LISTA_MUNICIPIOS.map(municipio => (
                                    <option key={municipio} value={municipio}>{municipio}</option>
                                ))}
                            </select>
                        </div>

                        {registrationError && (
                            <div className="alert alert-danger mt-3">{registrationError}</div>
                        )}
                        {registrationSuccess && (
                            <div className="alert alert-success mt-3">{registrationSuccess}</div>
                        )}

                        <div className="d-grid">
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isRegistering || !selectedMunicipio || contractLoading || isAlreadyRegistered}
                            >
                                {isRegistering ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Registrando...
                                    </>
                                ) : (
                                    <><i className="bi bi-person-plus-fill me-2"></i>Registrar Municipio</>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </form>
        </Card>
    );
};

export default MunicipioRegistration;