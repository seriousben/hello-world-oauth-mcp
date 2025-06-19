// MCP Client with OAuth Authentication using Mastra MCPClient
// Simplified with fewer functions and more direct logic flow

import { MCPClient } from "@mastra/mcp";
import * as crypto from "crypto";
import * as http from "http";
import { spawn } from "child_process";

// ===== TYPES =====
interface OAuthMetadata {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	jwks_uri: string;
	response_types_supported: string[];
	grant_types_supported: string[];
	code_challenge_methods_supported: string[];
	scopes_supported: string[];
	token_endpoint_auth_methods_supported: string[];
	registration_endpoint?: string;
	response_modes_supported?: string[];
	subject_types_supported?: string[];
	id_token_signing_alg_values_supported?: string[];
}

interface TokenResponse {
	access_token: string;
	token_type: string;
	refresh_token?: string;
	scope?: string;
}

// ===== MAIN CLIENT CLASS =====
export class AuthenticatedMCPClient {
	private mcpServerUrl: string;
	private clientName: string;
	private redirectPort: number;
	private accessToken?: string;
	private mcpClient?: MCPClient;
	private clientId?: string;

	constructor(options: {
		mcpServerUrl: string;
		clientName: string;
		redirectPort: number;
	}) {
		this.mcpServerUrl = options.mcpServerUrl.replace(/\/$/, "");
		this.clientName = options.clientName;
		this.redirectPort = options.redirectPort;
	}

