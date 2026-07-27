#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const published = process.argv.includes("--published");
const transport = published
  ? new StdioClientTransport({
      command: "pnpm",
      args: ["dlx", "@hyperdrift-io/deputy-workforce-mcp@latest"],
      env: { ...process.env, DEPUTY_MODE: "fixture" },
      stderr: "pipe",
    })
  : new StdioClientTransport({
      command: process.execPath,
      args: ["dist/stdio.js"],
      env: { ...process.env, DEPUTY_MODE: "fixture" },
      stderr: "pipe",
    });

const client = new Client({
  name: "deputy-fixture-proof",
  version: "1.0.0",
});

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const result = await client.callTool({
    name: "find_coverage_gaps",
    arguments: {
      start_date: "2026-07-20",
      end_date: "2026-07-26",
      timezone: "Europe/London",
      minimum_people: 2,
    },
  });
  const structured = result.structuredContent ?? {};
  const findings = Array.isArray(structured.findings) ? structured.findings : [];
  process.stdout.write(`${JSON.stringify({
    package: published ? "@hyperdrift-io/deputy-workforce-mcp@latest" : "local-build",
    fixture_only: true,
    tool_count: listed.tools.length,
    tools: listed.tools.map((tool) => tool.name),
    called: "find_coverage_gaps",
    finding_count: findings.length,
    is_error: result.isError === true,
  }, null, 2)}\n`);
} finally {
  await client.close();
}
