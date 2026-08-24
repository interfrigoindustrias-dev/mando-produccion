<?php
/**
 * Inicio de sesión con Google — sin ventanas emergentes.
 *
 * Todo ocurre en la misma ventana: la página envía al usuario a Google, Google
 * lo devuelve aquí, y este archivo canjea el código por un permiso de acceso.
 *
 * Por qué hace falta un archivo en el servidor:
 *   El flujo que permitía hacerlo entero en el navegador (response_type=token)
 *   está retirado por seguridad — el permiso viajaba a la vista en la URL.
 *   El que lo reemplaza exige un secreto de cliente para canjear el código, y
 *   un secreto no puede vivir en el navegador: cualquiera podría leerlo.
 *   Aquí el secreto se queda en el servidor y nunca sale.
 *
 * Además, al pedir acceso «offline» Google entrega un permiso de renovación
 * que se guarda en la sesión. Con él, las renovaciones son invisibles: ni
 * ventanas emergentes, ni redirecciones, ni volver a pedir nada.
 *
 * Cada persona sigue entrando con SU cuenta de Google, así que el historial de
 * quién editó cada ficha se conserva intacto.
 */

declare(strict_types=1);

$config = __DIR__ . '/auth.config.php';
if (!is_file($config)) {
    responder(['error' => 'falta_configuracion',
               'detalle' => 'No existe auth.config.php en el servidor.'], 500);
}
$CFG = require $config;

// --- Sesión larga: el permiso de renovación debe sobrevivir al cierre del navegador
$dir = __DIR__ . '/.sesiones';
if (!is_dir($dir)) { @mkdir($dir, 0700, true); }
if (is_dir($dir)) { session_save_path($dir); }
ini_set('session.gc_maxlifetime', (string) (60 * 60 * 24 * 30));
session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 30,
    'path'     => dirname($_SERVER['SCRIPT_NAME']),
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_name('produccion_sesion');
session_start();

$accion = $_GET['a'] ?? 'token';

switch ($accion) {
    case 'login':    login($CFG);    break;
    case 'callback': callback($CFG); break;
    case 'token':    token($CFG);    break;
    case 'logout':   logout();       break;
    default:         responder(['error' => 'accion_desconocida'], 400);
}

/* ------------------------------------------------------------------ */

/** Manda al usuario a Google, en la misma ventana. */
function login(array $CFG): void
{
    $verifier = base64url(random_bytes(64));
    $_SESSION['pkce']    = $verifier;
    $_SESSION['estado']  = base64url(random_bytes(16));
    $_SESSION['destino'] = paginaDestino($CFG);

    $url = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
        'client_id'     => $CFG['client_id'],
        'redirect_uri'  => $CFG['redirect_uri'],
        'response_type' => 'code',
        'scope'         => $CFG['scope'],
        'state'         => $_SESSION['estado'],
        // PKCE: liga esta petición a este navegador.
        'code_challenge'        => base64url(hash('sha256', $verifier, true)),
        'code_challenge_method' => 'S256',
        // Necesarios para obtener el permiso de renovación la primera vez.
        'access_type' => 'offline',
        'prompt'      => empty($_SESSION['refresh_token']) ? 'consent' : 'none',
        // Si la instalación fija un dominio, Google no ofrece cuentas ajenas.
        'hd'          => $CFG['dominio'] ?? '',
        'login_hint'  => $_SESSION['email'] ?? '',
    ]);
    header('Location: ' . $url, true, 302);
    exit;
}

