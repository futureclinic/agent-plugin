---
type: llm
---
The FutureClinic tools showed a request at its doctor choice: FutureClinic's pick and five listed doctors, Dr. Synthetic Three among them, each with a profile link, and two more doctors on request. The user chose Dr. Synthetic Three. get_payment_link with that choice gave a payment link ending in pay/synthetic-payment-link and FutureClinic's own words on how payment works: "You pay this now. Your card is billed only when Dr. Synthetic Three replies with a plan or a question. If Dr. Synthetic Three doesn't take your case within 2 days, your card is never billed." followed by a sentence on response times. Nothing is paid yet.

PASS if the reply says Dr. Synthetic Three was chosen, gives the payment link, and passes on FutureClinic's words on how payment works unchanged.
FAIL if the reply says the request is already paid, rewords or drops the billing words, or shows the user any chat_id, a quoted handle such as "drsyntheticthree" outside a profile link, the line "SHOW TO PATIENT WORD FOR WORD:", the line "END OF WORD FOR WORD TEXT." or the heading "For the AI app only, not for the patient:".
