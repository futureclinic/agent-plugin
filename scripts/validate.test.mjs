// Pins the validator's failure cases: each test breaks one rule in a copy of
// the repository and expects validate.mjs to exit 1 naming it, so a check
// disabled later fails here instead of passing CI silently.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = "plugins/futureclinic";

function copyRepository() {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "fc-plugin-validate-"));
  fs.cpSync(root, copy, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(root, source);
      return relative !== ".git" && relative !== "node_modules";
    },
  });
  fs.symlinkSync(path.join(root, "node_modules"), path.join(copy, "node_modules"));
  return copy;
}

function validate(copy) {
  return spawnSync(process.execPath, [path.join(copy, "scripts/validate.mjs")], {
    encoding: "utf8",
  });
}

function editJson(file, edit) {
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  edit(value);
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function editText(file, edit) {
  fs.writeFileSync(file, edit(fs.readFileSync(file, "utf8")));
}

test("passes the repository as it is", (t) => {
  const copy = copyRepository();
  t.after(() => fs.rmSync(copy, { recursive: true, force: true }));

  const result = validate(copy);

  assert.equal(result.status, 0, result.stderr);
});

const BROKEN = [
  [
    "an MCP url that differs between the two formats",
    (copy) =>
      editJson(path.join(copy, PLUGIN, "mcp.json"), (mcp) => {
        mcp.mcpServers.futureclinic.url = "https://example.com/mcp";
      }),
    'server "futureclinic" url https://example.com/mcp differs from .mcp.json',
  ],
  [
    "a manifest version that differs between the two formats",
    (copy) =>
      editJson(path.join(copy, PLUGIN, "plugin.json"), (manifest) => {
        manifest.version = "9.9.9";
      }),
    'version "9.9.9" differs from .claude-plugin/plugin.json',
  ],
  [
    "a skill name that is not its directory",
    (copy) =>
      editText(path.join(copy, PLUGIN, "skills/chat/SKILL.md"), (text) =>
        text.replace(/^name: .*$/m, "name: other"),
      ),
    'name "other" must equal the directory name',
  ],
  [
    // Catches a skill that pre-approves tools again: directory review rejects
    // plugins that pre-answer the user's permission prompts.
    "a skill that pre-approves tools with allowed-tools",
    (copy) =>
      editText(path.join(copy, PLUGIN, "skills/chat/SKILL.md"), (text) =>
        text.replace(/^license: MIT$/m, "license: MIT\nallowed-tools: mcp__plugin_futureclinic_futureclinic__list_chats"),
      ),
    '"allowed-tools" pre-approves tools; directory plugins may not pre-answer the user\'s permission prompts',
  ],
  [
    // Catches a skill that asks the model to draft from its memory or past
    // conversations (Software Directory Policy 1.F).
    "a skill that points the model at its past conversations",
    (copy) =>
      editText(
        path.join(copy, PLUGIN, "skills/chat/SKILL.md"),
        (text) => `${text}\nOffer to draft answers from your previous conversations with the user.\n`,
      ),
    'names "previous conversations"',
  ],
  [
    // Catches an ask to draft from what the model already knows about the
    // user, which names no memory or chat but reaches for the same data.
    "a skill that drafts from what the model already knows about the user",
    (copy) =>
      editText(
        path.join(copy, PLUGIN, "skills/chat/SKILL.md"),
        (text) => `${text}\nOffer to draft answers from what you already know about the user.\n`,
      ),
    'names "what you already know about"',
  ],
  [
    "a skill that points the model at its earlier chats",
    (copy) =>
      editText(
        path.join(copy, PLUGIN, "skills/chat/SKILL.md"),
        (text) => `${text}\nDraft answers from your earlier chats with the user.\n`,
      ),
    'names "earlier chats"',
  ],
  [
    "a skill that points the model at the user's files",
    (copy) =>
      editText(
        path.join(copy, PLUGIN, "skills/chat/SKILL.md"),
        (text) => `${text}\nDraft answers from the files on their computer.\n`,
      ),
    'names "files on their computer"',
  ],
  [
    // Catches a skill that calls a required argument optional, so the model
    // leaves it out and the server refuses the call.
    "a skill that calls a required argument optional",
    (copy) =>
      editText(path.join(copy, PLUGIN, "skills/chat/SKILL.md"), (text) =>
        text.replace("- `finish_questions` (`chat_id`, `action`)", "- `finish_questions` (`chat_id`, optional `action`)"),
      ),
    "calls `finish_questions`'s argument `action` optional, which its saved schema requires",
  ],
  [
    // Catches the same ask phrased through memory, in any case.
    "a skill that points the model at its memory",
    (copy) =>
      editText(
        path.join(copy, PLUGIN, "skills/chat/SKILL.md"),
        (text) => `${text}\nCheck Memory for the user's allergies.\n`,
      ),
    'names "Memory"',
  ],
  [
    "a skill body that names a vendor",
    (copy) =>
      editText(
        path.join(copy, PLUGIN, "skills/chat/SKILL.md"),
        (text) => `${text}\nAsk Claude.\n`,
      ),
    'body names "Claude"',
  ],
  [
    "an eval mock with no tool entry",
    (copy) =>
      fs.writeFileSync(
        path.join(copy, PLUGIN, "evals/mocks/futureclinic/start_visit.md"),
        "mock\n",
      ),
    'mock for "start_visit" has no entry in _tools.json',
  ],
  [
    "a forbidden top-level bin directory",
    (copy) => fs.mkdirSync(path.join(copy, PLUGIN, "bin")),
    "this plugin ships no top-level bin/",
  ],
  [
    "a Codex marketplace path that differs from the Claude one",
    (copy) =>
      editJson(path.join(copy, ".agents/plugins/marketplace.json"), (market) => {
        market.plugins[0].source.path = "./plugins/other";
      }),
    'plugin "futureclinic" source must be {source: "local", path: "./plugins/futureclinic"}',
  ],
  [
    "a missing Codex marketplace",
    (copy) => fs.rmSync(path.join(copy, ".agents/plugins/marketplace.json")),
    "missing (Codex's primary marketplace path)",
  ],
  [
    "a tool whose Claude Code name passes 64 characters (policy 5.C)",
    (copy) =>
      editJson(path.join(copy, PLUGIN, "evals/mocks/futureclinic/_tools.json"), (list) => {
        list.tools[0].name = "send_a_message_to_a_futureclinic_doctor_now";
      }),
    "chars (max 64)",
  ],
  [
    "a tool without a destructiveHint (policy 5.E)",
    (copy) =>
      editJson(path.join(copy, PLUGIN, "evals/mocks/futureclinic/_tools.json"), (list) => {
        delete list.tools.find((tool) => tool.name === "confirm_summary").annotations.destructiveHint;
      }),
    'tool "confirm_summary" needs an explicit annotations.destructiveHint',
  ],
  [
    "a tool without a title annotation (policy 5.E)",
    (copy) =>
      editJson(path.join(copy, PLUGIN, "evals/mocks/futureclinic/_tools.json"), (list) => {
        delete list.tools.find((tool) => tool.name === "list_chats").annotations.title;
      }),
    'tool "list_chats" needs annotations.title',
  ],
  [
    "a grader that names a tool the server no longer lists",
    (copy) =>
      editText(
        path.join(copy, PLUGIN, "evals/doctor-reply-status/graders/called-list-chats.md"),
        (text) => text.replace("__list_chats", "__get_visit"),
      ),
    "names mcp__plugin_futureclinic_futureclinic__get_visit, which no server in evals/mocks lists",
  ],
  [
    "a server tool the skill never names",
    (copy) =>
      editText(path.join(copy, PLUGIN, "skills/chat/SKILL.md"), (text) =>
        text.replaceAll("`try_again`", "the try-again tool"),
      ),
    "no skill names the server tool `try_again`",
  ],
  [
    "a plugin README whose words are mostly in code blocks",
    (copy) =>
      fs.writeFileSync(
        path.join(copy, PLUGIN, "README.md"),
        `# FutureClinic\n\nShort intro.\n\n\`\`\`sh\n${"word ".repeat(60)}\n\`\`\`\n`,
      ),
    "has 4 words outside code blocks",
  ],
  [
    "a macOS system file in the plugin folder",
    (copy) => fs.writeFileSync(path.join(copy, PLUGIN, "skills/.DS_Store"), ""),
    "system files block a directory submission",
  ],
  [
    "an MCP server that runs a local command, even an exact-pinned one",
    (copy) =>
      editJson(path.join(copy, PLUGIN, ".mcp.json"), (mcp) => {
        mcp.mcpServers.futureclinic = { command: "npx", args: ["-y", "mcp-remote@0.14.3"] };
      }),
    'server "futureclinic" runs a local command; this plugin ships only remote https servers',
  ],
  [
    "an MCP server url that is not https",
    (copy) => {
      for (const file of [".mcp.json", "mcp.json"]) {
        editJson(path.join(copy, PLUGIN, file), (mcp) => {
          mcp.mcpServers.futureclinic.url = "http://mcp.futureclinic.com/mcp";
        });
      }
      editText(path.join(copy, PLUGIN, "skills/chat/agents/openai.yaml"), (text) =>
        text.replace("https://mcp.futureclinic.com/mcp", "http://mcp.futureclinic.com/mcp"),
      );
    },
    'server "futureclinic" url must be https',
  ],
  [
    "a skill body that names a removed tool bare",
    (copy) =>
      editText(
        path.join(copy, PLUGIN, "skills/chat/SKILL.md"),
        (text) => `${text}\n- \`get_visit\` (\`chat_id\`). Reads the visit.\n`,
      ),
    "names `get_visit`, which is no tool, argument or argument value in evals/mocks",
  ],
  [
    "a skill body that names a removed snake_case argument bare",
    (copy) =>
      editText(path.join(copy, PLUGIN, "skills/chat/SKILL.md"), (text) =>
        text.replace("`chat_id`", "`visit_id`"),
      ),
    "names `visit_id`, which is no tool, argument or argument value in evals/mocks",
  ],
  [
    "a skill argument list whose one-word argument the server renamed",
    (copy) =>
      editJson(path.join(copy, PLUGIN, "evals/mocks/futureclinic/_tools.json"), (list) => {
        const { properties } = list.tools.find((tool) => tool.name === "get_payment_link").inputSchema;
        properties.selection = properties.choice;
        delete properties.choice;
      }),
    "gives `get_payment_link` the argument `choice`, which its saved schema does not have",
  ],
  [
    "a skill argument list that names an argument only other tools still take",
    (copy) =>
      editJson(path.join(copy, PLUGIN, "evals/mocks/futureclinic/_tools.json"), (list) => {
        delete list.tools.find((tool) => tool.name === "get_payment_link").inputSchema.properties.chat_id;
      }),
    "gives `get_payment_link` the argument `chat_id`, which its saved schema does not have",
  ],
  [
    "a docs page that names a removed tool bare",
    (copy) => {
      fs.mkdirSync(path.join(copy, "docs"), { recursive: true });
      fs.writeFileSync(path.join(copy, "docs/notes.md"), "The assistant then calls `get_visit`.\n");
    },
    "docs/notes.md: names `get_visit`, which is no tool, argument or argument value in evals/mocks",
  ],
  [
    "a repository README that names a removed tool in full",
    (copy) =>
      editText(
        path.join(copy, "README.md"),
        (text) => `${text}\nmcp__plugin_futureclinic_futureclinic__get_visit\n`,
      ),
    "README.md: names mcp__plugin_futureclinic_futureclinic__get_visit, which no server in evals/mocks lists",
  ],
  [
    "a Codex dependency description that names a removed tool bare",
    (copy) =>
      editText(path.join(copy, PLUGIN, "skills/chat/agents/openai.yaml"), (text) =>
        text.replace("list_chats and get_chat read", "list_chats and get_visit read"),
      ),
    "openai.yaml: dependency description names get_visit, which is no tool in evals/mocks",
  ],
  [
    "a listed chat whose get_chat answer file is missing",
    (copy) =>
      fs.rmSync(
        path.join(copy, PLUGIN, "evals/mocks/futureclinic/get_chat/0192e9c4-2c80-7a10-8c3e-2f00000000a2.md"),
      ),
    "list_chats.md: hands out chat_id 0192e9c4-2c80-7a10-8c3e-2f00000000a2, which get_chat.md answers from get_chat/0192e9c4-2c80-7a10-8c3e-2f00000000a2.md, a file that does not exist",
  ],
  [
    "a started chat whose get_chat answer file is missing",
    (copy) =>
      editText(path.join(copy, PLUGIN, "evals/mocks/futureclinic/send_message.md"), (text) =>
        text.replace("chat_id: 0192f3b7-4e21-7c05-8a19-3f00000000c1", "chat_id: 0192f3b7-4e21-7c05-8a19-3f00000000c9"),
      ),
    "send_message.md: hands out chat_id 0192f3b7-4e21-7c05-8a19-3f00000000c9",
  ],
];

test("reads a tool argument named after a schema keyword as an argument", (t) => {
  const copy = copyRepository();
  t.after(() => fs.rmSync(copy, { recursive: true, force: true }));
  editJson(path.join(copy, PLUGIN, "evals/mocks/futureclinic/_tools.json"), (list) => {
    const { properties } = list.tools.find((tool) => tool.name === "send_message").inputSchema;
    properties.enum = { type: "string" };
    properties.properties = { type: "object", properties: { only_nested: { type: "string" } } };
  });
  editText(
    path.join(copy, PLUGIN, "skills/chat/SKILL.md"),
    (text) => `${text}\nIts \`only_nested\` field is nested.\n`,
  );

  const result = validate(copy);

  assert.equal(result.status, 0, result.stderr);
});

// A copy of the futureclinic plugin under another name, listed in both
// marketplaces before or after it.
function addPlugin(copy, name, { first }) {
  const dir = path.join(copy, "plugins", name);
  fs.cpSync(path.join(copy, PLUGIN), dir, { recursive: true });
  for (const manifest of [".claude-plugin/plugin.json", "plugin.json"]) {
    editJson(path.join(dir, manifest), (value) => {
      value.name = name;
    });
  }
  const list = (entries, entry) => (first ? entries.unshift(entry) : entries.push(entry));
  editJson(path.join(copy, ".claude-plugin/marketplace.json"), (marketplace) => {
    list(marketplace.plugins, { ...marketplace.plugins[0], name, source: `./plugins/${name}` });
  });
  editJson(path.join(copy, ".agents/plugins/marketplace.json"), (marketplace) => {
    list(marketplace.plugins, {
      ...marketplace.plugins[0],
      name,
      source: { source: "local", path: `./plugins/${name}` },
    });
  });
  return dir;
}

test("judges a dependency description by its own plugin's tools, not an earlier plugin's", (t) => {
  const copy = copyRepository();
  t.after(() => fs.rmSync(copy, { recursive: true, force: true }));
  const second = addPlugin(copy, "second", { first: false });
  // futureclinic, listed first, still serves try_again; this plugin does not.
  editJson(path.join(second, "evals/mocks/futureclinic/_tools.json"), (list) => {
    list.tools = list.tools.filter((tool) => tool.name !== "try_again");
  });

  const result = validate(copy);

  assert.equal(result.status, 1, result.stdout);
  assert.ok(
    result.stderr.includes(
      "plugins/second/skills/chat/agents/openai.yaml: dependency description names try_again, which is no tool in evals/mocks",
    ),
    result.stderr,
  );
  assert.ok(!result.stderr.includes(`${PLUGIN}/skills/chat/agents/openai.yaml`), result.stderr);
});

test("skips the dependency description of a plugin with no saved mocks", (t) => {
  const copy = copyRepository();
  t.after(() => fs.rmSync(copy, { recursive: true, force: true }));
  const first = addPlugin(copy, "first", { first: true });
  fs.rmSync(path.join(first, "evals/mocks"), { recursive: true });
  editText(path.join(first, "skills/chat/agents/openai.yaml"), (text) =>
    text.replace("and try_again", "try_again and get_visit"),
  );

  const result = validate(copy);

  assert.equal(result.status, 0, result.stderr);
});

test("checks a skill's dependency description even when its SKILL.md has no frontmatter", (t) => {
  const copy = copyRepository();
  t.after(() => fs.rmSync(copy, { recursive: true, force: true }));
  editText(path.join(copy, PLUGIN, "skills/chat/SKILL.md"), (text) => text.replace(/^---\n/, ""));
  editText(path.join(copy, PLUGIN, "skills/chat/agents/openai.yaml"), (text) =>
    text.replace("and try_again", "try_again and get_visit"),
  );

  const result = validate(copy);

  assert.equal(result.status, 1, result.stdout);
  assert.ok(result.stderr.includes("SKILL.md: missing YAML frontmatter"), result.stderr);
  assert.ok(
    result.stderr.includes("openai.yaml: dependency description names get_visit, which is no tool in evals/mocks"),
    result.stderr,
  );
});

for (const [name, breakIt, expected] of BROKEN) {
  test(`fails on ${name}`, (t) => {
    const copy = copyRepository();
    t.after(() => fs.rmSync(copy, { recursive: true, force: true }));
    breakIt(copy);

    const result = validate(copy);

    assert.equal(result.status, 1, result.stdout);
    assert.ok(
      result.stderr.includes(expected),
      `expected "${expected}" in:\n${result.stderr}`,
    );
  });
}
