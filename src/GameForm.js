import React from 'react'
import Typography from '@material-ui/core/Typography'
import { Box, Button, withStyles, } from '@material-ui/core';
import GameRow from './GameRow'
import GameTotals from './GameTotals'
import indigo from '@material-ui/core/colors/indigo'
import AvailablePoints from './AvailablePoints';

export const HOURS_ID = 'game-hours-'
export const BRAIN_ID = 'game-brain-'
export const MUSCLE_ID = 'game-muscle-'
export const HEART_ID = 'game-heart-'
export const STRIKE_ID = 'game-strike-'

const styles = withStyles({
    availablePointsContainer: {
        background: indigo[500],
        position: 'sticky',
        top: 65,
        color: 'black',
        paddingTop: '40px',
        paddingBottom: '40px',
        zIndex: 5,
    },
    columnHeaders: {

        position: 'sticky',
        top: 155,
        background: 'white',
        paddingTop: '40px',
        paddingBottom: '40px',
        zIndex: 5,
    },
    availablePointsButtons: {
        border: 'solid white 1px',
        color: 'white',
    }
});

class GameForm extends React.Component {

    constructor() {
        super();
        this.state = {
            isLoaded: false,
            submitted: false,
            companies: [],
            saveStatus: "Last Saved " + new Date().toLocaleTimeString(),
            disableAll: false,
            week: 0,
            totalProfit: 0,
            weekProfit: 0,
            distributablePoints: 20,
            availableBrain: 20,
            availableMuscle: 20,
            availableHeart: 20,
            totalBrain: 0,
            totalHeart: 0,
            totalMuscle: 0,
            totalHours: 0

        }
        this.timer = undefined
        // stack to determine set the saved status only after the most recent request is successful
        // incremented in GameRow
        this.selectionStack = 0;
    }

    updateTotals(hours, brain, muscle, heart) {
        this.setState((prevState) => {
            const newState = { ...prevState}
            newState.totalBrain+=brain
            newState.totalMuscle+=muscle
            newState.totalHeart+=heart
            newState.totalHours+=hours
            return newState
        })
    }

    componentDidMount() {
        fetch('/api/getGameFormData')
            .then(res => {
                return res.json();
            }).then(data => {
                const tempState = { ...this.state }
                const len = data.rows.length
                tempState.companies = data.rows
                tempState.submitted = data.submitted
                tempState.week = data.week
                tempState.isLoaded = true
                tempState.numRows = len
                tempState.username = data.username
                tempState.availableBrain = data.available_brain
                tempState.availableMuscle = data.available_muscle
                tempState.availableHeart = data.available_heart
                tempState.totalProfit = data.total_profit
                tempState.weekProfit = data.week_profit
                if(tempState.week === 1) {
                    tempState.distributablePoints = 80 - tempState.availableBrain - tempState.availableMuscle - tempState.availableHeart
                }
                this.setState(tempState)
            }, (error) => {
                console.log("Error fetching companies: " + error)
            })
    }

    sendSelection(newRow) {
        const data = {
            update: newRow, // {companies_name: ... , hours: ... , strike: ...}
            week: this.state.week,
        }
        fetch('/api/sendSelection', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => {
            this.selectionStack--
            const status = res.status
            if (status === 200 && this.selectionStack === 0) {
                const newState = { ...this.state }
                newState.saveStatus = "Last Saved " + new Date().toLocaleTimeString();
                this.setState(newState)
                return;
            }
        })

    }

    setNotSaved() {
        if (this.state.saveStatus !== "Not Saved") {
            const newState = { ...this.state }
            newState.saveStatus = "Not Saved";
            this.setState(newState)
        }
    }

    canTakeAvailablePoint() {
        return this.state.distributablePoints > 0
    }

    canReturnAvailablePoint(part) {
        let overMinimum;
        if(part === "brain") {
            overMinimum = this.state.availableBrain > 20
        }
        else if(part === "muscle") {
            overMinimum = this.state.availableMuscle > 20
        }
        else {
            overMinimum = this.state.availableHeart > 20
        }
        return overMinimum && this.state.distributablePoints < 20
    }

    incrementAvailable(part) {
        const newState = { ...this.state}
        if(this.canTakeAvailablePoint()) {
            newState.distributablePoints-=1
            if(part === 'brain') {
                newState.availableBrain+=1
            }
            else if(part === 'muscle') {
                newState.availableMuscle+=1
            }
            else {
                newState.availableHeart+=1
            }
            newState.saveStatus = "Not Saved"
            this.setState(newState)
            this.updateAvailablePoints(newState)
        }
        
    }

