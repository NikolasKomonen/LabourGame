import React from "react";
import ResponsiveDrawer from "../ResponsiveDrawer";
import GameForm from "../GameForm"
import {withRouter} from "react-router-dom"

const GamePage = () => {
    
    return <ResponsiveDrawer main={<GameForm />} />
}

export default withRouter(GamePage);