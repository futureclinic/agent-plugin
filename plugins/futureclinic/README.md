# FutureClinic

Text a state-licensed US doctor from your AI app. Tell your assistant what is
going on, answer FutureClinic's questions in your own words, read the summary
before it goes to a doctor, and approve it yourself. Ask "did my doctor
reply?" and your assistant lists your FutureClinic chats, each with a short
status and a link, and reads your doctor's messages to you word for word.
Ask "what's in my treatment plan?" and it reads you the plan your doctor
sent, once you have confirmed your home address and ID on FutureClinic;
accepting the plan, and every step after it, happens in the FutureClinic app
or on its website.

FutureClinic is cash-pay and for adults, about their own health. It is not
for emergencies, controlled substances, or phone, video or in-person care. A
doctor typically replies in a few hours, up to 48 hours. You pay only on FutureClinic's
payment page in your browser, never in the AI app. Photos and videos go
to FutureClinic through its own upload page, where you sign in to your own
account, never through your AI app. For
an emergency call 911, or call or text 988 for a
mental-health crisis.

## Try asking

- "Can a FutureClinic doctor look at the itchy rash on my arms?"
- "Has my FutureClinic doctor replied yet?"
- "What did my doctor say about the cream, word for word?"
- "What's in my FutureClinic treatment plan?"
- "I want to pay for my FutureClinic request."

## Install

In Claude Code:

```sh
claude plugin marketplace add futureclinic/agent-plugin
claude plugin install futureclinic@futureclinic
```

Then type `/mcp`, choose `plugin:futureclinic:futureclinic` and Authenticate
with your FutureClinic account.

## What it runs, sends and stores

The plugin holds no code that runs on your computer and stores nothing. It
adds one remote server, `https://mcp.futureclinic.com/mcp`, and one skill,
`chat`, that tells your assistant how to use it. You sign in to FutureClinic
in your browser (OAuth) and agree to share data with your AI app; your AI app
then calls FutureClinic's tools for you, and FutureClinic receives only those
calls. `list_chats` and `get_treatment_plan` only read; `get_chat` reads a
chat and marks it read, as opening it in the app does. Sending your summary to a doctor
(`confirm_summary`) always asks for your approval first.

Chat status lines carry no health details. What you send in a chat becomes
part of your FutureClinic medical record, which FutureClinic keeps for the
years state law sets. Anything you send through these tools also passes
through your AI company, under its own terms. You can disconnect an AI app at
any time in your FutureClinic account settings.

Privacy policy: https://futureclinic.com/privacy-policy. Terms:
https://futureclinic.com/terms-of-service. Help: help@futureclinic.com.
Setup and troubleshooting: https://github.com/futureclinic/agent-plugin#troubleshooting.
