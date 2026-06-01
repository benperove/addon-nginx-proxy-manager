/**
 * Normalize DNS provider credential files before Certbot reads them.
 */
export default function normalizeDnsProviderCredentials(provider, credentials) {
	if (typeof credentials !== "string") {
		return "";
	}

	let normalized = credentials.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd();

	if (provider !== "cloudflare") {
		return normalized;
	}

	const lines = normalized.split("\n").map((line) => {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			return line;
		}

		let match = trimmed.match(/^dns_cloudflare_api_token\s*=\s*(.*)$/);
		if (match) {
			return `dns_cloudflare_api_token = ${match[1].trim()}`;
		}

		match = trimmed.match(/^dns_cloudflare_api_key\s*=\s*(.*)$/);
		if (match) {
			return `dns_cloudflare_api_key = ${match[1].trim()}`;
		}

		match = trimmed.match(/^dns_cloudflare_email\s*=\s*(.*)$/);
		if (match) {
			return `dns_cloudflare_email = ${match[1].trim()}`;
		}

		return line;
	});

	return lines.join("\n");
}
