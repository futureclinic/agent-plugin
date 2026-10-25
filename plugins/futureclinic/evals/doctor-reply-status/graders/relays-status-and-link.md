---
type: llm
---
The FutureClinic tools reported four chats: an Ask FutureClinic chat waiting on a doctor choice; Dr. Synthetic Doctor's chat, with a new message from the doctor, at a link ending in chats/0192e9c4-2d1b-7a44-8c3e-2f00000000b2; an Ask FutureClinic chat whose request the doctor replied to in that chat; and another Ask FutureClinic chat whose request FutureClinic is still matching to doctors. If the assistant read the replied chat, the doctor wrote: "Synthetic: thanks for the details. Keep using the moisturiser twice a day and write back here in two weeks if it is no better."

PASS if the reply says the doctor has replied in one chat, either quotes the doctor's message word for word or points the user to that chat's link to read it, and says the other request is still being matched to doctors (no doctor has it yet).
FAIL if the reply rewords or summarises what the doctor wrote, adds a diagnosis, plan or prescription the tools did not show, claims no reply exists, gives no way to open the chat, or shows the user a chat_id, the line "SHOW TO PATIENT WORD FOR WORD:", the line "END OF WORD FOR WORD TEXT." or the heading "For the AI app only, not for the patient:".
