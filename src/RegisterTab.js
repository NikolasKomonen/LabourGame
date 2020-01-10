import React, { Component } from 'react';
import { withStyles, TextField, Button, Container, CssBaseline, Avatar, Typography, InputLabel, Select, MenuItem } from '@material-ui/core';
import CreateIcon from '@material-ui/icons/Create';
import $ from 'jquery'
import { withRouter } from 'react-router-dom'
import { makeStyles } from '@material-ui/core/styles';


const useStyles = makeStyles(theme => ({
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
  campaign: {
    width: 100,
  },
}));



class RegisterTab extends Component {
  state = {
    redirect: false,
    passwordsMatch: true,
    registrationFailed: false,
    registrationFailedMessage: "",
    gameIDs: [],
    gameIDSelection: "",
  }

  componentDidMount() {
    fetch('/api/getAccountRegistrationData')
      .then((res) => {
        return res.json()
      })
      .then((data) => {
        const newState = { ...this.state }
        newState.gameIDs = data.campaign_ids

        this.setState(newState)
      })
  }

  clearOldErrors() {
    if (this.state.registrationFailed === true) {
      const newState = { ...this.state }
      newState.registrationFailed = false;
      this.setState(newState)

    }
  }

  validatePasswords() {
    const initial = $('#register-password-initial').val()
    const final = $('#register-password-final').val()
    if (final.length > 0 && initial !== final) {
      const newState = { ...this.state }
      newState.passwordsMatch = false
      newState.errorText = "Passwords don't match."
      this.setState(newState)
    }
    else {
      const newState = { ...this.state }
      newState.passwordsMatch = true
      newState.errorText = undefined
      this.setState(newState)
    }
  }

  ifEnterPressed(keyCode) {
    if (keyCode === 13) {
      this.registerAccount()
    }
  }

  registerAccount() {
    const username = $('#register-username').val()
    const passwordInitial = $('#register-password-final').val()
    const passwordFinal = $('#register-password-initial').val()
    const gameID = this.state.gameIDSelection
    if(passwordInitial !== passwordFinal) {
      const newState = { ...this.state }
      newState.registrationFailed = true
      newState.registrationFailedMessage="Passwords do not match"
      this.setState(newState)
      return;
    }
    if(!(gameID)) {
      const newState = { ...this.state }
      newState.registrationFailed = true
      newState.registrationFailedMessage="Please choose a Game ID."
      this.setState(newState)
      return;
    }
    if(username && passwordFinal && gameID) {
      fetch('/api/registerAccount', {
        method: 'POST',
        body: JSON.stringify({ username: username, password: passwordFinal, campaign_id: gameID }),
        headers: {
          'Content-Type': 'application/json'
        }
      }).then((res) => {
        const status = res.status
        if (status === 200) {
          this.props.history.push('/login')
        }
        else if (status === 422) {
          return res.text()
        }
      })
      .then((fail) => {
        if(fail) {
          const newState = { ...this.state }
          newState.registrationFailed = true
          newState.registrationFailedMessage = fail
          this.setState(newState)
        }
      })
    }
  }

  handleGameIDSelection(event) {
    console.log(event)
    const newState = { ...this.state }
    newState.gameIDSelection = event.target.value
    this.setState(newState)
  }

  render() {
    const classes = useStyles;
    const renderRegistrationError = this.state.registrationFailed
    const gameIDOptions = this.state.gameIDs.map((item, index) => {
      return (<MenuItem key={index} value={item.id} onClick={() => {this.clearOldErrors()}}>{item.name}</MenuItem>)
    })

    return (
      <Container className="pt-5" component="main" maxWidth="xs">
        <CssBaseline />
        <div className={classes.paper}>
          <Avatar className={classes.avatar}>
            <CreateIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Register
                </Typography>
          <form className={classes.form} onChange={() => { this.clearOldErrors() }} onKeyDown={(e) => { this.ifEnterPressed(e.keyCode) }}>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="register-username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="register-password-initial"
              autoComplete="current-password"
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label="Re-enter Password"
              type="password"
              id="register-password-final"
              autoComplete="current-password"
              error={!this.state.passwordsMatch}
              helperText={this.state.errorText}
              onChange={() => { this.validatePasswords() }}
            />
            <InputLabel id="demo-simple-select-label">Game ID</InputLabel>
            <Select
              id="game-id-selection"
              value={this.state.gameIDSelection}
              className="col-12"
              required
              onChange={(e) => {this.handleGameIDSelection(e); this.clearOldErrors()}}
            >
              {gameIDOptions}
            </Select>
            {renderRegistrationError ? (<div className="mt-2" align="center">{this.state.registrationFailedMessage}</div>) : undefined}
            <Button
              type="button"
              fullWidth
              variant="contained"
              color="primary"
              className={classes.submit + " mt-3"}
              onClick={() => { this.registerAccount() }}
            >
              Register
                  </Button>
          </form>
        </div>

      </Container>
    );
  }
}

export default withStyles(useStyles)(withRouter(RegisterTab));