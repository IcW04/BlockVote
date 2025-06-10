// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SistemaDeVotacion
 * @dev Este contrato combina un token ERC20 con un sistema de votación.
 * Los poseedores del token pueden votar en elecciones gestionadas por el propietario del contrato.
 * Cada voto consume una cantidad fija de tokens.
 */
contract SistemaDeVotacion {

    //================================================================================
    // Propiedades del Token (ERC20)
    //================================================================================
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) public allowance;

    //================================================================================
    // Propiedades del Sistema de Votación
    //================================================================================
    address public propietario;
    bool public votacionActiva;
    uint256 public constant COSTO_VOTO = 1 ether; // 1 token con 18 decimales

    // Detalles de la elección actual
    string public nombreEleccionActual;
    uint256 public idEleccionActual;

    // Conteo de votos por candidato
    mapping(string => uint256) public conteoVotos;

    // Rastreo de votantes por elección
    // idEleccion => votante => haVotado
    mapping(uint256 => mapping(address => bool)) public haVotadoEnEleccion;

    // Candidatos
    string[] public candidatos;
    mapping(string => bool) private _existeCandidato;

    // Historial de elecciones
    struct InfoEleccion {
        string nombre;
        uint256 id;
        uint256 votosTotales;
        bool completada;
        uint256 fechaFinalizacion;
    }
    InfoEleccion[] public historialElecciones;

    //================================================================================
    // ✅ NUEVO: Sistema de Auto-Mint y Registro de Usuarios
    //================================================================================
      // Configuración del auto-mint
    bool public autoMintEnabled = false;
    uint256 public autoMintAmount = 3000000000000000; // 0.000003 tokens (3000000000000000 wei)
    
    // Control de usuarios registrados
    mapping(address => bool) public usuarioRegistrado;
    mapping(address => bool) public haRecibidoTokensIniciales;
    address[] public usuariosRegistrados;
    
    // Límites de seguridad
    uint256 public maxTokensPorUsuario = 100 ether;
    uint256 public limiteDiarioAutoMint = 1000 ether;
    uint256 public tokensDistribuidosHoy = 0;
    uint256 public ultimoResetDiario = block.timestamp;

    //================================================================================
    // Eventos
    //================================================================================

    // Eventos de Token
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // Eventos de Votación
    event VotoEmitido(address indexed votante, string candidato, uint256 indexed idEleccion);
    event CandidatoAgregado(string candidato);
    event CandidatoEliminado(string candidato);
    event VotacionActivada(bool activa);
    event EleccionIniciada(uint256 indexed idEleccion, string nombre);
    event EleccionReiniciada(uint256 indexed idEleccion);
    event TransferenciaDePropiedad(address indexed propietarioAnterior, address indexed nuevoPropietario);
    
    // ✅ NUEVO: Eventos de Auto-Mint
    event AutoMintActivado(bool activado);
    event AutoMintCantidadCambiada(uint256 nuevaCantidad);
    event UsuarioRegistrado(address indexed usuario);
    event TokensAutomaticosOtorgados(address indexed usuario, uint256 cantidad);
    event TokensDistribuidos(address indexed admin, address indexed usuario, uint256 cantidad);

    //================================================================================
    // Modificadores
    //================================================================================

    modifier soloPropietario() {
        require(msg.sender == propietario, "Error: Accion solo para el propietario");
        _;
    }

    modifier siVotacionActiva() {
        require(votacionActiva, "Error: La votacion no esta activa");
        _;
    }

    // ✅ NUEVO: Modificador para auto-registro
    modifier autoRegistrarUsuario() {
        if (!usuarioRegistrado[msg.sender]) {
            _registrarUsuario(msg.sender);
        }
        _;
    }

    //================================================================================
    // Constructor
    //================================================================================

    constructor(
        string memory _nombreToken,
        string memory _simboloToken,
        uint256 _suministroInicial
    ) {
        propietario = msg.sender;
        emit TransferenciaDePropiedad(address(0), propietario);

        // Configuración del token
        name = _nombreToken;
        symbol = _simboloToken;
        decimals = 18;
        
        // Acuñar suministro inicial para el desplegador del contrato
        uint256 suministroTotalConDecimales = _suministroInicial * (10**decimals);
        totalSupply = suministroTotalConDecimales;
        _balances[msg.sender] = suministroTotalConDecimales;
        emit Transfer(address(0), msg.sender, suministroTotalConDecimales);

        // Configuración inicial de la votación
        idEleccionActual = 1;
        nombreEleccionActual = "Eleccion Inicial";
        votacionActiva = false;
        
        // ✅ NUEVO: Registrar al propietario automáticamente
        _registrarUsuario(msg.sender);
        usuarioRegistrado[msg.sender] = true;
        haRecibidoTokensIniciales[msg.sender] = true; // El admin ya tiene tokens
    }

    //================================================================================
    // ✅ NUEVO: Funciones de Auto-Mint y Gestión de Usuarios
    //================================================================================

    /**
     * @dev Registra un usuario automáticamente y le da tokens si está habilitado
     */
    function _registrarUsuario(address usuario) internal {
        if (!usuarioRegistrado[usuario]) {
            usuarioRegistrado[usuario] = true;
            usuariosRegistrados.push(usuario);
            emit UsuarioRegistrado(usuario);
            
            // Auto-mint si está habilitado
            if (autoMintEnabled && !haRecibidoTokensIniciales[usuario]) {
                _darTokensIniciales(usuario);
            }
        }
    }    /**
     * @dev Da tokens iniciales a un usuario nuevo mediante transferencia desde el propietario
     */
    function _darTokensIniciales(address usuario) internal {
        if (haRecibidoTokensIniciales[usuario]) return;
        
        // Verificar límites diarios
        _verificarLimiteDiario();
        
        if (tokensDistribuidosHoy + autoMintAmount <= limiteDiarioAutoMint) {
            // Verificar que el propietario tenga suficientes tokens
            require(_balances[propietario] >= autoMintAmount, "Propietario no tiene suficientes tokens");
            
            haRecibidoTokensIniciales[usuario] = true;
            tokensDistribuidosHoy += autoMintAmount;
            
            // Transferir tokens del propietario al usuario
            _balances[propietario] -= autoMintAmount;
            _balances[usuario] += autoMintAmount;
            
            emit Transfer(propietario, usuario, autoMintAmount);
            emit TokensAutomaticosOtorgados(usuario, autoMintAmount);
        }
    }

    /**
     * @dev Verifica y resetea el límite diario si es necesario
     */
    function _verificarLimiteDiario() internal {
        if (block.timestamp >= ultimoResetDiario + 1 days) {
            tokensDistribuidosHoy = 0;
            ultimoResetDiario = block.timestamp;
        }
    }

    /**
     * @dev Permite al admin activar/desactivar el auto-mint
     */
    function toggleAutoMint(bool _activado) external soloPropietario {
        autoMintEnabled = _activado;
        emit AutoMintActivado(_activado);
    }

    /**
     * @dev Permite al admin cambiar la cantidad de tokens por auto-mint
     */
    function setAutoMintAmount(uint256 _cantidad) external soloPropietario {
        require(_cantidad > 0 && _cantidad <= maxTokensPorUsuario, "Cantidad invalida");
        autoMintAmount = _cantidad;
        emit AutoMintCantidadCambiada(_cantidad);
    }    /**
     * @dev Permite al admin dar tokens manualmente a usuarios específicos mediante transferencia
     */
    function distribuirTokens(address usuario, uint256 cantidad) external soloPropietario {
        require(usuario != address(0), "Direccion invalida");
        require(cantidad > 0, "Cantidad debe ser mayor a 0");
        require(_balances[propietario] >= cantidad, "Propietario no tiene suficientes tokens");
        
        // Registrar usuario si no está registrado
        if (!usuarioRegistrado[usuario]) {
            _registrarUsuario(usuario);
        }
        
        // Transferir tokens del propietario al usuario
        _balances[propietario] -= cantidad;
        _balances[usuario] += cantidad;
        
        emit Transfer(propietario, usuario, cantidad);
        emit TokensDistribuidos(msg.sender, usuario, cantidad);
    }

    /**
     * @dev Permite a los usuarios solicitar tokens iniciales manualmente
     */
    function solicitarTokensIniciales() external autoRegistrarUsuario {
        require(autoMintEnabled, "Auto-mint no esta habilitado");
        require(!haRecibidoTokensIniciales[msg.sender], "Ya has recibido tokens iniciales");
        require(_balances[msg.sender] == 0, "Ya tienes tokens");
        
        _darTokensIniciales(msg.sender);
    }    /**
     * @dev Distribución masiva de tokens a todos los usuarios registrados mediante transferencia
     */
    function distribucionMasiva(uint256 cantidadPorUsuario) external soloPropietario {
        require(cantidadPorUsuario > 0, "Cantidad invalida");
        
        uint256 totalNecesario = cantidadPorUsuario * usuariosRegistrados.length;
        require(_balances[propietario] >= totalNecesario, "Propietario no tiene suficientes tokens");
        
        for (uint i = 0; i < usuariosRegistrados.length; i++) {
            address usuario = usuariosRegistrados[i];
            if (usuario != address(0) && usuario != propietario) {
                _balances[propietario] -= cantidadPorUsuario;
                _balances[usuario] += cantidadPorUsuario;
                emit Transfer(propietario, usuario, cantidadPorUsuario);
            }
        }
    }

    //================================================================================
    // Funciones de Votación (Lógica Principal) - ACTUALIZADA
    //================================================================================

    /**
     * @dev Emite un voto por un candidato, quemando tokens del votante.
     * @param _candidato El nombre del candidato por el cual votar.
     */
    function emitirVoto(string calldata _candidato) external siVotacionActiva autoRegistrarUsuario {
        require(_existeCandidato[_candidato], "Error: El candidato no existe");
        require(!haVotadoEnEleccion[idEleccionActual][msg.sender], "Error: Ya has votado en esta eleccion");
        require(balanceOf(msg.sender) >= COSTO_VOTO, "Error: No tienes suficientes tokens para votar");

        // Marcar como votado antes de la operación para prevenir reentrada
        haVotadoEnEleccion[idEleccionActual][msg.sender] = true;
        
        // Incrementar el conteo de votos
        conteoVotos[_candidato]++;

        // Quemar los tokens del votante
        _burn(msg.sender, COSTO_VOTO);

        emit VotoEmitido(msg.sender, _candidato, idEleccionActual);
    }

    //================================================================================
    // ✅ NUEVO: Funciones de Consulta para Usuarios
    //================================================================================

    function obtenerVotantesRegistrados() external view returns (address[] memory) {
        return usuariosRegistrados;
    }

    function obtenerEstadisticasUsuarios() external view returns (
        uint256 totalUsuarios,
        uint256 usuariosConTokens,
        uint256 tokensDistribuidosHoyActual,
        uint256 limiteDistribucionDiaria
    ) {
        uint256 conTokens = 0;
        for (uint i = 0; i < usuariosRegistrados.length; i++) {
            if (_balances[usuariosRegistrados[i]] > 0) {
                conTokens++;
            }
        }
        
        return (
            usuariosRegistrados.length,
            conTokens,
            tokensDistribuidosHoy,
            limiteDiarioAutoMint
        );
    }    function puedeRecibirTokens(address usuario) external view returns (bool) {
        return !haRecibidoTokensIniciales[usuario] && _balances[usuario] == 0;
    }

    /**
     * @dev Verifica si el propietario tiene suficientes tokens para distribución
     */
    function balancePropietario() external view returns (uint256) {
        return _balances[propietario];
    }

    /**
     * @dev Calcula cuántos tokens necesita el propietario para dar a todos los usuarios registrados
     */
    function tokensNecesariosParaTodos() external view returns (uint256) {
        uint256 usuariosSinTokens = 0;
        for (uint i = 0; i < usuariosRegistrados.length; i++) {
            if (!haRecibidoTokensIniciales[usuariosRegistrados[i]] && _balances[usuariosRegistrados[i]] == 0) {
                usuariosSinTokens++;
            }
        }
        return usuariosSinTokens * autoMintAmount;
    }

    /**
     * @dev Permite al admin resetear el estado de tokens iniciales de un usuario
     * Útil para casos donde un usuario necesita solicitar tokens nuevamente
     */
    function resetearEstadoTokensIniciales(address usuario) external soloPropietario {
        require(usuario != address(0), "Direccion invalida");
        haRecibidoTokensIniciales[usuario] = false;
        emit TokensAutomaticosOtorgados(usuario, 0); // Evento para indicar reset
    }

    /**
     * @dev Permite al admin resetear múltiples usuarios a la vez
     */
    function resetearEstadoTokensInicialsesMasivo(address[] calldata usuarios) external soloPropietario {
        for (uint i = 0; i < usuarios.length; i++) {
            if (usuarios[i] != address(0)) {
                haRecibidoTokensIniciales[usuarios[i]] = false;
            }
        }
    }

    //================================================================================
    // Funciones de Administración (soloPropietario) - SIN CAMBIOS
    //================================================================================

    function iniciarNuevaEleccion(string calldata _nombreEleccion) external soloPropietario {
        require(!votacionActiva, "Error: Deten la votacion actual antes de iniciar una nueva");
        require(bytes(_nombreEleccion).length > 0, "Error: El nombre de la eleccion no puede estar vacio");

        // Guardar la elección actual en el historial si tuvo votos
        uint256 votosTotales = obtenerVotosTotales();
        if (votosTotales > 0) {
            historialElecciones.push(InfoEleccion({
                nombre: nombreEleccionActual,
                id: idEleccionActual,
                votosTotales: votosTotales,
                completada: true,
                fechaFinalizacion: block.timestamp
            }));
        }

        // Iniciar nueva elección
        idEleccionActual++;
        nombreEleccionActual = _nombreEleccion;

        // Reiniciar conteo de votos para los candidatos existentes
        for (uint i = 0; i < candidatos.length; i++) {
            conteoVotos[candidatos[i]] = 0;
        }

        emit EleccionIniciada(idEleccionActual, _nombreEleccion);
    }

    function agregarCandidato(string calldata _candidato) external soloPropietario {
        require(bytes(_candidato).length > 0, "Error: El nombre del candidato no puede estar vacio");
        require(!_existeCandidato[_candidato], "Error: El candidato ya existe");

        candidatos.push(_candidato);
        _existeCandidato[_candidato] = true;
        conteoVotos[_candidato] = 0; // Inicializar conteo de votos

        emit CandidatoAgregado(_candidato);
    }

    function eliminarCandidato(string calldata _candidato) external soloPropietario {
        require(_existeCandidato[_candidato], "Error: El candidato no existe");
        require(!votacionActiva, "Error: No se puede eliminar candidatos mientras la votacion este activa");

        // Encontrar y eliminar el candidato del array (swap-and-pop)
        for (uint i = 0; i < candidatos.length; i++) {
            if (keccak256(bytes(candidatos[i])) == keccak256(bytes(_candidato))) {
                candidatos[i] = candidatos[candidatos.length - 1];
                candidatos.pop();
                break;
            }
        }

        delete _existeCandidato[_candidato];
        delete conteoVotos[_candidato];

        emit CandidatoEliminado(_candidato);
    }
    
    function activarVotacion(bool _activa) external soloPropietario {
        votacionActiva = _activa;
        emit VotacionActivada(_activa);
    }
    
    function transferirPropiedad(address _nuevoPropietario) external soloPropietario {
        require(_nuevoPropietario != address(0), "Error: El nuevo propietario no puede ser la direccion cero");
        address propietarioAnterior = propietario;
        propietario = _nuevoPropietario;
        emit TransferenciaDePropiedad(propietarioAnterior, _nuevoPropietario);
    }

    //================================================================================
    // Funciones de Consulta (Vista Pública) - SIN CAMBIOS
    //================================================================================

    function obtenerCandidatos() external view returns (string[] memory) {
        return candidatos;
    }

    function obtenerVotosTotales() public view returns (uint256) {
        uint256 total = 0;
        for (uint i = 0; i < candidatos.length; i++) {
            total += conteoVotos[candidatos[i]];
        }
        return total;
    }
    
    function obtenerResultados() external view returns (string[] memory, uint256[] memory) {
        string[] memory nombres = new string[](candidatos.length);
        uint256[] memory votos = new uint256[](candidatos.length);
        
        for (uint i = 0; i < candidatos.length; i++) {
            nombres[i] = candidatos[i];
            votos[i] = conteoVotos[candidatos[i]];
        }
        
        return (nombres, votos);
    }

    //================================================================================
    // Funciones del Token (ERC20) - SIN CAMBIOS
    //================================================================================
    
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        _transfer(from, to, amount);
        _approve(from, msg.sender, currentAllowance - amount);
        return true;
    }

    function mint(address to, uint256 amount) public soloPropietario {
        require(to != address(0), "ERC20: mint to the zero address");
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");

        _balances[from] = fromBalance - amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        allowance[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");
        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        
        _balances[account] = accountBalance - amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }
}