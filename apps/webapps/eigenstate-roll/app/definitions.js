/* ─────────────────────────────────────────────────────────────
   EIGENSTATE ROLL — Sacred Data
   ───────────────────────────────────────────────────────────── */

window.ER = window.ER || {};

/*
  Each die's faces carry three layers:
    text    — the embodied reading, in Eigenstate Roll's own voice
    overlay — the "Quantum Vector Overlay": a short paragraph reframing
              the facet through the physics metaphor the app is built on
    echo    — the "Cultural Echo": original-language terms with an
              English bridge, tying the facet to the wider multicultural
              numerological record (Hebrew Gematria, Chinese Wu Xing /
              Bagua / Lo Shu, Vedic & Tantric cosmology, Hellenistic /
              Pythagorean number theory, Kemetic myth, and classical
              geomancy / Ilm al-Raml).

  A note on sourcing: this file is written as an editable seed, not a
  locked artifact. The D4 facets below are original text composed for
  this app in the spirit of four elemental archetypes — swap in the
  verbatim book text for your printed deck (with correctly licensed
  quotations) by editing the `text` field directly; nothing else in the
  app needs to change.
*/
ER.DICE_DEFINITIONS = {

  /* ═══════════════════════════════════════════════════════════
     D4 — ROOT  (Element)
     ═══════════════════════════════════════════════════════════ */
  d4: {
    sides: 4, key: 'd4', label: 'Root', subtitle: 'Element', shape: 'tetrahedron',
    faces: {
      1: {
        name: 'Trailblazer', keyword: 'Fire', element: 'fire',
        text: `You are the spark that refuses to wait for permission. Trailblazer energy moves first, asks forgiveness later, and trusts that the trail reveals itself to the one already walking it. Where others hesitate at the tree line, you are already three ridges ahead, breath fogging in the cold, certain the map will catch up to you.`,
        overlay: `In eigenstate terms, Fire is the collapse-function itself — the moment potential becomes kinetic. Your Root roll didn't just select a card; it front-loaded ignition into every card that follows.`,
        echo: {
          terms: [
            { script: 'אֵשׁ', translit: 'Esh', lang: 'Hebrew', gloss: "'fire' — gematria value 301" },
            { script: '火', translit: 'Huǒ', lang: 'Chinese', gloss: 'the Wu Xing phase of ascension and visibility' },
            { script: 'Πῦρ', translit: 'Pyr', lang: 'Greek', gloss: 'one of the four Empedoclean roots' }
          ],
          note: `Across Gematria, the Hebrew אֵשׁ (Esh, "fire") sums to 301 — a number ancient commentators tied to the seraphim, the "burning ones." In Chinese Wu Xing, 火 (Huǒ) is the phase of ascension and visibility. Fire is the one element nearly every tradition agrees moves upward, outward, first.`
        }
      },
      2: {
        name: 'Peacemaker', keyword: 'Water', element: 'water',
        text: `You read the room before the room finishes forming. Peacemaker energy is not passive — it is water's particular genius for finding the seam in any conflict and dissolving it without ever raising its voice. You hold space the way a river holds a stone: patiently, and eventually the stone yields its shape to you.`,
        overlay: `Water collapses differently than Fire — not outward but inward, toward coherence. Your Root sets every subsequent roll into relationship rather than isolation; the whole reading will want to reconcile itself.`,
        echo: {
          terms: [
            { script: 'מַיִם', translit: 'Mayim', lang: 'Hebrew', gloss: "'water'" },
            { script: '水', translit: 'Shuǐ', lang: 'Chinese', gloss: 'the Wu Xing phase of stillness, depth, and wisdom' },
            { script: 'वं', translit: 'Vaṃ', lang: 'Sanskrit', gloss: "the bija (seed-syllable) of the water element" }
          ],
          note: `In Chinese five-phase theory 水 (Shuǐ) governs winter, the north, and wisdom-through-stillness — the same North that anchors the Lo Shu square's number 1 in your Vector roll. In Tantric bija-mantra, the seed sound Vaṃ (वं) is water's own vibration, sung at the sacral chakra where feeling begins.`
        }
      },
      3: {
        name: 'Communicator', keyword: 'Air', element: 'air',
        text: `You are the thread between rooms that never speak to each other. Communicator energy translates — feeling into language, silence into signal, one person's need into another's understanding. You cannot help but narrate the world as you move through it, and the world, gratefully, listens.`,
        overlay: `Air is the eigenstate's carrier wave — it does not hold information so much as move it. Your Root roll means every other facet in this reading will find a way to be spoken aloud.`,
        echo: {
          terms: [
            { script: 'רוּחַ', translit: 'Ruach', lang: 'Hebrew', gloss: "'wind / spirit / breath' — one word for all three" },
            { script: '風', translit: 'Fēng', lang: 'Chinese', gloss: 'wind, the carrier of qi across the eight directions' },
            { script: 'πνεῦμα', translit: 'Pneuma', lang: 'Greek', gloss: "'breath / spirit', root of pneumatic and pneumonia" }
          ],
          note: `Hebrew רוּחַ (Ruach) does triple duty as "wind," "breath," and "spirit" — language itself refusing to separate the physical air from the animating one. Greek πνεῦμα (pneuma) carries the same collapse of category, the root beneath both "pneumonia" and "pneumatic."`
        }
      },
      4: {
        name: 'Salt of the Earth', keyword: 'Structure · Earth', element: 'earth',
        text: `You are the load-bearing wall in every room you enter. Structure energy does not need to be loud to be trusted — it is the friend people call at 2 a.m., the plan that survives contact with chaos, the promise kept quietly and completely. Where others build castles of intention, you pour foundations.`,
        overlay: `Earth is the eigenstate's decoherence-resistance — the part of the wavefunction that holds its shape under observation. Your Root roll grounds this entire reading; whatever wildness the later dice bring, it will have somewhere solid to land.`,
        echo: {
          terms: [
            { script: 'אֶרֶץ', translit: 'Eretz', lang: 'Hebrew', gloss: "'earth / land'" },
            { script: '土', translit: 'Tǔ', lang: 'Chinese', gloss: 'the central Wu Xing phase, stabilizer of the other four' },
            { script: 'Ta', translit: 'Ta', lang: 'Kemetic', gloss: "'earth', embodied by the god Geb" }
          ],
          note: `In Chinese five-phase cosmology, 土 (Tǔ, Earth) sits not at a compass point but at the center — the phase that stabilizes the other four, precisely as the Lo Shu square places 5 at its own unmoving heart. In Kemetic myth, Geb is the earth itself, lying beneath his sister-wife Nut, the sky — structure as the patient, literal ground of being.`
        }
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     D6 — DAILY GRIND
     ═══════════════════════════════════════════════════════════ */
  d6: {
    sides: 6, key: 'd6', label: 'Daily Grind', subtitle: 'Texture', shape: 'cube',
    faces: {
      1: {
        name: 'The Waking Hour', keyword: 'Ritual',
        text: `The first decision of the day is never really about coffee. This facet is the ritual you perform before the world asks anything of you — the five minutes that decide whether today happens to you, or you happen to today.`,
        overlay: `A single quantum measurement collapses a superposition; a single morning ritual collapses a day's worth of possible selves into one who is already, quietly, in motion.`,
        echo: {
          terms: [
            { script: 'א', translit: 'Aleph', lang: 'Hebrew', gloss: 'value 1, the silent breath before speech' },
            { script: '一', translit: 'yī', lang: 'Chinese', gloss: "'one' — unity, beginning" }
          ],
          note: `The Pythagoreans called 1 the Monad — not a number so much as the source of number, the point before the line. Hebrew's Aleph (א) is famously silent, the breath that must happen before any word can. Both traditions agree: the waking hour isn't nothing. It's the condition for everything after it.`
        }
      },
      2: {
        name: 'The Threshold Task', keyword: 'Avoidance',
        text: `Somewhere on your list is the one thing you've moved to tomorrow three days running. This facet names it directly: the task standing exactly at the doorway between where you are and who you're becoming, refusing to be skipped.`,
        overlay: `Two is the first number that requires relationship — self and other, task and avoidance. The eigenstate can't fully collapse until this pair resolves.`,
        echo: {
          terms: [
            { script: '三心二意', translit: 'sān xīn èr yì', lang: 'Chinese', gloss: "'three hearts, two intentions' — a wavering mind" },
            { script: 'ב', translit: 'Bet', lang: 'Hebrew', gloss: "'house' — the first letter of Torah" }
          ],
          note: `Chinese carries a folk idiom, 三心二意, for a wavering mind — the number two bound early to duality and second-guessing. Hebrew's Bet (ב) means "house": the first structure, and every house needs a threshold you must actually cross.`
        }
      },
      3: {
        name: 'The Shared Table', keyword: 'Connection',
        text: `Someone is waiting on you today — for a call back, a decision, a shared meal, a simple "I'm here." This facet is the reminder that the daily grind is never really solitary, even on the days it feels that way.`,
        overlay: `Three nodes make the smallest stable structure in any network — the first shape that can hold weight without collapsing. Today's triangle: you, them, the table between you.`,
        echo: {
          terms: [
            { script: 'Τριάς', translit: 'Trias', lang: 'Greek', gloss: 'the Pythagorean Triad, the first true shape' },
            { script: 'त्रिमूर्ति', translit: 'Trimūrti', lang: 'Sanskrit', gloss: 'the three-form: creation, preservation, dissolution' }
          ],
          note: `The Pythagoreans considered 3 the first number-as-shape — two points make a line, but three make a plane, the first thing with actual area. Vedic cosmology answers with its own triad, the trimūrti of creation, preservation, and dissolution, folded quietly into your shared meal.`
        }
      },
      4: {
        name: 'The Correspondence', keyword: 'Reckoning',
        text: `A message needs answering — not the easy kind, the kind that requires you to actually say the true thing. This facet governs the emails, texts, and unspoken conversations that structure today whether you address them or not.`,
        overlay: `Four stabilizes a wavefunction into a form you can actually build on — the square footing beneath the rest of the day's architecture.`,
        echo: {
          terms: [
            { script: '四', translit: 'sì', lang: 'Chinese', gloss: "'four' — a near-homophone of 死 (sǐ), 'death'" },
            { script: 'Τετρακτύς', translit: 'Tetraktys', lang: 'Greek', gloss: 'the sacred base of the Pythagorean decad' }
          ],
          note: `Chinese buildings famously skip the fourth floor; the Pythagoreans, meanwhile, built their entire cosmology on 4 as the base of the Tetraktys. Same number, opposite verdict — proof that no digit carries meaning without the culture reading it.`
        }
      },
      5: {
        name: 'The Restless Errand', keyword: 'Motion',
        text: `Something needs to leave the house today — a package, an apology, an old version of yourself. This facet is kinetic, slightly impatient, the itch behind your sternum that says sitting still is not today's assignment.`,
        overlay: `Five breaks symmetry. It's the number that refuses to divide the day evenly, which is exactly why it moves.`,
        echo: {
          terms: [
            { script: '五行', translit: 'wǔxíng', lang: 'Chinese', gloss: 'the five phases, each in restless transformation' },
            { script: 'आकाश', translit: 'Ākāśa', lang: 'Sanskrit', gloss: "'space / ether' — the fifth Vedic element" }
          ],
          note: `Chinese cosmology organizes the physical world into 五行 (wǔxíng), five phases in constant restless transformation into one another — nothing holds still. Vedic thought adds a fifth element to the usual four, ākāśa (space), the element that makes room for all the others to move.`
        }
      },
      6: {
        name: 'The Evening Reckoning', keyword: 'Completion',
        text: `The day closes the way it opened — with a choice, not an accident. This facet is the small honest audit before sleep: what got done, what got carried, what gets set down at the threshold of tomorrow.`,
        overlay: `Six is the first perfect number — the sum of its own divisors, 1+2+3=6, a closed loop that answers to nothing outside itself. Today, complete, equals itself.`,
        echo: {
          terms: [
            { script: '六六大顺', translit: 'liù liù dà shùn', lang: 'Chinese', gloss: "'may everything go smoothly' — six as flow" },
            { script: 'שבת', translit: 'Shabbat', lang: 'Hebrew', gloss: 'the rest that follows six days of creation' }
          ],
          note: `Chinese business culture prizes 六 (liù) for its sound-kinship with 流 (liú, "flow") — 六六大顺, "may everything go smoothly." It's a fitting number for the close of a day: not an ending so much as a completed circuit, ready to flow into the next.`
        }
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     D8 — VECTOR   (Lo Shu direction · Ba Gua trigram · Etruscan quadrant)
     ═══════════════════════════════════════════════════════════ */
  d8: {
    sides: 8, key: 'd8', label: 'Vector', subtitle: 'Direction', shape: 'octahedron',
    faces: {
      1: {
        name: 'Tread One', keyword: 'North · Kan ☵', loshu: 1, direction: 'N', trigram: '坎', quadrant: 'NE',
        text: `Every vector starts from stillness. This is the deep-water direction — the coordinate the Lo Shu square places first, underfoot, the one you press off from rather than arrive at. Whatever moves in this reading, it moves because this point held firm.`,
        overlay: `In vector notation, magnitude means nothing without an origin. North is your reading's (0,0) — the quiet coordinate every other force is measured against.`,
        echo: {
          terms: [
            { script: '坎', translit: 'Kǎn', lang: 'Chinese', gloss: 'trigram of Water — danger navigated by staying calm within it' },
            { script: '戴九履一', translit: 'dài jiǔ lǚ yī', lang: 'Chinese', gloss: "'wear nine, tread one' — the square's classical mnemonic" }
          ],
          note: `The old mnemonic for the Lo Shu square runs 戴九履一 — "wear nine, tread one" — nine crowning the head at due south, one grounding the foot at due north. The trigram here is 坎 (Kǎn), doubled water, the sign of danger navigated by staying calm within it.`
        }
      },
      2: {
        name: 'Southwest', keyword: 'Southwest · Kun ☷', loshu: 2, direction: 'SW', trigram: '坤', quadrant: 'SW',
        text: `This is the receiving direction — the vector that doesn't push but opens. Southwest asks you to let something in rather than send something out: an offer, a partnership, a piece of help you'd normally wave off.`,
        overlay: `A vector pointing inward is still a vector — receptivity has magnitude too. This facet measures how much you're willing to let arrive.`,
        echo: {
          terms: [
            { script: '坤', translit: 'Kūn', lang: 'Chinese', gloss: 'trigram of Earth, pure yin, the receptive force' }
          ],
          note: `坤 (Kūn) is the Yi Jing's great receptive force, pure yin opposite Qian's pure yang — in feng shui practice this southwest sector governs partnership and marriage, the vector of things held rather than chased.`
        }
      },
      3: {
        name: 'East', keyword: 'East · Zhen ☳', loshu: 3, direction: 'E', trigram: '震', quadrant: 'SE',
        text: `East is thunder — the vector of sudden, necessary movement. Something in your world is about to wake up loudly. This isn't chaos; it's the specific jolt that gets a stalled plan finally moving.`,
        overlay: `Not every collapse is gentle. Some eigenstates resolve with a spike — a discontinuity in the wavefunction that looks, from outside, exactly like a clap of thunder.`,
        echo: {
          terms: [
            { script: '震', translit: 'Zhèn', lang: 'Chinese', gloss: 'trigram of Thunder, the eldest son, new beginnings' }
          ],
          note: `震 (Zhèn) governs the east in the Bagua — sunrise's direction, and fittingly the trigram of the eldest son and of beginnings that arrive with noise rather than negotiation.`
        }
      },
      4: {
        name: 'Southeast', keyword: 'Southeast · Xun ☴', loshu: 4, direction: 'SE', trigram: '巽', quadrant: 'SE',
        text: `Southeast is wind — the vector of gradual, penetrating influence. Nothing announces itself here; it seeps. Watch for the small, repeated thing that's quietly changing your position without a single dramatic moment.`,
        overlay: `Wind-vectors don't spike, they accumulate — small consistent pressure over time outperforming a single large force. This facet rewards patience over intensity.`,
        echo: {
          terms: [
            { script: '巽', translit: 'Xùn', lang: 'Chinese', gloss: 'trigram of Wind / Wood, linked to gradual wealth' }
          ],
          note: `巽 (Xùn) is wind and wood both — the trigram of things that grow by persistence. Practitioners place this southeast sector at the heart of wealth-cultivation practice precisely because wind never asks permission, it simply keeps arriving.`
        }
      },
      5: {
        name: 'Northwest', keyword: 'Northwest · Qian ☰', loshu: 6, direction: 'NW', trigram: '乾', quadrant: 'NW',
        text: `Northwest is heaven itself — the vector of authority, mentorship, and the help that arrives from somewhere above your own effort. Someone or something with more altitude than you is about to weigh in.`,
        overlay: `Every vector field needs a source term — a place the whole field points back to. Qian is that source: not a direction you travel, but the one everything else is oriented around.`,
        echo: {
          terms: [
            { script: '乾', translit: 'Qián', lang: 'Chinese', gloss: 'trigram of Heaven, pure yang, the benefactor sector' }
          ],
          note: `乾 (Qián) is the Yi Jing's first hexagram doubled into pure creative yang — feng shui reserves this northwest sector for mentors, benefactors, and the father figure whose help you didn't have to earn to receive.`
        }
      },
      6: {
        name: 'West', keyword: 'West · Dui ☱', loshu: 7, direction: 'W', trigram: '兌', quadrant: 'NW',
        text: `West is the lake — the vector of pleasure, conversation, and open exchange. This facet governs the parts of life meant to be enjoyed rather than optimized: good talk, good food, a genuine laugh you didn't plan for.`,
        overlay: `Not every vector points toward productivity. Some point toward delight, and delight, measured honestly, still moves the whole system.`,
        echo: {
          terms: [
            { script: '兌', translit: 'Duì', lang: 'Chinese', gloss: 'trigram of Lake, joy, speech, open water' }
          ],
          note: `兌 (Duì) is joy itself in the Yi Jing's vocabulary — the trigram of open water, open mouths, and unguarded pleasure. Its western sector in feng shui governs children, creativity, and the parts of the self that speak without calculating first.`
        }
      },
      7: {
        name: 'Northeast', keyword: 'Northeast · Gen ☶', loshu: 8, direction: 'NE', trigram: '艮', quadrant: 'NE',
        text: `Northeast is the mountain — the vector of stillness, study, and the deliberate pause. This facet asks you to stop moving on purpose: to sit with a question until it answers itself instead of chasing the answer down.`,
        overlay: `A vector at rest is still a vector — its stillness is information. This facet measures the force of a held position.`,
        echo: {
          terms: [
            { script: '艮', translit: 'Gèn', lang: 'Chinese', gloss: 'trigram of Mountain, pure stopping, self-cultivation' }
          ],
          note: `艮 (Gèn) is the only trigram made of pure stopping — mountain facing mountain, movement arrested on purpose. Its sector governs education and self-cultivation, the discipline of a mind that has learned to sit still long enough to see clearly.`
        }
      },
      8: {
        name: 'Wear Nine', keyword: 'South · Li ☲', loshu: 9, direction: 'S', trigram: '離', quadrant: 'SW',
        text: `This is the crown direction — the vector the Lo Shu square places highest, worn like a diadem at true south. Something in this reading is meant to be seen. Whatever it touches, it illuminates; there is no hiding from this facet, only being witnessed clearly.`,
        overlay: `The vector with maximum visibility is also the one most vulnerable to observation collapsing it prematurely. Fire clarifies, but fire is also watched.`,
        echo: {
          terms: [
            { script: '離', translit: 'Lí', lang: 'Chinese', gloss: 'trigram of Fire, clarity, reputation, the eyes' },
            { script: '戴九', translit: 'dài jiǔ', lang: 'Chinese', gloss: "'wear nine' — the crown of the square" }
          ],
          note: `離 (Lí) is fire clinging to what it burns — clarity, vision, reputation, the trigram of the eyes themselves. The old mnemonic 戴九 ("wear nine") places this number at the very top of the square, a crown that is also, always, a spotlight.`
        }
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     D10 — KARMIC TWIST   (Ilm al-Raml / classical geomancy figures)
     ═══════════════════════════════════════════════════════════ */
  d10: {
    sides: 10, key: 'd10', label: 'Karmic Twist', subtitle: 'Wildcard', shape: 'pentagonal-trapezohedron',
    faces: {
      1: {
        name: 'Via', keyword: 'The Path',
        text: `Not a fixed karma but a corridor — this facet says the die is not yet cast, only the direction is. Via is movement without a verdict; you are between two states, and the twist is that you get to choose which one you become.`,
        overlay: `In binary generation, Via reads as an unstable string — a figure built from restlessness, four lines that refuse to settle into a fixed pattern. The eigenstate stays superposed a little longer here.`,
        echo: {
          terms: [
            { script: 'علم الرمل', translit: "'Ilm al-Raml", lang: 'Arabic', gloss: "'the science of the sand' — the root geomantic tradition" },
            { script: 'Via', translit: 'Via', lang: 'Latin', gloss: "'road / way' — the medieval European figure name" }
          ],
          note: `In Ilm al-Raml, "the science of the sand," a practitioner marks four rows of dots and reduces each to odd or even — a literal binary process centuries before computing borrowed the word. Via, the medieval Latin name for this figure, means simply "road": the twist is that the road is still being walked as you read this.`
        }
      },
      2: {
        name: 'Populus', keyword: 'The Crowd',
        text: `Karma, here, is collective — other people's decisions arriving in your life as weather. This facet reflects rather than initiates; it takes on the shape of whoever's nearest. The twist: you may not be the author of this chapter, only its witness.`,
        overlay: `A figure of maximum symmetry — every line doubled, no line distinguished from another. In wavefunction terms, Populus is high entropy: many outcomes equally likely, the crowd itself undecided.`,
        echo: {
          terms: [
            { script: 'Populus', translit: 'Populus', lang: 'Latin', gloss: "'the people' — ruled by the Moon in classical geomancy" }
          ],
          note: `Classical geomancers assigned Populus to the Moon — changeable, reflective, without a fixed will of its own. It's the figure of the crowd precisely because a crowd, like the moon's face, is always shifting who stands where.`
        }
      },
      3: {
        name: 'Fortuna Major', keyword: 'Greater Fortune',
        text: `This is luck with its gates already open — not chance but a door someone left ajar for you specifically. The twist here is generous: whatever you were bracing to fight for, you may simply be handed.`,
        overlay: `A high-amplitude eigenstate — one outcome overwhelmingly favored in the collapse. Fortuna Major skews the whole probability field toward yes.`,
        echo: {
          terms: [
            { script: 'Fortuna Major', translit: 'Fortuna Major', lang: 'Latin', gloss: "'greater fortune', entering 'through the front gate'" }
          ],
          note: `Renaissance geomancers pictured Fortuna Major as fortune entering through the main door in broad daylight — solar, public, undeniable — in contrast to its twin Fortuna Minor, whose luck slips in through the back.`
        }
      },
      4: {
        name: 'Fortuna Minor', keyword: 'Lesser Fortune',
        text: `Good news arrives, but through the side door — quieter, provisional, needing to be seized quickly before it changes its mind. This facet's twist: the fortune is real, but its window is shorter than you think.`,
        overlay: `A favorable amplitude that decays fast — this eigenstate rewards quick collapse over patient observation. Waiting too long here changes the outcome.`,
        echo: {
          terms: [
            { script: 'Fortuna Minor', translit: 'Fortuna Minor', lang: 'Latin', gloss: "'lesser fortune', leaving 'through the back gate'" }
          ],
          note: `Where Fortuna Major is the sun at noon, Fortuna Minor is luck at dusk — real, but closing. Its classical instruction was always the same: act on it now, or watch the gate shut.`
        }
      },
      5: {
        name: 'Puer', keyword: 'The Youth',
        text: `Karmic Twist arrives here as raw, unrefined force — action before deliberation. Puer is the part of your fate that would rather move wrong than not move at all. The twist: your impulsiveness this week is not a flaw to manage but a tool to aim.`,
        overlay: `High kinetic energy, low precision — a vector with strong magnitude and a still-forming direction. Aim before you fire, but don't wait for perfect aim.`,
        echo: {
          terms: [
            { script: 'Puer', translit: 'Puer', lang: 'Latin', gloss: "'boy', ruled by Mars — courage and untrained strength" }
          ],
          note: `Geomancers gave Puer to Mars without hesitation — impulsive, martial, half-formed. It's the twist that dares you to act on instinct before your better judgment talks you out of something you were right about.`
        }
      },
      6: {
        name: 'Puella', keyword: 'The Maiden',
        text: `Here the twist is gentler but no less decisive — a fate shaped by attraction, aesthetics, and quiet diplomacy rather than force. Puella wins the room by being the one everyone wants to keep talking to.`,
        overlay: `A low-force, high-coherence state — this eigenstate doesn't overpower the field, it harmonizes with it, achieving collapse through resonance rather than pressure.`,
        echo: {
          terms: [
            { script: 'Puella', translit: 'Puella', lang: 'Latin', gloss: "'girl', ruled by Venus — beauty and relational strategy" }
          ],
          note: `Venus governs Puella in the old texts — not weakness but a different theory of power, one built on attraction rather than assault. The twist: sometimes the fastest way through a locked door is to be someone it wants to open for.`
        }
      },
      7: {
        name: 'Acquisitio', keyword: 'Gain',
        text: `Something is about to land in your open hands — material, tangible, countable. This facet's twist isn't the gain itself but the question riding underneath it: what does having this now obligate you to become?`,
        overlay: `A positive-value eigenstate collapse — the wavefunction resolves toward accumulation. But every gain redraws the boundary of the system it enters.`,
        echo: {
          terms: [
            { script: 'Acquisitio', translit: 'Acquisitio', lang: 'Latin', gloss: "'acquisition', ruled by Jupiter — expansion and abundance" }
          ],
          note: `Jupiter's rulership makes Acquisitio the most straightforwardly lucky of the sixteen figures — expansion, abundance, the door opening onto more room than you had before. Its old warning was never to refuse the gift, only to grow to meet it.`
        }
      },
      8: {
        name: 'Amissio', keyword: 'Loss',
        text: `This facet asks you to release something before it's taken. Amissio's twist is that voluntary loss and involuntary loss look identical from the outside — but only one of them leaves you standing taller afterward.`,
        overlay: `A negative-amplitude collapse — but negative amplitude in a wavefunction isn't failure, it's information. What leaves the system tells you as much as what stays.`,
        echo: {
          terms: [
            { script: 'Amissio', translit: 'Amissio', lang: 'Latin', gloss: "'loss' — drawn as an open hand releasing what it held" }
          ],
          note: `Amissio's glyph is drawn like a purse turned upside down, spilling — an image blunt enough to need no translation across any of the traditions that borrowed it. The twist survives every language: what you're gripping too tightly was never going to stay yours.`
        }
      },
      9: {
        name: 'Laetitia', keyword: 'Joy',
        text: `Unclouded relief — the twist you didn't see coming because you'd stopped expecting good news at all. Laetitia arrives light-footed, undercutting whatever heaviness the rest of this reading was building.`,
        overlay: `A resonant, high-coherence collapse — this eigenstate doesn't just land favorably, it lands cleanly, without the noise or ambiguity of a mixed outcome.`,
        echo: {
          terms: [
            { script: 'Laetitia', translit: 'Laetitia', lang: 'Latin', gloss: "'joy, gladness' — Jupiter at its most unguarded" }
          ],
          note: `Classical geomancers ranked Laetitia among the brightest figures in the entire set — Jupiter at its most unguarded. Where Acquisitio brings gain you must grow to meet, Laetitia simply asks you to notice you're already happy.`
        }
      },
      10: {
        name: 'Tristitia', keyword: 'Sorrow · Reverse',
        text: `Not tragedy — restriction. Tristitia's twist is the reverse card in this hand: it narrows the field of options rather than closing it entirely, and the narrowing, uncomfortable as it is, is exactly what finally makes a decision possible.`,
        overlay: `A collapsed eigenstate with reduced degrees of freedom — fewer outcomes remain viable, but the ones that do are more clearly seen. Constraint, here, functions as clarity.`,
        echo: {
          terms: [
            { script: 'Tristitia', translit: 'Tristitia', lang: 'Latin', gloss: "'sadness', ruled by Saturn — contraction, not destruction" }
          ],
          note: `Saturn's figures are never comfortable, but the old texts are careful to distinguish Tristitia from true catastrophe — this is winter, not death. Saturn prunes; it doesn't uproot. What's cut back here was crowding something that needed the room.`
        }
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     D12 — HOUSES
     ═══════════════════════════════════════════════════════════ */
  d12: {
    sides: 12, key: 'd12', label: 'Houses', subtitle: 'Life Domain', shape: 'dodecahedron',
    faces: {
      1: {
        name: 'Self', keyword: 'Ascendant',
        text: `The house of first impressions and first instincts — how you enter a room before you've decided how to enter it. This facet governs identity in motion: not who you are on paper, but who you are the instant before you speak.`,
        overlay: `The first house is the reading's boundary condition — the initial state every subsequent eigenstate measures itself against.`,
        echo: {
          terms: [
            { script: 'लग्न', translit: 'Lagna', lang: 'Sanskrit', gloss: "'attachment' — the Vedic ascendant" },
            { script: 'ὡροσκόπος', translit: 'hōroskopos', lang: 'Greek', gloss: "'hour-watcher' — root of the word horoscope" }
          ],
          note: `Vedic astrology calls this point the Lagna — the "attachment," the exact degree the soul fastens itself to at the moment of first breath. Greek hōroskopos, literally "watcher of the hour," gave us the English word horoscope entire, all from this single house.`
        }
      },
      2: {
        name: 'Resources', keyword: 'Wealth',
        text: `What you hold, what you're worth, what you can count on when things get hard — not just money, but every form of stored security. This facet asks: what have you actually built up, versus what have you only assumed would be there?`,
        overlay: `A conserved quantity in the system — the second house measures what doesn't disperse when the rest of the reading collapses.`,
        echo: {
          terms: [
            { script: 'धन भाव', translit: 'Dhana Bhāva', lang: 'Sanskrit', gloss: "'house of wealth'" }
          ],
          note: `Vedic astrologers name this house directly — Dhana Bhāva, "house of wealth" — no metaphor needed. It governs not just what you own but your family's spoken word, since in classical thought a reliable tongue was its own form of stored value.`
        }
      },
      3: {
        name: 'Communication', keyword: 'Siblings',
        text: `Siblings, short trips, the texts you send without thinking twice — this house governs the small, constant exchanges that add up to a life. Not the grand speech, but the thousand ordinary sentences that actually built the relationship.`,
        overlay: `A high-frequency, low-amplitude channel — this facet's information moves fast and often, its influence accumulating through repetition rather than a single decisive pulse.`,
        echo: {
          terms: [
            { script: 'सहज भाव', translit: 'Sahaja Bhāva', lang: 'Sanskrit', gloss: "'house of the co-born' — siblings and instinct" }
          ],
          note: `Vedic tradition calls the third house Sahaja Bhāva — "co-born" — placing siblings and short journeys under the same roof as your own instinctive nature, on the logic that the people who grew up beside you shaped your reflexes before you had words for them.`
        }
      },
      4: {
        name: 'Roots', keyword: 'Home',
        text: `The floor beneath the floor — ancestry, home, the private self nobody sees at the dinner party. This facet governs the foundation you didn't choose and the one you're actively building for whoever comes after you.`,
        overlay: `The fourth house sits at the eigenstate's lowest point in the chart wheel — the Imum Coeli, literally the bottom of the sky. Everything else in the reading is measured with this floor beneath it.`,
        echo: {
          terms: [
            { script: 'Imum Coeli', translit: 'Imum Coeli', lang: 'Latin', gloss: "'bottom of the heaven'" },
            { script: 'सुख भाव', translit: 'Sukha Bhāva', lang: 'Sanskrit', gloss: "'house of comfort'" }
          ],
          note: `Vedic astrology names this house Sukha Bhāva — comfort itself — tying home not to a location but to a feeling. Latin astrology anchors it geometrically instead: the Imum Coeli, the literal floor of the sky, the point every other house is built upward from.`
        }
      },
      5: {
        name: 'Creativity', keyword: 'Pleasure',
        text: `Children, art, romance, the games you still play for no reason but joy — this house refuses to apologize for wanting things that don't produce anything except delight. It's where your inner child checks whether you still remember them.`,
        overlay: `A high-entropy, generative state — this facet doesn't conserve energy so much as multiply it, output exceeding input, the mark of genuine creative process.`,
        echo: {
          terms: [
            { script: 'पुत्र भाव', translit: 'Putra Bhāva', lang: 'Sanskrit', gloss: "'house of children'" }
          ],
          note: `Whether Vedic or Hellenistic, both traditions land on children as this house's clearest signature — but both also read "children" broadly enough to include anything you made that carries a piece of you forward, art included.`
        }
      },
      6: {
        name: 'Service', keyword: 'Health',
        text: `The unglamorous machinery keeping everything else running — routines, the body's actual needs, the coworker you owe an answer to. This house rewards maintenance, the boring discipline that makes the flashier houses possible at all.`,
        overlay: `A stabilizing feedback loop — the sixth house is the reading's homeostat, the mechanism that notices drift and quietly corrects it before it becomes crisis.`,
        echo: {
          terms: [
            { script: 'रोग भाव', translit: 'Roga Bhāva', lang: 'Sanskrit', gloss: "'house of illness' — and the discipline that wards it" }
          ],
          note: `Vedic astrology is unsentimental here, naming it Roga Bhāva, "house of illness" — but the same house governs the daily discipline (diet, work, routine) that keeps illness at bay, a reminder that vigilance and vulnerability were always the same house.`
        }
      },
      7: {
        name: 'Partnership', keyword: 'Mirror',
        text: `The mirror across the table — marriage, business partners, open rivals, anyone significant enough to define you by contrast. This house asks who you become in relationship, which is never quite who you are alone.`,
        overlay: `The seventh house sits in exact opposition to the first across the chart wheel — a paired eigenstate, entangled by definition. You cannot fully measure one without implicating the other.`,
        echo: {
          terms: [
            { script: 'Δύσις', translit: 'Dysis', lang: 'Greek', gloss: "'the setting' — the Descendant" },
            { script: 'कलत्र भाव', translit: 'Kalatra Bhāva', lang: 'Sanskrit', gloss: "'house of spouse'" }
          ],
          note: `Greek astrology calls this cusp the Descendant, the Dysis — the sun's setting point, directly opposite the Ascendant's sunrise. Where house one is who you are alone in the light, house seven is who you become once someone else is standing in the same doorway.`
        }
      },
      8: {
        name: 'Transformation', keyword: 'Threshold',
        text: `Death, sex, inheritance, other people's money entangled with your own — this house governs the transformations you don't fully choose but come out the other side of changed regardless. Nothing here is casual.`,
        overlay: `The eighth house is where the wavefunction doesn't just collapse, it recombines — old states destroyed to free the energy for a genuinely new configuration, not a modification of the old one.`,
        echo: {
          terms: [
            { script: 'आयुर् भाव', translit: 'Āyur Bhāva', lang: 'Sanskrit', gloss: "'house of lifespan'" }
          ],
          note: `Vedic astrology ties this house directly to lifespan and death, unflinching about it in a way Western tradition often softens — both agree, though, that the eighth house's transformations are never merely symbolic. Something real ends here so something else can actually begin.`
        }
      },
      9: {
        name: 'Philosophy', keyword: 'Journey',
        text: `Long journeys, higher education, the belief systems you inherited and the ones you're building instead — this house is where your worldview gets tested against something bigger than your own neighborhood.`,
        overlay: `A wide-aperture facet — the ninth house samples the reading against a much larger field than the houses before it, trading local precision for a genuinely expanded view.`,
        echo: {
          terms: [
            { script: 'धर्म भाव', translit: 'Dharma Bhāva', lang: 'Sanskrit', gloss: "'house of righteous purpose'" }
          ],
          note: `Vedic tradition's Dharma Bhāva ties this house to your entire sense of righteous purpose, not just travel or study — the logic being that you cannot know your duty until you've gone far enough from home to see your own life in proportion.`
        }
      },
      10: {
        name: 'Vocation', keyword: 'Reputation',
        text: `Career, reputation, the legacy visible to strangers — this is the house of the self the public actually sees, the one written on the résumé rather than felt in the chest. This facet asks what you want to be known for.`,
        overlay: `The tenth house occupies the chart's zenith — the Midheaven, the highest point of the wheel. Whatever collapses here is, by construction, the most visible outcome in the entire reading.`,
        echo: {
          terms: [
            { script: 'Medium Coeli', translit: 'Medium Coeli', lang: 'Latin', gloss: "'middle of the heaven' — the Midheaven" },
            { script: 'कर्म भाव', translit: 'Karma Bhāva', lang: 'Sanskrit', gloss: "'house of deeds'" }
          ],
          note: `Vedic tradition names this house Karma Bhāva directly — the house of deeds, the place where intention finally becomes something the world can see and judge. Latin astrology marks the same point geometrically: the Medium Coeli, literally the middle, the very top, of the sky.`
        }
      },
      11: {
        name: 'Community', keyword: 'Hope',
        text: `Friend groups, movements, the future you're building with people who aren't family but might as well be — this house holds every hope too big to carry alone. It asks who's actually in this with you.`,
        overlay: `A distributed system — the eleventh house's eigenstate isn't localized to a single node but spread across a whole network, its outcome dependent on collective rather than individual collapse.`,
        echo: {
          terms: [
            { script: 'ἀγαθὸς δαίμων', translit: 'Agathos Daimon', lang: 'Greek', gloss: "'good spirit' — one of the luckiest houses" },
            { script: 'लाभ भाव', translit: 'Lābha Bhāva', lang: 'Sanskrit', gloss: "'house of gains'" }
          ],
          note: `Hellenistic astrologers called this house the Agathos Daimon, the "good spirit" — one of the two luckiest houses in the entire chart. Vedic tradition agrees in substance if not name, calling it Lābha Bhāva, the house of gains realized specifically through other people.`
        }
      },
      12: {
        name: 'The Unseen', keyword: 'Dissolution',
        text: `What you can't quite see about your own situation — the hidden costs, the private grief, the parts of yourself still in the dark. This house isn't punishment; it's the necessary rest before the wheel begins again at house one.`,
        overlay: `The twelfth house is the eigenstate's decoherence limit — the boundary where measurement itself becomes impossible, where some part of the system must remain unobserved for the whole to keep functioning.`,
        echo: {
          terms: [
            { script: 'व्यय भाव', translit: 'Vyaya Bhāva', lang: 'Sanskrit', gloss: "'house of loss / expenditure'" },
            { script: 'κακὸς δαίμων', translit: 'Kakos Daimon', lang: 'Greek', gloss: "'bad spirit' — traditionally the hardest house" }
          ],
          note: `Both traditions treat this house with real caution — Vyaya Bhāva in Sanskrit names it loss outright, and Hellenistic astrology's Kakos Daimon calls it the "bad spirit" without euphemism. But both also place it directly before the first house's rebirth: the dark isn't the end of the wheel, it's the seam.`
        }
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     D20 — ARC   (overarching narrative)
     ═══════════════════════════════════════════════════════════ */
  d20: {
    sides: 20, key: 'd20', label: 'Arc', subtitle: 'The Narrative', shape: 'icosahedron',
    faces: {
      1: {
        name: 'The Spark', keyword: 'Ignition',
        text: `Every arc needs an ignition point — not the whole story, just the first true instinct that something is beginning. This station is smaller than it feels; treat it as data, not destiny, and let the rest of the arc prove it right.`,
        overlay: `A single excitation lifts the whole system out of its ground state. Nothing else in this arc happens without this first quantum of energy.`,
        echo: {
          terms: [{ script: 'Μονάς', translit: 'Monas', lang: 'Greek', gloss: 'the Pythagorean Monad — source, not sum' }],
          note: `The Pythagoreans refused to even call the Monad a true number — it was the seed every other number grew from, present but not yet plural. Your arc's first station borrows exactly that status: not yet a story, just its precondition.`
        }
      },
      2: {
        name: 'The Question', keyword: 'Divergence',
        text: `The spark needs a question to organize around, and this station is where you finally admit what you're actually asking. Not the polished version — the blunt one you've been avoiding saying out loud.`,
        overlay: `Superposition requires at least two possible outcomes to be meaningful. The Question is where your arc first becomes genuinely undecided — and therefore genuinely alive.`,
        echo: {
          terms: [{ script: 'חָכְמָה', translit: 'Chochmah', lang: 'Hebrew', gloss: "'wisdom' — the second sefirah, first differentiated insight" }],
          note: `In Kabbalistic sefirot, the second emanation, Chochmah ("wisdom"), is the first flash of differentiated insight — not the source itself, but the first true question the source asks of itself.`
        }
      },
      3: {
        name: 'The Threshold', keyword: 'Commitment',
        text: `Past this point, going back costs more than going forward. The Threshold isn't dramatic from the inside — it often looks like an ordinary decision — but this station is where the arc becomes irreversible.`,
        overlay: `Three points define the first stable plane in any geometry. Your arc gains actual shape here, no longer a line but a surface you can stand on.`,
        echo: {
          terms: [{ script: 'त्रिमूर्ति', translit: 'Trimūrti', lang: 'Sanskrit', gloss: 'Brahma–Vishnu–Shiva, one complete cosmic cycle' }],
          note: `Vedic cosmology needs exactly three forces — Brahma, Vishnu, Shiva — to describe a complete cycle of existence. Your Threshold borrows that same completeness: past this station, the cycle you've begun has to run its course.`
        }
      },
      4: {
        name: 'The First Ally', keyword: 'Support',
        text: `No arc survives on solitary will. This station introduces the person, resource, or piece of unexpected support that makes the rest of the journey structurally possible — the load-bearing wall arriving exactly when needed.`,
        overlay: `Four points make the first structure stable under real weight — the base the Pythagoreans built their entire sacred decad upon.`,
        echo: {
          terms: [{ script: 'Τετρακτύς', translit: 'Tetraktys', lang: 'Greek', gloss: '10 dots in 4 rows (1+2+3+4) — the holiest Pythagorean figure' }],
          note: `The Tetraktys — ten dots arranged in four rows of 1, 2, 3, and 4 — was the Pythagorean brotherhood's most sacred symbol, sworn upon in their oaths. Four is the row that finally makes the triangle wide enough to stand on.`
        }
      },
      5: {
        name: 'The Trial', keyword: 'Resistance',
        text: `The arc's first real resistance — not catastrophic, but enough to test whether the Spark was serious. This station asks you to choose, under actual pressure, whether you meant what you said back at station one.`,
        overlay: `Five breaks perfect symmetry — the asymmetry is exactly what generates motion. A trial that resolved evenly wouldn't move the arc forward at all.`,
        echo: {
          terms: [{ script: '五行', translit: 'wǔxíng', lang: 'Chinese', gloss: 'five phases, each generating and restraining the others' }],
          note: `Wu Xing's five phases don't just coexist, they actively check each other — wood feeds fire, but metal cuts wood. The Trial works the same way: resistance isn't the arc's enemy, it's the mechanism that keeps any single force from running away with the story.`
        }
      },
      6: {
        name: 'The Mirror', keyword: 'Recognition',
        text: `Something or someone in this station shows you an unflattering, accurate reflection. The Mirror doesn't judge — it just refuses to let you keep believing the flattering version of events.`,
        overlay: `Six is the first perfect number, equal to the sum of its own divisors — a closed loop with nothing left over. The Mirror shows you exactly what you already are, no more, no less.`,
        echo: {
          terms: [{ script: 'रिपु षड्वर्ग', translit: 'Ripu Ṣaḍvarga', lang: 'Sanskrit', gloss: 'the six inner enemies a seeker learns to recognize' }],
          note: `Vedic ethical philosophy names six specific inner obstacles a seeker must see clearly before progressing — not banish, just see. The Mirror station borrows that exact discipline: recognition first, correction later.`
        }
      },
      7: {
        name: 'The Descent', keyword: 'Cost',
        text: `The arc goes underground here — literally or emotionally. This station costs something real, and there's no clever workaround that avoids paying it. What you bring back up depends entirely on what you're willing to set down first.`,
        overlay: `Seven sits outside the clean geometric progressions — prime, unruly, resistant to being built from smaller structures. The Descent, likewise, resists shortcuts.`,
        echo: {
          terms: [{ script: 'ḥwt-ḥrw', translit: 'the Seven Hathors', lang: 'Kemetic', gloss: 'goddesses who foretell fate at a child’s birth' }],
          note: `Egyptian myth is full of sevens at the threshold of the underworld — seven gates, seven guardian goddesses. The number recurs at exactly the places where a story insists you cannot rush the crossing.`
        }
      },
      8: {
        name: 'The Ordeal', keyword: 'Pressure',
        text: `The arc's true center of gravity — the hardest station, positioned deliberately past the midpoint so you'd already be invested before you knew how much this would cost. What breaks here was never meant to survive intact.`,
        overlay: `Eight trigrams, fully combined, generate the sixty-four hexagrams of change — the Ordeal is where your arc's small elements finally combine into something with real, irreversible complexity.`,
        echo: {
          terms: [{ script: '八卦', translit: 'bāguà', lang: 'Chinese', gloss: 'the eight trigrams underlying the sixty-four-hexagram Yi Jing' }],
          note: `The Yi Jing builds its entire system of change from just eight trigrams recombined — proof that complexity doesn't require many parts, only enough pressure to force the few parts you have into new configurations.`
        }
      },
      9: {
        name: 'The Revelation', keyword: 'Understanding',
        text: `Something finally makes sense — not everything, but the one thing that reorganizes how you read every station before it. This is the arc looking back at itself and understanding, for the first time, what it was actually about.`,
        overlay: `Nine, the last single digit, is where a numeral system completes its first full cycle before folding back into new tens. The Revelation is your arc's equivalent — completion, just before the count resets higher.`,
        echo: {
          terms: [{ script: '九', translit: 'jiǔ', lang: 'Chinese', gloss: "'nine' — imperial completeness; a near-homophone of 久, 'enduring'" }],
          note: `Chinese imperial numerology reserved nine for the emperor alone — nine dragons, nine bestowed gifts — treating it as yang carried to its absolute limit. It's also a near-homophone for 久 ("enduring"), which is exactly what a real revelation needs to be.`
        }
      },
      10: {
        name: 'The Turning', keyword: 'Pivot',
        text: `The arc changes direction here, decisively. Not a small correction — an actual pivot, the moment the story you thought you were in reveals itself as a different story requiring a different ending.`,
        overlay: `Ten is the Pythagorean holy decad completed — the Tetraktys's own sum, a full return to unity at a higher order. The Turning resolves everything before it into a single new coordinate.`,
        echo: {
          terms: [{ script: 'Δεκάς', translit: 'Dekas', lang: 'Greek', gloss: 'the holy Decad, 1+2+3+4=10, "most perfect of numbers"' }],
          note: `For the Pythagoreans, ten wasn't just a number after nine — it was the number that contained all the numbers before it, the Tetraktys folded into a single perfect sum. The Turning works the same way: everything in your arc so far is still present, just reorganized.`
        }
      },
      11: {
        name: 'The Fracture', keyword: 'Instability',
        text: `Something that held together cleanly through station ten finally shows a crack. This isn't failure — it's the arc admitting that the old structure has done all it can do, and something new needs room to form.`,
        overlay: `Eleven sits just past the Pythagorean decad's completion — the first number the old sacred system had no ready name for. The Fracture is exactly that: the arc moving past what its own prior logic can explain.`,
        echo: {
          terms: [{ script: 'קליפות', translit: 'Qliphoth', lang: 'Hebrew', gloss: "'shells' — imbalance existing just outside the ten sefirot" }],
          note: `Kabbalah maps ten sefirot as the complete, ordered structure of creation — eleven, by definition, falls outside that map. Jewish mystical tradition reads numbers just past a completed structure as inherently unstable, which is precisely the Fracture's job in your arc.`
        }
      },
      12: {
        name: 'The Bridge', keyword: 'Rebuilding',
        text: `A structure finally reappears — not the old one, a new one built from what survived the Fracture. This station connects the arc's broken middle to whatever's coming, and it's sturdier than it looks.`,
        overlay: `Twelve returns to full geometric stability — a number divisible six clean ways, the most "buildable" small number in the set. The Bridge holds weight because its underlying structure genuinely can.`,
        echo: {
          terms: [{ script: 'wnwt', translit: 'the Twelve Hours', lang: 'Kemetic', gloss: "Ra's nightly barque-journey through the Duat" }],
          note: `Egyptian funerary texts map the sun's nightly underworld crossing across exactly twelve hours, each guarded and each necessary — dawn isn't guaranteed, it's earned hour by hour. The Bridge station asks the same patience.`
        }
      },
      13: {
        name: 'The Reckoning', keyword: 'Honest Count',
        text: `Time to actually count the cost of everything since the Descent. This station has an unfair reputation for dread it doesn't deserve — most traditions that call thirteen unlucky are working from a much younger superstition than the number itself.`,
        overlay: `An eigenstate audit — the Reckoning doesn't add new information to the arc, it just finally measures what's already there, converting ambiguity into an honest number.`,
        echo: {
          terms: [{ script: 'יג מידות', translit: "yod-gimel middot", lang: 'Hebrew', gloss: 'the Thirteen Attributes of Mercy' }],
          note: `Jewish liturgical tradition attaches thirteen specifically to divine mercy — the Thirteen Attributes recited at the year's most searching moment. The Reckoning borrows that same spirit: an honest count, offered without cruelty.`
        }
      },
      14: {
        name: 'The Vow', keyword: 'Devotion',
        text: `You commit, out loud or in writing, to carrying what the Reckoning revealed. The Vow doesn't undo any damage — it just refuses to let the damage be the last word.`,
        overlay: `A phase-locked state — once made, the Vow constrains every future collapse in this arc to remain consistent with it. It's a boundary condition you've chosen rather than one imposed on you.`,
        echo: {
          terms: [{ script: 'Wsjr', translit: 'Osiris', lang: 'Kemetic', gloss: 'body scattered in fourteen pieces, recovered one by one' }],
          note: `Plutarch's account of the Osiris myth has the god's body divided into fourteen parts, each one needing to be individually found and honored before wholeness returns. The Vow is that same commitment: restoration by deliberate, piece-by-piece devotion, not a single magic reversal.`
        }
      },
      15: {
        name: 'The Harvest', keyword: 'Yield',
        text: `Something the arc planted many stations ago is finally ready to be gathered in. The Harvest rewards the version of you who kept showing up on the unglamorous middle stations nobody applauds.`,
        overlay: `A high-yield collapse — the eigenstate here resolves toward accumulated return, energy invested across many earlier low-visibility stations paying out at once.`,
        echo: {
          terms: [{ script: 'तिथि', translit: 'Tithi', lang: 'Sanskrit', gloss: 'one of fifteen lunar days completing each fortnight' }],
          note: `Vedic timekeeping divides each lunar fortnight into fifteen tithis, the fifteenth always marking a culmination — full moon or new moon, light fully gathered or fully released. The Harvest station is your arc's own fifteenth tithi.`
        }
      },
      16: {
        name: 'The Silence', keyword: 'Rest',
        text: `After the Harvest, the arc goes quiet on purpose. Nothing is asked of you at this station except to not immediately fill the space with a new plan. Let the silence finish its own sentence.`,
        overlay: `A ground-state return — after a high-energy collapse, the system needs to settle before the next excitation is even possible. The Silence isn't empty; it's recovery.`,
        echo: {
          terms: [{ script: 'علم الرمل', translit: "'Ilm al-Raml", lang: 'Arabic', gloss: 'sixteen figures — a total set, nothing needing to be added' }],
          note: `The geomantic tradition considers sixteen the complete set of possible figures — nothing outside it, nothing missing from it. The Silence station holds that same completeness: whatever this arc needed to generate, it already has.`
        }
      },
      17: {
        name: 'The Ember', keyword: 'Threshold Heat',
        text: `Not dead, not yet reignited — the Ember station holds the coal of everything the arc has built so far, warm and specific, waiting for the deliberate breath that will bring it back to flame.`,
        overlay: `A metastable state — held just below the threshold of full re-ignition, stable for now but ready to transition the instant the right small input arrives.`,
        echo: {
          terms: [{ script: '17', translit: 'heptakaideka', lang: 'Greek', gloss: 'wedged, per Plutarch, between the square 16 and the rectangle 18' }],
          note: `Plutarch records that some Pythagoreans distrusted seventeen specifically because of its position — wedged between the square of 16 and the rectangle of 18 (whose 3-by-6 sides share the square's perimeter), belonging fully to neither. The Ember sits in exactly that kind of in-between, and it's no less real for being hard to classify.`
        }
      },
      18: {
        name: 'The Convergence', keyword: 'Braiding',
        text: `Threads from across the whole arc — the Spark, the Ally, the Mirror, the Vow — visibly braid together here. This station doesn't introduce anything new; it just makes the pattern impossible to miss any longer.`,
        overlay: `Multiple prior eigenstates resolve into a single coherent superstructure — the Convergence is where local outcomes finally reveal themselves as one connected system.`,
        echo: {
          terms: [{ script: 'חַי', translit: 'Chai', lang: 'Hebrew', gloss: "'life' — gematria value 18 (ח=8, י=10)" }],
          note: `Chai — "life" itself — sums to eighteen in Hebrew gematria, which is why eighteen and its multiples became the customary denomination for gifts across Jewish tradition. The Convergence station carries that same charge: everything alive in this arc, gathered under one number.`
        }
      },
      19: {
        name: 'The Ascension', keyword: 'Reconciliation',
        text: `The arc lifts, decisively, out of whatever weight it's been carrying since the Descent. This station doesn't erase the cost of the journey — it just proves the cost bought something real.`,
        overlay: `A phase transition to a higher-energy stable configuration — not a temporary spike but a genuine change of state, the eigenstate settling into a new, elevated ground.`,
        echo: {
          terms: [{ script: 'Μετωνικὸς κύκλος', translit: 'Metonic cycle', lang: 'Greek', gloss: '19 solar years ≈ 235 lunar months, sun and moon realigned' }],
          note: `Meton of Athens found that nineteen years reconciles the sun's calendar with the moon's — two timekeeping systems that otherwise drift apart, brought back into alignment by this one number. The Ascension is your arc's own reconciliation, sun and moon of the story finally in the same sky again.`
        }
      },
      20: {
        name: 'The Eigenstate', keyword: 'Full Measurement',
        text: `The arc's final station is not an ending so much as a name for what has already happened — the whole sequence, collapsed into one settled, describable state. This is who the reading says you are, right now, having walked every prior number to get here.`,
        overlay: `The full measurement. Every prior superposition in this reading — Root, Grind, Vector, Twist, House, Arc — resolves here into a single describable configuration: your eigenstate, named and held.`,
        echo: {
          terms: [
            { script: 'quatre-vingt', translit: 'quatre-vingt', lang: 'French', gloss: "literally 'four-twenty' for eighty — vigesimal counting surviving in the language" }
          ],
          note: `Counting by twenties shows up in wildly unconnected places — the Maya Long Count, the old Celtic "score," even French still says quatre-vingt for eighty. Different civilizations, no contact between them, arriving at the same instinct: twenty is where a full count comes home. So does your arc.`
        }
      }
    }
  }
};

/* Element → zodiac triplicity, for the Antikythera-style dial.
   Each triplicity contains one cardinal, one fixed, one mutable sign;
   the mutable sign is the traditional point of culmination/handoff
   and receives extra emphasis on the dial (Water's is Pisces). */
ER.TRIPLICITY = {
  fire:  { signs: ['Aries', 'Leo', 'Sagittarius'],  mutable: 'Sagittarius', color: '#ff6b35' },
  earth: { signs: ['Taurus', 'Virgo', 'Capricorn'], mutable: 'Virgo',       color: '#c9a84c' },
  air:   { signs: ['Gemini', 'Libra', 'Aquarius'],  mutable: 'Gemini',      color: '#00f3ff' },
  water: { signs: ['Cancer', 'Scorpio', 'Pisces'],  mutable: 'Pisces',      color: '#bc13fe' }
};

ER.ZODIAC = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
