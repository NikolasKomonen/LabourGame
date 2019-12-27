import React, { Component } from 'react'

// Breaks if you use regular Router
import { Switch, Route, withRouter } from "react-router-dom"

import LoginPage from "./pages/login"
import GamePage from "./pages/game"
import RootRedirect from "./pages/root"
import RegisterPage from "./pages/register"

class App extends Component {

    redirectToLogin() {
        this.props.history.push('/login')
    }
    render() {
        console.log()
        return (
            
            <div >
                {/* 'Switch' ensures that once a pattern match for 'path' is found it stops */}
                <Switch>
                    {/* 'exact' means it must exactly be a '/' with nothing after */}
                    <Route exact path="/"  component={RootRedirect}/>
                    <Route path="/login" component={LoginPage} />
                    <Route path="/register" component={RegisterPage} />
                    <Route path="/game" component={GamePage}/>
                </Switch>
            </div>
            
        )
    }
}



export default withRouter(App);