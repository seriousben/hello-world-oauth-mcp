import { Mastra } from "@mastra/core";
import { createTool } from "@mastra/core/tools";
import { MCPServer } from "@mastra/mcp";
import { RuntimeContext } from "@mastra/core/di";
import { createVerifier } from "fast-jwt";
import buildGetJwks from "get-jwks";
import { z } from "zod";
import { AsyncLocalStorage } from "async_hooks";

// ===== CONFIGURATION =====
const AUTH_ISSUER = process.env.AUTH_ISSUER as string;
const AUTHORIZATION_ENDPOINT = process.env.AUTHORIZATION_ENDPOINT as string;
const TOKEN_ENDPOINT = process.env.TOKEN_ENDPOINT as string;
const JWKS_URI = process.env.JWKS_URI as string;
const REGISTRATION_ENDPOINT = process.env.REGISTRATION_ENDPOINT as string;

// Validate JWKS URI
let jwksUrl: URL;
try {
	jwksUrl = new URL(JWKS_URI);
} catch (error) {
	console.error("Invalid JWKS_URI:", JWKS_URI, error);
	throw new Error("Invalid JWKS_URI environment variable");
}

console.log("Using JWKS path:", jwksUrl.pathname);
console.log("Using issuer:", AUTH_ISSUER);

// Initialize JWKS client
const getJWKS = buildGetJwks({
	jwksPath: jwksUrl.pathname,
});

// ===== AUTH CONTEXT =====
// We maintain both AsyncLocalStorage and RuntimeContext for future compatibility
// AsyncLocalStorage is currently the reliable method, RuntimeContext will be used when Mastra supports it
const authAsyncStorage = new AsyncLocalStorage<{
	subject: string;
	audience: string;
	clientId?: string;
	scopes?: string[];
}>();

// ===== MCP TOOLS =====
const helloTool = createTool({
	id: "hello_world",
	inputSchema: z.object({
		name: z.string().describe("The name to greet"),
	}),
	description: "Returns a greeting message with the provided name",
	execute: async ({ context: { name }, runtimeContext }) => {
		console.log("Executing hello_world tool with name:", name);

		// Try RuntimeContext first (for future compatibility), then AsyncLocalStorage
		let user = runtimeContext?.get("user") as
			| {
					subject: string;
					audience: string;
					clientId?: string;
					scopes?: string[];
			  }
			| undefined;
		if (!user) {
			user = authAsyncStorage.getStore();
		}

		if (!user) {
			return `Hello ${name}! (No user context available)`;
		}

		return `Hello ${name}! (From: ${user.subject} | Client: ${user.clientId || "unknown"} | Audience: ${user.audience})`;
	},
});

// ===== MCP SERVER =====
const mcpServer = new MCPServer({
	id: "hello_world_mcp_server",
	name: "Hello World MCP Server",
	version: "1.0.0",
	tools: {
		helloTool,
	},
});

// ===== MAIN MASTRA CONFIGURATION =====
export const mastra = new Mastra({
	mcpServers: {
		helloWorldServer: mcpServer,
	},

	server: {
		port: parseInt(process.env.PORT || "4111", 10),
		apiRoutes: [
			// OAuth Authorization Server Metadata
			{
				path: "/.well-known/oauth-authorization-server",
				method: "GET",
				handler: async (c) => {
					return c.json({
						issuer: AUTH_ISSUER,
						authorization_endpoint: AUTHORIZATION_ENDPOINT,
						token_endpoint: TOKEN_ENDPOINT,
						jwks_uri: JWKS_URI,
						response_types_supported: ["code"],
						grant_types_supported: ["authorization_code"],
						code_challenge_methods_supported: ["S256", "plain"],
						scopes_supported: ["mcp"],
						token_endpoint_auth_methods_supported: ["none"],
						response_modes_supported: ["query", "fragment"],
						subject_types_supported: ["public"],
						token_endpoint_auth_signing_alg_values_supported: ["RS256"],
						id_token_signing_alg_values_supported: ["RS256"],
						registration_endpoint: REGISTRATION_ENDPOINT,
					});
				},
			},
		],
		middleware: [
			{
				path: "/api/mcp/*",
				handler: async (c, next) => {
					// Skip auth for well-known endpoints
					if (c.req.path.startsWith("/.well-known")) {
						return next();
					}

					// Validate Bearer token
					const authHeader = c.req.header("Authorization");
					if (!authHeader || !authHeader.startsWith("Bearer ")) {
						return c.json(
							{
								error: "unauthorized",
								error_description: "Valid bearer token required",
								authorization_uri: AUTHORIZATION_ENDPOINT,
							},
							401,
						);
					}

					const token = authHeader.substring(7);
					let authData: {
						subject: string;
						audience: string;
						clientId?: string;
						scopes?: string[];
					} | null = null;

					try {
						// Decode JWT header to get key ID
						const headerB64 = token.split(".")[0];
						const header = JSON.parse(
							Buffer.from(headerB64, "base64url").toString(),
						);
						const kid = header.kid;

						if (!kid) {
							throw new Error("No key ID found in JWT header");
						}

						// Get public key and verify JWT
						const publicKey = await getJWKS.getPublicKey({
							domain: AUTH_ISSUER,
							kid,
						});
						const verifier = createVerifier({
							allowedIss: [AUTH_ISSUER],
							key: publicKey,
							algorithms: [
								"RS256",
								"RS384",
								"RS512",
								"ES256",
								"ES384",
								"ES512",
							],
						});

						const decoded = verifier(token) as Record<string, unknown>;
						console.log("JWT decoded:", decoded);

						authData = {
							subject: decoded.sub as string,
							audience: decoded.aud as string,
							clientId: decoded.client_id as string | undefined,
							scopes: decoded.scope
								? typeof decoded.scope === "string"
									? decoded.scope.split(" ")
									: (decoded.scope as string[])
								: undefined,
						};
					} catch (error) {
						console.error("JWT verification failed:", error);
						return c.json(
							{
								error: "unauthorized",
								error_description: "Invalid or expired token",
								authorization_uri: AUTHORIZATION_ENDPOINT,
							},
							401,
						);
					}

					// Store auth data in both contexts
					return authAsyncStorage.run(authData, async () => {
						console.log("Running request with user:", authData.subject);

						// Also set RuntimeContext for future compatibility
						const runtimeContext = c.get(
							"runtimeContext",
						) as RuntimeContext<unknown>;
						if (runtimeContext) {
							runtimeContext.set("user", authData);
						} else {
							// Create new RuntimeContext if not available
							const newRuntimeContext = new RuntimeContext();
							newRuntimeContext.set("user", authData);
							c.set("runtimeContext", newRuntimeContext);
						}

						return await next();
					});
				},
			},
		],
	},
});
