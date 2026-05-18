### Florida Short-Term Rental Legal & Strategy Dashboard
Here is the raw, functional web suite to catalog the legal standing for the Florida property, followed by the hard-hitting strategy your friend in Maryland needs to execute immediately.
#### 1. index.html (Entry Point)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Florida STR Legal Catalog</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="root"></div>
    <!-- Assuming React and Babel are loaded via CDN or bundler for the JSX -->
    <script src="app.js" type="text/babel"></script>
</body>
</html>

```
#### 2. styles.css (Pragmatic UI)
```css
:root {
    --bg-color: #0f172a;
    --card-bg: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --accent-red: #ef4444;
    --border-color: #334155;
}

body {
    background-color: var(--bg-color);
    color: var(--text-primary);
    font-family: system-ui, -apple-system, sans-serif;
    margin: 0;
    padding: 2rem;
    line-height: 1.5;
}

.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
}

.header {
    display: flex;
    align-items: center;
    gap: 1rem;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 1rem;
    margin-bottom: 2rem;
}

.law-card {
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}

.law-title {
    color: var(--accent-red);
    margin-top: 0;
    font-size: 1.25rem;
}

.law-meta {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-bottom: 1rem;
}

.svg-icon {
    width: 32px;
    height: 32px;
    fill: var(--accent-red);
}

```
#### 3. SecurityIcon.svg (Visual Asset)
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-icon">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
</svg>

```
#### 4. LegalDashboard.jsx (Logic and Rendering)
```jsx
const FL_LAWS = [
    {
        id: "FS_509_141",
        title: "Florida Statute 509.141: Ejection of Undesirable Guests",
        relevance: "Primary protocol for removing destructive guests.",
        details: "Operators of public lodging can eject guests for intoxication, brawling, destroying property, or disturbing the peace. Written or oral notice must be given stating: 'You are hereby notified that this establishment no longer desires to entertain you as its guest, and you are requested to leave at once.' Remaining after this notice is a second-degree misdemeanor. Police are required by statute to assist in removal."
    },
    {
        id: "FS_810_08",
        title: "Florida Statute 810.08: Trespass in Structure",
        relevance: "Secondary removal tactic.",
        details: "If a guest remains past the booking checkout time, they have no tenancy rights under FL Chapter 83. They are trespassers. Local sheriffs must be explicitly informed there is no lease and it is transient occupancy."
    },
    {
        id: "AIRCOVER_2026",
        title: "Airbnb AirCover 2026 Evidence Mandates",
        relevance: "Filing the $3M property damage claim.",
        details: "Airbnb updated terms in 2026. Claims must include 'Legitimate and Verifiable Evidence'. AI-generated or altered photos/videos are explicitly banned and will result in claim denial. Time-stamped, raw photographs, police reports, and contractor invoices are required."
    }
];

function LegalDashboard() {
    return (
        <div className="dashboard-container">
            <div className="header">
                <svg viewBox="0 0 24 24" className="svg-icon">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
                <h1>Florida Short-Term Rental Legal Matrix</h1>
            </div>
            
            {FL_LAWS.map(law => (
                <div key={law.id} className="law-card">
                    <h2 className="law-title">{law.title}</h2>
                    <div className="law-meta">Application: {law.relevance}</div>
                    <p>{law.details}</p>
                </div>
            ))}
        </div>
    );
}

// ReactDOM.render(<LegalDashboard />, document.getElementById('root'));

```
### Immediate Strategic Protocol for Your Friend
Your friend failed to vet the guests, and the Florida property paid the price. Operating an asset from Maryland without localized structural defenses is a liability. Here is the exact sequence of actions required to secure compensation and harden the property.
**Phase 1: Damage Control and Claims (Next 48 Hours)**
 1. **File the Police Report:** Do not skip this. Call the local non-emergency line for the Florida jurisdiction. State a crime occurred under FS 509.162 (Theft/Damage of property from an establishment). A police report forces Airbnb to take the claim seriously.
 2. **Raw Documentation:** Take unedited, time-stamped photographs and video of the removed fridge door and all peripheral damage. Under Airbnb's 2026 AirCover policies, any suspected AI enhancement or filtering will result in an immediate denial of the $3M Host Damage Protection claim.
 3. **Submit AirCover Claim:** Initiate the claim via the Resolution Center. Upload the raw photos, the police report number, and a line-item estimate from a licensed Florida contractor to replace the fridge and repair the wreck.
**Phase 2: Tactical Vetting Implementation (Pre-Next Booking)**
The "50+ age limit" is a legally defective strategy that violates familial status laws and fails HOPA requirements. You stop college parties by manipulating friction, not by arbitrarily checking IDs for gray hair.
 * **Age Floor:** Set the primary booker age limit to 25. This is legal, standard, and removes the core demographic responsible for fraternity-style destruction.
 * **Duration Friction:** Implement a 3-night minimum stay for weekends. One-night and two-night weekend rentals are the primary vector for party bookings.
 * **Hardware Surveillance:** Install decibel monitoring hardware (e.g., Minut). It measures noise levels, not audio content, making it legal in Florida. Disclose this in the listing. Those intending to throw a party will immediately navigate away when they read the house monitors decibels.
**Phase 3: Legal Hardening**
Require an external, signed rental agreement prior to providing the door code. The agreement must explicitly cite Florida Statute 509.141. It must state that any violation of noise ordinances or occupancy limits will result in immediate ejection without a refund, and that law enforcement will be dispatched.
**Tabular Summary of Florida STR Legal Mechanics**
Category	Statute/Rule	Application
Ejection	FS 509.141	Operator can order guests to leave for brawling/intoxication. Refusal is a 2nd-degree misdemeanor.
Trespassing	FS 810.08	Guests remaining past checkout have no tenant rights; treated as trespassers.
Claim Evidence	AirCover 2026	Raw, unedited photos only. Contractor invoices required.
Vetting	Age 25 Limit	Legal structural barrier to prevent underage/college liability.
Tezcatlikensho
