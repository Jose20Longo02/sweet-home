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
      heroDescription: 'Charlottenburg is one of Berlin’s most sought-after residential areas. Classic Altbau, careful modernisations, and strong micro-locations meet steady demand from owner-occupiers and investors.',
      sectionTitleProperties: 'Apartments in Charlottenburg',
      sectionTitleProjects: 'New developments in and around Charlottenburg',
      sectionTitleWhy: 'Why Charlottenburg attracts property buyers',
      whyP1: 'Charlottenburg combines urban quality of life, excellent infrastructure, and long-term location stability. Representative streets, nearby recreation, and strong transport links make it work for very different buyer profiles.',
      whyP2: 'Investors get solid lettability; owner-occupiers get established neighbourhoods and short everyday distances. Central micro-locations in particular have shown resilient long-term value.',
      sectionTitleMicro: 'Popular micro-locations in Charlottenburg',
      microAreas: [
        'Savignyplatz and surroundings — urban, lively, and architecturally in demand.',
        'Lietzensee — a quieter, high-quality residential setting.',
        'Near Kurfürstendamm — representative addresses with international demand.',
        'Around Schloss Charlottenburg — characterful stock with steady buyer interest.'
      ],
      sectionTitleFaq: 'FAQ: buying an apartment in Charlottenburg',
      faq: [
        { q: 'Is Charlottenburg better for owner-occupiers or investors?', a: 'Both. Owner-occupiers value location quality and infrastructure; investors value stable demand, lettability, and location resilience.' },
        { q: 'Which apartment types are most in demand?', a: 'Modernised Altbau, well-cut 2- to 4-room units, and high-quality new builds in central micro-locations.' },
        { q: 'How does Charlottenburg differ from other Berlin districts?', a: 'It combines prestige, established neighbourhoods, strong infrastructure, and lasting purchase demand more consistently than most districts.' },
        { q: 'How does Sweet Home help with a purchase in Charlottenburg?', a: 'We support the full process: shortlist, market context, viewings, negotiation, and closing support.' }
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
    heroImage: '/images/Schöneberg.webp',
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
      heroDescription: 'Prenzlauer Berg is one of Berlin’s most desired residential addresses. Historic Altbau, family-friendly Kieze, and strong central demand shape the market.',
      sectionTitleProperties: 'Apartments in Prenzlauer Berg',
      sectionTitleProjects: 'New developments in Prenzlauer Berg',
      sectionTitleWhy: 'Why Prenzlauer Berg stays in demand',
      whyP1: 'Strong neighbourhood identity, high livability, and durable buyer demand make the submarket resilient.',
      whyP2: 'Owner-occupiers value schools, parks, and daily amenities. Investors value depth of demand in well-positioned streets.',
      sectionTitleMicro: 'In-demand micro-locations in Prenzlauer Berg',
      microAreas: [
        'Around Kollwitzplatz — classic, highly requested residential core.',
        'Helmholtzplatz — lively cafés and strong everyday demand.',
        'Near Mauerpark — urban energy with park access.',
        'Quieter side streets off major roads — better for long-term living.'
      ],
      sectionTitleFaq: 'FAQ: Prenzlauer Berg apartments',
      faq: [
        { q: 'Why are prices often high here?', a: 'Because demand is deep and supply of well-located Altbau is limited.' },
        { q: 'Is it only a family district?', a: 'No, but families are a large and stable buyer group.' },
        { q: 'What should investors check carefully?', a: 'Existing rents, building fabric, and whether the street supports long-term letting.' },
        { q: 'How does Sweet Home help?', a: 'We filter for street quality, price realism, and transaction readiness.' }
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
    heroImage: '/images/Neukölln.jpg',
    propertiesWhere: "(LOWER(COALESCE(p.neighborhood, '')) LIKE $1 OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2)",
    propertiesParams: ['%neukölln%', '%neukolln%'],
    projectsWhere: "(LOWER(COALESCE(p.neighborhood, '')) LIKE $1 OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2)",
    projectsParams: ['%neukölln%', '%neukolln%'],
    titleEn: 'Apartments for sale in Neukölln',
    metaEn: 'Apartments for sale in Neukölln, Berlin: compare curated listings and buy with Sweet Home.',
    contentEn: {
      heroTitle: 'Apartments for sale in Neukölln',
      heroDescription: 'Neukölln mixes urban energy, strong dynamics, and very different micro-locations. It attracts buyers looking for demand depth and development potential.',
      sectionTitleProperties: 'Apartments in Neukölln',
      sectionTitleProjects: 'New developments in Neukölln',
      sectionTitleWhy: 'Why Neukölln interests buyers',
      whyP1: 'Urban demand, solid public transport, and a range from Altbau to modernised stock keep the district on many shortlists.',
      whyP2: 'International neighbourhoods and lively quarters support lettability, while price levels still differ sharply by street.',
      sectionTitleMicro: 'In-demand micro-locations in Neukölln',
      microAreas: [
        'Reuterkiez — urban, requested, and very lively.',
        'Schillerkiez — near Tempelhofer Feld with strong livability.',
        'Rixdorf / Böhmisches Dorf — characterful Altbau pockets.',
        'Britz-Nord — quieter setting with practical infrastructure.'
      ],
      sectionTitleFaq: 'FAQ: buying in Neukölln',
      faq: [
        { q: 'Is Neukölln suitable as an investment?', a: 'Yes in many micro-locations with stable rental demand — after a clean location and building check.' },
        { q: 'Which areas are most requested?', a: 'Central pockets such as Reuterkiez and Schillerkiez, plus well-connected residential streets.' },
        { q: 'How is the market developing?', a: 'Demand has been robust for years, but differences between micro-locations remain large.' },
        { q: 'How does Sweet Home help in Neukölln?', a: 'With pricing analysis, shortlisting, and full transaction support.' }
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
      heroDescription: 'Berlin-Mitte is the city’s central premium location — requested by owner-occupiers and international investors who prioritise location quality and long-term lettability.',
      sectionTitleProperties: 'Apartments in Berlin-Mitte',
      sectionTitleProjects: 'New developments in Berlin-Mitte',
      sectionTitleWhy: 'Why Mitte attracts property buyers',
      whyP1: 'Central access, international demand, and strong infrastructure support both living and long-term letting.',
      whyP2: 'Entry prices often sit above the Berlin average — buyers pay for location resilience and lasting demand from professionals and international tenants.',
      sectionTitleMicro: 'In-demand micro-locations in Mitte',
      microAreas: [
        'Hackescher Markt / Scheunenviertel — urban top location with deep demand.',
        'Government quarter / Spreebogen — central addresses with strong infrastructure.',
        'Around Alexanderplatz — excellent connectivity and mixed stock.',
        'Oranienburger Straße / near Museum Island — representative Altbau and premium stock.'
      ],
      sectionTitleFaq: 'FAQ: buying in Berlin-Mitte',
      faq: [
        { q: 'Is buying in Mitte still worth it?', a: 'For location-led buyers, often yes: central demand and strong infrastructure, at a higher entry price.' },
        { q: 'Who buys in Mitte?', a: 'Owner-occupiers who want a central home, and investors focused on location quality and international tenant demand.' },
        { q: 'What should Altbau buyers check?', a: 'Energy certificate, WEG reserves, renovation backlog, and realistic purchase costs — prestige does not replace due diligence.' },
        { q: 'How does Sweet Home help in Mitte?', a: 'With shortlisting, price and location context, negotiation, and support through land-register registration.' }
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
