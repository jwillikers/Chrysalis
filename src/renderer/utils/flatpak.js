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

function insideFlatpak() {
  const flatpakInfoPath = "/.flatpak-info";
  return process.platform == "linux" && fs.existsSync(flatpakInfoPath);
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

async function listPorts() {
  return new Promise(resolve => {
    const ttySysClassPath = "/sys/class/tty";
    const ports = [];
    const hasDeviceUeventFile = dir => {
      return fs.lstatSync(path.join(dir, "device", "uevent")).isFile();
    };

    const isDir = fileName => {
      return fs.lstatSync(fileName).isDirectory();
    };

    const getDirectories = folderPath =>
      fs
        .readdirSync(folderPath)
        .map(fileName => {
          return path.join(folderPath, fileName);
        })
        .filter(isDir);

    console.log("Directories: " + getDirectories(ttySysClassPath).values());

    for (const dirPath of getDirectories(ttySysClassPath).values()) {
      const dir = path.basename(dirPath);
      // console.log("dir: " + dir);
      // const dirPath = path.join(ttySysClassPath, dir);
      console.log("dirPath: " + dirPath);
      if (!hasDeviceUeventFile(dirPath)) {
        continue;
      }
      let port = { path: path.join("/dev", dir) };
      console.log("Path: " + port["path"]);
      const fileStream = fs.createReadStream(
        path.join(dirPath, "device", "uevent")
      );
      const lines = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      lines.on("line", line => {
        const values = line.match(/^PRODUCT=(.*),(.*),.*/);
        if (!values) {
          return;
        }
        port["vendorId"] = values[0];
        console.log("Vendor ID: " + port["vendorId"]);
        port["modelId"] = values[1];
        console.log("Model ID: " + port["model"]);
        ports.push(port);
      });
    }

    resolve(ports);
  });
}

export { insideFlatpak, listPorts };
