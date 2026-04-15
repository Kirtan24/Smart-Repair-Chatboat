/**
 * Rule-based decision tree for common home appliance issues
 * Each appliance has a tree of questions and diagnoses
 */

const ISSUE_TYPES = {
  AC: 'ac',
  REFRIGERATOR: 'refrigerator',
  WIFI: 'wifi',
  FAN: 'fan',
  WASHING_MACHINE: 'washing_machine',
  WATER_HEATER: 'water_heater',
  TV: 'tv',
  MICROWAVE: 'microwave',
  GENERAL: 'general',
};

const DECISION_TREES = {
  [ISSUE_TYPES.AC]: {
    name: 'Air Conditioner',
    icon: 'snowflake',
    symptoms: ['leaking', 'not cooling', 'not turning on', 'making noise', 'bad smell', 'remote not working'],
    tree: {
      id: 'ac_start',
      question: "Is the AC turning on at all?",
      options: [
        {
          label: 'No, it won\'t turn on',
          next: {
            id: 'ac_no_power',
            question: 'Is the power LED light on the unit?',
            options: [
              {
                label: 'No LED at all',
                diagnosis: {
                  issue: 'Power supply failure',
                  severity: 'medium',
                  diy: true,
                  steps: [
                    'Check if the AC is properly plugged into the wall outlet',
                    'Test the wall outlet with another device to ensure it works',
                    'Check your home circuit breaker – find the breaker labeled "AC" or "Air Conditioner" and flip it off, then back on',
                    'Check if the AC has a separate fuse near the outdoor unit – replace if blown',
                    'Try pressing the Reset button on the AC unit (usually a small button near the display)',
                  ],
                  warnings: ['Never work on electrical components without turning off power at the breaker first'],
                  professionalNeeded: false,
                },
              },
              {
                label: 'LED is on but AC doesn\'t start',
                next: {
                  id: 'ac_led_no_start',
                  question: 'What does the display show?',
                  options: [
                    {
                      label: 'Error code',
                      diagnosis: {
                        issue: 'AC Error Code – Control board or sensor fault',
                        severity: 'high',
                        diy: false,
                        steps: [
                          'Note the exact error code shown on the display',
                          'Consult your AC manual for the specific error code meaning',
                          'Common error codes: E1=Indoor sensor fault, E2=Outdoor sensor, E3=Communication error',
                          'Try powering off for 5 minutes and restarting',
                        ],
                        warnings: ['Error codes indicate internal faults – professional service is recommended'],
                        professionalNeeded: true,
                        reason: 'Control board or sensor replacement required',
                      },
                    },
                    {
                      label: 'Normal display but AC won\'t run',
                      diagnosis: {
                        issue: 'Remote control or capacitor issue',
                        severity: 'medium',
                        diy: true,
                        steps: [
                          'Check remote control batteries – replace with fresh AA batteries',
                          'Try using the manual ON button on the AC unit itself',
                          'Point remote directly at the AC receiver (usually a small sensor on the front)',
                          'Ensure nothing is blocking the IR signal',
                          'If still not working, the start capacitor may be faulty – this requires a technician',
                        ],
                        professionalNeeded: false,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          label: 'Yes, it turns on but not cooling',
          next: {
            id: 'ac_not_cooling',
            question: 'Is the outdoor unit (compressor) running? You should hear it humming outside.',
            options: [
              {
                label: 'Outdoor unit is off/silent',
                diagnosis: {
                  issue: 'Compressor failure or refrigerant issue',
                  severity: 'high',
                  diy: false,
                  steps: [
                    'Check that the outdoor unit is not blocked by debris or plants (clear 2 feet around it)',
                    'Clean the outdoor unit fins with a garden hose (gentle spray)',
                    'Check if outdoor unit circuit breaker is tripped',
                    'If outdoor unit still won\'t run, likely compressor failure or refrigerant leak',
                  ],
                  warnings: ['Refrigerant handling requires certified technicians – do not attempt yourself'],
                  professionalNeeded: true,
                  reason: 'Compressor or refrigerant issue requires professional service',
                },
              },
              {
                label: 'Outdoor unit is running',
                next: {
                  id: 'ac_no_cool_compressor_ok',
                  question: 'Is cold air coming from the indoor unit vents?',
                  options: [
                    {
                      label: 'No cold air or warm air',
                      diagnosis: {
                        issue: 'Dirty air filter or low refrigerant',
                        severity: 'medium',
                        diy: true,
                        steps: [
                          'Turn off the AC and locate the air filter (usually behind front panel)',
                          'Remove the filter and clean it with warm water and mild soap',
                          'Let it dry completely before reinstalling (30 mins)',
                          'Check that all vents are open and not blocked by furniture',
                          'Set temperature to max cool (18°C/64°F) and check again',
                          'If still not cooling after filter cleaning, refrigerant may be low',
                        ],
                        professionalNeeded: false,
                      },
                    },
                    {
                      label: 'Slightly cold but room not cooling',
                      diagnosis: {
                        issue: 'Inefficient cooling – insulation or capacity issue',
                        severity: 'low',
                        diy: true,
                        steps: [
                          'Ensure all windows and doors are closed while AC runs',
                          'Check for gaps around windows where cool air escapes',
                          'Verify the AC capacity (tonnage) matches your room size',
                          '1 ton = suitable for ~120 sq ft; 1.5 ton = ~180 sq ft; 2 ton = ~240 sq ft',
                          'Use curtains or blinds to block direct sunlight',
                          'Clean the AC filter as it may be partially blocked',
                        ],
                        professionalNeeded: false,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          label: 'AC is leaking water',
          next: {
            id: 'ac_leaking',
            question: 'Where is the water leaking from?',
            options: [
              {
                label: 'Dripping from indoor unit into room',
                diagnosis: {
                  issue: 'Clogged drain pipe',
                  severity: 'medium',
                  diy: true,
                  steps: [
                    'Turn off the AC immediately to prevent electrical hazard',
                    'Locate the drain pipe (usually a PVC pipe exiting through the wall)',
                    'Check if the pipe outlet is blocked by dust or insects',
                    'Use a wet-dry vacuum to suction out the blockage from the drain outlet',
                    'Pour a cup of diluted bleach into the drain pan to clear algae buildup',
                    'Check the drain pan for cracks or damage',
                    'Run AC again and verify water flows through the drain pipe properly',
                  ],
                  warnings: ['Always turn off power before inspecting internal components', 'Prolonged leaking can cause mold and electrical damage'],
                  professionalNeeded: false,
                },
              },
              {
                label: 'Water outside near outdoor unit',
                diagnosis: {
                  issue: 'Normal condensation',
                  severity: 'low',
                  diy: true,
                  steps: [
                    'This is usually normal – AC units produce condensation water',
                    'Verify the amount – a small puddle during hot, humid days is normal',
                    'Ensure the outdoor unit is slightly tilted back to drain water properly',
                    'If excessive water, check if the outdoor unit coils are iced over (refrigerant issue)',
                  ],
                  professionalNeeded: false,
                },
              },
            ],
          },
        },
        {
          label: 'Making strange noises',
          diagnosis: {
            issue: 'Mechanical fault – motor or fan issue',
            severity: 'medium',
            diy: false,
            steps: [
              'Rattling: Check if front panel is loose and tighten screws',
              'Squealing: Fan belt or motor bearing may be worn',
              'Banging: Fan blade hitting casing – turn off immediately',
              'Hissing: Possible refrigerant leak – call technician immediately',
              'Clicking on startup: Normal for compressor; persistent clicking = relay issue',
            ],
            warnings: ['Do not run AC with banging or hissing sounds – can cause further damage'],
            professionalNeeded: true,
            reason: 'Motor or fan component replacement required',
          },
        },
      ],
    },
  },

  [ISSUE_TYPES.REFRIGERATOR]: {
    name: 'Refrigerator',
    icon: 'ice',
    symptoms: ['not cooling', 'freezer not working', 'making noise', 'leaking', 'not starting'],
    tree: {
      id: 'fridge_start',
      question: 'What\'s the main problem with your refrigerator?',
      options: [
        {
          label: 'Not cooling at all',
          next: {
            id: 'fridge_no_cool',
            question: 'Is the interior light turning on when you open the door?',
            options: [
              {
                label: 'No light',
                diagnosis: {
                  issue: 'Power supply failure',
                  severity: 'high',
                  diy: true,
                  steps: [
                    'Check if refrigerator is plugged in securely',
                    'Test the outlet by plugging in another device',
                    'Check circuit breaker and reset if tripped',
                    'Inspect the power cord for physical damage',
                    'Check if there is a separate GFCI outlet that tripped',
                  ],
                  professionalNeeded: false,
                },
              },
              {
                label: 'Light works but not cooling',
                next: {
                  id: 'fridge_light_ok',
                  question: 'Is the compressor running? (Listen for a low hum at the back/bottom)',
                  options: [
                    {
                      label: 'No hum, compressor silent',
                      diagnosis: {
                        issue: 'Compressor start relay failure',
                        severity: 'high',
                        diy: true,
                        steps: [
                          'Unplug the refrigerator',
                          'Pull fridge away from wall and locate compressor (black dome at back bottom)',
                          'Find the start relay – a small device plugged into the side of compressor',
                          'Remove and shake the relay – if it rattles, it\'s faulty and needs replacement',
                          'Replace the start relay (costs $10-30) – this is a common DIY fix',
                          'If relay is fine, compressor itself may be failed – requires technician',
                        ],
                        warnings: ['Always unplug before touching internal components'],
                        professionalNeeded: false,
                      },
                    },
                    {
                      label: 'Compressor hums but still not cold',
                      diagnosis: {
                        issue: 'Refrigerant leak or condenser coil issue',
                        severity: 'high',
                        diy: false,
                        steps: [
                          'Clean condenser coils at back/bottom with vacuum brush attachment',
                          'Ensure 3-4 inches clearance around refrigerator for ventilation',
                          'Check if condenser fan (if present) is spinning',
                          'If still not cooling after cleaning, refrigerant recharge needed',
                        ],
                        warnings: ['Refrigerant is pressurized gas – only certified technicians can handle it'],
                        professionalNeeded: true,
                        reason: 'Refrigerant recharge or condenser fan replacement required',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          label: 'Cooling but not cold enough',
          diagnosis: {
            issue: 'Temperature setting or door seal issue',
            severity: 'low',
            diy: true,
            steps: [
              'Set refrigerator to recommended temperature: Fridge 37-40°F (3-4°C), Freezer 0°F (-18°C)',
              'Inspect door gasket (rubber seal) for cracks or gaps – run finger along it',
              'Test door seal: close door on a piece of paper and pull – if paper slides out easily, seal is worn',
              'Ensure refrigerator isn\'t overpacked – air needs to circulate',
              'Don\'t place hot food directly in fridge – let it cool first',
              'Clean the condenser coils at the back (dust buildup reduces efficiency)',
            ],
            professionalNeeded: false,
          },
        },
        {
          label: 'Making loud noises',
          diagnosis: {
            issue: 'Fan or compressor vibration',
            severity: 'medium',
            diy: true,
            steps: [
              'Buzzing/Humming: Normal compressor sound – loud buzzing may mean compressor issue',
              'Rattling: Check if fridge is level and adjust leveling feet',
              'Check items on top of refrigerator – moving them often stops vibration',
              'Gurgling: Normal refrigerant flow sounds',
              'Clicking: Defrost timer or relay clicking is normal; frequent clicking = problem',
              'Loud fan noise: Debris may be stuck in condenser fan – unplug and inspect',
            ],
            professionalNeeded: false,
          },
        },
        {
          label: 'Water pooling inside',
          diagnosis: {
            issue: 'Clogged defrost drain',
            severity: 'low',
            diy: true,
            steps: [
              'Empty and remove all food from refrigerator',
              'Locate the defrost drain at the bottom back wall of the fridge compartment',
              'Use a turkey baster to flush the drain with warm water',
              'Clear any ice blocks around the drain with warm water',
              'Remove drain plug and clean with pipe cleaner',
              'Empty the drain pan at the bottom of the refrigerator and clean it',
            ],
            professionalNeeded: false,
          },
        },
      ],
    },
  },

  [ISSUE_TYPES.WIFI]: {
    name: 'WiFi / Router',
    icon: 'signal',
    symptoms: ['no internet', 'slow speed', 'dropping connection', 'device not connecting'],
    tree: {
      id: 'wifi_start',
      question: 'What\'s the WiFi problem you\'re experiencing?',
      options: [
        {
          label: 'No internet / completely not working',
          next: {
            id: 'wifi_no_internet',
            question: 'Can you see the WiFi network name in device settings?',
            options: [
              {
                label: 'Yes, I can see it but can\'t connect',
                diagnosis: {
                  issue: 'Authentication or ISP issue',
                  severity: 'medium',
                  diy: true,
                  steps: [
                    'Restart your router: Unplug power, wait 30 seconds, plug back in',
                    'Wait 2 minutes for router to fully restart',
                    'Check if the internet light on your router is on (usually white/green)',
                    'Try "Forget Network" on your device and reconnect with password',
                    'Check if your internet bill is paid and service is active',
                    'If router internet light is red/off, contact your ISP',
                  ],
                  professionalNeeded: false,
                },
              },
              {
                label: 'No, I can\'t see the WiFi network at all',
                diagnosis: {
                  issue: 'Router hardware or WiFi broadcast issue',
                  severity: 'high',
                  diy: true,
                  steps: [
                    'Check if router is powered on (power light should be solid)',
                    'Restart router by unplugging for 30 seconds',
                    'Check if WiFi button on router is turned on (some routers have a physical switch)',
                    'Factory reset the router: Hold reset button for 10 seconds',
                    'After reset, connect with default credentials (on router label)',
                    'If router still doesn\'t broadcast, router hardware may be faulty',
                  ],
                  professionalNeeded: false,
                },
              },
            ],
          },
        },
        {
          label: 'Very slow internet speed',
          diagnosis: {
            issue: 'Bandwidth congestion or interference',
            severity: 'low',
            diy: true,
            steps: [
              'Run a speed test at fast.com or speedtest.net – compare with your plan speed',
              'Restart your router to clear memory and reconnect to ISP',
              'Move router to a central, elevated location away from walls',
              'Keep router away from microwave, cordless phones, and other electronics',
              'Switch from 2.4GHz to 5GHz band in device WiFi settings (faster but shorter range)',
              'Check how many devices are connected – disconnect unused devices',
              'Update router firmware from admin panel (usually 192.168.1.1)',
              'If slow only on WiFi but fast on cable, router antenna or placement issue',
            ],
            professionalNeeded: false,
          },
        },
        {
          label: 'WiFi keeps dropping',
          diagnosis: {
            issue: 'Interference or router overheating',
            severity: 'medium',
            diy: true,
            steps: [
              'Check router temperature – ensure it\'s not hot and has ventilation',
              'Change WiFi channel: Access 192.168.1.1, go to Wireless settings, change channel to 1, 6, or 11',
              'Update router firmware from admin panel',
              'Check for interference from neighboring WiFi networks',
              'If dropping when far away, extend range with a WiFi extender/repeater',
              'Disable old WiFi standards (802.11b) in router settings for better stability',
            ],
            professionalNeeded: false,
          },
        },
      ],
    },
  },

  [ISSUE_TYPES.FAN]: {
    name: 'Ceiling/Table Fan',
    icon: 'wind',
    symptoms: ['not turning on', 'slow speed', 'making noise', 'wobbly', 'remote not working'],
    tree: {
      id: 'fan_start',
      question: 'What issue are you experiencing with your fan?',
      options: [
        {
          label: 'Fan won\'t turn on',
          next: {
            id: 'fan_no_start',
            question: 'Is the fan connected to a wall switch?',
            options: [
              {
                label: 'Yes, wall switch',
                diagnosis: {
                  issue: 'Power supply or capacitor issue',
                  severity: 'medium',
                  diy: true,
                  steps: [
                    'Check if wall switch is ON',
                    'Test if other devices work in same circuit',
                    'Check circuit breaker for the fan circuit',
                    'For ceiling fans: inspect if the remote battery is dead',
                    'Listen closely – if fan hums but doesn\'t spin, capacitor is dead (common issue)',
                    'Capacitor replacement: Turn off power at breaker, locate capacitor in fan housing, note wire connections, replace with matching capacitor (costs $5-15)',
                  ],
                  warnings: ['Always turn off power at breaker before opening fan housing'],
                  professionalNeeded: false,
                },
              },
              {
                label: 'Direct plug-in table/pedestal fan',
                diagnosis: {
                  issue: 'Power cord or internal fuse issue',
                  severity: 'low',
                  diy: true,
                  steps: [
                    'Check if fan is plugged in and outlet works',
                    'Inspect power cord for visible damage or kinks',
                    'Check if fan has a built-in circuit breaker/fuse (often a small button or fuse holder near plug)',
                    'Press the reset button if present',
                    'Check speed selector switch – try all speed positions',
                  ],
                  professionalNeeded: false,
                },
              },
            ],
          },
        },
        {
          label: 'Fan is running very slowly',
          diagnosis: {
            issue: 'Worn capacitor or bearing lubrication needed',
            severity: 'medium',
            diy: true,
            steps: [
              'First, try cleaning the fan – dust buildup can slow motors',
              'Check if the capacitor is weak (same part that causes "won\'t start" issues)',
              'For ceiling fans: Check if speed control/regulator is working properly (replace if defective)',
              'Add a drop of machine oil to the oil port on top of the motor (if present) – do this annually',
              'If recently installed, ensure correct capacitor value for motor rating',
            ],
            professionalNeeded: false,
          },
        },
        {
          label: 'Fan is wobbling / shaking',
          diagnosis: {
            issue: 'Blade balance issue',
            severity: 'low',
            diy: true,
            steps: [
              'Turn off fan and check each blade for warping (hold ruler against each blade)',
              'Check that all blade mounting screws are tight',
              'Check that the fan mounting bracket is secure to ceiling',
              'Use a blade balancing kit (available at hardware stores for ₹200-500) to balance blades',
              'Alternatively, add a small counterweight (like a coin with tape) to the top of the heavy blade',
            ],
            professionalNeeded: false,
          },
        },
        {
          label: 'Making grinding or squeaking noise',
          diagnosis: {
            issue: 'Bearing wear or lack of lubrication',
            severity: 'medium',
            diy: true,
            steps: [
              'Turn off and unplug the fan',
              'Squeaking: Apply machine oil to the bearing/oil port at top of motor shaft',
              'Grinding: Bearings may be worn and need replacement',
              'Check if any wires are touching the rotating parts',
              'Tighten all mounting screws which may be causing vibration',
              'For severe grinding, ball bearing replacement may be needed',
            ],
            professionalNeeded: false,
          },
        },
      ],
    },
  },

  [ISSUE_TYPES.WASHING_MACHINE]: {
    name: 'Washing Machine',
    icon: 'water',
    symptoms: ['not spinning', 'not draining', 'vibrating', 'not starting', 'water leaking'],
    tree: {
      id: 'wm_start',
      question: 'What\'s wrong with your washing machine?',
      options: [
        {
          label: 'Not draining water',
          diagnosis: {
            issue: 'Clogged drain pump or filter',
            severity: 'medium',
            diy: true,
            steps: [
              'Cancel the cycle and let machine rest 5 minutes',
              'Locate the pump filter (usually behind small door near bottom front of machine)',
              'Place a shallow pan and towel to catch water',
              'Slowly unscrew the filter cap – water will flow out',
              'Remove and clean the filter under running water',
              'Check inside the pump housing for debris (socks, coins, etc.)',
              'Reinstall filter, run a spin-only cycle to drain remaining water',
            ],
            warnings: ['Water may be hot – let it cool before draining manually'],
            professionalNeeded: false,
          },
        },
        {
          label: 'Won\'t spin',
          diagnosis: {
            issue: 'Load imbalance or drive belt issue',
            severity: 'medium',
            diy: true,
            steps: [
              'Redistribute clothes evenly inside the drum',
              'Remove very heavy single items (like rugs) that cause imbalance',
              'Ensure machine is perfectly level – adjust leveling feet if needed',
              'Check if drum turns freely by hand (power off) – if stiff, bearing issue',
              'If spin works manually but not in cycle, door lock sensor may be faulty',
            ],
            professionalNeeded: false,
          },
        },
        {
          label: 'Excessive vibration',
          diagnosis: {
            issue: 'Leveling or shock absorber issue',
            severity: 'low',
            diy: true,
            steps: [
              'Check machine is perfectly level with a spirit level',
              'Adjust the four leveling feet until machine doesn\'t rock',
              'Tighten the lock nuts on leveling feet',
              'Ensure shipping bolts are removed (red bolts visible at back – new appliances)',
              'Place anti-vibration pads under the machine',
              'Reduce load size if only vibrating with heavy loads',
            ],
            professionalNeeded: false,
          },
        },
      ],
    },
  },
};

/**
 * Detect issue type from user message
 */
function detectIssueType(message) {
  const text = message.toLowerCase();

  const patterns = {
    [ISSUE_TYPES.AC]: ['ac', 'air condition', 'aircon', 'cooling unit', 'split unit', 'inverter ac', 'window ac'],
    [ISSUE_TYPES.REFRIGERATOR]: ['fridge', 'refrigerator', 'freezer', 'cooling box', 'frost'],
    [ISSUE_TYPES.WIFI]: ['wifi', 'wi-fi', 'internet', 'router', 'network', 'broadband', 'connection'],
    [ISSUE_TYPES.FAN]: ['fan', 'ceiling fan', 'table fan', 'pedestal fan', 'exhaust fan'],
    [ISSUE_TYPES.WASHING_MACHINE]: ['washing machine', 'washer', 'laundry machine', 'dryer'],
    [ISSUE_TYPES.WATER_HEATER]: ['water heater', 'geyser', 'hot water', 'boiler'],
    [ISSUE_TYPES.TV]: ['tv', 'television', 'smart tv', 'led tv'],
    [ISSUE_TYPES.MICROWAVE]: ['microwave', 'oven', 'microwave oven'],
  };

  for (const [type, keywords] of Object.entries(patterns)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return type;
    }
  }

  return ISSUE_TYPES.GENERAL;
}

/**
 * Get the decision tree for a specific issue type
 */
function getDecisionTree(issueType) {
  return DECISION_TREES[issueType] || null;
}

/**
 * Determine complexity of an issue
 */
function assessComplexity(diagnosis) {
  if (!diagnosis) return 'unknown';
  if (diagnosis.professionalNeeded) return 'complex';
  if (diagnosis.severity === 'high') return 'moderate';
  return 'simple';
}

module.exports = {
  ISSUE_TYPES,
  DECISION_TREES,
  detectIssueType,
  getDecisionTree,
  assessComplexity,
};
