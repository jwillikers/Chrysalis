/* Chrysalis -- Kaleidoscope Command Center
 * Copyright (C) 2021  Keyboardio, Inc.
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 */

import Focus from "../focus";

global.chrysalis_macros_instance = null;

class Macros {
  constructor(opts) {
    if (!global.chrysalis_macros_instance) {
      this.steps = [
        this.stepEnd(),
        this.stepu8("INTERVAL", 1),
        this.stepu8("WAIT", 2),
        this.stepu16("KEYDOWN", 3),
        this.stepu16("KEYUP", 4),
        this.stepu16("TAP", 5),
        this.stepu8("KEYCODEDOWN", 6),
        this.stepu8("KEYCODEUP", 7),
        this.stepu8("TAPCODE", 8),
        this.stepEmpty("EXPLICIT_REPORT", 9),
        this.stepEmpty("IMPLICIT_REPORT", 10),
        this.stepEmpty("SEND_REPORT", 11),
        this.stepTapSequence(),
        this.stepTapCodeSequence()
      ];
      global.chrysalis_macros_instance = this;
    }

    return global.chrysalis_macros_instance;
  }

  stepEnd() {
    return {
      // We do not need to parse the END step, as we handle that specially.
      serialize: function(data) {
        if (data.type == "END") {
          return [0];
        }
      }
    };
  }

  stepEmpty(type, id) {
    return {
      parse: function() {
        return {
          macroStep: {
            type: type
          },
          advance: 0
        };
      },
      serialize: function(data) {
        if (data.type == type) {
          return [id];
        }
      }
    };
  }

  stepu8(type, id) {
    return {
      parse: function(data) {
        return {
          macroStep: {
            type: type,
            value: data[0]
          },
          advance: 1
        };
      },
      serialize: function(data) {
        if (data.type == type) {
          return [id, data.value];
        }
      }
    };
  }

  stepu16(type, id) {
    return {
      parse: function(data) {
        return {
          macroStep: {
            type: type,
            value: data[0] * 256 + data[1]
          },
          advance: 2
        };
      },
      serialize: function(data) {
        if (data.type == type) {
          return [id, Math.floor(data.value / 256), data.value % 256];
        }
      }
    };
  }

  stepTapSequence() {
    return {
      parse: function(data) {
        let pos = 0;
        let sequence = [];
        let key = 0;
        do {
          key = data[pos] * 256 + data[pos + 1];
          if (key > 0) sequence.push(key);
          pos += 2;
        } while (key > 0);
        return {
          macroStep: {
            type: "TAPSEQUENCE",
            value: sequence
          },
          advance: pos
        };
      },
      serialize: function(data) {
        if (data.type == "TAPSEQUENCE") {
          let ser = [12];
          for (let i = 0; i < data.value.length; i++) {
            ser.push(Math.floor(data.value[i] / 256));
            ser.push(data.value[i] % 256);
          }
          ser.push(0);
          ser.push(0);
          return ser;
        }
      }
    };
  }

  stepTapCodeSequence() {
    return {
      parse: function(data) {
        let pos = 0;
        let sequence = [];
        let key = 0;
        do {
          key = data[pos];
          if (key > 0) sequence.push(key);
          pos += 1;
        } while (key > 0);
        return {
          macroStep: {
            type: "TAPCODESEQUENCE",
            value: sequence
          },
          advance: pos
        };
      },
      serialize: function(data) {
        if (data.type == "TAPCODESEQUENCE") {
          let ser = [13];
          for (let i = 0; i < data.value.length; i++) {
            ser.push(data.value[i]);
          }
          ser.push(0);
          return ser;
        }
      }
    };
  }

  serializeMacros(macros) {
    let ser = [];

    for (const macro of macros) {
      for (const macroStep of macro) {
        for (const step of this.steps) {
          const s = step.serialize(macroStep);
          if (s) {
            ser = ser.concat(s);
          }
        }
      }
      ser = ser.concat([0]);
    }

    return ser;
  }

  parseMacros(macroMap) {
    // First, check if we're all 255 bytes, when we're uninitialized
    if (macroMap.filter(n => n != 255).length == 0) {
      return [];
    }
    let macros = [];
    let currentMacro = 0;
    let pos = 0;

    while (pos < macroMap.length) {
      const step = macroMap[pos];
      if (step == 0) {
        currentMacro++;
        pos++;
      } else if (this.steps[step]) {
        const res = this.steps[step].parse(macroMap.slice(pos + 1));
        pos += res.advance + 1;
        if (macros[currentMacro]) {
          macros[currentMacro].push(res.macroStep);
        } else {
          macros[currentMacro] = [res.macroStep];
        }
      }
    }
    return macros;
  }

  async focus(s, macros) {
    if (macros) {
      // serialize and update
    } else {
      const macroMap = (await s.request("macros.map"))
        .trimEnd()
        .split(" ")
        .map(v => parseInt(v));

      return {
        storageSize: macroMap.length,
        macros: this.parseMacros(macroMap)
      };
    }
  }
}

let focus = new Focus();
focus.addCommands({
  macros: new Macros()
});

export { Macros as default };
