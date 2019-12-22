import React, { Component } from 'react'

import {BrowserRouter as Router, Switch, Route} from "react-router-dom"

import LoginPage from "./pages/login"
import GamePage from "./pages/game"

class App extends Component {
    render() {
        return (
            <Router >
                {/* 'Switch' ensures that once a pattern match for 'path' is found it stops */}
                <Switch>
                    {/* 'exact' means it must exactly be a '/' with nothing after */}
                    <Route exact path="/" component={LoginPage}/>
                    <Route path="/game" component={GamePage}/>
                </Switch>
            </Router>
        )
    }
}



export default App;