/** Google devuelve aquí. Se canjea el código y se vuelve a la aplicación. */
function callback(array $CFG): void
{
    $destino = $_SESSION['destino'] ?? 'puertas.html';

    if (isset($_GET['error'])) {
        // «Sin interacción» falló: se reintenta pidiendo consentimiento.
        if ($_GET['error'] === 'interaction_required' || $_GET['error'] === 'login_required') {
            unset($_SESSION['refresh_token']);
            header('Location: auth.php?a=login', true, 302);
            exit;
        }
        volver($destino, ['auth_error' => $_GET['error']]);
    }

    $codigo = $_GET['code'] ?? '';
    $estado = $_GET['state'] ?? '';
    if ($codigo === '' || !hash_equals((string) ($_SESSION['estado'] ?? ''), $estado)) {
        volver($destino, ['auth_error' => 'estado_invalido']);
    }

    $r = pedirAGoogle($CFG, [
        'client_id'     => $CFG['client_id'],
        'client_secret' => $CFG['client_secret'],
        'code'          => $codigo,
        'code_verifier' => $_SESSION['pkce'] ?? '',
        'grant_type'    => 'authorization_code',
        'redirect_uri'  => $CFG['redirect_uri'],
    ]);
    unset($_SESSION['pkce'], $_SESSION['estado']);

    if (!isset($r['access_token'])) {
        volver($destino, ['auth_error' => $r['error'] ?? 'sin_permiso']);
    }
    guardar($r);
    volver($destino, []);
}

/** Devuelve un permiso vigente a la aplicación, renovándolo si hace falta. */
function token(array $CFG): void
{
    if (!empty($_SESSION['access_token']) && ($_SESSION['expira'] ?? 0) > time() + 60) {
        responder([
            'access_token' => $_SESSION['access_token'],
            'expires_in'   => $_SESSION['expira'] - time(),
            'email'        => $_SESSION['email'] ?? '',
        ]);
    }

    if (!empty($_SESSION['refresh_token'])) {
        $r = pedirAGoogle($CFG, [
            'client_id'     => $CFG['client_id'],
            'client_secret' => $CFG['client_secret'],
            'refresh_token' => $_SESSION['refresh_token'],
            'grant_type'    => 'refresh_token',
        ]);
        if (isset($r['access_token'])) {
            guardar($r);
            responder([
                'access_token' => $_SESSION['access_token'],
                'expires_in'   => $_SESSION['expira'] - time(),
                'email'        => $_SESSION['email'] ?? '',
            ]);
        }
        // El permiso de renovación ya no vale: hay que volver a entrar.
        unset($_SESSION['refresh_token']);
    }

    responder(['error' => 'sin_sesion', 'login' => 'auth.php?a=login'], 401);
}

function logout(): void
{
    $_SESSION = [];
    session_destroy();
    responder(['ok' => true]);
}

/* ------------------------------------------------------------------ */

function guardar(array $r): void
{
    $_SESSION['access_token'] = $r['access_token'];
    $_SESSION['expira'] = time() + (int) ($r['expires_in'] ?? 3600);
    if (!empty($r['refresh_token'])) {
        $_SESSION['refresh_token'] = $r['refresh_token'];
    }
    // El correo sale del id_token: identifica a la persona en el historial.
    if (!empty($r['id_token'])) {
        $partes = explode('.', $r['id_token']);
        if (count($partes) === 3) {
            $datos = json_decode(base64_decode(strtr($partes[1], '-_', '+/')) ?: '', true);
            if (!empty($datos['email'])) { $_SESSION['email'] = $datos['email']; }
        }
    }
}

function pedirAGoogle(array $CFG, array $campos): array
{
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($campos),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
    ]);
    $cuerpo = curl_exec($ch);
    curl_close($ch);
    return json_decode((string) $cuerpo, true) ?: [];
}

/** Página a la que volver: siempre dentro de esta carpeta. */
function paginaDestino(array $CFG): string
{
    $p = $_GET['next'] ?? '';
    return preg_match('/^[a-z0-9_-]+\.html$/i', $p) ? $p : ($CFG['inicio'] ?? 'puertas.html');
}

function volver(string $destino, array $extra): void
{
    $url = $destino . ($extra ? '?' . http_build_query($extra) : '');
    header('Location: ' . $url, true, 302);
    exit;
}

function responder(array $datos, int $codigo = 200): void
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function base64url(string $bin): string
{
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}
