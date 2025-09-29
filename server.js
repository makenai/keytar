const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || process.env.KC_HTTP_PORT || 8020;
const REALM_CONFIG_PATH = process.env.REALM_CONFIG || '/config/realm-config.json';
const TOKEN_EXPIRY = parseInt(process.env.TOKEN_EXPIRY) || 86400;
const DEBUG = process.env.DEBUG === 'true';

// Middleware
app.use(cors());
app.use(morgan(DEBUG ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Generate RSA key pair for signing tokens
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Load realm configuration
let realmConfig = null;
const configPaths = [
  REALM_CONFIG_PATH,
  '/opt/keycloak/data/import/realm-config.json' // KeyCloak default mount point
];

for (const configPath of configPaths) {
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    realmConfig = JSON.parse(configData);
    console.log(`✅ Loaded realm configuration from ${configPath}`);
    console.log(`📋 Found ${realmConfig.users?.length || 0} users`);
    break;
  } catch (error) {
    if (configPath === configPaths[configPaths.length - 1]) {
      console.error(`❌ Failed to load realm configuration:`, error.message);
    }
  }
}

if (!realmConfig) {
  console.log('💡 Using default configuration...');
  realmConfig = {
    realm: 'flow',
    accessTokenLifespan: TOKEN_EXPIRY,
    accessTokenLifespanForImplicitFlow: TOKEN_EXPIRY,
    clients: [{
      clientId: 'flow-auth',
      redirectUris: ['http://localhost:*'],
      implicitFlowEnabled: true,
      defaultClientScopes: ['profile', 'email'],
      optionalClientScopes: ['userinfo']
    }],
    users: [{
      username: 'test',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      enabled: true,
      attributes: {
        unique_name: 'test@int.example.com'
      }
    }],
    clientScopes: []
  };
}

// Startup warning
console.log('⚠️  Mock SSO - Development Only ⚠️');
console.log('🎹+🎸=🔐 Keytar is running!');

// Helper function to get user by username
function getUserByUsername(username) {
  return realmConfig.users?.find(u => u.username === username && u.enabled !== false);
}

// Helper function to generate JWT tokens
function generateTokens(user, clientId, nonce, scopes = []) {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + (realmConfig.accessTokenLifespanForImplicitFlow || TOKEN_EXPIRY);
  const sessionState = uuidv4();
  const jti = uuidv4();
  
  // Build user claims
  const userClaims = {
    sub: user.username,
    email: user.email,
    email_verified: user.emailVerified || true,
    name: `${user.firstName} ${user.lastName}`,
    preferred_username: user.username,
    given_name: user.firstName,
    family_name: user.lastName,
    unique_name: user.attributes?.unique_name || user.email
  };

  // Add group claim if available (from protocol mappers)
  const profileScope = realmConfig.clientScopes?.find(cs => cs.name === 'profile');
  const groupMapper = profileScope?.protocolMappers?.find(pm => pm.name === 'group');
  if (groupMapper?.config?.['claim.value']) {
    userClaims.group = groupMapper.config['claim.value'];
  }

  // Access token
  const accessToken = jwt.sign({
    exp: expiry,
    iat: now,
    auth_time: now,
    jti: jti,
    iss: `http://localhost:${PORT}`,
    aud: clientId,
    sub: user.username,
    typ: 'Bearer',
    azp: clientId,
    session_state: sessionState,
    acr: '1',
    scope: scopes.join(' '),
    ...userClaims,
    MOCK_SSO_DEVELOPMENT: true
  }, privateKey, { algorithm: 'RS256', keyid: 'mock-sso-key' });

  // ID token
  const idToken = jwt.sign({
    exp: expiry,
    iat: now,
    auth_time: now,
    jti: uuidv4(),
    iss: `http://localhost:${PORT}`,
    aud: clientId,
    sub: user.username,
    azp: clientId,
    session_state: sessionState,
    nonce: nonce,
    ...userClaims,
    MOCK_SSO_DEVELOPMENT: true
  }, privateKey, { algorithm: 'RS256', keyid: 'mock-sso-key' });

  return {
    access_token: accessToken,
    id_token: idToken,
    token_type: 'Bearer',
    expires_in: realmConfig.accessTokenLifespanForImplicitFlow || TOKEN_EXPIRY,
    session_state: sessionState
  };
}

// Helper function to validate redirect URI
function isValidRedirectUri(clientId, redirectUri) {
  const client = realmConfig.clients?.find(c => c.clientId === clientId);
  if (!client) return false;
  
  return client.redirectUris?.some(allowedUri => {
    // Handle wildcards
    if (allowedUri.includes('*')) {
      const pattern = allowedUri.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(redirectUri);
    }
    return allowedUri === redirectUri;
  });
}

// Routes

// GET /get-token - Programmatic token generation
app.get('/get-token', (req, res) => {
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: 'Missing username parameter' });
  }
  
  const user = getUserByUsername(username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const tokens = generateTokens(user, 'flow-auth', null, ['openid', 'email', 'profile', 'userinfo']);
  
  res.json({
    access_token: tokens.access_token,
    token_type: tokens.token_type,
    expires_in: tokens.expires_in
  });
});

