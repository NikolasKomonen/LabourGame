import React, { Component } from 'react';
import { Paper, withStyles, Grid, TextField, Button, FormControlLabel, Checkbox, Box } from '@material-ui/core';
import { Face, Fingerprint } from '@material-ui/icons'
import $ from 'jquery'
import {withRouter} from 'react-router-dom'

const styles = theme => ({
    margin: {
        margin: theme.spacing(2),
    },
    padding: {
        padding: theme.spacing()
    }
});



class LoginTab extends Component {
    state = {
        redirect: false
    }

    validateLogin() {
        const username = $('#login-username').val()
        const password = $('#login-password').val()
        fetch('/auth', {
            method: 'POST',
            body: JSON.stringify({ username: username, password: password }),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => {
            const status = res.status
            if (status === 200) {
                console.log(this.props)

                this.props.history.push('/game')
            }
            if (status === 422) {
                $('#error-message').val(res.body)
            }
        })
    }

    render() {
        const { classes } = this.props;
        return (
            <Box className="container">
                <Box className="col-12 col-lg-6 offset-lg-3 ">
                    <Paper className={classes.padding}>
                        <div className={classes.margin}>
                            <Grid container spacing={8} alignItems="flex-end">
                                <Grid item>
                                    <Face />
                                </Grid>
                                <Grid item md={true} sm={true} xs={true}>
                                    <TextField id="login-username" label="Username" type="email" fullWidth autoFocus required />
                                </Grid>
                            </Grid>
                            <Grid container spacing={8} alignItems="flex-end">
                                <Grid item>
                                    <Fingerprint />
                                </Grid>
                                <Grid item md={true} sm={true} xs={true}>
                                    <TextField id="login-password" label="Password" type="password" fullWidth required />
                                </Grid>
                            </Grid>
                            <Grid container alignItems="center" justify="space-between">
                                <Grid item>
                                    <FormControlLabel control={
                                        <Checkbox
                                            color="primary"
                                        />
                                    } label="Remember me" />
                                </Grid>
                                <Grid item>
                                    <Button disableFocusRipple disableRipple style={{ textTransform: "none" }} variant="text" color="primary">Forgot password ?</Button>
                                </Grid>
                            </Grid>
                            <Grid container justify="center" style={{ marginTop: '10px' }}>

                                <Button variant="outlined" color="primary" style={{ textTransform: "none" }} onClick={() => this.validateLogin()}>Login</Button>
                                <Box id="error-message"></Box>
                            </Grid>
                        </div>
                    </Paper>
                </Box>
            </Box>
        );
    }
}

export default withStyles(styles)(withRouter(LoginTab));