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

