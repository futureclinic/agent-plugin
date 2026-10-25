# FutureClinic agent plugin

Start a FutureClinic chat with a state-licensed US doctor from your AI app,
answer FutureClinic's questions, confirm the summary that goes to the doctor,
and read your doctor's replies word for word. FutureClinic is cash-pay, for
adults, about their own health, and not for emergencies.

One plugin, two formats: it installs in **Claude Code** and in **Codex** from
this repository, which is also the plugin marketplace. ChatGPT is not
supported yet.

FutureClinic's MCP server runs at `https://mcp.futureclinic.com/mcp`.

## What it does

The plugin adds one remote MCP server and one skill. The server's tools act
only inside the signed-in patient's own FutureClinic account; no tool takes a
patient id.

| Tool | Title your AI app shows | What it does |
|---|---|---|
| `list_chats` | List your chats | Read-only. Lists your FutureClinic chats, latest activity first, each with a status line for each thing open in it and a link. |
| `get_chat` | Read a chat and your doctor's replies | Reads one chat: where it stands, your doctor's messages word for word, a doctor choice waiting, and any questions or summary waiting on you. It also marks the chat read, as opening it in the app does. |
| `send_message` | Write to FutureClinic | Starts a FutureClinic chat with a doctor, or writes in one of your chats, in your own words. |
| `answer_form` | Answer your questions | Sends your answers to the questions in your chat. |
| `upload_attachments` | Upload attachments | Gives a single-use FutureClinic upload page where you send photos or a video into your chat, as the app's chat takes them, or for a question that asks for them, after you sign in to your own FutureClinic account. The files never pass through your AI app. No PDFs or documents. |
| `cancel_questions` | Stop or restart your questions | Only when you ask: cancels your questions, or starts them over where a result offers it. Either drops the answers given so far. Your AI app may ask you to approve it. |
| `restore_questions` | Carry on with expired questions | Brings back questions that expired where you left them, answers included. |
| `finish_questions` | Send your answers or accept the doctor's plan | Only on your explicit go: sends answers kept unsent on to the doctor, or takes the doctor's plan shown with your questions as the answer. Your AI app asks you to approve it. |
| `confirm_summary` | Send your summary to a doctor | Sends the summary you confirmed to a doctor. Your AI app asks you to approve this call. |
| `get_treatment_plan` | Read your treatment plan | Read-only. Reads the treatment plan, or response to lab results, your doctor sent in a chat: its words, prescriptions, lab tests or scans, where it stands and what is left to do, with links. It shows the plan only after you have confirmed your home address and ID on FutureClinic. Accepting the plan, and any other change to it, happens in the FutureClinic app or on its website. |
| `get_payment_link` | Get the payment link | Shows the doctor choice, FutureClinic's pick and the first five doctors with their profile links, and records yours once you make it, with a link to FutureClinic's payment page when something is left to pay. The call itself pays nothing. |
| `try_again` | Send your request to doctors again | Sends a request no doctor took in time, or one you canceled, to doctors again. |