    decrementAvailable(part) {
        const newState = { ...this.state}
        if(this.canReturnAvailablePoint(part)) {
            newState.distributablePoints+=1
            if(part === 'brain') {
                newState.availableBrain-=1
            }
            else if(part === 'muscle') {
                newState.availableMuscle-=1
            }
            else {
                newState.availableHeart-=1
            }
            this.setState(newState)
            this.updateAvailablePoints(newState)
        }
    }

    updateAvailablePoints(newState) {
        const data = {
            available_brain: newState.availableBrain,
            available_muscle: newState.availableMuscle,
            available_heart: newState.availableHeart
        }
        fetch('/api/updateAvailablePoints', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => {
            let saveMessage;
            if(res.status === 200) {
                saveMessage = "Last Saved " + new Date().toLocaleTimeString()
            }
            else {
                saveMessage = "Issue saving on the server, contact Nikolas"
            }
            const newState = { ...this.state }
            newState.saveStatus = saveMessage
            this.setState(newState)
        })
    }
    
    submitSelection() {
        
        fetch('/api/submitGameForm').then((res) => {
            if(res.status === 200) {
                const newState = { ...this.state }
                newState.submitted = true
                newState.saveStatus = "Submitted"
                this.setState(newState)
            }
        })
    }

    render() {
        const { error, isLoaded } = this.state;
        if (error) {
            return <div>Error {error.message}</div>
        }
        if (!isLoaded) {
            return <div>Loading...</div>
        }
        return (
            <Box>

                <Box className="col-12 border-bottom" pb={4}>
                    <Box className="row">
                        <Box className="col-md-4 col-12">
                            <Typography className="col-12" variant="h2" id="game-form-week" noWrap>
                                Week {this.state.week}
                            </Typography>
                            <Box className="col-12" mt={2}>
                                <Typography variant="h6" id="game-form-name">
                                    User: <small>{this.state.username}</small>
                                </Typography>
                            </Box>

                        </Box>
                        <Box className="col-md-4 col-12" display="flex" alignItems="flex-end">
                            <Box>
                            <Box className="col-12" >
                                <Typography variant="h6" id="game-saved-status" >
                                    Previous week: <small>${this.state.weekProfit}</small>
                                </Typography>
                            </Box>
                            <Box className="col-12 " >
                                <Typography variant="h6" id="game-saved-status">
                                    Total Earnings: <small>${this.state.totalProfit}</small>
                                </Typography>
                            </Box>
                            </Box>
                        </Box>
                        <Box className="col-md-4 col-12" pr={0} display="flex" justifyContent="center">
                            <Box mt="auto" className="col-6" pt={3} pr={0} >
                                <Typography id="game-saved-status">
                                    {this.state.saveStatus}
                                </Typography>
                            </Box>

                            <Box mt="auto" className="col-6"  display="flex" justifyContent="flex-end" pr={0} >
                                <Button id="game-submit-button" variant="contained" color="primary" disabled={this.state.submitted} onClick={() => {
                                    this.submitSelection()
                                }}>
                                    Submit
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Box className={this.props.classes.availablePointsContainer + " col-12 mt-3 py-3"} borderRadius={5}>
                    <Box className="row">
                        <Box className="col-md-5 my-auto" style={{color:'white'}}display="flex" justifyContent="center">
                            Available Points {this.state.week === 1 ? '(Distributable Points: '+this.state.distributablePoints+')' : null}
                        </Box>
                        <Box className="col-md-6 p-0" display="flex">
                            <AvailablePoints parent={this} week={this.state.week} part="brain" available={this.state.availableBrain-this.state.totalBrain}/>
                            <AvailablePoints parent={this} week={this.state.week} part="muscle" available={this.state.availableMuscle-this.state.totalMuscle}/>
                            <AvailablePoints parent={this} week={this.state.week} part="heart" available={this.state.availableHeart-this.state.totalHeart}/>
                        </Box>
                    </Box>

                </Box>
                <Box className={this.props.classes.columnHeaders + " col-12 mt-3 py-2 pr-3"} borderTop={2} borderBottom={2}>
                    <Box className="row">
                        <Box className="col-md-2 col-12" display="flex">
                            <Box className="mx-auto p-1" fontWeight="fontWeightBold" fontSize={26}>
                                Company
                        </Box>
                        </Box>
                        <Box className="col-md-3 col-4" display="flex">
                            <Box className="mx-auto p-1" fontWeight="fontWeightBold" fontSize={26}>
                                Hours
                        </Box>
                        </Box>
                        <Box className="col-md-6 col-8 p-0 py-md-0 py-3" display="flex">
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
                </Box>
                {this.state.companies.map((c, i) => {
                    return (
                        <GameRow key={i} company={c} index={i} parent={this} submitted={this.state.submitted}/>
                    );
                })}
                <GameTotals hours={this.state.totalHours} brain={this.state.totalBrain} muscle={this.state.totalMuscle} heart={this.state.totalHeart}/>

            </Box>
        );
    }
}

export default styles(GameForm)