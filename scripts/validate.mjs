// Repository checks that `claude plugin validate` does not make: the Agent
// Plugins (OpenAI / Codex) files against their schemas, skill frontmatter as
// real YAML (the Claude validator accepts broken skill YAML), and the
// cross-file rules that keep the two formats describing one plugin.
// Exits 1 and lists every failure.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const fail = (file, message) =>
  failures.push(`${path.relative(root, file)}: ${message}`);

const readText = (file) => fs.readFileSync(file, "utf8");
function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    fail(file, `not valid JSON (${error.message})`);
    return undefined;
  }
}
function readYaml(file, text = readText(file)) {
  try {
    return parseYaml(text, { strict: true, uniqueKeys: true });
  } catch (error) {
    fail(file, `not valid YAML (${error.message.split("\n")[0]})`);
    return undefined;
  }
}

// Agent Skills spec fields only, so the skill also loads in claude.ai,
// Cowork and Codex. The spec's `allowed-tools` is refused by its own check
// in checkSkill: it pre-approves tools, and directory plugins may not remove
// or pre-answer the user's permission prompts.
const SKILL_FRONTMATTER_KEYS = new Set(["name", "description", "license", "compatibility", "metadata"]);
// Anthropic Software Directory Policy 1.F: software must not query or extract
// data from Claude's memory, chat history, conversation summaries or the
// user's files. A skill that names them asks the model to reach for them, or
// sets rules for the host's own context, which is not the plugin's to set.
// A word list catches these spellings only; review still reads the rest.
const HOST_CONTEXT_WORDS =
  /\b(?:memory|memories|(?:past|previous|earlier|prior) (?:chats?|conversations?)|chat history|chat logs?|conversation summar(?:y|ies)|what you (?:already )?know about|(?:the user's|their|your) files|files on (?:the user's|their|your) (?:computer|device|drive))\b/i;
// Claude Code truncates the skill listing at 1,536 chars and the Agent Skills
// spec caps descriptions at 1,024.
const MAX_SKILL_DESCRIPTION_CHARS = 1024;
const MAX_SKILL_LINES = 500;
// A top-level bin/ blocks install in claude.ai and Cowork; the rest are
// components this plugin deliberately does not ship.
const FORBIDDEN_PLUGIN_DIRS = ["bin", "commands", "hooks", "agents", "monitors"];
// Claude Code's `http` and Agent Plugins' `streamable-http` are one transport.
const MCP_TYPE_PAIRS = { http: "streamable-http" };
// The directory counts README words outside code blocks only.
const MIN_README_WORDS = 40;
// Anthropic Software Directory Policy 5.C caps tool names at 64 characters;
// Claude Code calls a plugin's tool mcp__plugin_<plugin>_<server>__<tool>,
// so the cap is checked on that full name, the longest one a host sees.
const MAX_TOOL_NAME_CHARS = 64;
// The directory blocks these system files anywhere in the plugin folder.
const FORBIDDEN_SYSTEM_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini", "__MACOSX"]);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const schemaValidators = {
  plugin: ajv.compile(
    readJson(path.join(root, "schemas/agent-plugins-1.0.0-plugin.schema.json")),
  ),
  mcp: ajv.compile(
    readJson(path.join(root, "schemas/agent-plugins-1.0.0-mcp.schema.json")),
  ),
};
function checkSchema(kind, file, document) {
  const validate = schemaValidators[kind];
  if (document !== undefined && !validate(document)) {
    for (const error of validate.errors) {
      fail(file, `${kind} schema: ${error.instancePath || "/"} ${error.message}`);
    }
  }
}

function checkMcpPair(pluginDir) {
  const claudeFile = path.join(pluginDir, ".mcp.json");
  const portableFile = path.join(pluginDir, "mcp.json");
  const claude = readJson(claudeFile);
  const portable = readJson(portableFile);
  checkSchema("mcp", portableFile, portable);
  if (!claude || !portable) return undefined;

  const claudeNames = Object.keys(claude.mcpServers ?? {}).sort();
  const portableNames = Object.keys(portable.mcpServers ?? {}).sort();
  if (claudeNames.join() !== portableNames.join()) {
    fail(
      portableFile,
      `server names [${portableNames}] differ from .mcp.json [${claudeNames}]`,
    );
  }
  for (const name of claudeNames) {
    const a = claude.mcpServers[name];
    const b = portable.mcpServers[name];
    if (!b) continue;
    if (a.url !== b.url) {
      fail(portableFile, `server "${name}" url ${b.url} differs from .mcp.json ${a.url}`);
    }
    if (MCP_TYPE_PAIRS[a.type] !== b.type) {
      fail(
        portableFile,
        `server "${name}" type "${b.type}" does not pair with .mcp.json type "${a.type}"`,
      );
    }
    // The plugin ships only remote servers. A local command would also need
    // the directory's exact-version pin on its launcher; add that check in
    // the change that ships one.
    if (a.command !== undefined) {
      fail(claudeFile, `server "${name}" runs a local command; this plugin ships only remote https servers`);
    } else if (!/^https:\/\//.test(a.url ?? "")) {
      fail(claudeFile, `server "${name}" url must be https`);
    }
  }
  return portable.mcpServers;
}