The server's tool descriptions, which your AI app reads, are the full rules
for each tool; this table is a summary. Each result keeps the ids and
handles your AI app passes back (a `chat_id`, a doctor's profile handle) in a
part marked for the AI app only, and every block your AI app shows you word
for word ends on its own end line, so no id reaches the text you read.
Every tool declares `title`, `readOnlyHint`, `destructiveHint`,
`idempotentHint` and `openWorldHint`. The
server's own instructions, and each tool's description, carry the rules for each call: emergency advice comes
first; FutureClinic's safety advice and your doctor's words are passed on
unchanged; a new chat starts only on your yes, after your AI app asks once for
your whole story (unless you already told it, or in an emergency), which it
uses to answer FutureClinic's questions for you to check. The `chat` skill
(`plugins/futureclinic/skills/chat/SKILL.md`) tells the model how the tools fit
together.

## Example prompts

- "Can a FutureClinic doctor look at the itchy rash on my arms?"
- "Has my FutureClinic doctor replied yet?"
- "What did my doctor say about the cream, word for word?"
- "What's in my FutureClinic treatment plan?"
- "I want to pay for my FutureClinic request."
- "I'm ready to answer FutureClinic's questions."

## What it sends and stores (privacy)

- The plugin contains no executable code: two manifest pairs, one remote MCP
  server URL and one skill. It stores nothing on your computer.
- Your AI app connects to `https://mcp.futureclinic.com/mcp` after you sign in
  to FutureClinic in your browser and agree to share data with that AI app
  (OAuth 2.0, through FutureClinic's sign-in at `account.futureclinic.com`).
  FutureClinic receives only the tool calls your AI app makes. It has no
  access to your AI app account.
- `list_chats` status lines carry no health details. `get_chat` shows your
  doctor's messages, and `get_treatment_plan` your doctor's treatment plan. What you send with `send_message` and `answer_form`, and
  what you upload on the page `upload_attachments` gives, becomes
  part of your FutureClinic medical record, which
  FutureClinic keeps for the years state law sets and cannot delete before
  then.
- You pay only on FutureClinic's payment page in your browser, never in the
  AI app, by card or, when it covers FutureClinic's pick of doctor, with your
  FutureClinic credit.
- Whatever you send through these tools also passes through your AI company,
  under its own terms.
- You can disconnect an AI app at any time in your FutureClinic account
  settings; FutureClinic then refuses its calls.
- FutureClinic's privacy policy: https://futureclinic.com/privacy-policy.
  Terms: https://futureclinic.com/terms-of-service.
- For an emergency call 911, or call or text 988 for a mental-health crisis.

## Connect (patients)

Patients follow https://futureclinic.com/connect-your-ai once FutureClinic
publishes it, which gives one server line per app. Set FutureClinic up once
per app: a second setup at the same address, such as this plugin beside a
direct line, makes you sign in twice.

**Claude (claude.ai, Desktop, mobile) and Claude Code signed in with a Claude
subscription:** add `https://mcp.futureclinic.com/mcp` as a custom connector
at https://claude.ai/customize/connectors (Add custom connector), or use the
"Add to Claude" link on FutureClinic's setup page. It works in Claude Code
too, so do not also add the server below.

**Claude Code without a Claude subscription:**

```sh
claude mcp add --transport http --scope user futureclinic https://mcp.futureclinic.com/mcp
```

Then type `/mcp`, choose `futureclinic` and Authenticate, or run
`claude mcp login futureclinic`.

**Codex:**

```sh
codex mcp add futureclinic --url https://mcp.futureclinic.com/mcp
codex mcp login futureclinic
```

Change no approval settings: FutureClinic's submit step (`confirm_summary`)
asks for your approval on purpose.

## Install the plugin from this repository

Use the plugin or a direct line above, never both.

**Claude Code:**

```sh
claude plugin marketplace add futureclinic/agent-plugin
claude plugin install futureclinic@futureclinic
```

Then type `/mcp`, choose `plugin:futureclinic:futureclinic` and Authenticate.

**Codex:**

```sh
codex plugin marketplace add futureclinic/agent-plugin
codex plugin add futureclinic@futureclinic
codex mcp login futureclinic
```

## Troubleshooting

- **FutureClinic's sign-in page or your AI app says AI apps aren't available
  for your account yet.** FutureClinic is opening AI apps to patients account
  by account, and yours does not have them yet. Your chats are still in the
  FutureClinic app and website.
- **Your AI app says the sign-in expired or asks you to authenticate again.**
  In Claude Code type `/mcp`, choose the FutureClinic server and Authenticate;
  in Codex run `codex mcp login futureclinic`; in claude.ai reconnect the
  connector.
- **A tool call says the app's copy of the tools may be out of date.** Start
  a new session (Codex keeps its old tool list until then).
- **A payment or upload link expired.** Ask your AI app for a new one.
- **The upload page asks you to sign in or will not open.** It opens only when
  you are signed in to your own FutureClinic account, on your phone or
  computer. Sign in as yourself, then open the link again.
- **Your summary was not sent because you are in another state.** For a
  request to FutureClinic's doctors: update your address on FutureClinic's
  website, then confirm again. For questions from your own doctor, when the
  answer says that doctor isn't licensed in your new state: confirming again
  will not send them. Update your address, then start a new FutureClinic
  chat, which finds a doctor licensed there; your chat with that doctor stays
  locked meanwhile. Your AI app passes on the way FutureClinic gives.
- **Anything else.** Email help@futureclinic.com.

## Layout

```
.agents/plugins/marketplace.json       marketplace "futureclinic" for Codex (its primary path)
.claude-plugin/marketplace.json        marketplace "futureclinic" for Claude Code (Codex's legacy fallback)
plugins/futureclinic/
  .claude-plugin/plugin.json           Claude Code manifest
  .claude-plugin/icon.png              directory listing icon (the green square logo)
  .mcp.json                            Claude Code server ("type": "http")
  plugin.json                          Agent Plugins 1.0.0 manifest (Codex 0.160+, OpenAI)
  mcp.json                             Agent Plugins server ("type": "streamable-http")
  skills/chat/SKILL.md                 the playbook the model follows
  skills/chat/agents/openai.yaml       OpenAI: the skill's MCP dependency
  evals/                               claude plugin eval cases with MCP mocks
schemas/                               vendored agent-plugins.org 1.0.0 JSON schemas
scripts/validate.mjs                   repository checks (CI)
scripts/validate.test.mjs              one broken copy per check, so none goes quiet (CI)
```

Codex 0.144 reads `.mcp.json`, Codex 0.160+ reads `mcp.json`, Claude Code reads
`.mcp.json`. Keep the two server files identical (same name and URL), and the
two marketplace files listing the same plugins at the same paths;
`scripts/validate.mjs` fails when they differ. The plugin name `futureclinic`
is permanent once released.

## Develop

```sh
pnpm install
pnpm validate                                              # schemas, YAML, directory rules, cross-file checks
pnpm test                                                  # each check still fails when its rule breaks
claude plugin validate . --strict                          # marketplace
claude plugin validate plugins/futureclinic --strict       # plugin
claude --plugin-dir plugins/futureclinic plugin list       # loads in Claude Code
```

Never use `--strict-mcp-config` with this plugin: it drops the plugin's server.

`pnpm validate` also checks the Claude directory's rules that a file can show:
a skill frontmatter without `allowed-tools` (a directory plugin may not
pre-answer your permission prompts), no skill text that names the model's
memory, past, previous, earlier or prior chats or conversations, chat history
or logs, conversation summaries, what it already knows about the user, or the
user's files (policy 1.F; a word list, so review still reads the rest), a
plugin README of at least 40 words outside code blocks, no system files such
as `.DS_Store`, only remote `https://` servers (the plugin runs no local
command, so it has no package launcher to pin), and, over the saved tool
list, every tool name within 64 characters as Claude Code names it and every
tool with `title`, `readOnlyHint` and `destructiveHint`. It fails when a
Markdown file in the plugin, this README or `docs/` names a tool the saved
list does not have: a full `mcp__plugin_...` name anywhere, or a backticked
snake_case name that is no tool, argument or argument value of the saved
list. A skill line that lists a tool's arguments, such as
``- `get_chat` (`chat_id`, optional `wait_s`)``, may name only that tool's
own arguments and values, and calls none optional that the tool requires.
It fails, too, when a skill's `agents/openai.yaml` dependency description
names a tool the list does not have, when the skill never names a tool the
list has, and when a mock hands out a `chat_id` that
`get_chat`'s mocks have no file for. It checks that hints exist, not that
they are right.

### Evals

`plugins/futureclinic/evals/` holds `claude plugin eval` cases. They answer
the FutureClinic tools from mocks (`evals/mocks/futureclinic/`), never the
real server, and use made-up data only. They call a model on your account, so
they run locally before a release, not in CI:

```sh
cd plugins/futureclinic
claude plugin eval . --runs 3 --no-publish --max-cost-usd 5
```

A mock answers every call the same way, except `get_chat`, which answers
from `get_chat/<chat_id>.md` for the chat asked for, so a case reads the chat
its own timeline has; a `chat_id` with no file there fails the run.

`evals/mocks/futureclinic/_tools.json` is the server's own `tools/list`
answer, saved as it was sent. When a tool's name, description, schema or
annotations change on the FutureClinic server, save the new answer there,
then update the skill and the mocks that answer differently, and change the
source below. The saved copy, and every mock's wording, is the answer of the
FutureClinic server built from its source of 2026-10-23, saved that day,
before that source reached production; this line is the one place that
records it. Production may still answer differently until its
release, which the submission checklist checks before the listing goes in.

## Support

Email help@futureclinic.com. Privacy policy: https://futureclinic.com/privacy-policy.
Terms: https://futureclinic.com/terms-of-service.

## License

MIT, see [LICENSE](LICENSE). The FutureClinic name and logo are trademarks of
FutureClinic and are not licensed for other use.
