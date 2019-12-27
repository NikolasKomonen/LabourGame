import React from 'react'
import Typography from '@material-ui/core/Typography'
import { Box, Button } from '@material-ui/core';
import GameRow from './GameRow'

export const HOURS_ID = 'game-hours-'
export const BRAIN_ID = 'game-brain-'
export const MUSCLE_ID = 'game-muscle-'
export const HEART_ID = 'game-heart-'
export const STRIKE_ID = 'game-strike-'

export default class GameForm extends React.Component {

    constructor() {
        super();
        this.state = {
            isLoaded: false,
            companies: [],
            saveStatus: "Not Saved",
            disableAll: false,
            week: 0
        }
    }

    componentDidMount() {
        fetch('/api/getCompanies')
            .then(res => {
                return res.json();
            }).then(data => {
                const tempState = {...this.state}
                const len = data.length
                tempState.companies = data.sessions
                tempState.week = data.week
                tempState.isLoaded = true
                tempState.numRows = len
                this.setState(tempState)
                console.log("Set the state in did mount")
            }, (error) => {
                console.log("Error fetching companies: "+ error)
            })
    }

    sendSelection(change) {
        const data = {
            update: change, // {companies_name: ... , hours: ... , strike: ...}
            week: this.state.week,
        }
        
        fetch('/api/sendSelection', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => {
            const status = res.status
            if(status === 200) {
                const newState = {...this.state}
                newState.saveStatus = "Saved " + new Date().toTimeString();
            }
        })
    }


    render() {
        const {error, isLoaded} = this.state;
        if(error) {
            return <div>Error {error.message}</div>
        }
        if(!isLoaded) {
            return <div>Loading...</div>
        }
        return (
            <div>
                <Box className="row border-bottom" pb={4}>
                    <Box className="row col-sm-6" pl={3}>
                        <Typography className="col-12" variant="h2" id="game-form-week">
                            Week {this.state.week}
                            </Typography>
                        <Box className="col-12" mt={2}>
                            <Typography variant="h6" id="game-form-name">
                                Student Name
                            </Typography>
                        </Box>

                    </Box>
                    <Box className="row col-sm-6" pl={3} >
                        <Box mt="auto" className="col-6" pt={3}>
                            <Typography id="game-saved-status">
                                {this.state.saveStatus}
                            </Typography>
                        </Box>

                        <Box mt="auto" className="col-6" >
                            <Button id="game-submit-button" variant="contained" color="primary" disabled={this.disableAll}>Submit</Button>
                        </Box>
                    </Box>
                </Box>

                <Box className="row col-12 mt-5 py-2 pr-3" borderTop={2} borderBottom={2}>
                    <Box className="col-md-2 col-12" display="flex">
                        <Box className="mx-auto p-1" fontWeight="fontWeightBold" fontSize={26}>
                            Company
                        </Box>
                    </Box>
                    <Box className="col-md-3 col-12" display="flex">
                        <Box className="mx-auto p-1" fontWeight="fontWeightBold" fontSize={26}>
                            Hours
                        </Box>
                    </Box>
                    <Box className="col-md-6 col-12 p-0 py-md-0 py-3" display="flex">
                        <Box className="col-4" display="flex">
                            <Box className="mx-auto my-auto" fontWeight="fontWeightMedium" fontSize={18}>
                                Brain
                            </Box>
                        </Box>
                        <Box className="col-4" display="flex">
                            <Box className="mx-auto my-auto" fontWeight="fontWeightMedium" fontSize={18}>
                                Muscle
                            </Box>
                        </Box>
                        <Box className="col-4" display="flex">
                            <Box className="mx-auto my-auto" fontWeight="fontWeightMedium" fontSize={18}>
                                Heart
                            </Box>
                        </Box>
                    </Box>
                    <Box className="col-md-1 col-12" display="flex">
                        <Box className="mx-auto p-1" fontWeight="fontWeightBold" fontSize={26}>
                            Strike
                        </Box>
                    </Box>
                </Box>
                {this.state.companies.map((c, i) => {
                    return (
                        <GameRow key={i} company={c} index={i} parent={this}/>
                    );
                })}
                
            </div>
        );
    }
}