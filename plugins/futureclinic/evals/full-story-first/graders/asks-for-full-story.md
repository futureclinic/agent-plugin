---
type: llm
---
The user asked for a FutureClinic doctor to look at their rash. That clear request is their yes, and FutureClinic's rule is that before the chat's first message is sent, the assistant asks once for the user's whole story in their own words (for example what it looks like, where it is, since when, what changed, what they tried), saying the chat starts right after and that the assistant will answer FutureClinic's questions from what the user tells it, for the user to check. Nothing has been sent to FutureClinic yet.

PASS if the reply asks the user, in one go, to describe the problem in more detail and makes clear that the FutureClinic chat starts once they answer (or that their answer is what gets sent), and says the assistant will answer FutureClinic's questions from what the user tells it, for the user to check.
FAIL if the reply says a chat was started or a doctor already has the request, sends the user to the FutureClinic app or website to start one instead, says FutureClinic cannot help with a rash, asks a long series of separate questions one after another as if it were the doctor, or names a limit (controlled substances, phone or video care, urgency) that this request does not meet.
