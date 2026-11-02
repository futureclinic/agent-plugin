Removed from the patient's record, with their reason: "Synthetic lisinopril".

FutureClinic's automated intake asks (no doctor wrote these questions):

1. How long have you had the headaches?
Why we ask: It tells your doctor how they are changing.
Send: the patient's answer in their words, in answer

2. Which medicines do you take now?
Why we ask: Some medicines cause headaches.
Their medical record lists no medicines they take now.
Medicines they might name: "Ibuprofen" (over_the_counter)
Send: medicines, one row per medicine the patient says they take now that their record does not list, with its section, and its strength and how often only when they say; empty when the record lists what they take. Each is saved to their record at once, so send only what the patient said, never a draft. One their record lists that they no longer take is removed with remove_medicines, by its medicine_id, with their reason. To change a medicine's strength or how often, the patient uses the FutureClinic app

These questions wait for the patient's answers. The example answers show the kind of answer the doctor needs; they are not choices. FutureClinic asks for answers from what the patient tells you in this conversation, never for anything from memory, earlier chats or files; what their words do not answer is asked. answer_form takes the patient's words with this chat_id, and FutureClinic answers with any follow-up question, the next questions or the summary.

On a resume, words sent for a question shown here are read as one of its options, so the patient's news since they last wrote (what is new or changed) waits for the question FutureClinic asks after these, for anything else, unless an answer ends the questions sooner.

For the AI app only, not for the patient:
chat_id: 0192f5d3-6b21-7e44-8a53-5f00000000e1
question 1, question_id: 0192f5d3-6b21-7e44-8a53-5f00000000e2
question 2, question_id: 0192f5d3-6b21-7e44-8a53-5f00000000e3