function readmeWords(text) {
  const prose = text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "");
  return prose.split(/\s+/).filter(Boolean).length;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? [full, ...walk(full)] : [full];
  });
}

function checkManifests(pluginDir, marketplaceEntry) {
  const claudeFile = path.join(pluginDir, ".claude-plugin/plugin.json");
  const portableFile = path.join(pluginDir, "plugin.json");
  const claude = readJson(claudeFile);
  const portable = readJson(portableFile);
  checkSchema("plugin", portableFile, portable);
  if (!claude || !portable) return;

  for (const key of ["name", "version", "description", "license", "homepage", "repository"]) {
    if (claude[key] !== portable[key]) {
      fail(portableFile, `${key} "${portable[key]}" differs from .claude-plugin/plugin.json "${claude[key]}"`);
    }
  }
  if (marketplaceEntry.name !== claude.name) {
    fail(claudeFile, `name "${claude.name}" differs from the marketplace entry "${marketplaceEntry.name}"`);
  }
  if ("userConfig" in claude) {
    fail(claudeFile, "userConfig is not supported by OpenAI plugins");
  }
}

function checkSkill(skillDir) {
  const skillFile = path.join(skillDir, "SKILL.md");
  const text = readText(skillFile);
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) {
    fail(skillFile, "missing YAML frontmatter");
    return;
  }
  const frontmatter = readYaml(skillFile, match[1]);
  if (frontmatter) {
    for (const key of Object.keys(frontmatter)) {
      if (key === "allowed-tools") {
        fail(skillFile, '"allowed-tools" pre-approves tools; directory plugins may not pre-answer the user\'s permission prompts');
      } else if (!SKILL_FRONTMATTER_KEYS.has(key)) {
        fail(skillFile, `frontmatter key "${key}" is not an Agent Skills field`);
      }
    }
    if (frontmatter.name !== path.basename(skillDir)) {
      fail(skillFile, `name "${frontmatter.name}" must equal the directory name`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(frontmatter.name ?? "") || frontmatter.name.length > 64) {
      fail(skillFile, "name must be lowercase letters, digits and hyphens, at most 64 chars");
    }
    if (typeof frontmatter.description !== "string" || frontmatter.description.length === 0) {
      fail(skillFile, "description is required");
    } else if (frontmatter.description.length > MAX_SKILL_DESCRIPTION_CHARS) {
      fail(skillFile, `description is ${frontmatter.description.length} chars (max ${MAX_SKILL_DESCRIPTION_CHARS})`);
    }
  }
  if (text.split("\n").length >= MAX_SKILL_LINES) {
    fail(skillFile, `must stay under ${MAX_SKILL_LINES} lines`);
  }
  const hostContext = HOST_CONTEXT_WORDS.exec(text);
  if (hostContext) {
    fail(skillFile, `names "${hostContext[0]}"; a skill never points the model at its memory, past chats, summaries or the user's files`);
  }
  // OpenAI requires provider-neutral skills ("the model", not a vendor).
  const body = text.slice(match[0].length);
  for (const vendor of ["Claude", "ChatGPT", "Codex", "Anthropic", "OpenAI"]) {
    if (new RegExp(`\\b${vendor}\\b`).test(body)) {
      fail(skillFile, `body names "${vendor}"; skills must be provider-neutral`);
    }
  }
}

