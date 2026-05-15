import React from 'react';

const DisplacementTimeline = () => {
  const events = [
    {
      year: "1788",
      region: "Australia",
      title: "Doctrine of Terra Nullius",
      desc: "British legal doctrine decrees the continent 'nobody's land,' instantly erasing Aboriginal biological rights and communal presence via legal definition."
    },
    {
      year: "1793",
      region: "India",
      title: "Permanent Settlement Act",
      desc: "The British East India Company converts local tax collectors (zamindars) into absolute owners, legally reducing communal peasant farmers (ryots) to tenant sharecroppers."
    },
    {
      year: "1801",
      region: "England",
      title: "General Inclosure Act",
      desc: "Parliament standardizes the privatization of 'the commons', criminalizing customary peasant survival to optimize land for the commercial wool trade."
    },
    {
      year: "1858",
      region: "Levant",
      title: "Ottoman Land Code",
      desc: "Communal musha land requires tapu deeds to generate tax revenue for European debt, creating a system of Levantine absentee landlords and dispossessing the fellahin."
    },
    {
      year: "1870",
      region: "Indonesia",
      title: "Agrarian Law (Domeinverklaring)",
      desc: "Dutch colonial government legally classifies any un-deeded indigenous adat land as state domain, leasing it to European corporate plantations."
    },
    {
      year: "1887",
      region: "United States",
      title: "Dawes Act",
      desc: "Communal Native American reservations are forcibly broken into individual plots; millions of acres of 'surplus' land are liquidated to white settlers and railroads."
    },
    {
      year: "1902",
      region: "Philippines",
      title: "Land Registration Act",
      desc: "US Torrens title system enables educated, urban elites (hacienderos) to legally register and seize lands customarily farmed by peasant kasamas."
    },
    {
      year: "1913",
      region: "South Africa",
      title: "Natives Land Act",
      desc: "The Black majority is legally prohibited from owning or sharecropping land outside of 7% designated reserves, laying the systemic foundation for Apartheid."
    }
  ];

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <svg 
        viewBox="0 0 800 1100" 
        width="100%" 
        height="1100" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ maxWidth: '800px', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderRadius: '8px' }}
      >
        {/* Header */}
        <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#1f2937">
          Global Commodification: Legal Decrees vs. Biological Rights
        </text>
        <text x="400" y="75" textAnchor="middle" fontSize="14" fill="#6b7280">
          Mapping the structural timeline of imperial land privatization (1788–1913)
        </text>

        {/* Center Timeline Axis */}
        <line x1="150" y1="100" x2="150" y2="1020" stroke="#e5e7eb" strokeWidth="4" />

        {/* Timeline Events */}
        {events.map((event, index) => {
          const yPos = 140 + (index * 115);
          
          return (
            <g key={event.year}>
              {/* Year Label */}
              <text x="120" y={yPos + 5} textAnchor="end" fontSize="18" fontWeight="bold" fill="#374151">
                {event.year}
              </text>
              
              {/* Timeline Node */}
              <circle cx="150" cy={yPos - 1} r="6" fill="#2563eb" stroke="#ffffff" strokeWidth="3" />

              {/* Event Content via foreignObject for HTML wrapping */}
              <foreignObject x="180" y={yPos - 25} width="550" height="100">
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.4' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: '#111827', fontSize: '16px' }}>{event.title}</span>
                    <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                      {event.region}
                    </span>
                  </div>
                  <p style={{ margin: 0 }}>{event.desc}</p>
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Footer */}
        <text x="400" y="1070" textAnchor="middle" fontSize="12" fill="#9ca3af" fontStyle="italic">
          Analysis: The weaponization of abstract legal infrastructure to override localized agrarian survival.
        </text>
      </svg>
    </div>
  );
};

export default DisplacementTimeline;
