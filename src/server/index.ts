import { createVerifier } from "fast-jwt";
import buildGetJwks from "get-jwks";
import { z } from "zod";
import { FastMCP } from "fastmcp";
import type { IncomingHttpHeaders, IncomingMessage } from "http";

// ===== CONFIGURATION =====
const AUTH_ISSUER = process.env.AUTH_ISSUER as string;

if (!AUTH_ISSUER) {
	throw new Error("AUTH_ISSUER environment variable is required");
}

console.log("Using issuer:", AUTH_ISSUER);

// ===== OAUTH METADATA DISCOVERY =====
async function discoverOAuthMetadata() {
	const issuerUrl = new URL(AUTH_ISSUER);
	const authServerMetadataUrl = `${issuerUrl.origin}/.well-known/oauth-authorization-server`;
	const openidConfigUrl = `${issuerUrl.origin}/.well-known/openid-configuration`;

	// Try OAuth authorization server metadata first
	try {
		console.log(
			`🔍 Trying OAuth authorization server metadata: ${authServerMetadataUrl}`,
		);
		const response = await fetch(authServerMetadataUrl);

		if (response.ok) {
			const metadata = await response.json();
			console.log("✅ Found OAuth authorization server metadata");
			return metadata;
		}
	} catch (error) {
		console.log(
			`⚠️  OAuth authorization server metadata failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	// Fallback to OpenID Connect configuration
	try {
		console.log(
			`🔍 Falling back to OpenID Connect configuration: ${openidConfigUrl}`,
		);
		const response = await fetch(openidConfigUrl);

		if (response.ok) {
			const metadata = await response.json();
			console.log("✅ Found OpenID Connect configuration");
			return metadata;
		}
	} catch (error) {
		console.log(
			`⚠️  OpenID Connect configuration failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	throw new Error(
		`Could not discover OAuth metadata from issuer ${AUTH_ISSUER}. Tried both OAuth authorization server metadata and OpenID Connect configuration endpoints.`,
	);
}

// Discover OAuth metadata at startup
const oauthMetadata = await discoverOAuthMetadata();
console.log("📋 Discovered OAuth metadata:", oauthMetadata);

// Extract required values
const AUTHORIZATION_ENDPOINT = oauthMetadata.authorization_endpoint;
const TOKEN_ENDPOINT = oauthMetadata.token_endpoint;
const JWKS_URI = oauthMetadata.jwks_uri;
const REGISTRATION_ENDPOINT = oauthMetadata.registration_endpoint;

// Validate JWKS URI
let jwksUrl: URL;
try {
	jwksUrl = new URL(JWKS_URI);
} catch (error) {
	console.error("Invalid JWKS_URI:", JWKS_URI, error);
	throw new Error("Invalid JWKS_URI from OAuth metadata");
}

console.log("Using JWKS path:", jwksUrl.pathname);

// Initialize JWKS client
const getJWKS = buildGetJwks({
	jwksPath: jwksUrl.pathname,
});

// ===== SESSION DATA =====
type SessionData = {
	[key: string]: unknown;
};

// ===== FASTMCP SERVER =====
const server = new FastMCP({
	name: "Hello World OAuth MCP Server",
	version: "1.0.0",
	oauth: {
		enabled: true,
		authorizationServer: {
			// Required fields for 2025-03-26 spec
			issuer: AUTH_ISSUER,
			authorizationEndpoint: AUTHORIZATION_ENDPOINT,
			tokenEndpoint: TOKEN_ENDPOINT,
			responseTypesSupported: ["code"],

			// Optional fields
			jwksUri: JWKS_URI,
			registrationEndpoint: REGISTRATION_ENDPOINT,
			grantTypesSupported: ["authorization_code"],
			codeChallengeMethodsSupported: ["S256", "plain"],
			scopesSupported: ["mcp"],
			tokenEndpointAuthMethodsSupported: ["none"],
			responseModesSupported: ["query", "fragment"],
			tokenEndpointAuthSigningAlgValuesSupported: ["RS256"],
		},
		protectedResource: {
			// 2025-06-18 spec
			resource: "mcp://hello-world-mcp-server",
			authorizationServers: [AUTH_ISSUER],
			bearerMethodsSupported: ["header"],
		},
	},
	authenticate: async (request: IncomingMessage): Promise<SessionData> => {
		// Validate Bearer token
		const authHeader = request.headers["authorization"];
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Response(
				JSON.stringify({
					error: "unauthorized",
					error_description: "Valid bearer token required",
					authorization_uri: AUTHORIZATION_ENDPOINT,
				}),
				{
					status: 401,
					statusText: "Unauthorized",
					headers: {
						"Content-Type": "application/json",
						"WWW-Authenticate": `Bearer realm="mcp", authorization_uri="${AUTHORIZATION_ENDPOINT}"`,
					},
				},
			);
		}

		const token = authHeader.substring(7);

		try {
			// Decode JWT header to get key ID
			const headerB64 = token.split(".")[0];
			const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
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
				algorithms: ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"],
			});

			const decoded = verifier(token) as Record<string, unknown>;
			console.log("JWT decoded:", decoded);

			return {
				...decoded,
			};
		} catch (error) {
			console.error("JWT verification failed:", error);
			throw new Response(
				JSON.stringify({
					error: "unauthorized",
					error_description: "Invalid or expired token",
					authorization_uri: AUTHORIZATION_ENDPOINT,
				}),
				{
					status: 401,
					statusText: "Unauthorized",
					headers: {
						"Content-Type": "application/json",
						"WWW-Authenticate": `Bearer realm="mcp", authorization_uri="${AUTHORIZATION_ENDPOINT}"`,
					},
				},
			);
		}
	},
});

// ===== MCP TOOL =====
server.addTool({
	name: "helloTool",
	description: "Returns a greeting message with the provided name",
	parameters: z.object({
		name: z.string().describe("The name to greet"),
	}),
	execute: async ({ name }: { name: string }, { session }) => {
		console.log("Executing helloTool with name:", name);

		if (!session) {
			return `Hello ${name}! (No user context available)`;
		}

		return `Hello ${name}! (${JSON.stringify(session)})`;
	},
});

// ===== START SERVER =====
const PORT = parseInt(process.env.PORT || "4111", 10);

await server.start({
	transportType: "httpStream",
	httpStream: {
		port: PORT,
	},
});

console.log(`
🚀 Hello World OAuth MCP Server is running!

Endpoints:
- MCP (HTTP Stream): http://localhost:${PORT}/mcp
- MCP (SSE): http://localhost:${PORT}/sse
- Health: http://localhost:${PORT}/health
- OAuth Authorization Server (2025-03-26): http://localhost:${PORT}/.well-known/oauth-authorization-server
- OAuth Protected Resource (2025-06-18): http://localhost:${PORT}/.well-known/oauth-protected-resource

The server supports both MCP specification versions:
- 2025-03-26 (legacy): Uses oauth-authorization-server endpoint
- 2025-06-18 (current): Uses oauth-protected-resource endpoint
`);
