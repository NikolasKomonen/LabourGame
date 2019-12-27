import React, { Component } from 'react';
import { withStyles, TextField, Button, Container, CssBaseline, Avatar, Typography } from '@material-ui/core';
import CreateIcon from '@material-ui/icons/Create';
import $ from 'jquery'
import {withRouter} from 'react-router-dom'
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
  }));

class RegisterTab extends Component {
    state = {
        redirect: false,
        passwordsMatch: true,
        registrationFailed: false
    }

    clearOldErrors() {
        if(this.state.registrationFailed === true) {
            const newState = {...this.state}
            newState.registrationFailed = false;
            this.setState(newState)

        }
    }

    validatePasswords() {
        const initial = $('#register-password-initial').val()
        const final = $('#register-password-final').val()
        if(final.length > 0 && initial !== final) {
            console.log('Pwrods dont match')
            const newState = {...this.state}
            newState.passwordsMatch = false
            newState.errorText="Passwords don't match."
            this.setState(newState)
        }
        else {
            console.log('Pwrodsmatch')
            const newState = {...this.state}
            newState.passwordsMatch = true
            newState.errorText=undefined
            this.setState(newState)
        }
    }

    registerAccount() {
        const username = $('#register-username').val()
        const password = $('#register-password-final').val()
        console.log("Username: ", username, " Password: ", password)
        fetch('/api/registerAccount', {
            method: 'POST',
            body: JSON.stringify({ username: username, password: password }),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => {
            const status = res.status
            if (status === 200) {
                this.props.history.push('/login')
            }
            if (status === 422) {
                const newState = {...this.state}
                newState.registrationFailed = true
                this.setState(newState)
            }
        })
    }

    render() {
        const classes = useStyles;
        const renderRegistrationError = this.state.registrationFailed
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
                <form className={classes.form} onChange={() => {this.clearOldErrors()}}>
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
                    onChange={() => {this.validatePasswords()}}
                  />
                  { renderRegistrationError ? (<div>Registration Failed</div>) : undefined}
                  <Button
                    type="button"
                    fullWidth
                    variant="contained"
                    color="primary"
                    className={classes.submit + " mt-3"}
                    onClick={() => {this.registerAccount()}}
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