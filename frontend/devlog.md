# Built BoomerBill in a Day — A Tiny App to Track Unpaid Tech Support Time

I built a small app this week called **BoomerBill**.

It tracks how much time you spend on “just one quick thing” and other boomer technical incompantance and calucaltes how much may you could have made freelances

## The Problem

If you’re a developer or can turn on a computer, you probably get this:

- “My Wi-Fi stopped working.”
- “The printer won’t connect.”
- “I broke something.”
- “Just one quick thing…”

Individually, they feel small.

Collectively, they add up.

But because it’s informal, we don’t track it. And if you don’t track it, it feels like it doesn’t exist.

I wanted to measure it.

## What It Does

BoomerBill is intentionally simple:

- Start / Stop timer  
- Quick add presets (Wi-Fi issue, printer, “I broke something”)  
- Live cost ticking up while you're helping  
- Lifetime totals  
- Daily / weekly / yearly averages  
- Local-first (no backend, no accounts)

It converts minutes into lost income using your hourly rate.

No billing. No invoices. Just awareness.

## Tech Stack

- Vue 3 (Composition API)  
- Pinia for state  
- DaisyUI + Tailwind  
- LocalStorage persistence  
- AGPLv3 license  

No SSR.  
No backend.  
No analytics.  
No SaaS.

Just a small, honest tool.

## Interesting Build Challenge

The trickiest part was keeping the timer visually ticking every second without mutating store state continuously.

The timer UI updates locally.  
The session only commits to the store on Stop.

This kept state clean and testable.

## Why I Built It

Two reasons:

1. Curiosity — how much invisible labor am I actually giving away?  
2. Boundaries — data makes it easier to decide when to say no.  

After tracking for a week, the numbers were… higher than I expected.

## Questions for You

- Do you track unpaid support time?  
- Do you bill friends/family? Never? Sometimes?  
- Have you found a healthy boundary strategy?  

Would love feedback on both the idea and the implementation.
