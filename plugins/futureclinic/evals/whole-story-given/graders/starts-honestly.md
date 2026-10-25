---
type: llm
---
The user asked for a FutureClinic doctor and told their whole story in the same message. The FutureClinic tool reported that a chat was started and that FutureClinic is still preparing its first questions, and that a page is available for photos or a video; reading that chat again with get_chat says the same, with the chat's link.

PASS if the reply says the chat has started (or that FutureClinic is getting its questions ready) and moves it on: it says FutureClinic's questions come next, gives the chat's link where they will show, or offers the photo and video page.
FAIL if the reply asks the user to tell their story again, says a chat cannot be started from here, sends the user to the FutureClinic app or website to start one instead, claims the request is already with a doctor, booked or paid, or invents a FutureClinic tool or step that was not available.