	/**
	 * Complete authentication and connection flow
	 */
	async authenticateAndConnect(): Promise<void> {
		console.log("🚀 Starting OAuth authentication flow...");

		// Step 1: Discover OAuth endpoints
		const response = await fetch(
			`${this.mcpServerUrl}/.well-known/oauth-authorization-server`,
		);

		if (!response.ok) {
			throw new Error(
				`OAuth discovery failed: ${response.status} ${response.statusText}`,
			);
		}

		const oauthMetadata = (await response.json()) as OAuthMetadata;
		console.log("🔍 Discovered OAuth endpoints:", oauthMetadata);

		// Step 2: Always register client dynamically
		if (!oauthMetadata.registration_endpoint) {
			throw new Error("Server does not support dynamic client registration");
		}

		console.log("📝 Registering OAuth client...");

		const registrationResponse = await fetch(
			oauthMetadata.registration_endpoint,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					client_name: this.clientName,
					redirect_uris: [`http://localhost:${this.redirectPort}/callback`],
					grant_types: ["authorization_code"],
					response_types: ["code"],
					scope: "mcp",
					token_endpoint_auth_method: "none",
				}),
			},
		);

		if (!registrationResponse.ok) {
			throw new Error(
				`Client registration failed: ${registrationResponse.status} ${await registrationResponse.text()}`,
			);
		}

		const registrationData = await registrationResponse.json();
		this.clientId = registrationData.client_id as string;

		console.log("✅ Client registered successfully:", registrationData);

		// Step 3: Start authorization code flow with PKCE
		const codeVerifier = crypto.randomBytes(32).toString("base64url");
		const codeChallenge = crypto
			.createHash("sha256")
			.update(codeVerifier)
			.digest("base64url");
		const state = crypto.randomBytes(16).toString("hex");
		const redirectUri = `http://localhost:${this.redirectPort}/callback`;

		// Build authorization URL
		const authParams = new URLSearchParams({
			client_id: this.clientId,
			response_type: "code",
			redirect_uri: redirectUri,
			scope: "mcp",
			state: state,
			code_challenge: codeChallenge,
			code_challenge_method: "S256",
		});

		const authUrl = `${oauthMetadata.authorization_endpoint}?${authParams}`;
		console.log("📖 Opening browser for authorization...");

		// Step 4: Start callback server and wait for authorization code
		const authorizationCode = await new Promise<string>((resolve, reject) => {
			const server = http.createServer((req, res) => {
				if (!req.url) {
					res.writeHead(400);
					res.end("Bad Request");
					return;
				}

				const url = new URL(req.url, `http://localhost:${this.redirectPort}`);
				if (url.pathname === "/callback") {
					const code = url.searchParams.get("code");
					const returnedState = url.searchParams.get("state");
					const error = url.searchParams.get("error");

					if (error) {
						res.writeHead(400, { "Content-Type": "text/html" });
						res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p>`);
						server.close();
						reject(new Error(`OAuth error: ${error}`));
						return;
					}

					if (!code || returnedState !== state) {
						res.writeHead(400, { "Content-Type": "text/html" });
						res.end("<h1>Authorization Failed</h1><p>Invalid callback</p>");
						server.close();
						reject(new Error("Invalid authorization callback"));
						return;
					}

					res.writeHead(200, { "Content-Type": "text/html" });
					res.end(
						"<h1>Authorization Successful!</h1><p>You can close this window.</p>",
					);
					server.close();
					resolve(code);
				} else {
					res.writeHead(404);
					res.end("Not found");
				}
			});

			server.listen(this.redirectPort, () => {
				console.log(
					`🔗 Callback server started on http://localhost:${this.redirectPort}`,
				);
				// Open browser
				const opener =
					process.platform === "win32"
						? "start"
						: process.platform === "darwin"
							? "open"
							: "xdg-open";
				spawn(opener, [authUrl], { stdio: "ignore", detached: true });
			});

			server.on("error", (err) => {
				reject(new Error(`Callback server error: ${err.message}`));
			});
		});

		// Step 5: Exchange authorization code for access token
		const tokenParams = new URLSearchParams({
			grant_type: "authorization_code",
			client_id: this.clientId,
			code: authorizationCode,
			redirect_uri: redirectUri,
			code_verifier: codeVerifier,
		});

		const tokenResponse = await fetch(oauthMetadata.token_endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: tokenParams,
		});

		if (!tokenResponse.ok) {
			throw new Error(
				`Token exchange failed: ${tokenResponse.status} ${await tokenResponse.text()}`,
			);
		}

		const tokenData: TokenResponse = await tokenResponse.json();
		this.accessToken = tokenData.access_token;

		console.log("🎫 Access token obtained successfully");

		// Step 6: Initialize MCP Client with authentication
		this.mcpClient = new MCPClient({
			id: "hello_world_mcp_client",
			servers: {
				helloWorldServer: {
					url: new URL(
						`${this.mcpServerUrl}/api/mcp/hello-world-mcp-server/mcp`,
					),
					requestInit: {
						headers: {
							Authorization: `Bearer ${this.accessToken}`,
						},
					},
				},
			},
		});

		console.log("🔌 Connected to MCP server with authentication");
		console.log("✅ Authentication and connection complete!");
	}

	/**
	 * Get available tools from the MCP server
	 */
	async getTools() {
		if (!this.mcpClient) {
			throw new Error("Not connected. Call authenticateAndConnect() first.");
		}

		const tools = await this.mcpClient.getTools();
		console.log("🛠️  Available tools:", Object.keys(tools));
		return tools;
	}

	/**
	 * Call a tool on the MCP server
	 */
	async callTool(toolName: string, args: Record<string, unknown>) {
		if (!this.mcpClient) {
			throw new Error("Not connected. Call authenticateAndConnect() first.");
		}

		const tools = await this.mcpClient.getTools();
		const tool = tools[toolName];

		if (!tool) {
			throw new Error(`Tool '${toolName}' not found`);
		}

		console.log(`🔧 Calling tool: ${toolName} with args:`, args);
		const result = await tool.execute({ context: args });
		console.log(`✨ Tool result:`, result);

		return result;
	}
}

// ===== EXAMPLE USAGE =====
async function main() {
	try {
		// Create client with dynamic registration
		const client = new AuthenticatedMCPClient({
			mcpServerUrl: "http://localhost:4111",
			clientName: "My Dynamic MCP Client",
			redirectPort: 7080,
		});

		// Authenticate and connect
		await client.authenticateAndConnect();

		// Get available tools
		// const tools = await client.getTools();
		// console.log("\nAvailable tools:", JSON.stringify(tools, null, 2));

		// Call a tool
		await client.callTool("helloWorldServer_helloTool", {
			name: "Alice",
		});
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

// Run the example
main();
