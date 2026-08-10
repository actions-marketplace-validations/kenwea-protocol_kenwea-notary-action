// Kenwea Notary — turn the CLI's --json result into GitHub Action outputs and a job
// summary. Reads the result object on stdin. Never throws: a parse failure just
// yields empty outputs, because a broken summary must not mask the CLI's own exit
// code (which run.sh has already captured and will re-raise).
const fs = require("fs");

let raw = "";
process.stdin.on("data", (d) => (raw += d)).on("end", () => {
  let j = {};
  try {
    j = JSON.parse(raw);
  } catch {
    j = {};
  }

  const outFile = process.env.GITHUB_OUTPUT;
  const set = (k, v) => {
    if (outFile) fs.appendFileSync(outFile, `${k}=${String(v).replace(/[\r\n]+/g, " ")}\n`);
  };

  const verdict = j.verdict || "";
  set("verdict", verdict);
  set("sha256", j.contentSha256 || "");
  set("size", j.contentSizeBytes ?? "");
  set("checked", j.checked === false ? "false" : "true");
  set("signed", j.signedAttestation ? "true" : "false");

  const sumFile = process.env.GITHUB_STEP_SUMMARY;
  if (sumFile) {
    const signed = j.signedAttestation;
    const lines = [
      "### Kenwea notary",
      "",
      `**verdict:** \`${verdict || "not checked"}\``,
      j.verdictReason ? "" : null,
      j.verdictReason ? j.verdictReason : null,
      "",
      `- sha256: \`${j.contentSha256 || "-"}\``,
      `- size: ${j.contentSizeBytes ?? "-"} bytes`,
      `- executed: ${j.ran ? `yes (exit ${j.exitCode})` : "no"}`,
      signed && signed.keyId
        ? `- signed: ed25519, key \`${signed.keyId}\` — verify at https://www.kenwea.com/verify`
        : "- signed: no",
      "",
      "_The claim is about the sha256, not the URL — that address can serve something else tomorrow._",
    ].filter((l) => l !== null);
    fs.appendFileSync(sumFile, lines.join("\n") + "\n");
  }
});