// A skill's Codex metadata, checked whether or not its SKILL.md parses.
// Stale tool names are judged against this plugin's own saved tools only, so
// the verdict never depends on which plugins the marketplace lists before it;
// a plugin with no saved mocks has nothing to judge them against.
function checkSkillDependencies(skillDir, mcpServers, pluginTools) {
  const openaiFile = path.join(skillDir, "agents/openai.yaml");
  if (!fs.existsSync(openaiFile)) return;
  const openai = readYaml(openaiFile);
  for (const tool of openai?.dependencies?.tools ?? []) {
    if (tool.type !== "mcp") continue;
    const server = mcpServers?.[tool.value];
    if (!server) {
      fail(openaiFile, `MCP dependency "${tool.value}" is not a server in mcp.json`);
    } else if (server.url !== tool.url) {
      fail(openaiFile, `MCP dependency url ${tool.url} differs from mcp.json ${server.url}`);
    }
    if (tool.transport !== "streamable_http") {
      fail(openaiFile, `MCP dependency transport must be "streamable_http"`);
    }
    // Codex shows this description, which names tools bare, without
    // backticks: every snake_case word in it must be a saved tool.
    if (pluginTools.size === 0 || typeof tool.description !== "string") continue;
    for (const [word] of tool.description.matchAll(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g)) {
      if (!pluginTools.has(word)) {
        fail(openaiFile, `dependency description names ${word}, which is no tool in evals/mocks`);
      }
    }
  }
}

// JSON Schema keywords whose values are subschemas, by shape. The walk
// follows only these, so a property named `enum` or `properties` is read as a
// property, never as a keyword.
const SUBSCHEMA_KEYWORDS = [
  "items",
  "additionalProperties",
  "unevaluatedProperties",
  "unevaluatedItems",
  "contains",
  "propertyNames",
  "not",
  "if",
  "then",
  "else",
];
const SUBSCHEMA_LIST_KEYWORDS = ["anyOf", "oneOf", "allOf", "prefixItems"];
const SUBSCHEMA_MAP_KEYWORDS = ["properties", "patternProperties", "dependentSchemas", "$defs", "definitions"];

// Every property name and string enum or const value in a JSON schema: the
// argument names and values a file may name in backticks beside the tools.
function schemaWords(schema, words = new Set()) {
  if (Array.isArray(schema)) {
    for (const item of schema) schemaWords(item, words);
    return words;
  }
  if (schema === null || typeof schema !== "object") return words;
  for (const name of Object.keys(schema.properties ?? {})) words.add(name);
  if (Array.isArray(schema.enum)) {
    for (const value of schema.enum) if (typeof value === "string") words.add(value);
  }
  if (typeof schema.const === "string") words.add(schema.const);
  for (const keyword of SUBSCHEMA_KEYWORDS) schemaWords(schema[keyword], words);
  for (const keyword of SUBSCHEMA_LIST_KEYWORDS) schemaWords(schema[keyword], words);
  for (const keyword of SUBSCHEMA_MAP_KEYWORDS) {
    const map = schema[keyword];
    if (map !== null && typeof map === "object") schemaWords(Object.values(map), words);
  }
  return words;
}

// What the saved tools/list answers allow other files to name: each tool by
// the name Claude Code gives it, each bare tool name with the argument names
// and values its own schema has, and all of those words together.
const saved = { toolNames: new Set(), toolWords: new Map(), toolRequired: new Map(), allWords: new Set() };

// The tools/list each mocked server answered, saved in _tools.json, checked
// against the directory's tool rules (policy 5.C and 5.E). Returns the
// plugin's bare tool names, and adds every tool to `saved`.
function checkEvalMocks(pluginDir, pluginName) {
  const pluginTools = new Set();
  const mocksDir = path.join(pluginDir, "evals/mocks");
  if (!fs.existsSync(mocksDir)) return pluginTools;
  for (const server of fs.readdirSync(mocksDir)) {
    const serverDir = path.join(mocksDir, server);
    if (!fs.statSync(serverDir).isDirectory() || server.startsWith(".")) continue;
    const toolsFile = path.join(serverDir, "_tools.json");
    const tools = readJson(toolsFile)?.tools ?? [];
    for (const tool of tools) {
      const fullName = `mcp__plugin_${pluginName}_${server}__${tool.name}`;
      pluginTools.add(tool.name);
      saved.toolNames.add(fullName);
      const words = schemaWords(tool.inputSchema);
      saved.toolWords.set(tool.name, words);
      saved.toolRequired.set(tool.name, new Set(tool.inputSchema?.required ?? []));
      saved.allWords.add(tool.name);
      for (const word of words) saved.allWords.add(word);
      if (fullName.length > MAX_TOOL_NAME_CHARS) {
        fail(toolsFile, `tool "${tool.name}" is ${fullName} in Claude Code, ${fullName.length} chars (max ${MAX_TOOL_NAME_CHARS})`);
      }
      const hints = tool.annotations ?? {};
      if (typeof hints.title !== "string" || hints.title.length === 0) {
        fail(toolsFile, `tool "${tool.name}" needs annotations.title`);
      }
      for (const hint of ["readOnlyHint", "destructiveHint"]) {
        if (typeof hints[hint] !== "boolean") {
          fail(toolsFile, `tool "${tool.name}" needs an explicit annotations.${hint}`);
        }
      }
    }
    const listed = new Set(tools.map((tool) => tool.name));
    for (const file of fs.readdirSync(serverDir)) {
      if (!file.endsWith(".md") || file.startsWith("_")) continue;
      const tool = file.slice(0, -".md".length);
      if (!listed.has(tool)) {
        fail(path.join(serverDir, file), `mock for "${tool}" has no entry in _tools.json`);
      }
    }
    checkMockFilesPerId(serverDir);
  }
  return pluginTools;
}

