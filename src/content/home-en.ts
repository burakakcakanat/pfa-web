// English home page copy. Consolidated here so no translated strings sit inline
// in components. The Turkish home page copy still lives in src/routes/index.tsx
// until that page is migrated to the same shape.
export const HOME_COPY = {
  en: {
    eyebrow: "Psycho-Functional Analysis",
    h1a: "A functional map of",
    h1b: "human consciousness.",
    lede:
      "PFA divides human consciousness into seven functional levels — from the survival drive of a single cell to the experience of universal unity — and pairs each one with a region of the brain, a type of intelligence and a stage of development.",
    metaRow: ["7 levels", "7 intelligences", "one map"],
    ctaBooks: "See the books",
    ctaMap: "Explore the map",

    mapEyebrow: "The map",
    mapTitle: "Seven functional levels",
    mapIntro:
      "Six core levels and one integrating level. All of them are active in everyone. PFA makes it possible to see which level needs regulating and which needs developing, so a person can orient themselves.",
    levels: [
      { code: "L1", name: "Survival", intel: "Physical Intelligence (PQ)" },
      { code: "L2", name: "Emotion & Memory", intel: "Emotional Intelligence (EQ)" },
      { code: "L3", name: "Rationality", intel: "Rational Intelligence (IQ)" },
      { code: "L4", name: "Meaning", intel: "Love Intelligence (LQ)" },
      { code: "L5", name: "Will", intel: "Creative Intelligence (CQ)" },
      { code: "L6", name: "Flow", intel: "Wisdom Intelligence (TQ)" },
      { code: "L7", name: "Unity", intel: "Holistic Intelligence (GQ)" },
    ],
    levelsNote:
      "Each level has its own intelligence. Development means attunement between them, not climbing higher: no level is better than another.",

    offerEyebrow: "What is available",
    offerTitle: "Books, the assessment and the 7Q Profile",

    bookTitle: "Psycho-Functional Analysis",
    bookSubtitle: "A Map of Consciousness — From Survival to Enlightenment",
    bookDesc:
      "Seven functional levels, seven types of intelligence. A way of finding your bearings, written for therapists, coaches, educators and anyone who has set out to understand themselves.",
    amazonHeading: "Amazon · standard edition (unsigned)",
    amazonKindle: "Kindle",
    amazonPaperback: "Paperback",
    amazonPick: "Choose a country…",
    signedHeading: "From this site · personalised signed copy",
    signedPriceNote: "PDF and EPUB together, personalised to your name.",
    signedBuyLabel: "Get the personalised copy",
    signedNote:
      "The personalised signed copy is a digital PDF prepared for your name. There is nothing to post; it appears in your account.",

    assessmentTitle: "PFA Assessment + report",
    assessmentDesc:
      "A self-development assessment across the seven levels. It indicates which function is out of tune and turns awareness into functional awareness. The full report is a digital PDF in your account.",
    assessmentFreeNote: "A short free version is available in Turkish; the English version is in preparation.",
    assessmentBuyLabel: "Get the full report",

    sevenqTitle: "7Q Profile",
    sevenqUpcoming: "Upcoming",
    sevenqDesc:
      "A separate profile alongside the PFA Assessment, reporting a 7Q Score across five dimensions — Practicality, Creativity, Resilience, Will and Routine. Currently in pilot; not yet on sale.",

    noticeTitle: "What this is, and what it is not",
    noticeBody:
      "PFA content, assessment results and consultation sessions are educational and developmental in purpose. They are not a substitute for medical diagnosis, treatment or psychiatric care.",

    legalEyebrow: "Buying from this site",
    refundLink: "Refund policy",
    termsLink: "Terms of use",
    contactLine: "Questions before you buy? Write to us at",
  },
} as const;