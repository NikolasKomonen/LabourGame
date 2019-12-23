import React from 'react'
import Typography from '@material-ui/core/Typography'
import { Box, Button } from '@material-ui/core';
import GameRow from './GameRow'
import $ from 'jquery'


// function createMockData(companyName, hoursWorked, )

// const rows = [
//     createData
// ]
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
            saveStatus: "Not Saved"
        }
    }

    componentDidMount() {
        fetch('/api/getCompanies')
            .then(res => {
                return res.json();
            }).then(data => {
                
                const len = data.length
                this.setState({
                    companies: data,
                    isLoaded: true,
                    numRows: len
                })
                console.log("Set the state in did mount")
            }, (error) => {
                console.log("Error fetching companies: "+ error)
            })
    }

    collectEntries() {
        const data = []
        for (let i = 0; i < this.state.numRows; i++) {
            const hours = $('#'+HOURS_ID+i).val()
            let strike = false
            if(!isNaN(hours) && hours > 0) {
                strike = $('#'+STRIKE_ID+i).prop('checked')
            }

            data[i] = [hours, strike]
            
        }
        return JSON.stringify(data)
    }

    sendSelection() {
        const data = this.collectEntries();
        console.log("Sending data: " + data)
        fetch('/api/sendSelection', {
            method: 'POST',
            body: data,
            headers: {
                'Content-Type': 'application/json'
                // 'Content-Type': 'application/x-www-form-urlencoded',
              }
            
            
        }).then((res) => {
            const status = res.status
            if(status === 200) {
                const newState = {...this.state}
                newState.saveStatus = "Saved " + new Date().toTimeString();
            }
        })
    }

    wasChange() {

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
                            Week X
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
                            <Button id="game-submit-button" variant="contained" color="primary">Submit</Button>
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
                        <GameRow company={c} index={i} parent={this}/>
                    );
                })}
                
            </div>
        );
    }
}