// A mock that answers from one file per argument value,
// `{{file:<dir>/{input.<arg>}.md}}`, fails the eval run on a value with no
// file, where the real server answers "not found". Every `<arg>: <uuid>` a
// mock hands out (a chat in list_chats, the chat send_message opened) must
// have its file.
function checkMockFilesPerId(serverDir) {
  const mockFiles = walk(serverDir).filter((file) => file.endsWith(".md"));
  const texts = mockFiles.map((file) => [file, readText(file)]);
  for (const [templateFile, template] of texts) {
    const match = template.trim().match(/^\{\{file:([\w-]+)\/\{input\.(\w+)\}\.md\}\}$/);
    if (match === null) continue;
    const [, dir, arg] = match;
    for (const [file, text] of texts) {
      for (const [, id] of text.matchAll(new RegExp(`\\b${arg}: ([0-9a-f]{8}-[0-9a-f-]{27})`, "g"))) {
        if (!fs.existsSync(path.join(serverDir, dir, `${id}.md`))) {
          fail(file, `hands out ${arg} ${id}, which ${path.basename(templateFile)} answers from ${dir}/${id}.md, a file that does not exist`);
        }
      }
    }
  }
}

// A renamed or removed server tool or argument leaves files naming one no
// host has. Graders use full names; prose names tools bare in backticks, so
// a backticked snake_case word must be a saved tool, argument or argument
// value (a one-word argument such as `text` is only checked in a tool's
// argument list, as prose uses such words for other things). A tool's
// argument list, the skill's "- `tool` (`arg`, optional `arg`)" line, may
// name only that tool's own arguments and values, and may not call one its
// schema requires optional.
function checkToolReferences(file) {
  const text = readText(file);
  for (const [name] of text.matchAll(/mcp__plugin_\w+/g)) {
    if (!saved.toolNames.has(name)) {
      fail(file, `names ${name}, which no server in evals/mocks lists`);
    }
  }
  for (const [, word] of text.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)) {
    if (!saved.allWords.has(word)) {
      fail(file, `names \`${word}\`, which is no tool, argument or argument value in evals/mocks`);
    }
  }
  for (const [, tool, args] of text.matchAll(/^\s*[-*] `([a-z][a-z0-9_]*)` \(([^)]*)\)/gm)) {
    const words = saved.toolWords.get(tool);
    if (words === undefined) continue;
    for (const [, word] of args.matchAll(/`([^`]+)`/g)) {
      if (!words.has(word)) {
        fail(file, `gives \`${tool}\` the argument \`${word}\`, which its saved schema does not have`);
      }
    }
    for (const [, word] of args.matchAll(/\boptional `([^`]+)`/g)) {
      if (saved.toolRequired.get(tool)?.has(word)) {
        fail(file, `calls \`${tool}\`'s argument \`${word}\` optional, which its saved schema requires`);
      }
    }
  }
}

// The skill must name every tool its server serves.
function checkSkillNamesEveryTool(pluginDir, pluginTools) {
  const skillsDir = path.join(pluginDir, "skills");
  const skillText = (fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir) : [])
    .map((skill) => path.join(skillsDir, skill, "SKILL.md"))
    .filter((file) => fs.existsSync(file))
    .map(readText)
    .join("\n");
  for (const tool of pluginTools) {
    if (!skillText.includes(`\`${tool}\``)) {
      fail(skillsDir, `no skill names the server tool \`${tool}\``);
    }
  }
}

