import React from "react";
import ResponsiveDrawer from "../ResponsiveDrawer";
import GameForm from "../GameForm"

const GamePage = () => {
    return <ResponsiveDrawer main={<GameForm />} />
}

export default GamePage;