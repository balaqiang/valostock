# Mega Flowchart — valostock.id (v8.0)

End-to-end flow across `front/` (Next.js), `back/` (Express) and the local Supabase project (Postgres + Auth + Storage). Stores **and every catalog** are verified by an admin. Midtrans Snap runs in Sandbox or simulation mode; Iris payouts, Digiflazz delivery and WhatsApp/Discord/Telegram are simulated.

> The assignment's formal model (Diagram Konteks, DFD, ERD, conceptual DB, table structure) is in [`docs/modeling/`](modeling/README.md). Admin screens: [`ADMIN_PANEL.md`](ADMIN_PANEL.md). Paste the code into mermaid.live to view it.

```mermaid
flowchart TD
    Start([User opens valostock.id]) --> Auth{"Logged in?"}
    Auth -- No --> Reg["Register (optional referral code) / Login<br/>Supabase Auth via API · httpOnly cookies"]
    Reg --> Role
    Auth -- Yes --> Role{"Intent?"}
    Role -- "Top-up" --> TU_Start
    Role -- "Buy an account" --> B_Browse
    Role -- "Open a store" --> S_Form

    %% ================= STORE ONBOARDING =================
    subgraph STORE_ONB["OPEN A STORE"]
        S_Form["Store profile: name, type OWNER/RESELLER, owner legal name<br/>PENDING_DEPOSIT"]
        S_Form --> S_Dep["Deposit Rp500.000 (payment)"] --> S_Review["PENDING_REVIEW"]
        S_Review --> A_Store{"Admin verifies store"}
        A_Store -- Reject + reason --> S_Rej["REJECTED"]
        A_Store -- Approve --> S_Active["ACTIVE · Free plan (5%)<br/>store balance opened"]
    end
    S_Active --> C_Draft

    %% ================= CATALOG + MODERATION =================
    subgraph LIST["CATALOG + ADMIN MODERATION"]
        C_Draft["Create catalog: game → fields from game template,<br/>title, price, description, photos (Storage) → DRAFT"]
        C_Draft --> C_Insp{"Inspect account? (optional)"}
        C_Insp -- Yes --> C_Check["Checklist + private media → Account Checked"]
        C_Insp -- No --> C_Submit
        C_Check --> C_Submit["Submit → VS code issued · PENDING_REVIEW<br/>(plan quota: Free 15 / Pro 60 / Business ∞)"]
        C_Submit --> A_Cat{"Admin reviews product"}
        A_Cat -- "Reject + reasons" --> C_Rej["REJECTED · store notified"]
        C_Rej -- "fix & resubmit" --> C_Submit
        A_Cat -- Approve --> C_Live["LISTED · visible to buyers"]
        C_Live -- "edit title/price/photos/attributes" --> C_Submit
        C_Live --> C_Promo["Promote: store voucher, flash sale, bundle,<br/>featured ad (paid), subscription (paid)"]
    end
    C_Live --> B_Browse

    %% ================= BUYER =================
    subgraph BUY["BUYER: DISCOVER, NEGOTIATE, BUY"]
        B_Browse["Search & filter (game fields), featured first,<br/>wishlist, follow store, recently viewed, chat store"]
        B_Browse --> B_Choice{"How to buy?"}
        B_Choice -- "Offer" --> O_Offer["Offer → store accept / counter / reject<br/>(expires 24 h)"]
        O_Offer -- accepted --> B_Order
        B_Choice -- "Lock first" --> B_Lock["Lock Rp5.000 · 30 min (payment)"] --> B_Order
        B_Choice -- "Buy now / bundle" --> B_Order
        B_Order["Order PENDING_PAYMENT · catalogs LOCKED<br/>price (offer / flash sale / bundle) − store voucher<br/>+ handling max(3.5%, Rp4.000) + protection Rp5.000"]
        B_Order --> PAY
    end

    %% ================= PAYMENT =================
    subgraph PAYFLOW["PAYMENT (all purposes)"]
        PAY["payments row PENDING + Midtrans Snap (or simulation)"]
        PAY --> PAY_Check{"Status from Midtrans Status API / signed webhook"}
        PAY_Check -- settlement --> PAY_OK["PAID → apply by purpose"]
        PAY_Check -- "expire / cancel" --> PAY_Fail["FAILED/EXPIRED → order CANCELLED, catalog LISTED"]
        PAY_Fail -. "Midtrans reports PAID later" .-> PAY_Late["Payment PAID · refunds row PENDING (PAID_AFTER_CANCEL)"]
    end
    PAY_OK -- ORDER --> RK_Open
    PAY_OK -- TOPUP --> TU_Deliver
    PAY_OK -- BALANCE_FILL --> BL_Credit
    PAY_OK -- "STORE_DEPOSIT" --> S_Review
    PAY_OK -- "SUBSCRIPTION / AD / LOCK" --> PAY_Other["activate plan · start featured ad · lock catalog 30 min<br/>(lock on a sold catalog → refund queue)"]
    PAY_Late --> A_Ref{"Admin completes refund (note)"}
    PAY_Other -. "LOCK_UNAVAILABLE" .-> A_Ref

    %% ================= REKBER =================
    subgraph REKBER["ESCROW + REKBER"]
        RK_Open["PAID · escrow +price (ESCROW_HOLD) · catalog IN_ORDER"]
        RK_Open --> RK_Deliver["Store sends account in rekber → IN_REKBER"]
        RK_Deliver --> RK_Safe["Buyer secures account → 'Akun aman' → SAFE"]
        RK_Safe --> RK_Done["Buyer 'Selesai' or auto 5 h after SAFE → COMPLETED"]
        RK_Done --> RK_Release[["Escrow release: available += price − commission (tier rate)<br/>loyalty points · referral reward · rating unlocked"]]
    end
    RK_Deliver -. "problem" .-> DSP
    RK_Safe -. "problem" .-> DSP
    RK_Release -. "within 14/30-day protection" .-> DSP

    %% ================= DISPUTE & RATING =================
    subgraph DISP["DISPUTE & RATING"]
        DSP["Dispute OPEN (reason + evidence) · store deadline 72 h"]
        DSP --> DSP_Resp["Store statement + evidence"] --> A_Dsp{"Admin decides"}
        A_Dsp -- Buyer wins --> DSP_B["Refund escrow (or compensation from store balance, shortfall from DEPOSIT) · catalog LISTED"]
        A_Dsp -. "sanction" .-> SANC["WARNING · FINE (DEPOSIT_DEDUCTION) · SUSPEND"]
        A_Dsp -- Store wins --> DSP_S["Order completes · escrow released"]
        RK_Release --> RATE["Rating ±1 + 3 service scores · store replies once"]
    end

    %% ================= PAYOUT =================
    subgraph PAYOUT["STORE PAYOUTS (Iris simulated)"]
        RK_Release --> W_Req["Withdraw: name must match owner legal name<br/>available −amount → PENDING"]
        RK_Release --> T_Req["Reseller: transfer to external seller → PENDING"]
        W_Req --> A_Pay{"Admin decision"}
        T_Req --> A_Pay
        A_Pay -- Approve --> W_Done["COMPLETED"]
        A_Pay -- Reject --> W_Rev["REJECTED · PAYOUT_REVERSAL"]
    end

    %% ================= STORE CLOSURE =================
    subgraph CLOSE["STORE CLOSURE"]
        CL_Req["Store: 'Tutup toko' (no active orders, disputes, pending payouts, escrow = 0) → CLOSING, catalogs DELISTED"]
        CL_Req --> A_Close{"Admin decision"}
        A_Close -- Approve --> CL_Done["CLOSED · DEPOSIT_REFUND → available · withdraw the rest"]
        A_Close -- "Reject (reason)" --> CL_Back["ACTIVE again"]
    end

    %% ================= TOP-UP =================
    subgraph TOPUP["TOP-UP + CLOSED-LOOP BALANCE"]
        TU_Start["Game → UID → nominal → promo → contact"] --> TU_Src{"Pay with?"}
        TU_Src -- Midtrans --> PAY
        TU_Src -- Balance --> TU_Bal["SPEND_TOPUP"] --> TU_Deliver
        TU_Deliver["Delivery (simulated) → SUCCESS · points earned"] --> TU_Inv["Invoice check (masked game ID)"]
        TU_Deliver -. "not received · admin refund" .-> TU_Ref["Member: REFUND_CREDIT to Balance · Guest: refund queue (TOPUP_UNDELIVERED)"]
        BL_Fill["Buy Balance vouchers"] --> PAY
        BL_Credit["TOPUP_CREDIT"]
        PTS["Redeem 100 points → Rp1.000 Balance"]
    end
```

## How to read it

- **Two admin gates before anything is sold:** the store (identity + deposit) and **every catalog** (photos, game fields, description, price). Rejections always carry a reason, and the store can fix and resubmit.
- **One payment flow** for orders, top-ups, Balance, deposits, subscriptions, featured ads and locks. Only Midtrans' answer (or simulation mode) marks a payment PAID.
- **Money always leaves a trail:** `store_ledger`, `balance_ledger`, `loyalty_ledger` with `balance_after`, in the same DB transaction as the state change.
- **Timers are jobs:** unpaid orders (60 min), locks (30 min), offers (24 h), auto-complete (5 h after SAFE), flash sales, featured ads, subscriptions, dispute deadlines (72 h).
