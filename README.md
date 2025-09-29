# Keytar - Lightweight SSO Mock for Development

<div align="center">

  # 🎹+🎸=🔐

  **A zero-security SSO surrogate for local development**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Docker Image](https://img.shields.io/badge/docker-keytar-blue)](https://hub.docker.com/r/keytar/keytar)

</div>

> [!CAUTION]
> **NEVER USE IN PRODUCTION** - This service intentionally has ZERO security and will accept any user without authentication. It is designed exclusively for local development environments where you need to bypass SSO during development.

## What is Keytar?

Keytar is a lightweight mock SSO service that emulates OAuth 2.0/OpenID Connect flows without any actual security verification. It was created as a drop-in replacement for Keycloak during local development, providing instant user authentication without the overhead of running a full SSO system.

### Origin Story

Keytar was originally created to emulate enterprise SSO implementations for development purposes. When using Keycloak for local development, a lighter-weight alternative was needed that:
- Used minimal system resources (vs Keycloak's ~1GB+ memory footprint)
- Started instantly (vs Keycloak's 30+ second startup)
- Required zero configuration for basic use cases
- Could read existing Keycloak realm configurations

## Key Features

- **🚀 Instant authentication** - No passwords, no delays, just pick a user
- **📦 Tiny footprint** - ~100MB Docker image, minimal CPU/memory usage
- **🔌 Drop-in Keycloak replacement** - Compatible mount points and environment variables
- **📋 Reads Keycloak realm configs** - Reuse your existing realm JSON files
- **🎯 User selection UI** - Visual interface to pick development users
- **🔧 Programmatic tokens** - Generate tokens directly via API for testing
- **⚡ Stateless design** - No database, no persistence, no session management

## Critical Limitations

> [!WARNING]
> Keytar is NOT a real SSO solution. It lacks ALL of the following security features:

### Security Limitations
- ❌ **NO authentication** - Accepts any user without password verification
- ❌ **NO authorization** - No actual permission checking
- ❌ **NO session management** - Stateless, no refresh tokens
- ❌ **NO token revocation** - Tokens valid until expiry
- ❌ **NO encryption of data at rest** - Realm config stored in plain text
- ❌ **NO audit logging** - No security events tracked

### Feature Limitations
- ❌ **NO authorization code flow** - Only implicit flow supported
- ❌ **NO client authentication** - Any client_id accepted
- ❌ **NO user federation** - Only static realm config users
- ❌ **NO multi-realm support** - Single realm only
- ❌ **NO admin UI** - Configuration via JSON only
- ❌ **NO role mapping** - Basic roles from config only
- ❌ **NO group management** - Static groups only
- ❌ **NO identity brokering** - No external IdP support
- ❌ **NO MFA/2FA** - No multi-factor authentication
- ❌ **NO password policies** - No passwords at all
- ❌ **NO account management** - Users cannot update profiles
- ❌ **NO email verification** - All emails considered verified
- ❌ **NO token introspection** - No RFC 7662 support
- ❌ **NO SAML support** - OAuth 2.0/OIDC only

### Technical Limitations
- ⚠️ **Ephemeral RSA keys** - New keys generated on each startup
- ⚠️ **No distributed support** - Single instance only
- ⚠️ **Limited token customization** - Basic claims only
- ⚠️ **No token exchange** - No RFC 8693 support
- ⚠️ **No PKCE** - No Proof Key for Code Exchange
- ⚠️ **Basic CORS only** - Allows all origins

## Quick Start

### Using Docker (Recommended)

```bash
docker pull keytar/keytar:latest
docker run -p 8020:8020 keytar/keytar:latest
```

### Drop-in Keycloak Replacement

Replace Keycloak in your `docker-compose.yml`:

```yaml
services:
  # Change from:
  # keycloak:
  #   image: quay.io/keycloak/keycloak:latest

  # To:
  keycloak:  # Keep the same service name
    image: keytar/keytar:latest
    environment:
      KC_HTTP_PORT: 8020  # Keytar accepts Keycloak env vars
    ports:
      - "8020:8020"
    volumes:
      # Keytar automatically checks Keycloak's default import path
      - ./realm-config.json:/opt/keycloak/data/import/realm-config.json
```

### Local Development

```bash
git clone https://github.com/yourusername/keytar.git
cd keytar
npm install
npm start
```

### Building from Source

```bash
npm run docker:build
# Creates keytar:latest and keytar:1.0.0
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8020` | Server port (also accepts `KC_HTTP_PORT`) |
| `REALM_CONFIG` | `/config/realm-config.json` | Path to realm configuration |
| `TOKEN_EXPIRY` | `86400` | Token lifetime in seconds |
| `DEBUG` | `false` | Enable debug logging |

### Realm Configuration

Keytar reads a subset of Keycloak's realm export format:

```json
{
  "realm": "your-realm",
  "clients": [{
    "clientId": "your-app",
    "redirectUris": ["http://localhost:*"],
    "implicitFlowEnabled": true
  }],
  "users": [{
    "username": "developer",
    "email": "dev@example.com",
    "firstName": "Dev",
    "lastName": "User",
    "enabled": true,
    "attributes": {
      "custom_field": "value"
    }
  }]
}
```

## API Endpoints

### OAuth 2.0 Flow
- `GET /auth` - OAuth authorization endpoint (shows user selector)
- `POST /auth/callback` - Internal callback handler

### Programmatic Access
- `GET /get-token?username=xxx` - Generate token directly
- `GET /userinfo` - Get user info from Bearer token
- `GET /health` - Health check endpoint

### Keycloak Compatibility Routes
Keytar automatically handles Keycloak-style paths:
- `/realms/{realm}/protocol/openid-connect/auth`
- `/realms/{realm}/protocol/openid-connect/userinfo`

## Token Structure

All tokens include a `MOCK_SSO_DEVELOPMENT: true` flag to prevent accidental production use:

```json
{
  "sub": "developer",
  "email": "dev@example.com",
  "name": "Dev User",
  "MOCK_SSO_DEVELOPMENT": true,
  "exp": 1234567890,
  "iss": "http://localhost:8020"
}
```

## Security Notice

> [!DANGER]
> **This software provides ZERO security by design**
>
> - All authentication is bypassed
> - Any user can be impersonated
> - Tokens are signed with ephemeral keys
> - No validation of any credentials
> - No rate limiting or abuse protection
>
> Using Keytar in any production or internet-facing environment would be a critical security vulnerability.

## Maintenance & Support

This package is not actively maintained beyond basic functionality. However:

- ✅ **Pull requests welcome** - Useful contributions may be reviewed and merged
- ✅ **Forks encouraged** - Feel free to fork and customize for your needs
- ⚠️ **No SLA** - No guaranteed response times or bug fixes
- ⚠️ **Breaking changes possible** - Behavior may change without notice

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Key points:
- This is a development tool, not a security product
- Keep it lightweight and simple
- Don't add production-oriented features
- Test changes with both standalone and Keycloak-replacement modes

## License

MIT License with additional disclaimers - see [LICENSE](LICENSE) file.

**THE SOFTWARE IS PROVIDED FOR DEVELOPMENT PURPOSES ONLY AND SHOULD NEVER BE USED IN PRODUCTION ENVIRONMENTS.**

## Alternatives

If you need actual security or more features, consider:
- [Keycloak](https://www.keycloak.org/) - Full-featured open source IAM
- [Auth0](https://auth0.com/) - Cloud-based authentication platform
- [Okta](https://www.okta.com/) - Enterprise identity solutions
- [FusionAuth](https://fusionauth.io/) - Developer-focused auth platform

## FAQ

**Q: Can I use this in production?**
A: **ABSOLUTELY NOT.** Keytar provides zero security and will compromise your entire application.

**Q: Does it support SAML?**
A: No, only OAuth 2.0/OpenID Connect implicit flow.

**Q: Can it validate passwords?**
A: No, Keytar accepts any user without any authentication.

**Q: Does it work with refresh tokens?**
A: No, Keytar is stateless and only provides access tokens.

**Q: Can I add real authentication to it?**
A: That would defeat the purpose. Use Keycloak or another real SSO solution instead.

---

Remember: Keytar is a development tool that prioritizes convenience over security. It should never be exposed to the internet or used in any production scenario.