const SCENES = {
    "start": {
        title: "The Trap Shuts",
        text: "The rent cleared. The Con Ed cleared. The arithmetic held. Then the ALPR cameras on the Triboro bridge caught the gray sedan. Fourteen thousand dollars in escalated state tolls. The registration is suspended. The repo truck idles down the block. The house is a cage.",
        voice: "narrator",
        bg: "none",
        choices: [{ type: "button", label: "LOOK OUT THE WINDOW", next: "hub" }]
    },
    "hub": {
        title: "The Options",
        text: "Three desperate thoughts form in the dark. Which way out?",
        voice: "protagonist",
        bg: "none",
        isHub: true,
        choices: [
            { type: "cloud", label: "The Hustle", desc: "Work 80 hours. Fight the courts. Pay it off.", next: "hustle_1" },
            { type: "cloud", label: "The Bedlam", desc: "Wait for global collapse. Let it burn.", next: "bedlam_1" },
            { type: "cloud", label: "The Paper", desc: "Surrender the metal. Call the lawyer.", next: "paper_1" }
        ]
    },
    "hustle_1": {
        title: "The Squeeze",
        text: "Uber halves the rate. The school cuts the hours. You take a warehouse job. The truck door slams on your hand. Six thousand dollars for the uninsured ER visit. The math fractures.",
        voice: "narrator",
        bg: "none",
        choices: [{ type: "button", label: "KEEP GRINDING", next: "hustle_2" }]
    },
    "hustle_2": {
        title: "The Repo",
        text: "The first lawyer takes a third. The second takes another third. You are left with nothing. The tow truck pins the sedan. The friend in the driver's seat shakes.",
        voice: "narrator",
        bg: "none",
        choices: [{ type: "button", label: "BACK TO THE WINDOW", next: "hub", isLoop: true }]
    },
    "bedlam_1": {
        title: "The News Broadcast",
        text: "The anchor is losing it on live television. Millions took the Ecuador loophole—no passport required—and just kept walking north. Shuttle buses into the Midwest. A quiet field to lay down in. Sleeper agents were literally sleeping.",
        voice: "narrator",
        bg: "none",
        choices: [{ type: "button", label: "THE SIGNAL HITS", next: "bedlam_2" }]
    },
    "bedlam_2": {
        title: "The Two-Way Street",
        text: "The signal activates. Manholes launch off their hinges. Basement doors blow outward. Storm drains flood with troops. The old playground joke turns real on the ticker: dig a hole, you hit China. Turns out it runs both directions.",
        voice: "protagonist",
        bg: "earth",
        choices: [{ type: "button", label: "THE GOVERNMENT FALLS", next: "bedlam_3" }]
    },
    "bedlam_3": {
        title: "The New Priorities",
        text: "Washington collapses by Tuesday. A new Emperor of the World takes the podium in Beijing. Global infrastructure gets repurposed overnight. Lithium. Copper. Raw material, stripped at the continental scale, feeding an empire with no interest in your zip code.",
        voice: "narrator",
        bg: "earth",
        choices: [{ type: "button", label: "CHECK THE BRIDGE", next: "bedlam_4" }]
    },
    "bedlam_4": {
        title: "The Flock Camera",
        text: "The ALPR gantry on the Triboro still has power. Red laser, same as always, tracks the gray sedan's plate. The new regime does not audit municipal debt from a dead government. Green light. Obedient cog, confirmed. You keep the car.",
        voice: "protagonist",
        bg: "earth",
        choices: [{ type: "button", label: "LOOK UP", next: "bedlam_5" }]
    },
    "bedlam_5": {
        title: "The Whistleblower",
        text: "Cape Canaveral, emergency briefing. A NASA scientist rips off his lab coat mid-sentence: the CGI budget ran dry, and so did the curvature. Behind him, a crayon map of a flat disc, ringed in ice.",
        voice: "narrator",
        bg: "sky",
        choices: [{ type: "button", label: "THE FLOOR GIVES OUT", next: "bedlam_6" }]
    },
    "bedlam_6": {
        title: "The Miscalculation",
        text: "Somebody underestimated the crust. A sinkhole swallows half the invasion, and the tunnel dumps them straight through the bottom of the map into vacuum. Gravity thins at the edges. The Triboro gantry tears loose from its footing and drifts into the stratosphere, your fourteen thousand dollars riding with it. Two blocks over, the flatbed hits a pothole that opens clean through the planet. Driver, clipboard, lien—gone, cartwheeling into the dark.",
        voice: "narrator",
        bg: "sky",
        choices: [{ type: "button", label: "SIT ON THE HOOD", next: "bedlam_7" }]
    },
    "bedlam_7": {
        title: "Zero Balance",
        text: "Sunglasses on, soda in hand, hood of the sedan warm under you. Paratroopers drift past in zero gravity. The toll authority is somewhere near the rings of Saturn now. Balance: zero.",
        voice: "protagonist",
        bg: "sky",
        choices: [{ type: "button", label: "WAKE UP", next: "bedlam_8" }]
    },
    "bedlam_8": {
        title: "The Glitch",
        text: "The debris is gone. Just smog over Queens. The stack of letters, untouched, still on the counter. The world didn't end. The balance didn't move.",
        voice: "narrator",
        bg: "none",
        choices: [{ type: "button", label: "TURN ON THE TV", next: "bedlam_9" }]
    },
    "bedlam_9": {
        title: "The Confirmation",
        text: "Boring, grounding, real: the anchor cuts to National Harbor, Maryland. Air and Space Forces conference, chyron running red. The Secretary confirms it, live: orbital weapons, deployed, defending the joint force against hostile action. The dream and the newsroom, lined up panel for panel.",
        voice: "narrator",
        bg: "none",
        choices: [{ type: "button", label: "STARE AT THE BILL", next: "bedlam_10" }]
    },
    "bedlam_10": {
        title: "The Stare",
        text: "Eye twitch. TV, then the bill, then the TV again. Space lasers might be warming up in orbit. Fourteen thousand dollars is still due Tuesday regardless. The phone comes out—not for a friend, not for Maryland. For a search bar.",
        voice: "protagonist",
        bg: "none",
        choices: [{ type: "button", label: "BACK TO THE WINDOW", next: "hub", isLoop: true }]
    },
    "paper_1": {
        title: "Severing the Leash",
        text: "You stop fighting the street. You call the lender and authorize a voluntary surrender. Before the flatbed takes the car, you unscrew the plates and walk them into the DMV. The penalty clock stops.",
        voice: "protagonist",
        bg: "none",
        choices: [{ type: "button", label: "MAKE THE CALL", next: "paper_2" }]
    },
    "paper_2": {
        title: "The Ultimate Reset",
        text: "You file Chapter 7. The Automatic Stay drops like a steel door. Creditors freeze. The ombudsman strips the inflated late fees. The ledger clears.",
        voice: "narrator",
        bg: "none",
        choices: [{ type: "button", label: "WALK OUTSIDE", isWin: true }]
    }
};
