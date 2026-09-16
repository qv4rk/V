// === THE $14K TOLL TRAP — MOTION COMIC DATA ===
// 18 panels, each with its SVG illustration and a two-host podcast
// script (COLE + REYES) narrating what's happening on screen.

const PANELS = [
  {
    id: 1,
    title: "1. The Good Week",
    indicator: "THE GOOD WEEK",
    indicatorColor: "#3fb950",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="0" y="300" width="800" height="150" fill="#161b22"/>
      <line x1="0" y1="300" x2="800" y2="300" stroke="#30363d" stroke-width="3"/>
      <g transform="translate(70,80)">
        <rect width="200" height="280" rx="22" fill="#21262d" stroke="#3fb950" stroke-width="3"/>
        <rect x="12" y="28" width="176" height="210" rx="6" fill="#0d1117"/>
        <text x="24" y="58" fill="#3fb950" font-family="sans-serif" font-size="14" font-weight="700">TRIP COMPLETE</text>
        <text x="24" y="88" fill="#fff" font-family="ui-monospace,monospace" font-size="28" font-weight="700">+$42.80</text>
        <text x="24" y="118" fill="#8b949e" font-family="sans-serif" font-size="12">LGA &#8594; Astoria</text>
        <rect x="24" y="150" width="150" height="26" rx="4" fill="#238636"/>
        <text x="48" y="168" fill="#fff" font-family="sans-serif" font-size="12" font-weight="700">CASH OUT</text>
      </g>
      <g transform="translate(320,120)">
        <rect width="180" height="120" rx="8" fill="#161b22" stroke="#58a6ff" stroke-width="2"/>
        <text x="16" y="36" fill="#58a6ff" font-family="sans-serif" font-size="13" font-weight="700">PS AIDE &#183; QUEENS</text>
        <text x="16" y="64" fill="#fff" font-family="sans-serif" font-size="18" font-weight="700">$18.40 / hr</text>
        <text x="16" y="92" fill="#3fb950" font-family="sans-serif" font-size="12">HOURS: 28 &#183; POSTED</text>
      </g>
      <g transform="translate(530,110)">
        <rect width="210" height="210" rx="6" fill="#f0e6cf"/>
        <text x="16" y="32" fill="#161b22" font-family="sans-serif" font-size="13" font-weight="700">RENT &#183; CON ED &#183; NOTE</text>
        <line x1="16" y1="46" x2="190" y2="46" stroke="#c4a574"/>
        <text x="16" y="78" fill="#161b22" font-family="ui-monospace,monospace" font-size="12">APT  1,850</text>
        <text x="16" y="102" fill="#161b22" font-family="ui-monospace,monospace" font-size="12">POWER   94</text>
        <text x="16" y="126" fill="#161b22" font-family="ui-monospace,monospace" font-size="12">CAR    412</text>
        <g transform="rotate(-18 110 160)">
          <circle cx="110" cy="160" r="38" fill="none" stroke="#238636" stroke-width="5"/>
          <text x="84" y="166" fill="#238636" font-family="sans-serif" font-size="14" font-weight="800">PAID</text>
        </g>
      </g>
      <text x="320" y="280" fill="#8b949e" font-family="sans-serif" font-size="14">Two checks. One sedan. The month closes.</text>
    </svg>`,
    dialogue: [
      { spkr: "cole", text: "Two jobs. One sedan. Rent stamped paid, Con Ed stamped paid, the car note clears on the fifteenth." },
      { spkr: "reyes", text: "Airport runs before dawn, cafeteria duty after lunch. Nobody's calling him." },
      { spkr: "cole", text: "That's the baseline. Remember it, because every panel after this one erodes it by degrees." }
    ]
  },
  {
    id: 2,
    title: "2. Uber Cuts the Rate",
    indicator: "RATE CUT",
    indicatorColor: "#f0883e",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <g transform="translate(80,70)">
        <rect width="280" height="310" rx="24" fill="#21262d" stroke="#f0883e" stroke-width="3"/>
        <rect x="14" y="30" width="252" height="240" rx="6" fill="#0d1117"/>
        <text x="28" y="70" fill="#8b949e" font-family="sans-serif" font-size="13">SAME TRIP &#183; LGA &#8594; ASTORIA</text>
        <text x="28" y="130" fill="#6e7681" font-family="ui-monospace,monospace" font-size="22" text-decoration="line-through">$42.80</text>
        <text x="28" y="180" fill="#f0883e" font-family="ui-monospace,monospace" font-size="36" font-weight="800">$19.15</text>
        <text x="28" y="220" fill="#f85149" font-family="sans-serif" font-size="13">NEW MARKET RATE APPLIED</text>
      </g>
      <g transform="translate(430,160)">
        <rect x="40" y="80" width="280" height="90" rx="8" fill="#21262d"/>
        <circle cx="110" cy="70" r="28" fill="#8d5524"/>
        <rect x="82" y="96" width="56" height="50" fill="#1f6feb"/>
        <text x="160" y="130" fill="#c9d1d9" font-family="sans-serif" font-size="14">same miles</text>
        <text x="160" y="152" fill="#f0883e" font-family="sans-serif" font-size="16" font-weight="700">half the envelope</text>
      </g>
    </svg>`,
    dialogue: [
      { spkr: "reyes", text: "Same bridge, same forty minutes to LGA. Overnight, the payout just redraws itself." },
      { spkr: "cole", text: "Forty-two eighty becomes nineteen fifteen. Gas doesn't move. The take does." },
      { spkr: "reyes", text: "Nobody signed anything. The app just decided." }
    ]
  },
  {
    id: 3,
    title: "3. The School Cuts the Hours",
    indicator: "HOURS CUT",
    indicatorColor: "#f0883e",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="90" y="60" width="620" height="320" rx="8" fill="#161b22" stroke="#30363d" stroke-width="2"/>
      <text x="120" y="110" fill="#58a6ff" font-family="sans-serif" font-size="16" font-weight="700">DOE TIMEKEEPING &#183; SCHOOL AIDE</text>
      <line x1="120" y1="128" x2="670" y2="128" stroke="#30363d"/>
      <text x="120" y="170" fill="#8b949e" font-family="ui-monospace,monospace" font-size="14">PREVIOUS  28.0 HRS</text>
      <text x="120" y="210" fill="#f85149" font-family="ui-monospace,monospace" font-size="22" font-weight="700">THIS CYCLE  11.5 HRS</text>
      <rect x="120" y="240" width="280" height="18" rx="3" fill="#21262d"/>
      <rect x="120" y="240" width="115" height="18" rx="3" fill="#f0883e"/>
      <text x="120" y="290" fill="#8b949e" font-family="sans-serif" font-size="13">Budget letter on the break-room table. Afternoon slots gone.</text>
      <text x="120" y="330" fill="#c9d1d9" font-family="sans-serif" font-size="15">The second check shrinks in the same week as the first.</text>
    </svg>`,
    dialogue: [
      { spkr: "cole", text: "Twenty-eight hours drops to eleven and a half. Same week as the rate cut." },
      { spkr: "reyes", text: "A budget letter on the break-room table. The cafeteria still needs bodies. The line item doesn't." }
    ]
  },
  {
    id: 4,
    title: "4. The Medical Night",
    indicator: "THE BILL",
    indicatorColor: "#f85149",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="0" y="200" width="800" height="250" fill="#161b22"/>
      <rect x="250" y="80" width="300" height="160" fill="#1f242b" stroke="#f85149" stroke-width="3"/>
      <text x="330" y="170" fill="#f85149" font-family="sans-serif" font-size="42" font-weight="800">ER</text>
      <rect x="248" y="78" width="8" height="164" fill="#f85149"/>
      <rect x="544" y="78" width="8" height="164" fill="#f85149"/>
      <g transform="translate(430,230) rotate(-6)">
        <rect width="320" height="180" fill="#f6f0e4" stroke="#161b22" stroke-width="2"/>
        <text x="16" y="28" fill="#161b22" font-family="sans-serif" font-size="12" font-weight="700">HOSPITAL ACCOUNT</text>
        <text x="16" y="70" fill="#f85149" font-family="ui-monospace,monospace" font-size="26" font-weight="800">$8,640.00</text>
        <text x="16" y="100" fill="#161b22" font-family="sans-serif" font-size="12">SELF-PAY &#183; UNINSURED NIGHT</text>
        <text x="16" y="130" fill="#6e3b00" font-family="sans-serif" font-size="11">DUE ON RECEIPT</text>
      </g>
      <text x="40" y="360" fill="#8b949e" font-family="sans-serif" font-size="14">One night. One wristband. The table already had two jobs on it.</text>
    </svg>`,
    dialogue: [
      { spkr: "reyes", text: "One ER visit, uninsured: eight thousand six hundred forty dollars." },
      { spkr: "cole", text: "That number doesn't care he has two jobs. It sits on the same stack as rent and the car note." }
    ]
  },
  {
    id: 5,
    title: "5. The Note Goes Assigned",
    indicator: "THE NOTE SLIPS",
    indicatorColor: "#f85149",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="0" y="340" width="800" height="110" fill="#161b22"/>
      <g font-family="ui-monospace,monospace" font-size="13">
        <rect x="40" y="40" width="300" height="260" rx="6" fill="#161b22" stroke="#30363d"/>
        <text x="56" y="70" fill="#58a6ff" font-size="14" font-weight="700">CAR NOTE &#183; DUE 15th</text>
        <text x="70" y="120" fill="#3fb950">15  PAID</text>
        <text x="70" y="160" fill="#3fb950">15  PAID</text>
        <text x="70" y="200" fill="#f0883e">15  12 DAYS LATE</text>
        <text x="70" y="240" fill="#f85149" font-size="16" font-weight="700">15  41 DAYS &#183; ASSIGNED</text>
      </g>
      <g transform="translate(400,250)">
        <rect x="20" y="40" width="300" height="24" fill="#6e3b00"/>
        <path d="M 300 64 L 300 20 L 360 20 L 390 48 L 390 64 Z" fill="#f0883e"/>
        <circle cx="70" cy="74" r="16" fill="#111" stroke="#8b949e" stroke-width="4"/>
        <circle cx="330" cy="74" r="16" fill="#111" stroke="#8b949e" stroke-width="4"/>
        <text x="40" y="30" fill="#f0883e" font-family="sans-serif" font-size="13" font-weight="700">RECOVERY UNIT</text>
      </g>
      <text x="400" y="220" fill="#8b949e" font-family="sans-serif" font-size="14">They know the block before he does.</text>
    </svg>`,
    dialogue: [
      { spkr: "cole", text: "Forty-one days late. The lender stops mailing pink paper and starts mailing a truck." },
      { spkr: "reyes", text: "The car's still his in the driveway. It's already theirs on a list." }
    ]
  },
  {
    id: 6,
    title: "6. Somebody Has to Sit",
    indicator: "OCCUPIED",
    indicatorColor: "#a371f7",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="0" y="0" width="280" height="450" fill="#1b2838"/>
      <rect x="20" y="40" width="240" height="140" fill="#58a6ff" opacity="0.15"/>
      <text x="40" y="90" fill="#c9d1d9" font-family="sans-serif" font-size="16" font-weight="700">KEY FOOD</text>
      <text x="40" y="114" fill="#8b949e" font-family="sans-serif" font-size="12">AISLE 4 &#183; RICE &#183; MILK</text>
      <circle cx="90" cy="260" r="16" fill="#8d5524"/>
      <rect x="74" y="276" width="32" height="50" fill="#1f6feb"/>
      <rect x="70" y="324" width="14" height="40" fill="#21262d"/>
      <rect x="96" y="324" width="14" height="40" fill="#21262d"/>
      <g transform="translate(330,200)">
        <path d="M 20 140 L 8 90 Q 40 30 130 30 L 250 40 Q 310 55 322 100 L 322 140 Z" fill="#2f353b" stroke="#111" stroke-width="3"/>
        <path d="M 120 42 L 230 48 Q 270 60 280 90 L 120 90 Z" fill="#0b1016"/>
        <g transform="translate(175,55)">
          <circle cx="0" cy="0" r="14" fill="#8d5524"/>
          <g fill="#2b1a10"><circle cx="-8" cy="-10" r="4"/><circle cx="0" cy="-13" r="4"/><circle cx="8" cy="-10" r="4"/></g>
          <rect x="-16" y="12" width="32" height="20" fill="#009b3a"/>
          <path d="M -14 18 L 14 18 L 0 28 Z" fill="#fed100"/>
          <ellipse cx="0" cy="30" rx="10" ry="4" fill="none" stroke="#f0d060" stroke-width="1.5"/>
          <g transform="translate(2,38)">
            <circle cx="0" cy="0" r="16" fill="none" stroke="#222" stroke-width="4"/>
            <ellipse cx="-12" cy="2" rx="5" ry="4" fill="#8d5524"/>
            <ellipse cx="12" cy="2" rx="5" ry="4" fill="#8d5524"/>
          </g>
        </g>
        <circle cx="70" cy="150" r="22" fill="#111" stroke="#6e7681" stroke-width="5"/>
        <circle cx="260" cy="150" r="22" fill="#111" stroke="#6e7681" stroke-width="5"/>
      </g>
      <g transform="translate(620,300)" opacity="0.85">
        <rect width="140" height="18" fill="#6e3b00"/>
        <text x="8" y="-8" fill="#f0883e" font-family="sans-serif" font-size="11" font-weight="700">HOOK</text>
      </g>
      <text x="320" y="50" fill="#a371f7" font-family="sans-serif" font-size="15" font-weight="700">BODY IN THE SEAT = NO HOOK</text>
    </svg>`,
    dialogue: [
      { spkr: "reyes", text: "He learns the rule fast: a car with a body in the driver's seat doesn't get hooked on the spot." },
      { spkr: "cole", text: "So a friend sits behind the wheel in a parking lot while he shops. Free babysitting for a two-ton asset." }
    ]
  },
  {
    id: 7,
    title: "7. Over the Triboro, Every Day",
    indicator: "THE BRIDGE",
    indicatorColor: "#58a6ff",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="p7dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1a3a5c"/><stop offset="55%" stop-color="#0d1117"/><stop offset="100%" stop-color="#1c1408"/>
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#p7dusk)"/>
      <g fill="#0b1520">
        <rect x="20" y="160" width="18" height="90"/><rect x="42" y="130" width="22" height="120"/>
        <rect x="68" y="150" width="14" height="100"/><rect x="86" y="100" width="16" height="150"/>
        <rect x="108" y="140" width="28" height="110"/><rect x="140" y="118" width="12" height="132"/>
        <rect x="156" y="155" width="20" height="95"/>
      </g>
      <g stroke="#8b949e" fill="#4b5563">
        <rect x="280" y="80" width="18" height="220"/><rect x="500" y="80" width="18" height="220"/>
        <polygon points="280,80 298,80 289,50"/><polygon points="500,80 518,80 509,50"/>
      </g>
      <path d="M 40 210 Q 289 40 509 40 Q 700 60 800 180" fill="none" stroke="#c9d1d9" stroke-width="3"/>
      <rect x="0" y="298" width="800" height="16" fill="#3d444d"/>
      <rect x="0" y="314" width="800" height="136" fill="#161b22"/>
      <rect x="620" y="230" width="14" height="70" fill="#8b949e"/>
      <rect x="620" y="220" width="160" height="12" fill="#8b949e"/>
      <text x="640" y="214" fill="#f85149" font-family="ui-monospace,monospace" font-size="11" font-weight="700">CASH / TOLL BY MAIL</text>
      <g transform="translate(340,300)">
        <path d="M 0 40 L -8 16 Q 16 -10 70 -10 L 130 -4 Q 160 6 166 24 L 166 40 Z" fill="#2f353b" stroke="#111" stroke-width="2"/>
        <circle cx="28" cy="46" r="10" fill="#111"/><circle cx="140" cy="46" r="10" fill="#111"/>
      </g>
      <g transform="translate(30,20)">
        <rect width="250" height="86" rx="6" fill="#010409" fill-opacity=".85" stroke="#f85149"/>
        <text x="14" y="28" fill="#f85149" font-family="ui-monospace,monospace" font-size="12" font-weight="700">TOLL-BY-MAIL &#183; RFK</text>
        <text x="14" y="56" fill="#fff" font-family="ui-monospace,monospace" font-size="22" font-weight="800">$+10.17</text>
        <text x="14" y="76" fill="#8b949e" font-family="sans-serif" font-size="11">NO TAG &#183; EVERY CROSSING</text>
      </g>
    </svg>`,
    dialogue: [
      { spkr: "cole", text: "No tag, no beep. Every crossing generates a letter instead." },
      { spkr: "reyes", text: "Ten seventeen a pass, plus a late-fee machine that wakes up weeks later and never goes back to sleep." }
    ]
  },
  {
    id: 8,
    title: "8. Stuck in the House",
    indicator: "THE CAGE",
    indicatorColor: "#f85149",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="80" y="40" width="420" height="280" fill="#010409" stroke="#6e7681" stroke-width="10"/>
      <line x1="290" y1="40" x2="290" y2="320" stroke="#6e7681" stroke-width="8"/>
      <line x1="80" y1="180" x2="500" y2="180" stroke="#6e7681" stroke-width="8"/>
      <g transform="translate(220,220)"><rect width="90" height="16" fill="#6e3b00"/><circle cx="18" cy="22" r="7" fill="#111"/><circle cx="70" cy="22" r="7" fill="#111"/></g>
      <g transform="translate(540,80)">
        <rect width="200" height="70" fill="#f0e6cf" transform="rotate(-4 100 35)"/>
        <rect y="50" width="200" height="70" fill="#e8dcc4"/>
        <rect y="110" width="200" height="90" fill="#f6f0e4" stroke="#f85149" stroke-width="2"/>
        <text x="16" y="148" fill="#f85149" font-family="ui-monospace,monospace" font-size="18" font-weight="800">$14,000</text>
        <text x="16" y="172" fill="#161b22" font-family="sans-serif" font-size="11">TBTA &#183; ESCALATED &#183; FINAL</text>
      </g>
      <text x="90" y="370" fill="#8b949e" font-family="sans-serif" font-size="15">The sedan is downstairs. He is not.</text>
      <text x="90" y="396" fill="#f85149" font-family="sans-serif" font-size="14">Two trucks want it. The letters already own the number.</text>
    </svg>`,
    dialogue: [
      { spkr: "cole", text: "Fourteen thousand dollars. Mostly late fees, stacked on top of maybe two grand in real crossings." },
      { spkr: "reyes", text: "Two trucks want the car. He starts inventing exits from behind the glass." }
    ]
  },
  {
    id: 9,
    title: "9. Borrowed Tin",
    indicator: "TRY: PLATES",
    indicatorColor: "#a371f7",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="0" y="330" width="800" height="120" fill="#161b22"/>
      <rect x="80" y="250" width="640" height="90" rx="8" fill="#2f353b"/>
      <g transform="translate(180,255) rotate(-12)">
        <rect width="200" height="80" rx="6" fill="#f0e6cf" stroke="#111" stroke-width="3"/>
        <rect width="200" height="16" fill="#0033a0"/>
        <text x="30" y="52" fill="#161b22" font-family="ui-monospace,monospace" font-size="22" font-weight="800">HIS-PL8</text>
      </g>
      <g transform="translate(430,248)">
        <rect width="200" height="80" rx="6" fill="#f0e6cf" stroke="#3fb950" stroke-width="3"/>
        <rect width="200" height="16" fill="#0033a0"/>
        <text x="18" y="52" fill="#161b22" font-family="ui-monospace,monospace" font-size="20" font-weight="800">FRND-22</text>
      </g>
      <g transform="translate(140,80)">
        <circle r="22" fill="#8d5524"/>
        <text x="36" y="8" fill="#c9d1d9" font-family="sans-serif" font-size="14">same make. same color.</text>
        <text x="36" y="30" fill="#a371f7" font-family="sans-serif" font-size="14">his friend's tin on the bolts.</text>
      </g>
      <g transform="translate(620,90)"><circle r="22" fill="#8d5524"/><g fill="#2b1a10"><circle cx="-10" cy="-14" r="5"/><circle cx="0" cy="-16" r="5"/><circle cx="10" cy="-12" r="5"/></g></g>
    </svg>`,
    dialogue: [
      { spkr: "reyes", text: "The plan sounds clean in the driveway: unscrew his plate, bolt on a friend's, drive like the gantry's reading someone else." },
      { spkr: "cole", text: "Same sedan shape, different aluminum. That's the whole idea." }
    ]
  },
  {
    id: 10,
    title: "10. The Plate Does Not Marry the Dash",
    indicator: "FAIL: VIN",
    indicatorColor: "#f85149",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="70" y="50" width="660" height="340" rx="8" fill="#161b22" stroke="#f85149" stroke-width="2"/>
      <text x="100" y="100" fill="#f85149" font-family="sans-serif" font-size="18" font-weight="700">PLATE / VIN MISMATCH</text>
      <line x1="100" y1="116" x2="680" y2="116" stroke="#30363d"/>
      <text x="100" y="160" fill="#8b949e" font-family="ui-monospace,monospace" font-size="14">PLATE   FRND-22   &#8594;  REGISTERED TO FRIEND'S VIN</text>
      <text x="100" y="196" fill="#8b949e" font-family="ui-monospace,monospace" font-size="14">CAR     HIS SEDAN &#8594;  DASH VIN STILL HIS</text>
      <text x="100" y="250" fill="#fff" font-family="sans-serif" font-size="16">The camera reads both. The database wants them married.</text>
      <text x="100" y="290" fill="#f85149" font-family="sans-serif" font-size="16" font-weight="700">They are not married. Stop is a felony conversation.</text>
      <rect x="100" y="320" width="200" height="36" rx="4" fill="#f85149"/>
      <text x="148" y="344" fill="#fff" font-family="sans-serif" font-size="14" font-weight="700">SCHEME DEAD</text>
    </svg>`,
    dialogue: [
      { spkr: "cole", text: "Flock and the toll gantries store plate, make, and VIN together. The dash VIN never changes." },
      { spkr: "reyes", text: "Plate says one man, chassis says another. That's not a loophole. That's a felony conversation with a cop." }
    ]
  },
  {
    id: 11,
    title: "11. Maryland Paper",
    indicator: "TRY: MARYLAND",
    indicatorColor: "#a371f7",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="0" y="260" width="800" height="190" fill="#1c2430"/>
      <rect x="40" y="200" width="720" height="70" fill="#3d444d"/>
      <text x="60" y="244" fill="#fff" font-family="sans-serif" font-size="16" font-weight="700">MVA &#183; GLEN BURNIE &#183; TITLE / TAGS</text>
      <g transform="translate(80,60)">
        <rect width="240" height="120" rx="8" fill="#fff" stroke="#c00" stroke-width="6"/>
        <text x="36" y="40" fill="#c00" font-family="sans-serif" font-size="11" font-weight="700">MARYLAND</text>
        <text x="28" y="82" fill="#111" font-family="ui-monospace,monospace" font-size="28" font-weight="800">FRND 22</text>
        <text x="70" y="108" fill="#c00" font-family="sans-serif" font-size="10">WAR OF 1812</text>
      </g>
      <g transform="translate(400,120)">
        <circle cx="0" cy="40" r="20" fill="#8d5524"/><rect x="-18" y="60" width="36" height="40" fill="#1f6feb"/>
        <circle cx="80" cy="40" r="20" fill="#8d5524"/>
        <g fill="#2b1a10" transform="translate(80,40)"><circle cx="-8" cy="-14" r="4"/><circle cx="0" cy="-16" r="4"/><circle cx="8" cy="-12" r="4"/></g>
        <rect x="62" y="60" width="36" height="40" fill="#009b3a"/>
        <text x="130" y="70" fill="#c9d1d9" font-family="sans-serif" font-size="14">Put it in his name.</text>
        <text x="130" y="92" fill="#a371f7" font-family="sans-serif" font-size="14">New state. Clean paper.</text>
      </g>
    </svg>`,
    dialogue: [
      { spkr: "reyes", text: "New plan: drive to Glen Burnie, put the car in a friend's name, hang a Maryland plate on it." },
      { spkr: "cole", text: "New state, new file, same old car." }
    ]
  },
  {
    id: 12,
    title: "12. The Lien Follows the VIN",
    indicator: "FAIL: TITLE",
    indicatorColor: "#f85149",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="70" y="50" width="660" height="340" rx="8" fill="#161b22" stroke="#f85149" stroke-width="2"/>
      <text x="100" y="100" fill="#f85149" font-family="sans-serif" font-size="18" font-weight="700">NMVTIS / LIEN FLAG</text>
      <line x1="100" y1="116" x2="680" y2="116" stroke="#30363d"/>
      <text x="100" y="160" fill="#c9d1d9" font-family="sans-serif" font-size="15">The national title check already has the lender on the VIN.</text>
      <text x="100" y="200" fill="#c9d1d9" font-family="sans-serif" font-size="15">Maryland will not hang a tag on a car he does not own.</text>
      <text x="100" y="250" fill="#f0883e" font-family="sans-serif" font-size="15">A friend who titles it anyway is in the fraud column with him.</text>
      <text x="100" y="300" fill="#f85149" font-family="sans-serif" font-size="16" font-weight="700">Out-of-state paper does not wash a live lien.</text>
      <rect x="100" y="328" width="200" height="36" rx="4" fill="#f85149"/>
      <text x="148" y="352" fill="#fff" font-family="sans-serif" font-size="14" font-weight="700">SCHEME DEAD</text>
    </svg>`,
    dialogue: [
      { spkr: "cole", text: "Every DMV in the country reads the same national title database. The lender's already on that VIN." },
      { spkr: "reyes", text: "Maryland won't tag a car he doesn't own. And a friend who titles it anyway just joined him in the fraud column." }
    ]
  },
  {
    id: 13,
    title: "13. The Flock Dragnet",
    indicator: "THE THREAT",
    indicatorColor: "#f85149",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="p13sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a1628"/><stop offset="100%" stop-color="#16110c"/></linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#p13sky)"/>
      <rect x="0" y="360" width="800" height="90" fill="#1c2128"/>
      <line x1="0" y1="360" x2="800" y2="360" stroke="#30363d" stroke-width="3"/>
      <g transform="translate(8,6)">
        <path d="M 168 338 L 148 278 Q 188 208 278 208 L 392 218 Q 458 236 470 286 L 470 338 Z" fill="#2f353b" stroke="#1c2126" stroke-width="3"/>
        <path d="M 268 222 L 388 228 Q 428 242 438 278 L 268 278 Z" fill="#0b1016"/>
        <circle cx="210" cy="348" r="28" fill="#0d1117" stroke="#6e7681" stroke-width="6"/>
        <circle cx="410" cy="348" r="28" fill="#0d1117" stroke="#6e7681" stroke-width="6"/>
        <rect x="154" y="304" width="48" height="20" rx="2" fill="#f85149"/>
        <text x="160" y="318" fill="#fff" font-family="ui-monospace,monospace" font-size="10" font-weight="700">SUSP</text>
      </g>
      <g transform="translate(548,28)">
        <rect x="54" y="70" width="9" height="332" fill="#1f242b"/>
        <g transform="translate(18,18) rotate(-24)"><rect width="92" height="48" rx="2" fill="#0b1014" stroke="#6e7681" stroke-width="2"/></g>
        <g transform="translate(18,118) rotate(-18)"><rect width="38" height="58" rx="10" fill="#12161c" stroke="#8b949e" stroke-width="2"/><circle cx="19" cy="20" r="5" fill="#58a6ff"/></g>
      </g>
      <g font-family="ui-monospace,monospace">
        <rect x="24" y="18" width="300" height="78" rx="6" fill="#010409" fill-opacity=".8" stroke="#f85149"/>
        <text x="36" y="42" fill="#f85149" font-size="13" font-weight="700">FLOCK HIT &#183; LANE 2</text>
        <text x="36" y="62" fill="#ff7b72" font-size="12">PLATE NY &#183; FLAG SUSP</text>
        <text x="36" y="82" fill="#8b949e" font-size="11">TOLL STACK $14,000 &#183; CONF 0.97</text>
      </g>
    </svg>`,
    dialogue: [
      { spkr: "cole", text: "Suspended registration plus a fourteen-thousand-dollar toll stack. One clean plate read turns a commute into a misdemeanor stop." },
      { spkr: "reyes", text: "Full-body scan down the hood. Ninety-seven percent confidence. That's not a maybe." }
    ]
  },
  {
    id: 14,
    title: "14. The Voluntary Surrender",
    indicator: "TACTICAL RETREAT",
    indicatorColor: "#3fb950",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="0" y="360" width="800" height="90" fill="#161b22"/>
      <g transform="translate(70,120)">
        <rect width="86" height="168" rx="14" fill="#21262d" stroke="#58a6ff" stroke-width="3"/>
        <rect x="8" y="22" width="70" height="118" rx="4" fill="#0d1117"/>
        <text x="14" y="48" fill="#3fb950" font-family="sans-serif" font-size="9" font-weight="700">HARDSHIP</text>
        <text x="14" y="92" fill="#c9d1d9" font-family="ui-monospace,monospace" font-size="11">CALL &#183; LIVE</text>
        <rect x="14" y="104" width="58" height="18" rx="3" fill="#238636"/>
        <text x="20" y="117" fill="#fff" font-family="sans-serif" font-size="9" font-weight="700">AUTHORIZE</text>
      </g>
      <g transform="translate(300,292)">
        <rect width="360" height="28" fill="#1f6f3a"/>
        <path d="M 340 0 L 340 -68 L 410 -68 L 448 -18 L 448 0 Z" fill="#2ea043"/>
        <path d="M 30 -66 L 22 -96 Q 50 -120 90 -120 L 160 -114 Q 190 -106 196 -84 L 196 -66 Z" fill="#2f353b" stroke="#111" stroke-width="2"/>
        <circle cx="60" cy="52" r="20" fill="#0d1117" stroke="#6e7681" stroke-width="5"/>
        <circle cx="390" cy="52" r="20" fill="#0d1117" stroke="#6e7681" stroke-width="5"/>
        <rect x="18" y="-66" width="168" height="22" rx="4" fill="#0d1117"/>
        <text x="28" y="-50" fill="#3fb950" font-family="sans-serif" font-size="13" font-weight="700">LENDER CARGO TOW</text>
      </g>
    </svg>`,
    dialogue: [
      { spkr: "reyes", text: "So he stops running from the street and calls the lender's hardship line himself." },
      { spkr: "cole", text: "Their own insured flatbed shows up before a patrol car ever does. Zero driving-violation exposure." }
    ]
  },
  {
    id: 15,
    title: "15. Severing the Leash",
    indicator: "DAMAGE CONTROL",
    indicatorColor: "#f0883e",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="0" y="330" width="800" height="120" fill="#161b22"/>
      <g transform="translate(210,150)">
        <rect x="-8" y="-70" width="16" height="92" rx="4" fill="#f0883e"/>
        <polygon points="-6,22 6,22 0,48" fill="#c9d1d9"/>
      </g>
      <g transform="translate(400,230)">
        <rect x="-110" y="-50" width="220" height="108" rx="8" fill="#f0e6cf" stroke="#161b22" stroke-width="4"/>
        <rect x="-110" y="-50" width="220" height="22" fill="#0033a0"/>
        <text x="-78" y="28" fill="#161b22" font-family="ui-monospace,monospace" font-size="34" font-weight="800">NY-PLATE</text>
      </g>
      <g transform="translate(560,318) rotate(-8)">
        <rect width="150" height="96" fill="#c4a574" stroke="#8b6914" stroke-width="2"/>
        <text x="18" y="28" fill="#3d2914" font-family="sans-serif" font-size="11" font-weight="700">NYS DMV</text>
        <text x="18" y="46" fill="#3d2914" font-family="sans-serif" font-size="10">PLATE SURRENDER</text>
      </g>
      <text x="200" y="56" fill="#58a6ff" font-family="sans-serif" font-size="18" font-weight="700">UNSCREW. WALK IT IN.</text>
    </svg>`,
    dialogue: [
      { spkr: "cole", text: "Before the flatbed even rolls, both plates come off with a screwdriver." },
      { spkr: "reyes", text: "Walked into a DMV counter by hand. The penalty clock on the license stops right there, not whenever the tow company files its paperwork." }
    ]
  },
  {
    id: 16,
    title: "16. The Intrusive Thought",
    indicator: "THE ESCAPIST FANTASY",
    indicatorColor: "#a371f7",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#2a0b12"/>
      <g fill="#120508">
        <polygon points="30,450 30,210 90,210 90,450"/>
        <polygon points="110,450 110,140 178,140 198,450"/>
        <polygon points="560,450 600,230 690,230 720,450"/>
      </g>
      <ellipse cx="620" cy="84" rx="64" ry="18" fill="#fff"/>
      <line x1="620" y1="102" x2="180" y2="430" stroke="#39d353" stroke-width="7"/>
      <g transform="translate(230,228)">
        <path d="M 0 108 L -22 46 Q 22 -28 118 -28 L 228 -16 Q 292 6 300 56 L 300 108 Z" fill="#2f353b" stroke="#000" stroke-width="3"/>
        <g transform="translate(168,8)">
          <ellipse cx="0" cy="28" rx="36" ry="16" fill="#009b3a"/>
          <rect x="-28" y="20" width="56" height="28" fill="#009b3a"/>
          <polygon points="-28,20 28,20 0,38" fill="#fed100"/>
          <circle cy="0" r="16" fill="#8d5524"/>
          <g fill="#2b1a10"><circle cx="-10" cy="-12" r="5"/><circle cx="-3" cy="-16" r="5"/><circle cx="5" cy="-16" r="5"/><circle cx="12" cy="-10" r="5"/></g>
        </g>
        <circle cx="52" cy="118" r="26" fill="#161b22" stroke="#111" stroke-width="6"/>
        <circle cx="236" cy="118" r="26" fill="#161b22" stroke="#111" stroke-width="6"/>
      </g>
      <text x="80" y="36" fill="#f0883e" font-family="sans-serif" font-size="20" font-weight="700">BEDLAM: TOTAL BANKING COLLAPSE</text>
    </svg>`,
    dialogue: [
      { spkr: "reyes", text: "And then, because he's human, his brain offers him the other option: total collapse. UAPs. The clearinghouses on fire." },
      { spkr: "cole", text: "Property law evaporates mid-sentence. In the fantasy, the friend's still grinning behind the wheel like the note never existed." }
    ]
  },
  {
    id: 17,
    title: "17. The Wasteland Loophole",
    indicator: "THE LOOPHOLE",
    indicatorColor: "#d29922",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="p17waste" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7c2d12"/><stop offset="100%" stop-color="#1c0a02"/></linearGradient></defs>
      <rect width="800" height="450" fill="url(#p17waste)"/>
      <circle cx="620" cy="128" r="78" fill="#ea580c" opacity=".55"/>
      <g fill="#291304"><polygon points="0,450 1200,450 1200,372 640,360 0,370"/></g>
      <g transform="translate(40,160)" opacity=".7">
        <rect x="20" y="40" width="7" height="210" fill="#44403c"/>
        <rect x="0" y="8" width="56" height="28" fill="#1c1917" transform="rotate(-18 20 20)"/>
      </g>
      <g transform="translate(200,220)">
        <path d="M 0 108 L -22 46 Q 22 -28 118 -28 L 228 -16 Q 292 6 300 56 L 300 108 Z" fill="#2f353b" stroke="#111" stroke-width="3"/>
        <g transform="translate(168,8)">
          <rect x="-28" y="20" width="56" height="28" fill="#009b3a"/>
          <polygon points="-28,20 28,20 0,38" fill="#fed100"/>
          <circle r="16" fill="#8d5524"/>
          <g fill="#2b1a10"><circle cx="-10" cy="-12" r="5"/><circle cx="0" cy="-16" r="5"/><circle cx="12" cy="-10" r="5"/></g>
        </g>
        <circle cx="52" cy="118" r="26" fill="#161b22" stroke="#44403c" stroke-width="6"/>
        <circle cx="236" cy="118" r="26" fill="#161b22" stroke="#44403c" stroke-width="6"/>
      </g>
      <text x="210" y="44" fill="#fcd34d" font-family="sans-serif" font-size="20" font-weight="700">STATUS: YOU KEPT THE METAL</text>
    </svg>`,
    dialogue: [
      { spkr: "cole", text: "Debt-free, but only because the ledger burned along with everything else." },
      { spkr: "reyes", text: "Rusted Flock pole on the shoulder. Dead camera. Full tank. That's the whole prize." }
    ]
  },
  {
    id: 18,
    title: "18. The Desk Off-Ramp",
    indicator: "BACK TO REALITY",
    indicatorColor: "#58a6ff",
    svg: `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0d1117"/>
      <rect x="0" y="370" width="800" height="80" fill="#161b22"/>
      <rect x="150" y="54" width="500" height="300" rx="8" fill="#161b22" stroke="#30363d" stroke-width="2"/>
      <rect x="150" y="54" width="500" height="44" fill="#0d1117"/>
      <text x="178" y="84" fill="#58a6ff" font-family="sans-serif" font-size="16" font-weight="700">ADMINISTRATIVE TOLL SETTLEMENT</text>
      <text x="178" y="142" fill="#8b949e" font-family="ui-monospace,monospace" font-size="12">OMBUDSMAN &#183; HARDSHIP DOCKET</text>
      <text x="178" y="186" fill="#f85149" font-family="ui-monospace,monospace" font-size="18">$14,000  ESCALATED PENALTIES</text>
      <line x1="178" y1="176" x2="520" y2="192" stroke="#f85149" stroke-width="2"/>
      <text x="178" y="236" fill="#3fb950" font-family="ui-monospace,monospace" font-size="20" font-weight="700">$2,000  BASE TOLL &#183; INSTALLMENTS</text>
      <text x="178" y="270" fill="#8b949e" font-family="sans-serif" font-size="12">Late fees were the machine. The principal was always smaller.</text>
      <rect x="178" y="292" width="200" height="36" rx="4" fill="#238636" stroke="#fff" stroke-width="2"/>
      <text x="204" y="316" fill="#fff" font-family="sans-serif" font-size="15" font-weight="700">ORDER ENTERED</text>
    </svg>`,
    dialogue: [
      { spkr: "reyes", text: "Back in the room with the lights on: an ombudsman, a hardship docket." },
      { spkr: "cole", text: "Turns out the fourteen thousand was mostly stacked hundred-dollar late fees riding on top of a two-thousand-dollar base toll." },
      { spkr: "reyes", text: "Squeeze the machine back down to the real number. Put it on a plan the desk will actually stamp." },
      { spkr: "cole", text: "No aliens required." }
    ]
  }
];

const HOSTS = {
  cole:  { name: "Cole",  role: "the numbers" },
  reyes: { name: "Reyes", role: "the read" }
};
