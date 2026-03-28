function shortSha(value) {
  return String(value || "").trim().slice(0, 7);
}

function oneLine(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 140);
}

async function main() {
  const webhook = String(process.env.DISCORD_WEBHOOK_URL || "").trim();
  if (!webhook) {
    throw new Error("Missing Discord webhook URL");
  }

  const ref = String(process.env.PUSH_REF || "").trim() || "main";
  const sha = shortSha(process.env.PUSH_SHA);
  const author = String(process.env.PUSH_AUTHOR || "").trim() || "unknown";
  const pusher = String(process.env.PUSHER_NAME || "").trim() || author;
  const message = oneLine(process.env.PUSH_MESSAGE) || "no commit message";
  const commitUrl = String(process.env.PUSH_COMMIT_URL || "").trim();
  const compareUrl = String(process.env.PUSH_COMPARE_URL || "").trim();

  const lines = [
    `bambina push: ${ref}${sha ? ` (${sha})` : ""}`,
    `by: ${pusher}${author && author !== pusher ? ` | author: ${author}` : ""}`,
    `commit: ${message}`,
    commitUrl ? `commit url: ${commitUrl}` : "",
    compareUrl ? `compare: ${compareUrl}` : "",
    "next: preview build should post separately when it finishes",
  ].filter(Boolean);

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: lines.join("\n") }),
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
