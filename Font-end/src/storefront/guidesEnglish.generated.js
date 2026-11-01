// Prepared English translations; not a publication registry. Routes must opt in after full locale verification.
export const preparedEnglishGuides = [
  {
    "id": "guide-marquage-01-en",
    "sourceId": "guide-marquage-01",
    "sourceSha256": "2c2b4de0ead614c7343a2fdaef718eaa08329ff8c22dcbcfd7782c25943280a4",
    "slug": "lire-marquage-composant",
    "language": "en",
    "type": "guide",
    "title": "Read a component marking before searching for its reference",
    "summary": "One missing letter can lead to a different part. Prepare a useful identification with the complete marking, manufacturer and package.",
    "createdAt": "2026-10-31",
    "reviewedAt": "2026-10-31",
    "families": [
      "transistors",
      "circuits-integres-audio"
    ],
    "products": [
      {
        "id": "12cd34b9-bec9-4a1a-a67a-179ecb13b8b2",
        "label": "Catalogue page: 2N 3773"
      }
    ],
    "sources": [
      {
        "id": "st",
        "label": "STMicroelectronics — 2N3773, revision 2, October 2008",
        "url": "https://www.st.com/resource/en/datasheet/2n3773.pdf",
        "locator": "Page 1, Device summary; pages 2–3, ratings and characteristics; page 5, TO-3 drawing",
        "checkedAt": "2026-10-31"
      }
    ],
    "sections": [
      {
        "id": "relever",
        "title": "Keep the clues without interpreting them too quickly",
        "paragraphs": [
          "Copy every visible line, spacing and suffix. Separate what you can read from what you assume: an uncertain character should remain marked as uncertain."
        ],
        "bullets": [
          "Photograph the marked face and package with a scale, without opening equipment that presents a hazard.",
          "Record the equipment model and the part’s position on the board.",
          "Include the logo, number of connections and dimensions in your request."
        ],
        "sources": []
      },
      {
        "id": "exemple",
        "title": "Documented example: ST’s 2N3773",
        "paragraphs": [
          "ST’s datasheet associates the order code and marking 2N3773 with a metal TO-3 package. It separates absolute ratings from electrical characteristics whose values depend on test conditions. A maximum value alone is therefore not an operating point to select."
        ],
        "bullets": [],
        "sources": [
          "st"
        ]
      },
      {
        "id": "comparer",
        "title": "Compare the correct documentation",
        "paragraphs": [
          "Find the datasheet for the identified manufacturer, then compare the full reference, package and pinout. If the manufacturer or a suffix remains unknown, treat the correspondence as a possibility to check."
        ],
        "bullets": [
          "Include the equipment reference, photographs and documentary link in your request.",
          "For a replacement, also explain the component’s role and the circuit constraints."
        ],
        "sources": []
      }
    ],
    "limits": [
      "This documentary example proves neither the authenticity nor the manufacturer of the item offered in the catalogue. It validates no replacement."
    ],
    "review": {
      "method": "documentary",
      "scope": "ST’s document and the scope of the example were checked; no physical test is claimed."
    }
  },
  {
    "id": "guide-condensateur-01-en",
    "sourceId": "guide-condensateur-01",
    "sourceSha256": "b8ce4e7257c62072bbb6c07ac7aeba20ac778fa0b4a83024c8e0382ce6dd453c",
    "slug": "choisir-condensateur-electrolytique",
    "language": "en",
    "type": "guide",
    "title": "Choosing an electrolytic capacitor: criteria to compare",
    "summary": "Capacitance and voltage are not enough. Also examine polarity, series, size and operating conditions before selecting a part.",
    "createdAt": "2026-10-31",
    "reviewedAt": "2026-10-31",
    "families": [
      "condensateurs"
    ],
    "products": [
      {
        "id": "02d5805f-7f51-4574-938d-d8cfe8c09487",
        "label": "Catalogue example: 4700 µF / 63 V, short body"
      }
    ],
    "sources": [
      {
        "id": "nichicon",
        "label": "Nichicon — Technical Notes and Application Guidelines",
        "url": "https://www.nichicon.co.jp/english/series_items/catalog_pdf/e-aluminum.pdf",
        "locator": "Section 2-1-1, Circuit Design; section 2-3, Operating Voltage and Safety",
        "checkedAt": "2026-10-31"
      }
    ],
    "sections": [
      {
        "id": "application",
        "title": "Start with the application and exact series",
        "paragraphs": [
          "Nichicon requires application and mounting conditions to remain within the specification, including temperature and ripple current. Polarised capacitors require the correct polarity. The printed capacitance and voltage do not describe every constraint."
        ],
        "bullets": [],
        "sources": [
          "nichicon"
        ]
      },
      {
        "id": "comparaison",
        "title": "Prepare a complete comparison",
        "paragraphs": [
          "Collect the information for the original part and then for the candidate. Missing information remains to be confirmed even if the part fits in the available space."
        ],
        "bullets": [],
        "table": {
          "caption": "Information to collect when asking for a capacitor selection",
          "headers": [
            "Record",
            "What to specify"
          ],
          "rows": [
            [
              "Identification",
              "Manufacturer, series and complete reference"
            ],
            [
              "Characteristics",
              "Capacitance, voltage, tolerance and polarity"
            ],
            [
              "Conditions",
              "Temperature, ripple current, ESR and service life according to series and application"
            ],
            [
              "Mounting",
              "Diameter, height, lead spacing and connection type"
            ]
          ]
        },
        "sources": [
          "nichicon"
        ]
      },
      {
        "id": "catalogue",
        "title": "Read catalogue descriptions with their limitations",
        "paragraphs": [
          "The pilot’s 4700 µF / 63 V variants distinguish small or medium diameter and short or long body. These relative descriptions do not provide dimensions in millimetres. Ask for measurements and series documentation before choosing."
        ],
        "bullets": [
          "Include markings, available dimensions and the equipment reference in your request.",
          "Have a competent person examine a capacitor installed in equipment before any intervention."
        ],
        "sources": []
      }
    ],
    "limits": [
      "Nichicon’s guide describes general criteria. It does not establish the series, ESR, temperature rating or admissible current of the generic catalogue parts."
    ],
    "review": {
      "method": "documentary",
      "scope": "General criteria were checked against Nichicon’s notes and limitations already recorded on the pilot pages; no electrical measurement was performed."
    }
  },
  {
    "id": "guide-multimetre-01-en",
    "sourceId": "guide-multimetre-01",
    "sourceSha256": "3c28f49b14aded8ce4a54b9e8da30c9722d4c2151d8be37f1aac83b3861e7a23",
    "slug": "choisir-multimetre-usage",
    "language": "en",
    "type": "guide",
    "title": "Choosing a multimeter for the measurements and their environment",
    "summary": "Start with your intended use, then check the exact model’s manual, functions, measurement category and accessories.",
    "createdAt": "2026-10-31",
    "reviewedAt": "2026-10-31",
    "families": [
      "multimetres"
    ],
    "products": [],
    "sources": [
      {
        "id": "fluke",
        "label": "Fluke — Guide to Digital Multimeter Safety",
        "url": "https://www.fluke.com/en-ie/learn/blog/safety/multimeter-guide",
        "locator": "Selecting category and voltage; Measurement Category table",
        "checkedAt": "2026-10-31"
      }
    ],
    "sections": [
      {
        "id": "besoin",
        "title": "Describe the measurements you actually need",
        "paragraphs": [
          "Prepare a specific list: DC or AC voltage, resistance, continuity and additional functions. State the expected range and context: electronics workshop, powered equipment or electrical installation. Do not choose solely by the number of advertised functions."
        ],
        "bullets": [
          "Identify the complete model rather than a series name.",
          "Ask for the manual, supplied leads and limits specific to each function.",
          "Check whether your work needs a particular accuracy or resolution."
        ],
        "sources": []
      },
      {
        "id": "categorie",
        "title": "Read category and voltage together",
        "paragraphs": [
          "Fluke’s guide distinguishes measurement categories according to the electrical environment. It calls for a category suited to the context and a corresponding admissible voltage. A printed maximum voltage does not replace the category required for the application."
        ],
        "bullets": [],
        "sources": [
          "fluke"
        ]
      },
      {
        "id": "confirmation",
        "title": "Ask for confirmation tied to the model",
        "paragraphs": [
          "Tell the shop the type of measurement and intended environment. If the model’s manual or safety limits are not established, ask for confirmation before selecting it. This guide does not describe a live-measurement procedure."
        ],
        "bullets": [
          "Compare functions, protections and accessories in the manual for the version sold.",
          "For work on an electrical installation, have a qualified person determine the appropriate equipment and procedure."
        ],
        "sources": []
      }
    ],
    "limits": [
      "Fluke’s documentation does not certify any CAT rating for catalogue models DT-830D, SD9206A, YX-360 or EPICA. Limits for each item must be established from its own manual."
    ],
    "review": {
      "method": "documentary",
      "scope": "Category and voltage criteria were checked in the manufacturer’s guide; no model certification or electrical intervention is claimed."
    }
  },
  {
    "id": "guide-connecteur-01-en",
    "sourceId": "guide-connecteur-01",
    "sourceSha256": "2f489087801ee4f2772cddf91f82997482431d4fa14e0c396300381696d2164d",
    "slug": "identifier-connecteur",
    "language": "en",
    "type": "guide",
    "title": "Identify a connector before searching for a matching part",
    "summary": "Contact count, pitch, orientation and keying: collect the clues that help compare two connectors beyond their appearance.",
    "createdAt": "2026-10-31",
    "reviewedAt": "2026-10-31",
    "families": [],
    "products": [],
    "sources": [
      {
        "id": "jst",
        "label": "JST — XH series specifications and drawings",
        "url": "https://www.jst-mfg.com/product/pdf/eng/eXH.pdf",
        "locator": "Page 1, 2.5 mm pitch; page 2, board layout and orientation; following pages, component references",
        "checkedAt": "2026-10-31"
      }
    ],
    "sections": [
      {
        "id": "indices",
        "title": "Collect information from both sides",
        "paragraphs": [
          "A front photograph alone often hides the locking feature or dimensions. Prepare views of both plug and header, together with the equipment reference."
        ],
        "bullets": [
          "Count the contacts and record the number of rows.",
          "Measure the pitch between adjacent contact centres and the housing dimensions.",
          "Show orientation, locking, keying and markings.",
          "Record known wiring information without inferring a wire’s function from its colour alone."
        ],
        "sources": []
      },
      {
        "id": "exemple",
        "title": "Example: pitch does not tell the whole story",
        "paragraphs": [
          "JST documents the XH series with a 2.5 mm pitch. Its drawings distinguish entry orientations and board layouts. This reference is an example of reading a drawing: a similar-looking part has not thereby been identified as JST XH."
        ],
        "bullets": [],
        "sources": [
          "jst"
        ]
      },
      {
        "id": "verification",
        "title": "Separate mechanical and electrical correspondence",
        "paragraphs": [
          "Before choosing, compare the references and drawings of the components to be mated. Mechanical mating alone does not establish the wiring or the assembly’s admissible electrical characteristics."
        ],
        "bullets": [
          "Send photographs with a scale, measurements and both references if readable.",
          "Have the exact component and operating conditions confirmed; do not force an assembly based on resemblance."
        ],
        "sources": []
      }
    ],
    "limits": [
      "No unknown photograph is identified here, and no XH-series stock availability is announced. Contact count and an approximate measurement do not prove compatibility."
    ],
    "review": {
      "method": "documentary",
      "scope": "JST XH specifications and drawings were read; no physical identification or mating check was performed."
    }
  }
];
