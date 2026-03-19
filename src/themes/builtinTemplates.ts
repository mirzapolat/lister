export interface BuiltinTemplate {
  name: string;
  description: string;
  subject: string;
  body: string;
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    name: 'Monthly Newsletter',
    description: 'A structured monthly newsletter with sections for highlights, a featured story, and quick links.',
    subject: 'What\'s New This Month',
    body: `# What's New This Month

Hello {{name}},

Welcome to this month's newsletter. Here's a quick look at what's been happening.

---

## Highlights

- **Update one** — A brief description of something notable.
- **Update two** — Another point worth sharing.
- **Update three** — Keep it concise and valuable.

---

## Featured Story

Write a longer piece here. This could be a story, a deep dive, or a personal note. Aim for 2–4 short paragraphs.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

---

## Quick Links

- [Link One](#)
- [Link Two](#)
- [Link Three](#)

---

Thanks for reading. See you next month!`,
  },
  {
    name: 'Product Announcement',
    description: 'Announce a new product, feature, or update to your audience.',
    subject: 'Introducing Something New',
    body: `# Introducing Something New

Hi {{name}},

We're excited to share something we've been working on — and we think you'll love it.

---

## What's New

**[Product / Feature Name]** is now live.

Here's what it does:

- **Benefit one** — Explain the key value in plain language.
- **Benefit two** — Keep it user-focused.
- **Benefit three** — What problem does it solve?

---

## See It in Action

> "Quote or testimonial that adds credibility."
> — Early user name

---

## Get Started

[Call to action button text](#)

Questions? Just reply to this email — we read everything.

Thanks,
The Team`,
  },
  {
    name: 'Welcome Email',
    description: 'A warm welcome email for new subscribers with a clear what-to-expect section.',
    subject: 'Welcome aboard, {{first_name}}!',
    body: `# Welcome aboard!

Hi {{first_name}},

We're really glad you're here.

You just signed up for **[Newsletter / Community Name]** — and we want to make sure you get the most out of it.

---

## What to Expect

Here's what you'll get from us:

- **[Frequency]** emails with [topic focus]
- Exclusive content not published anywhere else
- Practical, actionable insights — no fluff

---

## A Quick Start

Here are three things you can do right now:

1. **[Action One]** — A quick task that delivers value immediately.
2. **[Action Two]** — Another easy win.
3. **[Action Three]** — Optional but worth doing.

---

Have a question or just want to say hi? Reply to this email — I read every message.

Talk soon,
**[Your Name]**`,
  },
  {
    name: 'Promotional Offer',
    description: 'A time-limited promotional email with a clear call to action and expiry date.',
    subject: 'A Special Offer Just for You',
    body: `# A Special Offer Just for You

Hi {{name}},

We rarely do this — but for the next few days, we're offering something special to our subscribers.

---

## The Offer

**[Offer Name]** — [Brief one-line description of the offer]

- ✅ [Benefit or included item 1]
- ✅ [Benefit or included item 2]
- ✅ [Benefit or included item 3]

---

## How to Claim It

[Claim Offer](#)

Use code **SUBSCRIBER** at checkout, or click the link above.

**Offer expires [date].** After that, it's gone.

---

Questions? Reply to this email and we'll help right away.

Thanks,
**[Your Name]**

---

*You're receiving this because you subscribed to [Newsletter Name].*`,
  },
  {
    name: 'Event Invitation',
    description: 'Invite subscribers to a webinar, live event, or in-person gathering.',
    subject: 'You\'re Invited — [Event Name]',
    body: `# You're Invited

Hi {{name}},

We'd love to have you join us for **[Event Name]**.

---

## Event Details

- **Date:** [Day, Month Date, Year]
- **Time:** [Start Time] – [End Time] [Timezone]
- **Location:** [Online / Venue Address]

---

## What to Expect

[Describe the event in 2–3 sentences. What will attendees learn or experience? Why should they come?]

---

## Who Should Attend

This is perfect for people who:

- [Audience trait 1]
- [Audience trait 2]
- [Audience trait 3]

---

## Reserve Your Spot

[Register Now](#)

Spots are limited — grab yours before they're gone.

See you there!
**[Your Name]**`,
  },
];
