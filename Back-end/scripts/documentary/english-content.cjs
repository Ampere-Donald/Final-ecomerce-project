'use strict';
// Authored English guidance. Does not machine-translate unverified numeric claims.
const copies = {
  condensateur: [
    'This capacitor stores electric charge. Its role may include filtering, decoupling or timing, depending on its technology and the circuit.',
    'Capacitance alone does not determine suitability. Compare rated voltage, technology, polarity where applicable, dimensions and operating conditions.',
    [
      'Filtering or decoupling in a documented circuit.',
      'Charge and discharge studies with a dimensioned circuit.',
    ],
    [
      'Compare capacitance and rated voltage under the circuit conditions.',
      'Check technology and polarity where applicable.',
      'Check diameter, height and lead spacing.',
      'Consult the series documentation for temperature, ESR and ripple-current requirements where relevant.',
    ],
    'Identify the intended function before dimensioning the component. Relate calculations to tolerances and the characteristics of the selected series.',
    'Why is capacitance alone insufficient?',
    'Capacitors with the same capacitance may differ in technology, dimensions and operating conditions. The circuit and series documentation determine the other selection criteria.',
  ],
  resistance: [
    'A resistor relates current and voltage and dissipates energy as heat. Its circuit role may include biasing, current limiting, measurement or loading.',
    'Compare resistance, tolerance, power and technology. Power and heating resistors also have mounting and cooling requirements.',
    [
      'Resistor-network studies.',
      'Biasing and current limiting in a dimensioned circuit.',
    ],
    [
      'Compare resistance and tolerance.',
      'Check dissipation under operating conditions.',
      'Check dimensions, mounting and connections.',
    ],
    'Calculate current and dissipation for each operating condition. Compare the selected value with component documentation and thermal conditions.',
    'Why check power as well as resistance?',
    'The resistor must support circuit dissipation under its mounting conditions. Equal resistance does not imply equal thermal capability.',
  ],
  transistor: [
    'A transistor controls current or processes a signal. Identify its technology and polarity before selecting the drive circuit.',
    'Bipolar and field-effect transistors use different drive methods. Package, pinout, drive conditions and dissipation must match the circuit.',
    [
      'Study of a switching stage.',
      'Analogue processing where supported by the device technology.',
    ],
    [
      'Identify technology and polarity.',
      'Compare the pinout using the manufacturer’s specified view.',
      'Check drive and operating conditions.',
      'Compare thermal requirements and heatsink mounting.',
    ],
    'Define the load, drive and thermal conditions. Absolute maximum ratings are not operating points to apply directly.',
    'Does the same package guarantee a replacement?',
    'A package does not guarantee the same technology, pinout or operating conditions. Compare the documented references.',
  ],
  diode: [
    'A diode behaves differently depending on its bias polarity. Rectifier, signal, Zener and Schottky diodes serve different functions.',
    'Selection depends on function, polarity, electrical limits and thermal conditions. For a bridge, also identify the terminals and mounting.',
    [
      'Rectification studies where appropriate for the type.',
      'Protection or signal processing according to the reference.',
    ],
    [
      'Identify technology and function.',
      'Check polarity or bridge terminals.',
      'Compare documented electrical and thermal conditions.',
    ],
    'Select the diode from the circuit, load and operating regime. Document the conditions that support the choice.',
    'Do all diodes serve the same function?',
    'Their technologies provide different behaviours and limits. The reference must match the intended circuit function.',
  ],
  relais: [
    'A relay controls contacts from a coil drive or an interface integrated into a module. Distinguish a bare relay from a relay-control board.',
    'Coil and contact ratings describe different functions. Load type also affects switching conditions.',
    ['Study of load control.', 'Switching interfaces in a documented circuit.'],
    [
      'Distinguish a bare relay from a module.',
      'Compare supply and drive requirements.',
      'Identify contacts and pinout.',
      'Check the switched-load conditions.',
    ],
    'Identify the drive stage and protections required by the circuit. A module and a bare relay do not necessarily use the same connections.',
    'Does coil voltage specify the contacts?',
    'Coil and contacts have separate characteristics. Consult both sets of data when checking the application.',
  ],
  connectique: [
    'This item provides a connection or adaptation between equipment. Identify connectors, genders, signal type and direction.',
    'Connector shape alone does not establish performance. Distinguish a mechanical adapter, active conversion and a simple cable.',
    [
      'Connection of compatible equipment.',
      'Interconnection of a test bench or project.',
    ],
    [
      'Compare connectors and genders at both ends.',
      'Check direction and signal type.',
      'Check length, any power requirement and documented capabilities.',
    ],
    'Map the complete connection chain and each device interface. Check the cable or adapter capabilities against the intended use.',
    'Does a matching connector guarantee compatibility?',
    'Signal, direction, functions and performance must also match. Check both equipment and accessory documentation.',
  ],
  alimentation: [
    'This item supports power supply or energy conversion. Identify its function and distinguish a complete power supply from a component requiring a circuit.',
    'Input and output characteristics, current type, connections and load conditions must match the circuit requirements.',
    [
      'Powering a compatible circuit.',
      'Conversion or regulation studies according to the reference.',
    ],
    [
      'Identify the exact function and item type.',
      'Compare input, output and polarity.',
      'Check connections, load and thermal conditions.',
    ],
    'Define each subsystem’s needs and check the documented operating conditions. Provide the external components required when the item is a component.',
    'Is a regulator component a complete power supply?',
    'A regulator requires a circuit and external elements consistent with its documentation. Identify what the item actually includes.',
  ],
  circuit: [
    'An integrated circuit performs functions defined by its reference. The complete reference, suffix and package identify the relevant documentation.',
    'Pinout, supply conditions, signals and external components depend on the variant. Compare family information with the actual reference.',
    [
      'Study of a documented application circuit.',
      'Maintenance of identified equipment.',
    ],
    [
      'Compare complete reference and suffix.',
      'Check package and pinout orientation.',
      'Consult supply requirements and external components.',
    ],
    'Start from the manufacturer’s application circuit and identify each interface’s conditions. Any adaptation to a project must be justified.',
    'Why do the suffix and package matter?',
    'They may identify different presentations or operating variants. Use the corresponding documentation for pinout and operating conditions.',
  ],
  module: [
    'A board or module combines functions for integration into equipment or a project. Identify its reference and revision before planning connections.',
    'Supply, interfaces, connections and required external elements depend on the model. A replacement board and an educational module serve different uses.',
    [
      'Integration according to the documented function.',
      'Replacement when a reference match is established.',
    ],
    [
      'Identify reference and revision.',
      'Compare supply, interfaces and connections.',
      'Check dimensions, mounting and associated elements.',
    ],
    'Break the project into subsystems and check their interfaces. A common connector does not guarantee an identical electrical or software interface.',
    'What should be checked before connecting a module?',
    'Identify its supply, connection functions and interface conditions. Consult documentation for the model and revision.',
  ],
  mesure: [
    'Select a measuring instrument from the quantity to be studied, operating range and functions of the model.',
    'Model documentation specifies measurement modes, accessories and operating limits. Account for markings and measurement conditions.',
    [
      'Measurements on circuits suited to the instrument.',
      'Preparation of documented laboratory work.',
    ],
    [
      'Identify the model and functions.',
      'Check ranges, limits and required accessories.',
      'Consult the manufacturer’s operating conditions.',
    ],
    'Define the measurement protocol, connections and expected results. Record the mode and conditions when interpreting results.',
    'Why identify accessories before a laboratory session?',
    'Measurement modes and connections may require specific accessories. Distinguish supplied accessories from advertised instrument functions.',
  ],
  outillage: [
    'This tool supports assembly or maintenance. Select its format, functions and consumables for the intended operation.',
    'Check accessory compatibility, operating conditions and supplied contents for the model.',
    [
      'Preparation of an assembly workstation.',
      'Maintenance within the tool’s capabilities.',
    ],
    [
      'Identify the model and operation.',
      'Check compatible accessories and consumables.',
      'Check any power requirement and operating conditions.',
    ],
    'List the operations and associated accessories. Distinguish supplied items from those required separately.',
    'How should the required equipment be prepared?',
    'List operations, tools, accessories and consumables, then check what is actually supplied.',
  ],
  equipement: [
    'This item forms part of equipment or a maintenance operation. Relate its role to the equipment and mounting constraints.',
    'Prepare selection from the reference, intended function and connections. Dimensions, mounting and associated elements complete the comparison.',
    ['Assembly or maintenance of corresponding equipment.'],
    [
      'Compare reference and function.',
      'Check dimensions and mounting.',
      'Check connections and associated elements.',
    ],
    'Identify the subsystem and its interfaces. Photographs can help prepare a comparison but do not replace the characteristics needed for selection.',
    'How can an advice request be prepared?',
    'Provide the item reference, equipment reference and intended function. Existing photographs can supplement this information.',
  ],
};
Object.assign(copies, {
  potentiometre: [
    'A potentiometer is an adjustable resistive component. Depending on its connections, it supports adjustment or the setting of an operating point.',
    'Compare total resistance, taper, number of channels, connections and mechanical format. Distinguish the component from its control knob.',
    [
      'Adjustment in a documented circuit.',
      'Study of a variable resistor network.',
    ],
    [
      'Compare resistance and taper.',
      'Identify connections and channel count.',
      'Check shaft, mounting and overall dimensions.',
    ],
    'Define the adjustment function and circuit conditions. Identify terminals and document the intended adjustment range.',
    'Why compare the mechanical format?',
    'The shaft, mounting and connections determine integration. Equal resistance does not guarantee equal mechanical fit.',
  ],
  interrupteur: [
    'This item provides control or switching according to its configuration. Identify momentary or maintained action and the contact arrangement.',
    'Terminal count, mechanical positions and load conditions must match the circuit. An illuminated switch may have separate lighting connections.',
    [
      'Control of compatible equipment.',
      'User-control interface in a documented circuit.',
    ],
    [
      'Compare operation and positions.',
      'Identify the contact arrangement.',
      'Check mounting, connections and load conditions.',
    ],
    'Prepare wiring from the contact configuration. Distinguish the user control from the power stage supplying the load.',
    'Is pin count sufficient for selection?',
    'Contact function, operating action and electrical conditions must also be established. Pin count alone does not provide this correspondence.',
  ],
  protection: [
    'A protective device is selected for a defined function and operating conditions. A fuse, breaker and thermostat are not interchangeable merely because their formats match.',
    'Reference, operating action and nominal characteristics must match the equipment documentation. Preserve the intended protection function.',
    ['Maintenance of an identified protection function.'],
    [
      'Identify type and reference.',
      'Compare documented characteristics and conditions.',
      'Check format, mounting and connections.',
    ],
    'Define the protection function from circuit requirements. Justify selection in the design dossier against component documentation.',
    'Can a protection device be selected by format alone?',
    'Format determines mounting. The protection function and documented characteristics must also match the equipment.',
  ],
  'energie-stockee': [
    'A battery supplies electrical energy according to its technology and format. Identify whether it is rechargeable before use.',
    'Voltage, dimensions, polarity and connections must match the equipment. A charger for a rechargeable battery must match its chemistry and specified conditions.',
    ['Autonomous power for compatible equipment.'],
    [
      'Compare technology and rechargeability.',
      'Check voltage, format, polarity and connections.',
      'Consult equipment and any charger requirements.',
    ],
    'Define the project energy requirements and connection constraints. Distinguish storage, charging and power distribution.',
    'Are all batteries rechargeable?',
    'Rechargeability depends on chemistry and reference. Use only the charging conditions and equipment explicitly specified for the item.',
  ],
});
function englishContent(content, profile, product) {
  const [
    intro,
    detail,
    applications,
    replacement,
    integration,
    question,
    answer,
  ] = copies[profile] || copies.equipement;
  const name =
    product.original.english_designation ||
    `Catalogue reference ${product.internal_reference || product.id}`;
  return {
    ...content,
    locales: {
      ...content.locales,
      en: {
        summary: `${name}. ${intro}`.slice(0, 700),
        paragraphs: [intro, detail],
        applications,
        integration: [
          integration,
          'For university work, state the circuit, assumptions and selection criteria, and relate the results to the documents used.',
        ],
        replacement,
        missing: [],
        faq: [{ question, answer }],
        documents: content.locales.fr.documents.map((d) => ({
          ...d,
          label: new URL(d.url).hostname + ' — reference document',
        })),
      },
    },
  };
}
module.exports = { englishContent };