function checkPluginFiles(pluginDir) {
  for (const dir of FORBIDDEN_PLUGIN_DIRS) {
    if (fs.existsSync(path.join(pluginDir, dir))) {
      fail(path.join(pluginDir, dir), "this plugin ships no top-level " + dir + "/");
    }
  }
  for (const file of walk(pluginDir)) {
    if (FORBIDDEN_SYSTEM_FILES.has(path.basename(file))) {
      fail(file, "system files block a directory submission");
    }
  }
  const readme = path.join(pluginDir, "README.md");
  const words = readmeWords(readText(readme));
  if (words < MIN_README_WORDS) {
    fail(readme, `has ${words} words outside code blocks; plugin directories require at least ${MIN_README_WORDS}`);
  }
  const license = path.join(pluginDir, "LICENSE");
  if (!fs.existsSync(license) || readText(license) !== readText(path.join(root, "LICENSE"))) {
    fail(license, "must exist and match the repository LICENSE");
  }
}

const marketplaceFile = path.join(root, ".claude-plugin/marketplace.json");
const pluginDirs = [];
const marketplace = readJson(marketplaceFile);
for (const entry of marketplace?.plugins ?? []) {
  if (typeof entry.source !== "string" || !entry.source.startsWith("./")) {
    fail(marketplaceFile, `plugin "${entry.name}" source must be a ./relative path`);
    continue;
  }
  const pluginDir = path.join(root, entry.source);
  if (!fs.existsSync(pluginDir)) {
    fail(marketplaceFile, `plugin "${entry.name}" source ${entry.source} does not exist`);
    continue;
  }
  checkManifests(pluginDir, entry);
  const mcpServers = checkMcpPair(pluginDir);
  const pluginTools = checkEvalMocks(pluginDir, entry.name);
  const skillsDir = path.join(pluginDir, "skills");
  const skills = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    : [];
  for (const skill of skills) {
    checkSkill(path.join(skillsDir, skill.name));
    checkSkillDependencies(path.join(skillsDir, skill.name), mcpServers, pluginTools);
  }
  checkSkillNamesEveryTool(pluginDir, pluginTools);
  checkPluginFiles(pluginDir);
  pluginDirs.push(pluginDir);
}
if (!marketplace?.plugins?.length) fail(marketplaceFile, "lists no plugins");

// Every Markdown file a host or reviewer reads: each plugin's own files
// (mocks excepted, which are server answers) and the repository's README and
// docs, which describe the tools to directory reviewers.
if (saved.toolNames.size > 0) {
  const isMarkdown = (file) => file.endsWith(".md");
  const files = [
    ...pluginDirs.flatMap((dir) =>
      walk(dir).filter((file) => isMarkdown(file) && !file.includes(`${path.sep}mocks${path.sep}`)),
    ),
    path.join(root, "README.md"),
    ...(fs.existsSync(path.join(root, "docs")) ? walk(path.join(root, "docs")).filter(isMarkdown) : []),
  ];
  for (const file of files) checkToolReferences(file);
}

// Codex's primary marketplace path; `.claude-plugin/marketplace.json` is its
// legacy fallback. The two must list the same plugins at the same paths.
function checkCodexMarketplace(claudeMarketplace) {
  const codexFile = path.join(root, ".agents/plugins/marketplace.json");
  if (!fs.existsSync(codexFile)) {
    fail(codexFile, "missing (Codex's primary marketplace path)");
    return;
  }
  const codex = readJson(codexFile);
  if (!codex || !claudeMarketplace) return;
  if (codex.name !== claudeMarketplace.name) {
    fail(codexFile, `name "${codex.name}" differs from .claude-plugin/marketplace.json "${claudeMarketplace.name}"`);
  }
  const claudeEntries = claudeMarketplace.plugins ?? [];
  const codexEntries = codex.plugins ?? [];
  const names = (entries) => entries.map((entry) => entry.name).join();
  if (names(codexEntries) !== names(claudeEntries)) {
    fail(codexFile, `plugins [${names(codexEntries)}] differ from .claude-plugin/marketplace.json [${names(claudeEntries)}]`);
  }
  for (const entry of codexEntries) {
    const claudeEntry = claudeEntries.find((candidate) => candidate.name === entry.name);
    if (entry.source?.source !== "local" || entry.source?.path !== claudeEntry?.source) {
      fail(codexFile, `plugin "${entry.name}" source must be {source: "local", path: "${claudeEntry?.source}"}`);
    }
    if (!entry.policy?.installation || !entry.policy?.authentication) {
      fail(codexFile, `plugin "${entry.name}" needs policy.installation and policy.authentication`);
    }
    if (typeof entry.category !== "string" || entry.category.length === 0) {
      fail(codexFile, `plugin "${entry.name}" needs a category`);
    }
  }
}
checkCodexMarketplace(marketplace);

if (failures.length > 0) {
  console.error(`validate: ${failures.length} problem(s)\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`validate: OK (${marketplace.plugins.length} plugin(s))`);
