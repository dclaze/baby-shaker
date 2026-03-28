function shortSha(value) {
  return String(value || "").trim().slice(0, 7);
}

async function main() {
  const webhook = String(process.env.DISCORD_WEBHOOK_URL || "").trim();
  if (!webhook) {
    throw new Error("Missing Discord webhook URL");
  }

  const prNumber = String(process.env.PR_NUMBER || "").trim();
  const prTitle = String(process.env.PR_TITLE || "").trim() || "untitled PR";
  const prUrl = String(process.env.PR_URL || "").trim();
  const mergedBy = String(process.env.MERGED_BY || "").trim() || "unknown";
  const baseRef = String(process.env.BASE_REF || "").trim() || "main";
  const headRef = String(process.env.HEAD_REF || "").trim() || "unknown";
  const mergeSha = shortSha(process.env.MERGE_SHA);

  const lines = [
    `bambina merge: #${prNumber} ${prTitle}`.trim(),
    `by: ${mergedBy}`,
    `branch: ${headRef} -> ${baseRef}${mergeSha ? ` (${mergeSha})` : ""}`,
    prUrl ? `pr: ${prUrl}` : "",
    "next: main preview build should post separately when it finishes",
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
