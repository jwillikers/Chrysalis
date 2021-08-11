// -*- mode: js-jsx -*-
/* Chrysalis -- Kaleidoscope Command Center
 * Copyright (C) 2018, 2019, 2020  Keyboardio, Inc.
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

import React from "react";
import PropTypes from "prop-types";

import Alert from "@material-ui/lab/Alert";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CircularProgress from "@material-ui/core/CircularProgress";
import FormControl from "@material-ui/core/FormControl";
import KeyboardIcon from "@material-ui/icons/Keyboard";
import LinearProgress from "@material-ui/core/LinearProgress";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import MenuItem from "@material-ui/core/MenuItem";
import Portal from "@material-ui/core/Portal";
import Select from "@material-ui/core/Select";
import Typography from "@material-ui/core/Typography";
import withStyles from "@material-ui/core/styles/withStyles";

import { toast } from "react-toastify";

import Focus from "../../api/focus";
import Hardware from "../../api/hardware";

import usb from "usb";

import i18n from "../i18n";

import { installUdevRules } from "../utils/installUdevRules";
import { insideFlatpak } from "../utils/flatpak";

const styles = theme => ({
  loader: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0
  },
  main: {
    width: "auto",
    display: "block",
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(3),
    [theme.breakpoints.up(500 + theme.spacing(3) * 2)]: {
      width: 500,
      marginLeft: "auto",
      marginRight: "auto"
    },
    padding: `${theme.spacing(2)}px ${theme.spacing(3)}px
 ${theme.spacing(3)}px`
  },
  preview: {
    maxWidth: 128,
    marginBottom: theme.spacing(2),
    "& .key rect, & .key path, & .key ellipse": {
      stroke: "#000000"
    }
  },
  card: {
    marginTop: theme.spacing(5),
    padding: `${theme.spacing(2)}px ${theme.spacing(3)}px ${theme.spacing(3)}px`
  },
  content: {
    display: "inline-block",
    width: "100%",
    textAlign: "center"
  },
  selectControl: {
    display: "flex"
  },
  connect: {
    verticalAlign: "bottom",
    marginLeft: 65
  },
  cardActions: {
    justifyContent: "center"
  },
  supported: {
    backgroundColor: theme.palette.secondary.main
  },
  grow: {
    flexGrow: 1
  },
  error: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    textAlign: "center"
  },
  found: {
    color: theme.palette.success.main
  }
});

class KeyboardSelect extends React.Component {
  state = {
    selectedPortIndex: 0,
    opening: false,
    devices: null,
    loading: false,
    scanForKeyboards: false
  };

  findNonSerialKeyboards = deviceList => {
    const devices = usb.getDeviceList().map(device => device.deviceDescriptor);
    devices.forEach(desc => {
      Hardware.nonSerial.forEach(device => {
        device.accessible = true;
        if (
          desc.idVendor == device.usb.vendorId &&
          desc.idProduct == device.usb.productId
        ) {
          let found = false;
          deviceList.forEach(sDevice => {
            if (
              sDevice.device.usb.vendorId == desc.idVendor &&
              sDevice.device.usb.productId == desc.idProduct
            ) {
              found = true;
            }
          });
          if (!found) deviceList.push({ device: device });
        }
      });
    });
    return deviceList;
  };

  findKeyboards = async () => {
    this.setState({ loading: true });
    let focus = new Focus();

    return new Promise(resolve => {
      focus
        .find(...Hardware.serial)
        .then(async devices => {
          let supported_devices = [];
          for (const device of devices) {
            device.accessible = await focus.isDeviceAccessible(device);
            if (device.accessible && (await focus.isDeviceSupported(device))) {
              supported_devices.push(device);
            } else if (!device.accessible) {
              supported_devices.push(device);
            }
          }
          const list = this.findNonSerialKeyboards(supported_devices);
          this.setState({
            loading: false,
            scanForKeyboards: false,
            devices: list
          });
          resolve(list.length > 0);
        })
        .catch(() => {
          const list = this.findNonSerialKeyboards([]);
          this.setState({
            loading: false,
            scanForKeyboards: false,
            devices: list
          });
          resolve(list.length > 0);
        });
    });
  };

  scanDevices = async () => {
    let found = await this.findKeyboards();
    this.setState({ scanFoundDevices: found });
    setTimeout(() => {
      this.setState({ scanFoundDevices: undefined });
    }, 1000);
  };

  componentDidMount() {
    setInterval(() => {
      if (this.state.scanForKeyboards) {
        this.findKeyboards();
      }
    }, 10000);

    this.finder = () => {
      this.setState({ scanForKeyboards: true });
    };
    usb.on("attach", this.finder);
    usb.on("detach", this.finder);

    this.findKeyboards().then(() => {
      let focus = new Focus();
      if (!focus._port) return;

      for (let device of this.state.devices) {
        if (!device.path) continue;

        if (device.path == focus._port.path) {
          this.setState(state => ({
            selectedPortIndex: state.devices.indexOf(device)
          }));
          break;
        }
      }
    });
  }

  componentWillUnmount() {
    usb.off("attach", this.finder);
    usb.off("detach", this.finder);
  }

  selectPort = event => {
    this.setState({ selectedPortIndex: event.target.value });
  };

  onKeyboardConnect = async () => {
    this.setState({ opening: true });

    const { devices } = this.state;

    try {
      await this.props.onConnect(devices[this.state.selectedPortIndex]);
    } catch (err) {
      this.setState({
        opening: false
      });
      toast.error(err.toString());
    }

    i18n.refreshHardware(devices[this.state.selectedPortIndex]);
  };

  installUdevRules = async () => {
    const { devices } = this.state;
    const selectedDevice = devices && devices[this.state.selectedPortIndex];

    try {
      await installUdevRules(selectedDevice.path);
    } catch (err) {
      toast.error(err.toString());
      return;
    }

    await this.scanDevices();
  };

  render() {
    const { classes } = this.props;
    const { scanFoundDevices, devices } = this.state;

    let loader = null;
    if (this.state.loading) {
      loader = <LinearProgress variant="query" className={classes.loader} />;
    }

    let deviceItems = null;
    let port = null;
    if (devices && devices.length > 0) {
      deviceItems = devices.map((option, index) => {
        let label = option.path;
        if (option.device && option.device.info) {
          label = (
            <ListItemText
              primary={option.device.info.displayName}
              secondary={option.path || i18n.t("keyboardSelect.unknown")}
            />
          );
        } else if (option.info) {
          label = <ListItemText primary={option.info.displayName} />;
        }

        const icon = (
          <ListItemIcon>
            <Avatar className={option.path && classes.supported}>
              <KeyboardIcon />
            </Avatar>
          </ListItemIcon>
        );

        return (
          <MenuItem
            key={`device-${index}`}
            value={index}
            selected={index === this.state.selectedPortIndex}
          >
            {icon}
            {label}
          </MenuItem>
        );
      });

      port = (
        <FormControl className={classes.selectControl}>
          <Select
            value={this.state.selectedPortIndex}
            classes={{ select: classes.selectControl }}
            onChange={this.selectPort}
          >
            {deviceItems}
          </Select>
        </FormControl>
      );
    }

    if (devices && devices.length == 0) {
      port = (
        <Typography variant="body1" color="error" className={classes.error}>
          {i18n.t("keyboardSelect.noDevices")}
        </Typography>
      );
    }

    let connectContent = i18n.t("keyboardSelect.connect");
    if (this.state.opening) {
      connectContent = <CircularProgress color="secondary" size={16} />;
    }

    const scanDevicesButton = (
      <Button
        variant={devices && devices.length ? "outlined" : "contained"}
        color={devices && devices.length ? "default" : "primary"}
        className={scanFoundDevices && classes.found}
        onClick={scanFoundDevices ? null : this.scanDevices}
      >
        {i18n.t("keyboardSelect.scan")}
      </Button>
    );

    let connectionButton, permissionWarning;
    let focus = new Focus();
    const selectedDevice = devices && devices[this.state.selectedPortIndex];

    if (
      process.platform == "linux" &&
      !insideFlatpak() &&
      selectedDevice &&
      !selectedDevice.accessible
    ) {
      const fixitButton = (
        <Button onClick={this.installUdevRules} variant="outlined">
          {i18n.t("keyboardSelect.installUdevRules")}
        </Button>
      );
      permissionWarning = (
        <Alert severity="error" action={fixitButton}>
          <Typography component="p" gutterBottom>
            {i18n.t("keyboardSelect.permissionError", {
              path: selectedDevice.path
            })}
          </Typography>
          <Typography component="p">
            {i18n.t("keyboardSelect.permissionErrorSuggestion")}
          </Typography>
        </Alert>
      );
    }

    if (
      focus.device &&
      selectedDevice &&
      selectedDevice.device == focus.device
    ) {
      connectionButton = (
        <Button
          disabled={
            this.state.opening ||
            (this.state.devices && this.state.devices.length == 0)
          }
          variant="outlined"
          color="secondary"
          onClick={this.props.onDisconnect}
        >
          {i18n.t("keyboardSelect.disconnect")}
        </Button>
      );
    } else {
      connectionButton = (
        <Button
          disabled={
            (selectedDevice ? !selectedDevice.accessible : false) ||
            this.state.opening ||
            (this.state.devices && this.state.devices.length == 0)
          }
          variant="contained"
          color="primary"
          onClick={this.onKeyboardConnect}
          className={classes.connect}
        >
          {connectContent}
        </Button>
      );
    }

    let preview;
    if (
      devices &&
      devices[this.state.selectedPortIndex] &&
      devices[this.state.selectedPortIndex].device &&
      devices[this.state.selectedPortIndex].device.components
    ) {
      const Keymap =
        devices[this.state.selectedPortIndex].device.components.keymap;
      preview = <Keymap index={0} className={classes.preview} />;
    }

    return (
      <React.Fragment>
        <Portal container={this.props.titleElement}>
          {i18n.t("app.menu.selectAKeyboard")}
        </Portal>
        {loader}
        {permissionWarning}

        <div className={classes.main}>
          <Card className={classes.card}>
            <CardContent className={classes.content}>
              {preview}
              {port}
            </CardContent>
            <CardActions className={classes.cardActions}>
              {scanDevicesButton}
              <div className={classes.grow} />
              {connectionButton}
            </CardActions>
          </Card>
        </div>
      </React.Fragment>
    );
  }
}

KeyboardSelect.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(KeyboardSelect);
