Vendored copies of the Agent Plugins 1.0.0 JSON schemas, fetched 2026-10-04:

- `agent-plugins-1.0.0-plugin.schema.json` from https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
- `agent-plugins-1.0.0-mcp.schema.json` from https://agent-plugins.org/schemas/1.0.0/mcp.schema.json

Vendored so CI does not depend on that site being up. A version bump of the
`$schema` URLs in `plugins/*/plugin.json` and `mcp.json` means fetching the new
files here.
