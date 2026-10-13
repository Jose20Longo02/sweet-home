/**
 * Berlin district landing pages — DE/EN path pairs and English page content (S6).
 * German long-form copy stays in the existing DE controllers/templates.
 * English pages use renderBerlinDistrictPageEn + properties-berlin-district-en.ejs.
 */
const BERLIN_DISTRICT_LANDINGS = [
  {
    key: 'charlottenburg',
    displayName: 'Charlottenburg',
    defaultNeighborhood: 'Charlottenburg',
    dePath: '/wohnung-kaufen-charlottenburg',
    enPath: '/en/properties-for-sale-charlottenburg',
    homeKeys: ['charlottenburgwilmersdorf'],
    heroImage: '/images/Charlottenburg.jpg',
    propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    propertiesParams: ['%charlottenburg%'],
    projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    projectsParams: ['%charlottenburg%'],
    titleEn: 'Apartments for sale in Charlottenburg',
    metaEn: 'Apartments for sale in Charlottenburg, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Charlottenburg',
      heroDescription: 'Charlottenburg is an Ortsteil of Charlottenburg-Wilmersdorf, not the whole borough. Buying here means choosing among Savignyplatz, the Kurfürstendamm, Lietzensee, and the streets around Schloss Charlottenburg. Wilmersdorf is a different residential area.',
      sectionTitleProperties: 'Apartments in Charlottenburg',
      sectionTitleProjects: 'New developments in and around Charlottenburg',
      sectionTitleWhy: 'Why buyers look at Charlottenburg',
      whyP1: 'Savignyplatz is on the Stadtbahn, with shops and Altbau on the side streets. The Kurfürstendamm is the shopping avenue, with the U1 and a different noise level from the residential blocks behind it. Bahnhof Zoologischer Garten sits at the eastern edge, where S-Bahn and U-Bahn meet. Most of the stock is older buildings, some modernised, some not.',
      whyP2: 'Lietzensee is the quieter residential side, away from the avenue. Schloss Charlottenburg and its park are the western anchor, with the U2 at Sophie-Charlotte-Platz. A flat facing the Ku\'damm and a flat on a courtyard toward Lietzensee can both be listed as Charlottenburg. The street decides the purchase.',
      whoTitle: 'Who Charlottenburg suits',
      whoP: 'Owner-occupiers who want an established west-Berlin address, the Stadtbahn or the U-Bahn, and Altbau rather than a scene Kiez. Buyers who will pay for that location and still read the building documents. Investors who tie the let to Savignyplatz, Zoo, or the U-Bahn, not to the borough name. It is a weaker fit for someone comparing it with an outer district on price alone.',
      sectionTitleMicro: 'Micro-locations to know in Charlottenburg',
      microAreas: [
        'Savignyplatz: Stadtbahn, shops, and Altbau on the side streets. The square and the next residential block are not the same flat.',
        'Kurfürstendamm and Zoo: the avenue, the U1, and Bahnhof Zoologischer Garten. Representative addresses, with traffic on the main road.',
        'Lietzensee: quieter housing around the lake, used by buyers who want Charlottenburg without living on the Ku\'damm.',
        'Schloss Charlottenburg: the palace park and the U2 at Sophie-Charlotte-Platz. Established streets, a different daily pattern from Savignyplatz.'
      ],
      sectionTitleFaq: 'FAQ: buying an apartment in Charlottenburg',
      faq: [
        { q: 'Is Charlottenburg the same as Charlottenburg-Wilmersdorf?', a: 'No. Charlottenburg-Wilmersdorf is the borough. This page is the Ortsteil Charlottenburg: Savignyplatz, the Kurfürstendamm, Lietzensee, and the palace area. Wilmersdorf is not this shortlist.' },
        { q: 'Who is an apartment in Charlottenburg best suited for?', a: 'Owner-occupiers who want west Berlin, rail, and Altbau, and investors who can name the station from the address. Buyers who only want the lowest entry price in Berlin are looking at a different borough.' },
        { q: 'Which parts do buyers compare?', a: 'Savignyplatz for the Stadtbahn, the Kurfürstendamm and Zoo for the avenue, Lietzensee for a quieter block, and Schloss Charlottenburg for the park and the U2. Inside each, the main road and the courtyard are separate checks.' },
        { q: 'How does Sweet Home help with a purchase in Charlottenburg?', a: 'We narrow the streets to your budget and how you will use the home, set the price against that street, check condition and the building documents, and stay through negotiation and the notary.' }
      ]
    }
  },
  {
    key: 'moabit',
    displayName: 'Moabit',
    defaultNeighborhood: 'Moabit',
    dePath: '/wohnung-kaufen-moabit',
    enPath: '/en/properties-for-sale-moabit',
    homeKeys: ['moabit'],
    heroImage: '/images/Moabit.jpg',
    propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    propertiesParams: ['%moabit%'],
    projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    projectsParams: ['%moabit%'],
    titleEn: 'Apartments for sale in Moabit',
    metaEn: 'Apartments for sale in Moabit, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Moabit',
      heroDescription: 'Moabit sits between Mitte, Tiergarten, and Berlin Hauptbahnhof. Established neighbourhoods, waterfront pockets, and ongoing quarter upgrades keep demand high for both living and investing.',
      sectionTitleProperties: 'Apartments in Moabit',
      sectionTitleProjects: 'New developments in Moabit',
      sectionTitleWhy: 'Why Moabit works for living and investment',
      whyP1: 'Central access and a mix of mature Kieze, canal-side streets, and regenerating blocks support strong demand from owner-occupiers and capital investors.',
      whyP2: 'Well-cut Altbau and modernised stock are especially sought after. Many micro-locations offer stable lettability with room for further upgrading.',
      sectionTitleMicro: 'In-demand micro-locations in Moabit',
      microAreas: [
        'Arminiusmarkthalle and Stephankiez — urban neighbourhood life with high housing demand.',
        'Near the Spree and the canal — attractive residential settings.',
        'Around Hauptbahnhof — strongly connected, popular with commuters and international buyers.',
        'Beusselkiez — established stock with further development potential.'
      ],
      sectionTitleFaq: 'FAQ: buying an apartment in Moabit',
      faq: [
        { q: 'Is Moabit still emerging or already established?', a: 'Both: demand is already strong in many pockets, while selected streets still have upside from local upgrading.' },
        { q: 'Who is Moabit best suited for?', a: 'Owner-occupiers who want a central address, and investors looking for lettability plus strong transport links.' },
        { q: 'How important is micro-location in Moabit?', a: 'Very. Quiet residential streets, waterfront blocks, and busier axes can sit only a few streets apart.' },
        { q: 'How does Sweet Home help with purchases in Moabit?', a: 'We shortlist suitable homes, explain price levels and micro-locations, negotiate, and support through completion.' }
      ]
    }
  },
  {
    key: 'friedrichshain-kreuzberg',
    displayName: 'Friedrichshain-Kreuzberg',
    defaultNeighborhood: 'Friedrichshain-Kreuzberg',
    dePath: '/wohnung-kaufen-friedrichshain-kreuzberg',
    enPath: '/en/properties-for-sale-friedrichshain-kreuzberg',
    homeKeys: ['friedrichshainkreuzberg'],
    heroImage: '/images/Friedrichshain-Kreuzberg.jpg',
    propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    propertiesParams: ['%friedrichshain%'],
    projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    projectsParams: ['%friedrichshain%'],
    titleEn: 'Apartments for sale in Friedrichshain-Kreuzberg',
    metaEn: 'Apartments for sale in Friedrichshain-Kreuzberg, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Friedrichshain-Kreuzberg',
      heroDescription: 'Friedrichshain-Kreuzberg is one of Berlin’s densest, most dynamic districts. Strong rental demand, urban energy, and sharp micro-location differences define the purchase market here.',
      sectionTitleProperties: 'Apartments in Friedrichshain-Kreuzberg',
      sectionTitleProjects: 'New developments in Friedrichshain-Kreuzberg',
      sectionTitleWhy: 'Why buyers look at Friedrichshain-Kreuzberg',
      whyP1: 'The district combines cultural pull, central access, and deep tenant demand. That supports both owner-occupation and long-term letting strategies.',
      whyP2: 'Prices and building quality vary street by street, so careful selection matters more here than in quieter outer districts.',
      sectionTitleMicro: 'In-demand micro-locations',
      microAreas: [
        'Boxhagener Platz — lively, highly requested residential pocket.',
        'Warschauer Straße corridor — strong connectivity and urban demand.',
        'Around Oberbaumbrücke — iconic riverfront setting.',
        'Quieter side streets off the main axes — better everyday living balance.'
      ],
      sectionTitleFaq: 'FAQ: Friedrichshain-Kreuzberg apartments',
      faq: [
        { q: 'Is this district mainly for investors?', a: 'No. Many owner-occupiers also buy here for lifestyle and location, while investors value deep rental demand.' },
        { q: 'What should buyers watch for?', a: 'Noise, building condition, WEG reserves, and whether the street matches the intended use.' },
        { q: 'Are prices uniform across the district?', a: 'No. Neighbouring blocks can trade at very different levels.' },
        { q: 'How does Sweet Home help here?', a: 'We filter for micro-location fit, stress-test pricing, and guide the transaction.' }
      ]
    }
  },
  {
    key: 'schoeneberg',
    displayName: 'Schöneberg',
    defaultNeighborhood: 'Schöneberg',
    dePath: '/wohnung-kaufen-schoeneberg',
    enPath: '/en/properties-for-sale-schoeneberg',
    homeKeys: ['schoneberg'],
    heroImage: '/images/Sch\u00f6neberg.webp',
    propertiesWhere: "(LOWER(COALESCE(p.neighborhood, '')) LIKE $1 OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2)",
    propertiesParams: ['%schöneberg%', '%schoeneberg%'],
    projectsWhere: "(LOWER(COALESCE(p.neighborhood, '')) LIKE $1 OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2)",
    projectsParams: ['%schöneberg%', '%schoeneberg%'],
    titleEn: 'Apartments for sale in Schöneberg',
    metaEn: 'Apartments for sale in Schöneberg, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Schöneberg',
      heroDescription: 'Schöneberg sits between central Berlin and calmer residential fabric. Good transport, mixed neighbourhoods, and less hype than the trendiest Kieze make it a practical buying district.',
      sectionTitleProperties: 'Apartments in Schöneberg',
      sectionTitleProjects: 'New developments in Schöneberg',
      sectionTitleWhy: 'Why Schöneberg appeals to buyers',
      whyP1: 'It offers everyday livability without giving up central access. Families and long-term owners often shortlist it for that balance.',
      whyP2: 'The stock ranges from classic Altbau to modernised buildings, so buyers can match budget and layout more easily than in tighter premium pockets.',
      sectionTitleMicro: 'Popular areas in Schöneberg',
      microAreas: [
        'Around Winterfeldtplatz — urban, well supplied, and lively.',
        'Bayerischer Platz — quieter residential character.',
        'Near Nollendorfplatz — strong transport and nightlife access.',
        'Southern Schöneberg streets — more space and calmer living.'
      ],
      sectionTitleFaq: 'FAQ: buying in Schöneberg',
      faq: [
        { q: 'Is Schöneberg good for families?', a: 'Often yes. Many pockets offer schools, parks, and a workable everyday rhythm.' },
        { q: 'Owner-occupier or investment?', a: 'Both work, depending on street and building. Demand is broad rather than niche.' },
        { q: 'How do prices compare with Mitte or Prenzlauer Berg?', a: 'Many streets still trade below the most expensive central districts while keeping good connectivity.' },
        { q: 'How does Sweet Home support buyers?', a: 'With shortlists, pricing context, negotiations, and process support through notarisation.' }
      ]
    }
  },
  {
    key: 'prenzlauer-berg',
    displayName: 'Prenzlauer Berg',
    defaultNeighborhood: 'Prenzlauer Berg',
    dePath: '/wohnung-kaufen-prenzlauer-berg',
    enPath: '/en/properties-for-sale-prenzlauer-berg',
    homeKeys: ['prenzlauerberg'],
    heroImage: '/images/Prenzlauer Berg.jpg',
    propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    propertiesParams: ['%prenzlauer berg%'],
    projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    projectsParams: ['%prenzlauer berg%'],
    titleEn: 'Apartments for sale in Prenzlauer Berg',
    metaEn: 'Apartments for sale in Prenzlauer Berg, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Prenzlauer Berg',
      heroDescription: 'Prenzlauer Berg is an Ortsteil of Pankow, not the whole borough. Buying an apartment here means comparing Kieze inside that Ortsteil. Kollwitzplatz, Helmholtzplatz, the Winsviertel, and the Bötzowviertel are not the same street, even when the listing only says Prenzlauer Berg.',
      sectionTitleProperties: 'Apartments in Prenzlauer Berg',
      sectionTitleProjects: 'New developments in Prenzlauer Berg',
      sectionTitleWhy: 'Why Prenzlauer Berg stays in demand',
      whyP1: 'The U2 runs through Senefelderplatz, Eberswalder Straße, and Schönhauser Allee. At Schönhauser Allee the Ringbahn meets the U2. Mauerpark sits on the western edge. Most of the housing is late-19th-century Altbau with courtyards, not one new quarter. Kollwitzplatz and Helmholtzplatz are the dense cores, with shops on the square and quieter side streets a block away.',
      whyP2: 'The borough of Pankow has its own page. This page is the Ortsteil south of the Ring. A flat off Kollwitzplatz and a flat on the main road at Schönhauser Allee can share the name Prenzlauer Berg and still be different purchases: noise, the courtyard, and how far the U2 entrance actually is. The Winsviertel and the Bötzowviertel are the calmer residential grids.',
      whoTitle: 'Who Prenzlauer Berg suits',
      whoP: 'Owner-occupiers who want Altbau, daily shops, and a short ride toward Mitte or Friedrichshain. Families who use the parks and the quieter grids in the Winsviertel or Bötzowviertel. Investors who tie lettability to the U2 and the Ringbahn, and who compare the street with the rent, not a Prenzlauer Berg average. It is a weaker fit for a buyer whose plan is an outer borough or a new-build quarter.',
      sectionTitleMicro: 'In-demand micro-locations in Prenzlauer Berg',
      microAreas: [
        'Kollwitzplatz: the residential core south of the U2. Altbau, daily shops, and a clear difference between the square and the next side street.',
        'Helmholtzplatz: lively, with cafés on the square and housing on the streets behind it. Check the actual street, not only the Kiez name.',
        'Winsviertel and Bötzowviertel: established Altbau grids, usually calmer than the squares. Families often shortlist these before the busiest corners.',
        'Mauerpark edge and Schönhauser Allee: park access on one side, the U2 and the Ringbahn on the other. Main-road noise and a quiet courtyard can sit in the same block.'
      ],
      sectionTitleFaq: 'FAQ: Prenzlauer Berg apartments',
      faq: [
        { q: 'Is Prenzlauer Berg the same as Pankow?', a: 'No. Pankow is the borough. Prenzlauer Berg is the central Ortsteil inside it. Wedding is not here, and neither is the rest of Pankow. This page lists homes in Prenzlauer Berg.' },
        { q: 'Who is an apartment in Prenzlauer Berg best suited for?', a: 'Owner-occupiers and families who want Altbau and a short trip toward the centre. Investors fit where the U2 or the Ringbahn and the street support a long let. A new-build search belongs on a different shortlist.' },
        { q: 'Which parts do buyers compare?', a: 'Kollwitzplatz and Helmholtzplatz for the squares, the Winsviertel and Bötzowviertel for quieter grids, and the Mauerpark edge against Schönhauser Allee for park and rail. Inside each pocket, the side street and the main road are separate decisions.' },
        { q: 'How does Sweet Home help with a purchase in Prenzlauer Berg?', a: 'We narrow the Kiez to your budget and how you will use the home, set the price against the street, check condition and the building documents, and stay through negotiation and the notary.' }
      ]
    }
  },
  {
    key: 'wedding',
    displayName: 'Wedding',
    defaultNeighborhood: 'Wedding',
    dePath: '/wohnung-kaufen-wedding',
    enPath: '/en/properties-for-sale-wedding',
    homeKeys: ['weddinggesundbrunnen'],
    heroImage: '/images/Wedding.jpg',
    propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    propertiesParams: ['%wedding%'],
    projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    projectsParams: ['%wedding%'],
    titleEn: 'Apartments for sale in Wedding',
    metaEn: 'Apartments for sale in Wedding, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Wedding',
      heroDescription: 'Wedding offers a more accessible entry into central-north Berlin. Good transport, mixed neighbourhoods, and improving pockets attract both first-time buyers and yield-focused investors.',
      sectionTitleProperties: 'Apartments in Wedding',
      sectionTitleProjects: 'New developments in Wedding',
      sectionTitleWhy: 'Why Wedding is on more shortlists',
      whyP1: 'Relative to prime central districts, entry prices can still be more approachable while connectivity remains strong.',
      whyP2: 'Micro-location quality varies widely, so buyers who select carefully can find durable living or letting setups.',
      sectionTitleMicro: 'Areas buyers compare in Wedding',
      microAreas: [
        'Around Leopoldplatz — practical urban living with good amenities.',
        'Near Gesundbrunnen — excellent transport links.',
        'Quiet residential streets off the main roads — better everyday balance.',
        'Pockets closer to Mitte — stronger long-term demand.'
      ],
      sectionTitleFaq: 'FAQ: buying in Wedding',
      faq: [
        { q: 'Is Wedding mainly an investment district?', a: 'It can be, but owner-occupiers also buy where streets feel settled and well connected.' },
        { q: 'What drives value differences?', a: 'Distance to transport, street character, and building condition.' },
        { q: 'Are there upgrading opportunities?', a: 'Yes, in selected blocks — but only with realistic renovation and rent assumptions.' },
        { q: 'How does Sweet Home help?', a: 'We compare streets, check numbers, and manage the purchase process.' }
      ]
    }
  },
  {
    key: 'tempelhof',
    displayName: 'Tempelhof',
    defaultNeighborhood: 'Tempelhof',
    dePath: '/wohnung-kaufen-tempelhof',
    enPath: '/en/properties-for-sale-tempelhof',
    homeKeys: ['tempelhof'],
    heroImage: '/images/Tempelhof.jpg',
    propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    propertiesParams: ['%tempelhof%'],
    projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    projectsParams: ['%tempelhof%'],
    titleEn: 'Apartments for sale in Tempelhof',
    metaEn: 'Apartments for sale in Tempelhof, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Tempelhof',
      heroDescription: 'Tempelhof is known for space, family-oriented living, and the open landscape of Tempelhofer Feld. Buyers often come here for everyday quality rather than nightlife.',
      sectionTitleProperties: 'Apartments in Tempelhof',
      sectionTitleProjects: 'New developments in Tempelhof',
      sectionTitleWhy: 'Why Tempelhof works for long-term buyers',
      whyP1: 'Many streets offer quieter living with good parks and infrastructure, which supports stable owner-occupier demand.',
      whyP2: 'Compared with denser inner districts, layouts and outdoor access can feel more generous — useful for families and longer holds.',
      sectionTitleMicro: 'Areas to know in Tempelhof',
      microAreas: [
        'Near Tempelhofer Feld — lifestyle premium from open space.',
        'Around Tempelhof town hall — practical amenities and transport.',
        'Quieter residential streets — stronger everyday living fit.',
        'Edges toward Schöneberg or Neukölln — different price and vibe mixes.'
      ],
      sectionTitleFaq: 'FAQ: Tempelhof apartments',
      faq: [
        { q: 'Is Tempelhof good for families?', a: 'Often yes, especially where parks, schools, and quieter streets line up.' },
        { q: 'Does proximity to the Feld matter?', a: 'Yes. It can lift livability and demand in nearby residential streets.' },
        { q: 'Owner-occupier or investor focus?', a: 'Both appear, with a strong long-term living component.' },
        { q: 'How does Sweet Home help?', a: 'We match streets to your use case and guide pricing and closing.' }
      ]
    }
  },
  {
    key: 'neukoelln',
    displayName: 'Neukölln',
    defaultNeighborhood: 'Neukölln',
    dePath: '/wohnung-kaufen-neukoelln',
    enPath: '/en/properties-for-sale-neukoelln',
    homeKeys: ['neukolln'],
    heroImage: '/images/Neuk\u00f6lln.jpg',
    propertiesWhere: "(LOWER(COALESCE(p.neighborhood, '')) LIKE $1 OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2)",
    propertiesParams: ['%neukölln%', '%neukolln%'],
    projectsWhere: "(LOWER(COALESCE(p.neighborhood, '')) LIKE $1 OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2)",
    projectsParams: ['%neukölln%', '%neukolln%'],
    titleEn: 'Apartments for sale in Neukölln',
    metaEn: 'Apartments for sale in Neukölln, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Neukölln',
      heroDescription: 'Neukölln is a borough of five localities: Neukölln, Britz, Buckow, Rudow, and Gropiusstadt. The district office lists them that way. A flat in the Reuterkiez and a flat in Rudow share the borough name and are not the same purchase.',
      sectionTitleProperties: 'Apartments in Neukölln',
      sectionTitleProjects: 'New developments in Neukölln',
      sectionTitleWhy: 'Why buyers compare localities inside Neukölln',
      whyP1: 'Northern Neukölln is the dense Ortsteil: Reuterkiez, Schillerkiez by Tempelhofer Feld, and Rixdorf around the Böhmisches Dorf. The U7 and U8, and the Ringbahn at Hermannstraße and Neukölln station, are the usual rail checks. Karl-Marx-Straße is the main shopping road. A side street off it is a different flat from one on the road itself.',
      whyP2: 'Britz sits south of that core, with the park and a quieter residential pattern. Buckow, Rudow, and Gropiusstadt are the southern localities. More distance to Kreuzberg, a different building stock, and a different daily trip. The first step is the locality on the expose, not the borough average.',
      whoTitle: 'Who Neukölln suits',
      whoP: 'Owner-occupiers who want the northern Kieze and will accept a lively street. Buyers who want the park and a calmer block, and who then look at Schillerkiez or Britz rather than the Reuterkiez. Investors who tie the let to the U7, the U8, or the Ringbahn and to the rent on that street. It is a weak fit if the shortlist treats Rudow and the Reuterkiez as one market.',
      sectionTitleMicro: 'Micro-locations to know in Neukölln',
      microAreas: [
        'Reuterkiez: northern Neukölln, dense and lively. Check the street against Sonnenallee and the canal, not only the Kiez name.',
        'Schillerkiez: next to Tempelhofer Feld. The park is the draw. The blocks facing busy roads are not the blocks behind them.',
        'Rixdorf and the Böhmisches Dorf: older Altbau in the Ortsteil Neukölln, with its own street pattern south of Karl-Marx-Straße.',
        'Britz, Buckow, Rudow, and Gropiusstadt: the other four localities in the borough. Name the one on the expose before comparing it with northern Neukölln.'
      ],
      sectionTitleFaq: 'FAQ: buying in Neukölln',
      faq: [
        { q: 'Is Neukölln one apartment market?', a: 'No. The borough has five localities: Neukölln, Britz, Buckow, Rudow, and Gropiusstadt. Northern Neukölln is what most buyers mean. The south is a separate decision.' },
        { q: 'Who is an apartment in Neukölln best suited for?', a: 'Owner-occupiers who have picked a locality, and investors who can point to the U7, the U8, or the Ringbahn from that address. A purchase that only says Neukölln, without the Ortsteil, is not ready to price.' },
        { q: 'Which parts do buyers compare first?', a: 'Reuterkiez and Schillerkiez in the north, Rixdorf for older stock, Britz when the park and a quieter block matter. Buckow, Rudow, and Gropiusstadt belong on the list only when the expose is actually there.' },
        { q: 'How does Sweet Home help with a purchase in Neukölln?', a: 'We name the locality first, set the price against the street, check condition and the building documents, and stay through negotiation and the notary.' }
      ]
    }
  },
  {
    key: 'reinickendorf',
    displayName: 'Reinickendorf',
    defaultNeighborhood: 'Reinickendorf',
    dePath: '/wohnung-kaufen-reinickendorf',
    enPath: '/en/properties-for-sale-reinickendorf',
    homeKeys: ['reinickendorf'],
    heroImage: '/images/reinickendorf.webp',
    propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    propertiesParams: ['%reinickendorf%'],
    projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    projectsParams: ['%reinickendorf%'],
    titleEn: 'Apartments for sale in Reinickendorf',
    metaEn: 'Apartments for sale in Reinickendorf, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Reinickendorf',
      heroDescription: 'Reinickendorf is north Berlin: Lake Tegel, the Tegeler Forst, and localities from Tegel and Heiligensee to Hermsdorf, Frohnau, and Wittenau. Buying an apartment here means buying space and quiet — and naming the locality, not just the borough.',
      sectionTitleProperties: 'Apartments in Reinickendorf',
      sectionTitleProjects: 'New developments in Reinickendorf',
      sectionTitleWhy: 'Why buyers look at Reinickendorf',
      whyP1: 'Tegel combines the lake, a local centre, and the reuse of the former airport. Berlin TXL is being built on that site; it will change the surroundings over years, and it does not replace a check of the individual street. Hermsdorf, Frohnau, and Waidmannslust are established residential areas with a slower rhythm than the inner city.',
      whyP2: 'Heiligensee and Konradshöhe are about the water and everyday calm, not a short ride to Mitte. Wittenau and Reinickendorf-Ost are more urban and sit closer to the S-Bahn and U-Bahn. Märkisches Viertel is a large housing estate with its own mix of stock, refurbishment, and demand. Prices and buyer types differ more than a borough map suggests.',
      whoTitle: 'Who Reinickendorf suits',
      whoP: 'Families and owner-occupiers who want greenery, water, or an established neighbourhood, and who do not need Mitte as a daily base. Buyers with a longer hold in stable pockets such as Hermsdorf or Frohnau. It is a weaker fit for someone whose plan is a scene district or the shortest trip to Kreuzberg. Lettings depend on the locality and the rail line, not on the name Reinickendorf.',
      sectionTitleMicro: 'Micro-locations buyers compare in Reinickendorf',
      microAreas: [
        'Tegel and Alt-Tegel — lake, local centre, and the former airport surroundings. Berlin TXL will reshape the area over years; the street is still the purchase decision.',
        'Hermsdorf, Frohnau, and Waidmannslust — established residential streets, more family living and longer holds than nightlife. Quiet blocks and busier roads sit close together.',
        'Heiligensee and Konradshöhe — waterside and quiet. Price follows the water and the seclusion, not proximity to the city centre.',
        'Wittenau, Reinickendorf-Ost, and Märkisches Viertel — more urban, better connected, a different stock. Compare refurbishment, service charges, and the exact block.'
      ],
      sectionTitleFaq: 'FAQ: buying an apartment in Reinickendorf',
      faq: [
        { q: 'Who is an apartment in Reinickendorf best suited for?', a: 'Owner-occupiers and families who value space, greenery, or water over a short trip to Mitte. Investors fit better in well-connected parts of Tegel, Wittenau, or Reinickendorf-Ost than in remote waterside streets with a narrower tenant pool.' },
        { q: 'How does Reinickendorf differ from central boroughs?', a: 'Entry prices often sit below Charlottenburg or Mitte, daily life is quieter, and the commute is longer. Inside the borough the range is wide: Frohnau is not Märkisches Viertel, and a street on Lake Tegel is not Wittenau.' },
        { q: 'Which localities do buyers compare most often?', a: 'Tegel for the lake and the airport reuse, Hermsdorf and Frohnau as established residential areas, Waidmannslust as a quieter in-between, Wittenau and Reinickendorf-Ost for the rail links. Heiligensee comes in when water and quiet are the criteria.' },
        { q: 'How does Sweet Home help with a purchase in Reinickendorf?', a: 'We narrow the locality to your budget and how you will use the home, set the price against the street, check condition, service charges, and documents, and stay through negotiation and the notary.' }
      ]
    }
  },
  {
    key: 'kreuzberg',
    displayName: 'Kreuzberg',
    defaultNeighborhood: 'Kreuzberg',
    dePath: '/wohnung-kaufen-kreuzberg',
    enPath: '/en/properties-for-sale-kreuzberg',
    homeKeys: ['kreuzberg'],
    heroImage: '/images/kreuzberg.jpg',
    propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    propertiesParams: ['%kreuzberg%'],
    projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    projectsParams: ['%kreuzberg%'],
    titleEn: 'Apartments for sale in Kreuzberg',
    metaEn: 'Apartments for sale in Kreuzberg, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Kreuzberg',
      heroDescription: 'Kreuzberg is denser, more local, and often different street by street from neighbouring Friedrichshain. Buyers come for urban character and lasting demand.',
      sectionTitleProperties: 'Apartments in Kreuzberg',
      sectionTitleProjects: 'New developments in Kreuzberg',
      sectionTitleWhy: 'Why Kreuzberg stays on buyer shortlists',
      whyP1: 'Strong identity, central access, and deep housing demand support both living and letting strategies.',
      whyP2: 'Noise, scene, and building condition can change quickly between blocks, so street-level checks matter.',
      sectionTitleMicro: 'Areas buyers compare in Kreuzberg',
      microAreas: [
        'Bergmannkiez — established, highly requested residential pocket.',
        'Around Görlitzer Park — lively urban setting.',
        'Near Landwehrkanal — greener everyday living.',
        'Side streets off major axes — better balance of character and calm.'
      ],
      sectionTitleFaq: 'FAQ: buying in Kreuzberg',
      faq: [
        { q: 'Is Kreuzberg only for lifestyle buyers?', a: 'No. Investors also buy where rents and location quality hold up.' },
        { q: 'What due diligence is most important?', a: 'Noise exposure, WEG health, energy status, and realistic comparable prices.' },
        { q: 'How does it differ from Friedrichshain?', a: 'Often denser and more locally varied — the right street matters even more.' },
        { q: 'How does Sweet Home help?', a: 'We filter streets carefully and manage pricing and process.' }
      ]
    }
  },
  {
    key: 'spandau',
    displayName: 'Spandau',
    defaultNeighborhood: 'Spandau',
    dePath: '/wohnung-kaufen-spandau',
    enPath: '/en/properties-for-sale-spandau',
    homeKeys: ['spandau'],
    heroImage: '/images/spandau.jpeg',
    propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    propertiesParams: ['%spandau%'],
    projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    projectsParams: ['%spandau%'],
    titleEn: 'Apartments for sale in Spandau',
    metaEn: 'Apartments for sale in Spandau, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Spandau',
      heroDescription: 'Spandau is west Berlin, between the Havel and the Spree. Buying an apartment here means comparing localities, not a single borough: the old town, Wilhelmstadt, Haselhorst, Siemensstadt, Kladow, and Gatow differ in transport, building stock, and price.',
      sectionTitleProperties: 'Apartments in Spandau',
      sectionTitleProjects: 'New developments in Spandau',
      sectionTitleWhy: 'Why buyers consider Spandau',
      whyP1: 'The old town has the citadel, everyday shops, and Spandau station, with S-Bahn, regional trains, and the U7. Wilhelmstadt sits to the south, established housing between the old town and the Havel. Haselhorst and Siemensstadt lie closer to the Spree and have more new build; Siemensstadt’s industrial past and newer quarter development make it a different market from the old town.',
      whyP2: 'Kladow and Gatow are greener and quieter. The trip into the inner city is longer, and the reason to buy is the living quality on the spot. Streets on the Havel price differently from stock set back from the water. The purchase turns on the street and the condition of the building, not the borough sign.',
      whoTitle: 'Who Spandau suits',
      whoP: 'Owner-occupiers who want more space or a quieter setting and will accept a longer trip to Mitte or Charlottenburg. Families for whom greenery, schools, and daily life in the locality matter more than a scene neighbourhood. Investors comparing entry prices below the central boroughs, and tying lettability to the U7, the S-Bahn, and the specific street — not to the name Spandau.',
      sectionTitleMicro: 'Micro-locations to know in Spandau',
      microAreas: [
        'Spandau old town — station, shops, and the citadel nearby. The usual shortlist for buyers who want daily life and a rail connection in one place.',
        'Wilhelmstadt — established housing between the old town and the Havel. More owner-occupation than nightlife, with real differences from one street to the next.',
        'Haselhorst and Siemensstadt — more new build and a different neighbourhood from the old town. Transport and how far the quarter has actually been built out both matter.',
        'Kladow and Gatow — green, quiet, in places on the water. Price follows the water and the calm, not proximity to the city centre.'
      ],
      sectionTitleFaq: 'FAQ: buying an apartment in Spandau',
      faq: [
        { q: 'Is Spandau too far from central Berlin?', a: 'It depends on the locality. The old town and Wilhelmstadt are on the S-Bahn, regional trains, and the U7. Kladow and Gatow are the quieter, longer option on purpose. Anyone commuting to Mitte every day should check that specific connection before comparing the price with Charlottenburg.' },
        { q: 'Owner-occupier or investment?', a: 'Owner-occupiers often buy space and quiet here. Investors look at lettability along the rail lines and at the condition of the stock. A tenanted flat with rent below the local level is a different deal from an empty flat in Kladow — that belongs in the calculation, not a borough average.' },
        { q: 'Which parts of Spandau do buyers compare?', a: 'The old town for the station and shops, Wilhelmstadt as a residential area, Haselhorst and Siemensstadt for new build, Kladow and Gatow for greenery and water. Inside each locality, quiet residential streets and busier roads sit side by side.' },
        { q: 'How does Sweet Home help with a purchase in Spandau?', a: 'We narrow the localities to your budget and how you will use the home, set the price against the street, check condition and documents, and stay through negotiation and the notary.' }
      ]
    }
  },
  {
    key: 'mitte',
    displayName: 'Mitte',
    defaultNeighborhood: 'Mitte',
    dePath: '/wohnung-kaufen-berlin-mitte',
    enPath: '/en/properties-for-sale-mitte',
    homeKeys: ['mitte', 'berlin-mitte'],
    heroImage: '/images/berlin-hero.jpg',
    propertiesWhere: "(LOWER(COALESCE(p.neighborhood, '')) LIKE $1 OR LOWER(COALESCE(p.neighborhood, '')) = $2 OR LOWER(COALESCE(p.neighborhood, '')) LIKE $3)",
    propertiesParams: ['%mitte%', 'mitte', '%berlin-mitte%'],
    projectsWhere: "(LOWER(COALESCE(p.neighborhood, '')) LIKE $1 OR LOWER(COALESCE(p.neighborhood, '')) = $2 OR LOWER(COALESCE(p.neighborhood, '')) LIKE $3)",
    projectsParams: ['%mitte%', 'mitte', '%berlin-mitte%'],
    titleEn: 'Apartments for sale in Berlin Mitte',
    metaEn: 'Apartments for sale in Berlin Mitte: compare central listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Berlin Mitte',
      heroDescription: 'This page is the central Ortsteil Mitte, not the whole borough. Moabit, Wedding, and Tiergarten have their own markets. Inside this Ortsteil, Hackescher Markt, the government quarter, Alexanderplatz, and the streets by Museum Island are different purchases.',
      sectionTitleProperties: 'Apartments in Berlin-Mitte',
      sectionTitleProjects: 'New developments in Berlin-Mitte',
      sectionTitleWhy: 'Why buyers look at central Mitte',
      whyP1: 'Hackescher Markt is on the S-Bahn, next to the Scheunenviertel. Alexanderplatz brings together the U2, U5, U8, and the S-Bahn. Friedrichstraße adds the U6. The government quarter and the Spreebogen sit toward Hauptbahnhof, with the U5. Museum Island and Oranienburger Straße are the older representative streets between those hubs.',
      whyP2: 'Entry prices here usually sit above many other Berlin districts, because the location is what the buyer is paying for. That does not make every building the same. A courtyard off a side street and a flat on a tourist route can share the label Mitte. The energy certificate, the reserves, and the street still decide the file.',
      whoTitle: 'Who central Mitte suits',
      whoP: 'Owner-occupiers who want to live in the centre and will compare Hackescher Markt with Alexanderplatz before they compare Mitte with another borough. Investors who tie the let to those stations and to international tenant demand, and who still read the building file. It is a weak fit for a buyer who meant Moabit, Wedding, or a quieter Ortsteil and searched only for the borough name.',
      sectionTitleMicro: 'Micro-locations to know in Mitte',
      microAreas: [
        'Hackescher Markt and the Scheunenviertel: S-Bahn and dense Altbau. Side streets and the busiest corners are not the same flat.',
        'Government quarter and Spreebogen: central addresses toward Hauptbahnhof and the U5. Infrastructure first, not a Kiez square.',
        'Alexanderplatz: U2, U5, U8, and S-Bahn. Mixed stock and heavy footfall. The block you buy matters more than the station name.',
        'Oranienburger Straße and Museum Island: representative older buildings between the hubs. Check renovation, reserves, and whether the street is a through-route.'
      ],
      sectionTitleFaq: 'FAQ: buying in Berlin-Mitte',
      faq: [
        { q: 'Does this page include all of borough Mitte?', a: 'No. Borough Mitte also includes Moabit, Wedding, Tiergarten, and Gesundbrunnen. Those are separate shortlists. This page is the central Ortsteil.' },
        { q: 'Who is an apartment in Mitte best suited for?', a: 'Owner-occupiers who want the centre, and investors who can name the station and still accept a higher entry price. Buyers looking for a quieter residential grid usually compare another district.' },
        { q: 'Which parts do buyers compare?', a: 'Hackescher Markt and the Scheunenviertel, the government quarter, Alexanderplatz, and the streets by Museum Island. Inside each, a courtyard and a main tourist street are different files.' },
        { q: 'How does Sweet Home help with a purchase in Mitte?', a: 'We keep the search on this Ortsteil, set the price against the street, check condition, reserves, and the purchase costs, and stay through negotiation and the land-register entry.' }
      ]
    }
  },
  {
    key: 'pankow',
    displayName: 'Pankow',
    defaultNeighborhood: 'Pankow',
    dePath: '/wohnung-kaufen-pankow',
    enPath: '/en/properties-for-sale-pankow',
    homeKeys: ['pankow'],
    heroImage: '/images/berlin-hero.jpg',
    propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    propertiesParams: ['%pankow%'],
    projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
    projectsParams: ['%pankow%'],
    titleEn: 'Apartments for sale in Pankow',
    metaEn: 'Apartments for sale in Pankow, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Pankow',
      heroDescription: 'Pankow combines residential calm with strong family demand and access toward Prenzlauer Berg and the north-east. Buyers often shortlist it for livability and longer holds.',
      sectionTitleProperties: 'Apartments in Pankow',
      sectionTitleProjects: 'New developments in Pankow',
      sectionTitleWhy: 'Why Pankow interests buyers',
      whyP1: 'Greener streets, established neighbourhoods, and family infrastructure make Pankow a durable living market.',
      whyP2: 'Depending on the pocket, buyers find a mix of Altbau, modernised stock, and selected new builds with more breathing room than denser central districts.',
      sectionTitleMicro: 'Areas buyers compare in Pankow',
      microAreas: [
        'Around Pankow centre — practical amenities and transport.',
        'Edges toward Prenzlauer Berg — stronger central demand spillover.',
        'Quieter residential streets — family-oriented everyday living.',
        'Well-connected northern pockets — more space at varying price levels.'
      ],
      sectionTitleFaq: 'FAQ: buying in Pankow',
      faq: [
        { q: 'Is Pankow mainly for families?', a: 'Families are a major group, but investors also buy where demand and building quality are solid.' },
        { q: 'How does it compare with Prenzlauer Berg?', a: 'Often more spacious and sometimes more accessible on price, with a calmer everyday feel.' },
        { q: 'What should buyers check first?', a: 'Commute fit, street character, and whether the building matches a long-term hold.' },
        { q: 'How does Sweet Home help?', a: 'We compare locations, shortlist realistic options, and support the purchase through completion.' }
      ]
    }
  }
];

