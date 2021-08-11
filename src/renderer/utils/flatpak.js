// -*- mode: js-jsx -*-
/* Chrysalis -- Kaleidoscope Command Center
 * Copyright (C) 2020  Keyboardio, Inc.
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import fs from "fs";
import path from "path";
import readline from "readline";

const flatpakInfoPath = "/.flatpak-info";

async function insideFlatpak() {
  return (
    process.platform == "linux" &&
    (await fs.promises.access(flatpakInfoPath).catch(() => {
      return false;
    }))
  );
}

// Linux example port
// {
//   path: '/dev/ttyACM0',
//   manufacturer: 'Arduino (www.arduino.cc)',
//   serialNumber: '752303138333518011C1',
//   pnpId: 'usb-Arduino__www.arduino.cc__0043_752303138333518011C1-if00',
//   locationId: undefined,
//   productId: '2301',
//   vendorId: '1209'
// }
// Example Model01 at /dev/ttyACM0 /sys/class/tty/ttyACM0/device/uevent
// DEVTYPE=usb_interface
// DRIVER=cdc_acm
// PRODUCT=1209/2301/100
// TYPE=239/2/1
// INTERFACE=2/2/0
// MODALIAS=usb:v1209p2301d0100dcEFdsc02dp01ic02isc02ip00in00

function createReadStreamSafe(filename, options) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filename, options);
    fileStream.on("error", reject).on("open", () => {
      resolve(fileStream);
    });
  });
}

const ttySysClassPath = "/sys/class/tty";
const productRegex = /^PRODUCT=(?<vendorId>\d+)\/(?<productId>\d+)\/.*/;

function listPorts() {
  return new Promise(async (resolve, reject) => {
    let ports = [];
    let openedDir;
    try {
      openedDir = await fs.promises.opendir(ttySysClassPath);
    } catch (err) {
      console.error(err);
      reject(err);
    }
    for await (const fileDirent of openedDir) {
      const dir = fileDirent.name;
      console.log("dir: " + dir);
      const dirPath = path.join(ttySysClassPath, dir);
      console.log("dirPath: " + dirPath);

      let stat;
      try {
        stat = await fs.promises.stat(dirPath);
      } catch (err) {
        console.debug(err);
        continue;
      }
      if (!stat.isDirectory()) {
        continue;
      }

      let port = { path: path.join("/dev", dir) };
      console.log("Path: " + port.path);

      console.log("Creating readStream: " + port.path);
      let fileStream;
      try {
        fileStream = await createReadStreamSafe(
          path.join(dirPath, "device", "uevent")
        );
      } catch (err) {
        console.debug(err);
        continue;
      }

      console.log("Creating readline interface...");

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      console.log("Looping over the lines of the file...");

      for await (const line of rl) {
        console.log("Line: " + line);
        const found = line.match(productRegex);
        if (!found) {
          continue;
        }
        port.vendorId = found.groups["vendorId"];
        console.log("Vendor ID: " + port.vendorId);
        port.productId = found.groups["productId"];
        console.log("Product ID: " + port.productId);
        ports.push(port);
        break;
      }

      console.log("Finished looping over the lines of the file");
    }

    console.dir(ports, { maxArrayLength: null });
    resolve(ports);
  });
}

export { insideFlatpak, listPorts };
