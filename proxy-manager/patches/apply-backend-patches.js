#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const backendDir = process.argv[2] || "/app/backend";

const setupPath = path.join(backendDir, "setup.js");
const certificatePath = path.join(backendDir, "internal/certificate.js");

let setup = fs.readFileSync(setupPath, "utf8");
const setupFrom = `\t\t\t\t// Make sure credentials file exists
\t\t\t\tconst credentials_loc = \`/etc/letsencrypt/credentials/credentials-\${certificate.id}\`;
\t\t\t\t// Escape single quotes and backslashes
\t\t\t\tif (typeof certificate.meta.dns_provider_credentials === "string") {
\t\t\t\t\tconst escapedCredentials = certificate.meta.dns_provider_credentials
\t\t\t\t\t\t.replaceAll("'", "\\\\'")
\t\t\t\t\t\t.replaceAll("\\\\", "\\\\\\\\");
\t\t\t\t\tconst credentials_cmd = \`[ -f '\${credentials_loc}' ] || { mkdir -p /etc/letsencrypt/credentials 2> /dev/null; echo '\${escapedCredentials}' > '\${credentials_loc}' && chmod 600 '\${credentials_loc}'; }\`;
\t\t\t\t\tpromises.push(utils.exec(credentials_cmd));
\t\t\t\t}`;

const setupTo = `\t\t\t\t// Make sure credentials file exists and stays in sync with the database
\t\t\t\tconst credentials_loc = \`/etc/letsencrypt/credentials/credentials-\${certificate.id}\`;
\t\t\t\tif (typeof certificate.meta.dns_provider_credentials === "string") {
\t\t\t\t\tconst credentialsContent = normalizeDnsProviderCredentials(
\t\t\t\t\t\tcertificate.meta.dns_provider,
\t\t\t\t\t\tcertificate.meta.dns_provider_credentials,
\t\t\t\t\t);
\t\t\t\t\tfs.mkdirSync("/etc/letsencrypt/credentials", { recursive: true });
\t\t\t\t\tfs.writeFileSync(credentials_loc, credentialsContent, { mode: 0o600 });
\t\t\t\t}`;

if (!setup.includes(setupFrom)) {
	throw new Error("setup.js credentials patch source not found");
}

if (!setup.includes('import normalizeDnsProviderCredentials from "./lib/normalize-dns-credentials.js";')) {
	setup = setup.replace(
		'import utils from "./lib/utils.js";\n',
		'import fs from "node:fs";\nimport normalizeDnsProviderCredentials from "./lib/normalize-dns-credentials.js";\nimport utils from "./lib/utils.js";\n',
	);
}

setup = setup.replace(setupFrom, setupTo);
fs.writeFileSync(setupPath, setup);

let certificate = fs.readFileSync(certificatePath, "utf8");

if (!certificate.includes('import normalizeDnsProviderCredentials from "../lib/normalize-dns-credentials.js";')) {
	certificate = certificate.replace(
		'import { installPlugin } from "../lib/certbot.js";\n',
		'import { installPlugin } from "../lib/certbot.js";\nimport normalizeDnsProviderCredentials from "../lib/normalize-dns-credentials.js";\n',
	);
}

const writeFrom =
	'\t\tfs.writeFileSync(credentialsLocation, certificate.meta.dns_provider_credentials, { mode: 0o600 });';
const writeTo = `\t\tfs.writeFileSync(
\t\t\tcredentialsLocation,
\t\t\tnormalizeDnsProviderCredentials(
\t\t\t\tcertificate.meta.dns_provider,
\t\t\t\tcertificate.meta.dns_provider_credentials,
\t\t\t),
\t\t\t{ mode: 0o600 },
\t\t);`;

if (!certificate.includes(writeFrom)) {
	throw new Error("certificate.js credentials write patch source not found");
}

certificate = certificate.replace(writeFrom, writeTo);

const renewMarker =
	'\t\tlogger.info(\n\t\t\t`Renewing LetsEncrypt certificates via ${dnsPlugin.name} for Cert #${certificate.id}: ${certificate.domain_names.join(", ")}`,\n\t\t);\n\n\t\tconst args = [';
const renewInsert = `\t\tlogger.info(
\t\t\t\`Renewing LetsEncrypt certificates via \${dnsPlugin.name} for Cert #\${certificate.id}: \${certificate.domain_names.join(", ")}\`,
\t\t);

\t\tconst credentialsLocation = \`/etc/letsencrypt/credentials/credentials-\${certificate.id}\`;
\t\tconst hasConfigArg = certificate.meta.dns_provider !== "route53";
\t\tif (typeof certificate.meta.dns_provider_credentials === "string") {
\t\t\tfs.mkdirSync("/etc/letsencrypt/credentials", { recursive: true });
\t\t\tfs.writeFileSync(
\t\t\t\tcredentialsLocation,
\t\t\t\tnormalizeDnsProviderCredentials(
\t\t\t\t\tcertificate.meta.dns_provider,
\t\t\t\t\tcertificate.meta.dns_provider_credentials,
\t\t\t\t),
\t\t\t\t{ mode: 0o600 },
\t\t\t);
\t\t}

\t\tconst args = [`;

if (!certificate.includes(renewMarker)) {
	throw new Error("certificate.js DNS renew patch source not found");
}

certificate = certificate.replace(renewMarker, renewInsert);

const renewArgsMarker = `\t\tif (certificate.meta?.key_type) {
\t\t\targs.push("--key-type", certificate.meta.key_type);
\t\t}

\t\tconst adds = internalCertificate.getAdditionalCertbotArgs(certificate.id, certificate.meta.dns_provider);
\t\targs.push(...adds.args);

\t\tlogger.info(\`Command: \${certbotCommand} \${args ? args.join(" ") : ""}\`);

\t\tconst result = await utils.execFile(certbotCommand, args, adds.opts);
\t\tlogger.info(result);
\t\treturn result;
\t},

\t/**
\t * @param   {Object}  certificate    the certificate row`;

const renewArgsInsert = `\t\tif (certificate.meta?.key_type) {
\t\t\targs.push("--key-type", certificate.meta.key_type);
\t\t}

\t\tif (hasConfigArg) {
\t\t\targs.push(\`--\${dnsPlugin.full_plugin_name}-credentials\`, credentialsLocation);
\t\t}
\t\tif (certificate.meta.propagation_seconds !== undefined) {
\t\t\targs.push(
\t\t\t\t\`--\${dnsPlugin.full_plugin_name}-propagation-seconds\`,
\t\t\t\tcertificate.meta.propagation_seconds.toString(),
\t\t\t);
\t\t}

\t\tconst adds = internalCertificate.getAdditionalCertbotArgs(certificate.id, certificate.meta.dns_provider);
\t\targs.push(...adds.args);

\t\tlogger.info(\`Command: \${certbotCommand} \${args ? args.join(" ") : ""}\`);

\t\tconst result = await utils.execFile(certbotCommand, args, adds.opts);
\t\tlogger.info(result);
\t\treturn result;
\t},

\t/**
\t * @param   {Object}  certificate    the certificate row`;

if (!certificate.includes(renewArgsMarker)) {
	throw new Error("certificate.js DNS renew args patch source not found");
}

certificate = certificate.replace(renewArgsMarker, renewArgsInsert);
fs.writeFileSync(certificatePath, certificate);

console.log("Applied backend credential patches");
