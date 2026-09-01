// English page copy for the /en surfaces (books, levels, about, contact).
// Translated faithfully from the existing Turkish content; nothing invented.
// Locked glossary: PFA Assessment (never "Scale"), 7Q Profile, Attunement,
// personalised signed copy = digital PDF. Level names match the English book.

export const BOOKS_COPY = {
  en: {
    eyebrow: "Books",
    h1: "The source texts of the map",
    lede:
      "Personalised signed copies are available only from this site; each one carries a dedication written to your name. Everything here is digital — there is nothing to post.",
    pfa: {
      kicker: "PFA · Source text",
      title: "Psycho-Functional Analysis",
      subtitle: "A Map of Consciousness — from Survival to Enlightenment",
      desc:
        "Seven functional levels, seven types of intelligence. A way of finding your bearings, written for therapists, coaches, educators and anyone who has set out to understand themselves.",
    },
    hcd: {
      kicker: "HCD · Earlier work",
      title: "Human Consciousness Decoded",
      subtitle: "The first book on the science of enlightenment (2015) — the roots of the PFA model.",
      desc:
        "An early study that examines how consciousness works in the language of science and insight; the intellectual foundation PFA was later built on.",
    },
    amazonHeading: "Amazon · standard edition (unsigned)",
    kindle: "Kindle",
    paperback: "Paperback",
    pickCountry: "Choose a country…",
    signedHeading: "From this site · personalised signed copy",
    signedPriceNote: "PDF and EPUB together, personalised to your name.",
    signedBuy: "Get the personalised copy",
    signedNote:
      "The personalised signed copy is a digital PDF prepared for your name. It appears in your account as soon as it is ready.",
    langLabel: { tr: "Turkish", en: "English" } as Record<"tr" | "en", string>,
    loading: "Loading…",
  },
} as const;

export const LEVELS_COPY = {
  en: {
    eyebrow: "The map",
    h1: "The seven levels of consciousness",
    lede:
      "PFA reads consciousness across seven functional levels. Each level is paired with a structure in the brain, a type of intelligence and a stage of development. All seven are active in everyone, all of the time.",
    levels: [
      {
        code: "L1",
        name: "Survival",
        intel: "Physiological Intelligence (PQ)",
        anchor: "Brain stem",
        body:
          "The oldest layer: breath, hunger, sleep, safety, the split between threat and resource. Its intelligence is the body's billions-of-years-old survival programme. It does not deliberate; it reacts — and it is right to. Everything else rises on the ground it provides.",
      },
      {
        code: "L2",
        name: "Emotions / Memory",
        intel: "Emotional Intelligence (EQ)",
        anchor: "Limbic system",
        body:
          "The field of memory records, attachment, belonging, identities and roles. Emotions are the fast decision labels assigned to our experiences, and the tissue that binds us to other people is woven here.",
      },
      {
        code: "L3",
        name: "Rationality",
        intel: "Rational Intelligence (IQ)",
        anchor: "Prefrontal cortex",
        body:
          "Questioning, analysis, comparison, cause and effect. This is the toolbox of conscious awareness — but the toolbox only opens once the storm on the floors below has settled.",
      },
      {
        code: "L4",
        name: "Meaning / Love",
        intel: "Love Intelligence (LQ)",
        anchor: "Corpus callosum",
        body:
          "Meaning and love meet at the level associated with the corpus callosum, where the hemispheres cooperate rather than operating as isolated parts.",
      },
      {
        code: "L5",
        name: "Creativity, Flow, Personal Art",
        intel: "Creative Intelligence (CQ)",
        anchor: "Frontal lobes",
        body:
          "Creativity, flow and personal art are the functions of this level, associated with the frontal lobes.",
      },
      {
        code: "L6",
        name: "Trance, Inspiration, Wisdom",
        intel: "Spiritual Intelligence (TQ/SQ)",
        anchor: "Integrated activity, not one region",
        body:
          "Trance, inspiration and wisdom arise through integrated activity rather than one dominant brain region.",
      },
      {
        code: "L7",
        name: "Enlightenment",
        intel: "GQ",
        anchor: "Silencing of self-referential networks; whole-brain integration",
        body:
          "Enlightenment is associated with the silencing of self-referential networks — the default-mode network — and whole-brain integration.",
      },
    ],
    principleTitle: "No level is better than another",
    principleBody:
      "The seven levels are not separate rooms but a single system in which each part continuously affects the others — the model calls this a Gestalt: the whole and the interaction of its parts at once. The practical consequence is that no level can be understood on its own and no difficulty is solved on a single floor. An emotional knot at the second level can switch off the analysis of the third; meaning arriving from the fourth can permanently lighten the load of the second.",
    directionTitle: "Expansion and integration",
    directionBody:
      "The first three levels build and expand the individual — an \"I\" emerges, differentiated from the single cell's programme, coloured by emotion, sharpened by reason. The last four reconnect that self to the whole. Expansion and integration are two halves of one cycle; the model calls it the Consciousness Cycle. Development within it is neither a race upwards nor a fall downwards: every floor has its own upkeep and its own season.",
    attunementTitle: "Attunement, not altitude",
    attunementBody:
      "Each level has its own intelligence. Development means attunement between them rather than climbing higher. The PFA Assessment is a self-development assessment: it indicates which function is out of tune, and turns awareness into functional awareness.",
    ctaTitle: "Where to go next",
    ctaBooks: "The books",
    ctaAbout: "About the author",
    ctaContact: "Ask a question",
    notice:
      "PFA content and assessment results are educational and developmental in purpose. They are not a substitute for medical diagnosis, treatment or psychiatric care.",
  },
} as const;

export const ABOUT_COPY = {
  en: {
    eyebrow: "About",
    h1: "Burak Akçakanat",
    paras: [
      "The PFA model grew out of an experience of illumination in 2001 and matured over more than twenty-three years of work, bringing psychology, neuroscience and philosophy together around a single question: can the functions of consciousness be shown on one map?",
      "On this map, enlightenment is not an unreachable miracle but the furthest stop on the route — because if a place has a map, being lost there is not a fate.",
      "His earlier work, Human Consciousness Decoded (2015), forms the roots of the model.",
    ],
    role: "Creator of the PFA model",
  },
} as const;

export const CONTACT_COPY = {
  en: {
    eyebrow: "Contact",
    h1: "Write to us",
    lede:
      "Use the form for questions, collaboration proposals or press enquiries, or write to us directly by email.",
    emailLabel: "Email",
    socialLabel: "Social",
    fullName: "Your full name",
    email: "Email",
    subject: "Subject",
    message: "Your message",
    send: "Send",
    sending: "Sending…",
    sentTitle: "Your message has been sent.",
    sentBody: "We will get back to you as soon as we can.",
    genericError: "Something went wrong.",
  },
} as const;