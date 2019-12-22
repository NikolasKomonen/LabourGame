import React from 'react'
import Typography from '@material-ui/core/Typography'
import { Box, TextField, FormControl, FormControlLabel, FormGroup, Checkbox, InputAdornment } from '@material-ui/core';
import GameRow from './GameRow'


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
            companies: [{name: "nikolas", brain: 1, muscle: 2, heart: 3}, {name: "nikolas", brain: 1, muscle: 2, heart: 3}, {name: "nikolas", brain: 1, muscle: 2, heart: 3}, {name: "nikolas", brain: 1, muscle: 2, heart: 3}, {name: "nikolas", brain: 1, muscle: 2, heart: 3}, {name: "nikolas", brain: 1, muscle: 2, heart: 3}],
        }
    }

    componentDidMount() {
        fetch('/api/getCompanies')
            .then(res => {
                return res.json();
            }).then(data => {
                this.setState({
                    companies: data,
                    isLoaded: true,
                })
                console.log("Set the state in did mount")
            }, (error) => {this.setState({
                isLoaded: true,
                error
            })})
    }

    render() {
        const {error, isLoaded, data} = this.state;
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
                            <Typography>
                                Saved
                            </Typography>
                        </Box>

                        <Box mt="auto" className="col-6" >
                            <Typography>
                                Saved 2
                            </Typography>
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
                {this.state.companies.map((c) => {
                    const i = this.state.companies.indexOf(c)
                    return (
                        <GameRow company={c} index={i}/>
                    );
                })}
            </div>
        );
    }
}