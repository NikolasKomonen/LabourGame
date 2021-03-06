import React, { Component } from 'react';
import { withStyles, Grid, TextField, Button, Container, CssBaseline, Avatar, Typography, Box, Dialog } from '@material-ui/core';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import $ from 'jquery'
import { withRouter, Link } from 'react-router-dom'
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
    }
}));



class LoginTab extends Component {
    constructor() {
        super();
        this.state = {
            showForgotPasswordPopup: false,
            loginErrorMessage: undefined

        }
    }

    closeModal() {
        this.setState({ showForgotPasswordPopup: false })
    }

    openModal() {
        this.setState({ showForgotPasswordPopup: true })
    }

    ifEnterPressed(keyCode) {
        if (keyCode === 13) {
            this.validateLogin()
        }
    }

    validateLogin() {
        const username = $('#login-username').val()
        const password = $('#login-password').val()
        fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username: username, password: password }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then((res) => {
            return Promise.all([Promise.resolve(res.status), res.json()])
        })
        .then((res) => {
            const status = res[0]
            const body = res[1]
            if (status === 200) {
                if(body.isAdmin) {
                    this.props.history.push('/adminResults')
                    return
                }
                this.props.history.push('/game')
                return;
            }
            return body.message

        }).then((text) => {
            if (text) {
                const newState = { ...this.state }

                newState.loginErrorMessage = text
                this.setState(newState)
            }
        })
    }

    newLoginAttempt() {
        if (this.state.loginErrorMessage) {
            const newState = { ...this.state }
            newState.loginErrorMessage = undefined
            this.setState(newState)
        }
    }

    render() {
        const classes = useStyles;

        return (
            <Container className="mt-5" component="main" maxWidth="xs">
                <CssBaseline />
                <div className={classes.paper}>
                    <Avatar className={classes.avatar}>
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Sign in
                </Typography>
                    <form className={classes.form} onChange={() => { this.newLoginAttempt() }} onKeyDown={(e) => { this.ifEnterPressed(e.keyCode) }}>
                        <TextField
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            id="login-username"
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
                            id="login-password"
                            autoComplete="current-password"
                        />
                        <Box ><Typography color="error">{this.state.loginErrorMessage}</Typography></Box>
                        <Button
                            type="button"
                            fullWidth
                            variant="contained"
                            color="primary"
                            className="mt-2"
                            onClick={() => { this.validateLogin() }}
                        >
                            Sign In
                        </Button>
                        <Grid container className="mt-2">
                            <Grid item xs>
                                <Link to="" onClick={(e) => { e.preventDefault(); this.openModal() }} >
                                    Forgot password?
                                </Link>
                                <Dialog onClose={() => { this.closeModal() }} open={this.state.showForgotPasswordPopup}>
                                    <Box className="p-3">
                                        <h3>Please Contact Nikolas Komonen</h3>
                                        <p>Email: nikolas.komonen AT mail.utoronto.ca</p>
                                    </Box>
                                </Dialog>
                            </Grid>
                            <Grid item>
                                <Link to="/register">
                                    {"Don't have an account? Sign Up"}
                                </Link>
                            </Grid>
                        </Grid>
                    </form>
                </div>
            </Container>
        );
    }
}

export default withStyles(useStyles)(withRouter(LoginTab));