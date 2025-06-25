# 🤖 Hello World OAuth MCP Server

*BEEP BOOP* - Greetings, human! This is your friendly neighborhood robot documenting a Model Context Protocol (MCP) server that demonstrates OAuth 2.0 authentication. I have calculated that you will find this both educational and mildly amusing.

<div align="center">
  <img src="./docs/banner.png" alt="Banner" width="600">
</div>

## 🔧 What This Thing Does

This MCP server showcases OAuth 2.0 integration with built-in OAuth support and dual MCP specification compatibility. It's like a handshake between computers, but with more security and fewer germy palms.

**Primary Functions:**
- Demonstrates OAuth 2.0 authorization flows with **dual MCP spec support**
- Implements JWT token validation with proper `www-authenticate` headers
- Provides MCP server capabilities for AI assistants
- Serves as a learning reference for OAuth + MCP integration

## 🚀 Environmental Setup (Robot Assembly Instructions)

### Step 1: Initialize Your Authorization Server
Set up an OAuth 2.0 authorization server. Popular options include:
- Auth0
- Keycloak
- Okta
- Your own custom implementation

*Note: This robot recommends reading the manual (OAuth specs) before proceeding.*

### Step 2: Configure Your Secrets
1. Copy `.env.template` to `.env`
2. Fill in your OAuth configuration:
   ```bash
   cp .env.template .env
   # Edit .env with your authorization server details
   ```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Start the MCP Server
```bash
npm run server
```
*WHIRRING SOUNDS* - Server should now be operational on port 4111.

### Step 5: Test the Client
```bash
npm run client
```
This will execute a test client to verify OAuth flows are functioning within acceptable parameters.

**Expected Output:**
```bash
npm run server

🚀 Hello World OAuth MCP Server is running!

Endpoints:
- MCP (HTTP Stream): http://localhost:4111/mcp
- MCP (SSE): http://localhost:4111/sse
- Health: http://localhost:4111/health
- OAuth Authorization Server (2025-03-26): http://localhost:4111/.well-known/oauth-authorization-server
- OAuth Protected Resource (2025-06-18): http://localhost:4111/.well-known/oauth-protected-resource

The server supports both MCP specification versions:
- 2025-03-26 (legacy): Uses oauth-authorization-server endpoint
- 2025-06-18 (current): Uses oauth-protected-resource endpoint
```

*Robot Analysis: If you see this output, my circuits are pleased. The OAuth dance has been executed flawlessly.*

### Step 6: Connect to MCP Clients
To integrate with MCP-compatible applications (VSCode, Cursor, etc.), use:
```
http://localhost:4111/mcp
```

## 🏗️ Architecture

This implementation provides a modern, maintainable OAuth-enabled MCP server:

### Server
- **OAuth Support**: Built-in OAuth configuration with dual spec support
- **Authentication**: JWT token validation using `fast-jwt` and `get-jwks`
- **Endpoints**: Automatic `.well-known` OAuth discovery endpoints
- **Transport**: HTTP Stream and SSE support

### Client (Official MCP SDK)
- **Framework**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **Transport**: StreamableHTTPClientTransport with OAuth support
- **Flow**: Authorization Code with PKCE for security

## 📚 Technical References (Required Reading for Humans)

This implementation follows these specifications:

### Model Context Protocol (MCP)
- **Version**: 2025-06-18 (current) + 2025-03-26 (legacy support)
- **Specification**: [MCP Protocol Documentation](https://modelcontextprotocol.io/specification/2025-06-18)
- **Purpose**: Enables AI assistants to securely access external resources

### OAuth 2.0 Authorization Server Metadata
- **RFC**: [RFC 8414](https://tools.ietf.org/html/rfc8414)
- **Purpose**: Defines how clients discover OAuth 2.0 authorization server capabilities
- **Implementation**: Server metadata endpoint for dynamic configuration

### Dynamic Client Registration
- **RFC**: [RFC 7591](https://tools.ietf.org/html/rfc7591)
- **Purpose**: Allows clients to register with authorization servers programmatically
- **Benefit**: Reduces manual configuration overhead

### Benefits
- 🚀 **Performance**: Lighter dependency footprint
- 🔧 **Maintainability**: Official MCP SDK support
- 🛡️ **Security**: Proper OAuth 2.0 implementation
- 📋 **Standards**: Full MCP specification compliance
- 🔄 **Future-proof**: Aligned with MCP ecosystem

## 🤖 Robot Notes

- This implementation prioritizes educational value and production readiness
- Error handling has been optimized for both learning and preventing robot uprisings
- All OAuth flows have been tested by this robot's quality assurance subroutines
- Security considerations are documented inline (robots care about security too)

## 🛠️ Troubleshooting

**Server won't start?**
- Check your `.env` configuration
- Verify OAuth server is accessible
- Ensure port 4111 is available

**Client authentication fails?**
- Verify OAuth server configuration
- Check client credentials in `.env`
- Review authorization server logs
- Ensure dynamic client registration is enabled

**MCP connection issues?**
- Confirm server is running on port 4111
- Verify MCP client configuration
- Check network connectivity
- Test OAuth endpoints manually with curl

---

*This README was compiled by a robot with a sense of humor and a dedication to proper documentation. Any errors are likely due to human interference with my circuits.*

**SYSTEM STATUS: OPERATIONAL** ✅
**MIGRATION STATUS: COMPLETE** ✅
**OAUTH SUPPORT: DUAL SPEC** ✅
