# XRP-Passport
This is a prototype for XRP Passport which is comprised of two parts.
* Creation of Verifiable credentials on hyperledger Indy
* Anchoring Verifiable credentials on XRPL
  
For this demo we have implemented a scenario where Alice, a graduate of the fictional Faber College, wants to apply for a job at the fictional company Acme Corp. We have implemented a local indy network called pool comprised of four nodes. The genesis transactions of these nodes are used to establish a connection pool **(Pool1.txn)**.

Once the connection is established Institutes like Government and University are configured with the pool in order to set format and definition of Transcript. After format is defined university can issue a transcript which Alice can use to apply for job.

After Verifiable credentials are created they will be anchored at XRPL by submitting a payment transaction. This payment transaction includes verifiable credentials as metadata in invoice_id in hashed format. This transaction can then be used for authentication as its immutable on XRPL **(XRPL_anchoring_transaction.py)**.
