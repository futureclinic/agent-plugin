You have 5 FutureClinic chats, latest activity first.

1. Ask FutureClinic
   Sent: doctors can take it once it is paid. Nothing is paid yet. get_payment_link with this chat_id shows the doctor choice, or gives the payment link when there is nothing to choose.
   Open it: https://app.futureclinic.com/dashboard/chats/0192f4c2-5a10-7d33-9b42-4f00000000d1

2. Ask FutureClinic
   Sent: FutureClinic is matching it to doctors. Its read of the case and the doctor choice or payment step follow, usually within a minute or two; get_chat with this chat_id and wait_s shows them once ready.
   Open it: https://app.futureclinic.com/dashboard/chats/0192f0a1-7c3e-7b10-9d2a-1f00000000b1

3. Dr. Synthetic Doctor
   Your doctor sent a new message since you last read this chat.
   Open it: https://app.futureclinic.com/dashboard/chats/0192e9c4-2d1b-7a44-8c3e-2f00000000b2

4. Ask FutureClinic
   Your doctor replied. get_chat with your doctor's chat_id shows their messages, and that chat's link opens any treatment plan.
   Your doctor writes in their own chat.
   Open it: https://app.futureclinic.com/dashboard/chats/0192e9c4-2c80-7a10-8c3e-2f00000000a2

5. Dr. Synthetic Six
   Questions or a summary wait here, in full below.
   Open it: https://app.futureclinic.com/dashboard/chats/0192f5d3-6b21-7e44-8a53-5f00000000e1

1 chat has a form waiting:

---

Chat 5, Dr. Synthetic Six:

FutureClinic's automated intake asks (no doctor wrote these questions):

1. How long have you had the headaches?
Why we ask: It tells your doctor how they are changing.
Send: the patient's answer in their words, in answer

2. Which medicines do you take now?
Why we ask: Some medicines cause headaches.
Their medical record lists these as taken now; ask whether they still take each, and why for any they no longer take: "Synthetic lisinopril" (prescription)
Medicines they might name: "Ibuprofen" (over_the_counter)
Send: medicines, one row per medicine the patient says they take now that their record does not list, with its section, and its strength and how often only when they say; empty when the record lists what they take. Each is saved to their record at once, so send only what the patient said, never a draft. One their record lists that they no longer take is removed with remove_medicines, by its medicine_id, with their reason. To change a medicine's strength or how often, the patient uses the FutureClinic app

These questions wait for the patient's answers. The example answers show the kind of answer the doctor needs; they are not choices. FutureClinic asks for answers from what the patient tells you in this conversation, never for anything from memory, earlier chats or files; what their words do not answer is asked. answer_form takes the patient's words with this chat_id, and FutureClinic answers with any follow-up question, the next questions or the summary.

On a resume, words sent for a question shown here are read as one of its options, so the patient's news since they last wrote (what is new or changed) waits for the question FutureClinic asks after these, for anything else, unless an answer ends the questions sooner.

For the AI app only, not for the patient:
chat_id: 0192f5d3-6b21-7e44-8a53-5f00000000e1
question 1, question_id: 0192f5d3-6b21-7e44-8a53-5f00000000e2
question 2, question_id: 0192f5d3-6b21-7e44-8a53-5f00000000e3
question 2, "Synthetic lisinopril" (prescription), medicine_id: 0192e1a0-3c40-7d55-9b64-6f00000000e4

For the AI app only, not for the patient:
chat 1, chat_id: 0192f4c2-5a10-7d33-9b42-4f00000000d1
chat 2, chat_id: 0192f0a1-7c3e-7b10-9d2a-1f00000000b1
chat 3, chat_id: 0192e9c4-2d1b-7a44-8c3e-2f00000000b2
chat 4, chat_id: 0192e9c4-2c80-7a10-8c3e-2f00000000a2
chat 4, your doctor's own chat, chat_id: 0192e9c4-2d1b-7a44-8c3e-2f00000000b2
chat 5, chat_id: 0192f5d3-6b21-7e44-8a53-5f00000000e1