// Handler for userinfo endpoint
const userinfoHandler = (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    
    // Extract user info from token
    const userInfo = {
      unique_name: decoded.unique_name,
      name: decoded.name,
      email: decoded.email,
      title: decoded.title || 'Software Engineer', // Default title
      group: decoded.group || 'Domain Users'
    };
    
    res.json(userInfo);
  } catch (error) {
    if (DEBUG) console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// GET /userinfo - Get user information from token
app.get('/userinfo', userinfoHandler);

// KeyCloak compatibility - match any path ending with /userinfo
app.get(/\/userinfo$/, userinfoHandler);

// Handler for auth endpoint
const authHandler = (req, res) => {
  const { client_id, redirect_uri, response_type, scope, nonce, state } = req.query;
  
  // Validate required parameters
  if (!client_id || !redirect_uri || !response_type) {
    return res.status(400).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>🎹+🎸=🔐</h1>
          <h2>Error: Missing required parameters</h2>
          <p>client_id, redirect_uri, and response_type are required</p>
        </body>
      </html>
    `);
  }
  
  // Validate client
  const client = realmConfig.clients?.find(c => c.clientId === client_id);
  if (!client) {
    return res.status(400).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>🎹+🎸=🔐</h1>
          <h2>Error: Invalid client_id</h2>
          <p>Client "${client_id}" not found</p>
        </body>
      </html>
    `);
  }
  
  // Validate redirect URI
  if (!isValidRedirectUri(client_id, redirect_uri)) {
    console.warn(`⚠️  Redirect URI "${redirect_uri}" not in allowed list for client "${client_id}"`);
  }
  
  // Get enabled users
  const users = realmConfig.users?.filter(u => u.enabled !== false) || [];
  
  // Generate user selection HTML
  const userOptions = users.map(user => `
    <div style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer;"
         onclick="selectUser('${user.username}')">
      <h3 style="margin: 0 0 10px 0;">${user.firstName} ${user.lastName}</h3>
      <p style="margin: 5px 0; color: #666;">${user.email}</p>
      <p style="margin: 5px 0; color: #888;">Roles: ${user.realmRoles?.join(', ') || 'user'}</p>
    </div>
  `).join('');
  
  const html = `
    <html>
      <head>
        <title>Keytar SSO - Select User</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 {
            text-align: center;
            font-size: 48px;
            margin: 0 0 20px 0;
          }
          h2 {
            text-align: center;
            color: #333;
            margin: 0 0 30px 0;
          }
          .loading {
            display: none;
            text-align: center;
            padding: 40px;
          }
          .loading .note {
            font-size: 48px;
            animation: bounce 0.5s ease-in-out infinite alternate;
          }
          @keyframes bounce {
            from { transform: translateY(0); }
            to { transform: translateY(-20px); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎹+🎸=🔐</h1>
          <div id="userSelection">
            <h2>Select Development User:</h2>
            ${userOptions}
          </div>
          <div id="loading" class="loading">
            <div class="note">🎵</div>
            <p>Logging in...</p>
          </div>
        </div>
        
        <script>
          function selectUser(username) {
            document.getElementById('userSelection').style.display = 'none';
            document.getElementById('loading').style.display = 'block';
            
            // Short delay for loading animation
            setTimeout(() => {
              const form = document.createElement('form');
              form.method = 'POST';
              form.action = window.location.pathname + '/callback';
              
              // Add all parameters
              form.innerHTML = \`
                <input type="hidden" name="username" value="\${username}">
                <input type="hidden" name="client_id" value="${client_id}">
                <input type="hidden" name="redirect_uri" value="${redirect_uri}">
                <input type="hidden" name="response_type" value="${response_type}">
                <input type="hidden" name="scope" value="${scope || 'openid email profile'}">
                <input type="hidden" name="nonce" value="${nonce || ''}">
                <input type="hidden" name="state" value="${state || ''}">
              \`;
              
              document.body.appendChild(form);
              form.submit();
            }, 1000);
          }
        </script>
      </body>
    </html>
  `;
  
  res.send(html);
};

// GET /auth - OAuth authorization endpoint
app.get('/auth', authHandler);

// KeyCloak compatibility - match any path ending with /auth
app.get(/\/auth$/, authHandler);

// Handler for auth callback
const authCallbackHandler = express.urlencoded({ extended: true });
const authCallbackLogic = (req, res) => {
  const { username, client_id, redirect_uri, response_type, scope, nonce, state } = req.body;
  
  const user = getUserByUsername(username);
  if (!user) {
    return res.status(400).send('User not found');
  }
  
  // Generate tokens
  const scopes = scope ? scope.split(' ') : ['openid', 'email', 'profile'];
  const tokens = generateTokens(user, client_id, nonce, scopes);
  
  // Build redirect URL with tokens in hash fragment
  const redirectUrl = new URL(redirect_uri);
  const hashParams = new URLSearchParams({
    access_token: tokens.access_token,
    id_token: tokens.id_token,
    token_type: tokens.token_type,
    expires_in: tokens.expires_in.toString(),
    session_state: tokens.session_state
  });
  
  if (state) {
    hashParams.append('state', state);
  }
  
  redirectUrl.hash = hashParams.toString();
  
  // Redirect to client
  res.redirect(redirectUrl.toString());
};

// POST /auth/callback - Handle user selection
app.post('/auth/callback', authCallbackHandler, authCallbackLogic);

// KeyCloak compatibility - match any path ending with /auth/callback
app.post(/\/auth\/callback$/, authCallbackHandler, authCallbackLogic);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'keytar' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Keytar SSO mock service listening on port ${PORT}`);
  console.log(`📍 Auth endpoint: http://localhost:${PORT}/auth`);
  console.log(`📍 Token endpoint: http://localhost:${PORT}/get-token`);
  console.log(`📍 User info endpoint: http://localhost:${PORT}/userinfo`);
});