import React from "react";
import ResponsiveDrawer from "../ResponsiveDrawer";
import ResultsSection from "../ResultsSection"
import {withRouter} from "react-router-dom"

const ResultsPage = () => {
    
    return <ResponsiveDrawer main={<ResultsSection />} />
}

export default withRouter(ResultsPage);