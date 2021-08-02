// -*- mode: js-jsx -*-
/* Chrysalis -- Kaleidoscope Command Center
 * Copyright (C) 2021  Keyboardio, Inc.
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

import Focus from "../../api/focus";

import AddIcon from "@material-ui/icons/Add";
import Avatar from "@material-ui/core/Avatar";
import BuildIcon from "@material-ui/icons/Build";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import Fab from "@material-ui/core/Fab";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Portal from "@material-ui/core/Portal";
import { withStyles } from "@material-ui/core/styles";

import { toast } from "react-toastify";

import i18n from "../i18n";
import { navigate } from "../routerHistory";

const styles = theme => ({
  root: {
    display: "flex",
    margin: theme.spacing(4)
  },
  card: {
    margin: theme.spacing(1)
  }
});

class MacroStep extends React.Component {
  render() {
    const { step } = this.props;

    const stepTitle = i18n.t("macroEditor.steps." + step.type);
    let stepVals = "";

    if (step.type == "INTERVAL" || step.type == "WAIT") {
      stepVals = step.value;
    }

    if (
      step.type == "KEYDOWN" ||
      step.type == "KEYUP" ||
      step.type == "TAP" ||
      step.type == "KEYCODEDOWN" ||
      step.type == "KEYCODEUP" ||
      step.type == "TAPCODE"
    ) {
      stepVals = step.value;
    }

    if (step.type == "TAPCODESEQUENCE" || step.type == "TAPSEQUENCE") {
      stepVals = step.value.join(" ");
    }

    return (
      <ListItem button>
        <ListItemText primary={stepTitle} secondary={stepVals} />
      </ListItem>
    );
  }
}

class UnstyledMacro extends React.Component {
  render() {
    const { macro, index, classes } = this.props;

    const title = i18n.t("macroEditor.macroTitle", { index: index });

    const macroSteps = macro.map((step, stepIndex) => (
      <MacroStep step={step} key={`me-ms-${index}-${stepIndex}`} />
    ));

    return (
      <Card className={classes.card}>
        <CardHeader
          avatar={
            <Avatar>
              <BuildIcon />
            </Avatar>
          }
          subheader={title}
        />
        <CardContent>
          <List>{macroSteps}</List>
        </CardContent>
        <CardActions>
          <Fab color="secondary">
            <AddIcon />
          </Fab>
        </CardActions>
      </Card>
    );
  }
}
const Macro = withStyles(styles)(UnstyledMacro);

class MacroEditor extends React.Component {
  state = {
    macros: {
      storageSize: 0,
      macros: []
    }
  };

  async componentDidMount() {
    let focus = new Focus();
    let macros = await focus.command("macros");
    this.setState({
      macros: macros
    });
  }

  render() {
    let focus = new Focus();
    const { classes } = this.props;

    let macroCards;

    macroCards = this.state.macros.macros.map((macro, index) => (
      <Macro macro={macro} index={index} key={`macro-card-${index}`} />
    ));

    return (
      <div className={classes.root}>
        <Portal container={this.props.titleElement}>
          {i18n.t("macroEditor.title")}
        </Portal>
        {macroCards}
      </div>
    );
  }
}

export default withStyles(styles)(MacroEditor);
