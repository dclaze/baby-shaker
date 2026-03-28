import fs from 'node:fs';

function readArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : 'true';
    args[key] = value;
  }
  return args;
}

function loadJson(path) {
  if (!path || !fs.existsSync(path)) return null;
  const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (Array.isArray(parsed)) return parsed[0] ?? null;
  if (parsed?.data && Array.isArray(parsed.data)) return parsed.data[0] ?? null;
  return parsed;
}

function firstUrl(build) {
  if (!build) return '';
  return (
    build?.artifacts?.applicationArchiveUrl ||
    build?.artifacts?.buildUrl ||
    build?.artifactUrl ||
    build?.buildArtifactUrl ||
    build?.buildDetailsPageUrl ||
    build?.detailsPageUrl ||
    build?.url ||
    ''
  );
}

function detailsUrl(build) {
  if (!build) return '';
  return build?.buildDetailsPageUrl || build?.detailsPageUrl || build?.url || firstUrl(build);
}

function lineForPlatform(label, build) {
  if (!build) return `${label}: build not created`;
  const primary = firstUrl(build);
  const details = detailsUrl(build);
  if (primary && details && primary !== details) {
    return `${label}: ${primary} | details: ${details}`;
  }
  return `${label}: ${primary || details || 'link unavailable'}`;
}

async function main() {
  const args = readArgs(process.argv);
  const webhook = args.webhook || process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    throw new Error('Missing Discord webhook URL');
  }

  const android = loadJson(args['android-json']);
  const ios = loadJson(args['ios-json']);
  const kind = args.kind || 'preview';
  const ref = args.ref || process.env.GITHUB_REF_NAME || 'manual';
  const sha = (args.sha || process.env.GITHUB_SHA || '').slice(0, 7);
  const releaseNotes = args.notes || 'automated build';

  const lines = [
    `bambina ${kind} build`,
    `notes: ${releaseNotes}`,
    `ref: ${ref}${sha ? ` (${sha})` : ''}`,
    lineForPlatform('android', android),
    lineForPlatform('ios', ios),
  ];

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: lines.join('\n') }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord webhook failed: ${response.status} ${text}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
