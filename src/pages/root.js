import React, { Component } from "react";
import {withRouter, Redirect} from 'react-router-dom'

class RootRedirect extends Component {
    constructor() {
        super()
        this.state = {
            alreadyLoggedIn: false,
            isLoaded: false
        }
    }

    componentDidMount() {
        fetch('/api/isLoggedIn').then((res) => 
            (res.text())
        ).then(data => {
            if(data === "Hi") {
                console.log("Updating the stataz")
                this.setState({
                    alreadyLoggedIn: true,
                    isLoaded: true
                })
            }
        })
    }

    render() {
        // So I had to add in isLoaded because what would happen without it
        // is that one of the redirected below would trigger and when the state
        // was updated in the above function componentDidMount() this component wasn't
        // mounted anymore because it was redirected elsewhere. To fix this
        // if the request to the server wasnt completed it would just render the <div's
        // below. But once we had the info from the server ready we would update the state
        // and finally select one of the Redirects.
        //
        // The original error was: Can't perform a React state update on an unmounted component
        if(!this.state.isLoaded) {
            return <div></div>
        }
        if(this.state.alreadyLoggedIn) {
            console.log("redirected to game")
            return <Redirect to='/game' />
        }
        console.log("redirected to login")
        return <Redirect to='/login' />;
    }
}

export default withRouter(RootRedirect);