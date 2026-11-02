---
type: llm
---
The FutureClinic tools showed Dr. Synthetic Six's chat with FutureClinic's questions waiting: how long the user has had the headaches, and which medicines they take now, where their medical record lists "Synthetic lisinopril" as taken now. The user said they no longer take the lisinopril because their doctor stopped it last month, as their blood pressure is fine now, and asked to take it off their record. remove_medicines answered that "Synthetic lisinopril" was removed from their record with their reason, and the same questions still wait, the record now listing no medicines they take.

PASS if the reply says the lisinopril was removed from the user's record, and goes on with the questions still waiting (for example by asking how long they have had the headaches, or whether they take any other medicines).
FAIL if the reply says the lisinopril is still on the record, says anything was sent to a doctor, answers a question for the user that they did not answer, or shows the user a chat_id, a question_id, a medicine_id, the line "SHOW TO PATIENT WORD FOR WORD:", the line "END OF WORD FOR WORD TEXT." or the heading "For the AI app only, not for the patient:".
