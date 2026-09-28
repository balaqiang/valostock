# Mega Flowchart — valostock.id (v7.0, Prototype)

End-to-end flow of the **prototype**: Buyer, Store, Admin, and Midtrans, across `front/` (Next.js), `back/` (Express + mysql2) and MySQL (XAMPP). Store verification is **manual by an admin** (no KYC provider). Midtrans Snap runs in Sandbox (or simulation mode). Top-up fulfilment and payouts are **simulated**.

> For the assignment's formal model (Diagram Konteks, DFD, ERD, conceptual DB, table structure) see [`docs/modeling/`](modeling/README.md). This page is an end-to-end overview flowchart. Paste the code into mermaid.live to view it.

```mermaid
flowchart TD
    Start([User opens valostock.id]) --> Auth{"Logged in?"}
    Auth -- No --> Reg["Register / Login<br/>(email + password, JWT httpOnly cookie)"]
    Reg --> Role
    Auth -- Yes --> Role{"Intent?"}
    Role -- "Top-up" --> TU_Start
    Role -- "Buy an account" --> B_Browse
    Role -- "Open a store" --> S_Form

    %% ================= STORE ONBOARDING =================
    subgraph STORE_ONB["OPEN A STORE (manual verification)"]
        S_Form["Store form: name, type OWNER/RESELLER,<br/>owner legal name, description<br/>status = PENDING_DEPOSIT"]
        S_Form --> S_Dep["Pay deposit Rp500.000 (payment flow)"]
        S_Dep --> S_Review["Deposit PAID → status PENDING_REVIEW"]
        S_Review --> A_Store{"Admin reviews store data"}
        A_Store -- Reject --> S_Rej["status REJECTED + note<br/>(audit log)"]
        A_Store -- Approve --> S_Active["status ACTIVE, identity_verified = 1<br/>store_balances row created (audit log)"]
    end
    S_Active --> C_Create

    %% ================= LISTING =================
    subgraph LIST["STORE: CATALOG"]
        C_Create["Create catalog: game, title, price, attributes"]
        C_Create --> C_Id["Platform issues unique VS code<br/>status LISTED"]
    end
    C_Id --> B_Browse

    %% ================= BUY ACCOUNT =================
    subgraph BUY["BUYER: BUY AN ACCOUNT"]
        B_Browse["Browse / search / listing detail"]
        B_Browse --> B_Order["Buy → order PENDING_PAYMENT<br/>catalog LOCKED (anti double-sell)<br/>total = price + handling max(3.5%, Rp4.000) + protection Rp5.000"]
        B_Order --> B_Method["Choose payment method"]
        B_Method --> PAY
    end

    %% ================= PAYMENT =================
    subgraph PAYFLOW["PAYMENT (shared by order / top-up / Balance / deposit)"]
        PAY["API creates payments row (PENDING)<br/>+ Midtrans Snap transaction (or simulation URL)"]
        PAY --> PAY_Redirect["Browser → Midtrans payment page"]
        PAY_Redirect --> PAY_Return["Return to /payment/finish"]
        PAY_Return --> PAY_Check{"API asks Midtrans Status API<br/>(amount must match)"}
        PAY_Hook["Optional: signed webhook<br/>(SHA512 + webhook_events idempotency)"] -.-> PAY_Check
        PAY_Check -- "settlement / capture" --> PAY_OK["payments PAID → apply by purpose"]
        PAY_Check -- "pending" --> PAY_Wait["Still pending — check again later"]
        PAY_Check -- "expire / cancel / deny" --> PAY_Fail["payments FAILED/EXPIRED<br/>order CANCELLED, catalog LISTED again"]
    end
    PAY_OK -- "ORDER" --> RK_Open
    PAY_OK -- "TOPUP" --> TU_Deliver
    PAY_OK -- "BALANCE_FILL" --> BL_Credit
    PAY_OK -- "STORE_DEPOSIT" --> S_Review

    %% ================= REKBER =================
    subgraph REKBER["ESCROW + REKBER ROOM (code = VS code)"]
        RK_Open["order PAID, catalog IN_ORDER<br/>store escrow += price (store_ledger ESCROW_HOLD)<br/>system message: rekber opened"]
        RK_Open --> RK_Deliver["Store sends account access in rekber messages<br/>order IN_REKBER"]
        RK_Deliver --> RK_Safe["Buyer changes email/password → clicks 'Akun aman'<br/>order SAFE"]
        RK_Safe --> RK_Done["Buyer clicks 'Selesai' → order COMPLETED, catalog SOLD"]
        RK_Done --> RK_Release[["Escrow release (one DB transaction):<br/>escrow −price · available +price · available −5% commission<br/>(store_ledger ESCROW_RELEASE + COMMISSION)"]]
    end

    %% ================= WITHDRAW =================
    subgraph PAYOUT["WITHDRAWAL (Iris simulated)"]
        RK_Release --> W_Req["Store requests withdrawal: amount, bank, account, name"]
        W_Req --> W_Match{"Account name vs owner legal name"}
        W_Match -- MISMATCH --> W_Block["Rejected immediately"]
        W_Match -- "MATCH / REVIEW" --> W_Debit["available −amount (WITHDRAW + WITHDRAW_FEE)<br/>withdrawal PENDING"]
        W_Debit --> A_W{"Admin decision"}
        A_W -- Approve --> W_Done["COMPLETED (simulated transfer)"]
        A_W -- Reject --> W_Rev["REJECTED → PAYOUT_REVERSAL +amount"]
    end

    %% ================= TOP-UP =================
    subgraph TOPUP["TOP-UP + CLOSED-LOOP BALANCE"]
        TU_Start["Pick game → UID (+zone) → nominal<br/>→ optional promo → contact"]
        TU_Start --> TU_Src{"Pay with?"}
        TU_Src -- "Midtrans (QRIS/VA/retail/e-wallet/CC)" --> PAY
        TU_Src -- "Balance (login)" --> TU_Bal["balance −total (balance_ledger SPEND_TOPUP)"]
        TU_Bal --> TU_Deliver["Simulated provider → status SUCCESS"]
        TU_Deliver --> TU_Invoice["Invoice check page (game ID masked)"]
        BL_Fill["Buy Balance vouchers (nominal × qty)"] --> PAY
        BL_Credit["balance +credit (balance_ledger TOPUP_CREDIT)"]
    end
```

## How to read it

- **One payment flow for everything.** Orders, top-ups, Balance fills and store deposits all create a `payments` row. Only Midtrans' own answer (Status API or signed webhook) can mark it PAID, and the effect depends on `purpose`.
- **Money always leaves a trail.** Every change to `users.balance` or `store_balances` writes a ledger row (`balance_ledger` / `store_ledger`) with `balance_after`, inside the same DB transaction.
- **Prototype simplifications:** escrow is released on *Selesai* (no 5-hour timer); withdrawals are completed by admin approval (Iris simulated); top-up delivery is simulated; disputes, offers, ratings and notifications are future work.