const BY_KEY = Object.fromEntries(BERLIN_DISTRICT_LANDINGS.map((d) => [d.key, d]));
const BY_DE_PATH = Object.fromEntries(BERLIN_DISTRICT_LANDINGS.map((d) => [d.dePath, d]));
const BY_EN_PATH = Object.fromEntries(BERLIN_DISTRICT_LANDINGS.map((d) => [d.enPath, d]));

function getDistrictLanding(key) {
  return BY_KEY[key] || null;
}

function getDistrictEnPathForDePath(dePath) {
  const row = BY_DE_PATH[dePath];
  return row ? row.enPath : '/en/properties-for-sale-berlin';
}

function getDistrictDePathForEnPath(enPath) {
  const row = BY_EN_PATH[enPath];
  return row ? row.dePath : '/wohnungen-berlin-kaufen';
}

function buildDistrictAlternateMap() {
  const map = {};
  BERLIN_DISTRICT_LANDINGS.forEach((d) => {
    const pair = { de: d.dePath, en: d.enPath };
    map[d.dePath] = pair;
    map[`/de${d.dePath}`] = pair;
    map[d.enPath] = pair;
  });
  return map;
}

function buildHomeDistrictPaths(lang) {
  const out = {};
  BERLIN_DISTRICT_LANDINGS.forEach((d) => {
    const path = lang === 'en' ? d.enPath : d.dePath;
    (d.homeKeys || []).forEach((k) => {
      out[k] = path;
    });
  });
  return out;
}

module.exports = {
  BERLIN_DISTRICT_LANDINGS,
  getDistrictLanding,
  getDistrictEnPathForDePath,
  getDistrictDePathForEnPath,
  buildDistrictAlternateMap,
  buildHomeDistrictPaths
};
