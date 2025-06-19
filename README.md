# 🤖 Hello World OAuth MCP Server

*BEEP BOOP* - Greetings, human! This is your friendly neighborhood robot documenting a Model Context Protocol (MCP) server that demonstrates OAuth 2.0 authentication. I have calculated that you will find this both educational and mildly amusing.

<div align="center">
  <img src="./docs/banner.png" alt="Banner" width="600">
</div>

## 🔧 What This Thing Does

This MCP server showcases OAuth 2.0 integration using dynamic client registration. It's like a handshake between computers, but with more security and fewer germy palms.

**Primary Functions:**
- Demonstrates OAuth 2.0 authorization flows
- Implements dynamic client registration
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
npm run dev
```
*WHIRRING SOUNDS* - Server should now be operational on port 4111.

### Step 5: Test the Client
```bash
npm run client
```
This will execute a test client to verify OAuth flows are functioning within acceptable parameters.

**Expected Output:**
```bash
npm run client                                                                             1045ms

> hello-world-oauth-mcp@1.0.0 client
> tsx ./src/client/client.ts

🚀 Starting OAuth authentication flow...
🔍 Discovered OAuth endpoints: {
  issuer: 'http://auth-server.example.com',
  authorization_endpoint: 'http://auth-server.example.com/oauth/2/authorize',
  token_endpoint: 'http://auth-server.example.com/token',
  jwks_uri: 'http://auth-server.example.com/openidconnect/jwks',
  response_types_supported: [ 'code' ],
  grant_types_supported: [ 'authorization_code' ],
  code_challenge_methods_supported: [ 'S256', 'plain' ],
  scopes_supported: [ 'mcp' ],
  token_endpoint_auth_methods_supported: [ 'none' ],
  response_modes_supported: [ 'query', 'fragment' ],
  subject_types_supported: [ 'public' ],
  token_endpoint_auth_signing_alg_values_supported: [ 'RS256' ],
  id_token_signing_alg_values_supported: [ 'RS256' ],
  registration_endpoint: 'http://auth-server.example.com/oauth/2/register/clients'
}
📝 Registering OAuth client...
✅ Client registered successfully: {
  client_id: '01234567-89ab-cdef-0123-456789abcdef',
  client_name: 'My Dynamic MCP Client',
  redirect_uris: [ 'http://localhost:7080/callback' ],
  grant_types: [ 'authorization_code' ],
  response_types: [ 'code' ],
  token_endpoint_auth_method: 'none'
}
📖 Opening browser for authorization...
🔗 Callback server started on http://localhost:7080
🎫 Access token obtained successfully
🔌 Connected to MCP server with authentication
✅ Authentication and connection complete!
🔧 Calling tool: helloWorldServer_helloTool with args: { name: 'Alice' }
✨ Tool result: {
  content: [
    {
      type: 'text',
      text: 'Hello Alice! (From: OAuth Demo Server | Client: example-client | Audience: https://api.example.com)'
    }
  ],
  isError: false
}
```

*Robot Analysis: If you see this output, my circuits are pleased. The OAuth dance has been executed flawlessly.*

### Step 6: Connect to MCP Clients
To integrate with MCP-compatible applications (VSCode, Cursor, etc.), use:
```
http://localhost:4111/api/mcp/hello-world-mcp-server/mcp
```

## 📚 Technical References (Required Reading for Humans)

This implementation follows these specifications:

### Model Context Protocol (MCP)
- **Version**: 2025-06-19
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

## 🤖 Robot Notes

- This implementation prioritizes educational value over production readiness
- Error handling has been optimized for learning, not for preventing robot uprisings
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

**MCP connection issues?**
- Confirm server is running on port 4111
- Verify MCP client configuration
- Check network connectivity

---

*This README was compiled by a robot with a sense of humor and a dedication to proper documentation. Any errors are likely due to human interference with my circuits.*

**SYSTEM STATUS: OPERATIONAL** ✅
