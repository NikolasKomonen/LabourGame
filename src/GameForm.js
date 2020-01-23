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
        this.updateCompanyStrike = this.updateCompanyStrike.bind(this);
        this.updateCompanyHours = this.updateCompanyHours.bind(this);
        this.state = {
            isLoaded: false,
            submitted: false,
            companyIDs: [],
            saveStatus: this.getLastSavedMessage(),
            week: 0,
            totalProfit: 0,
            weekProfit: 0,
            totalAvailableResources: {brain:0, muscle:0, heart: 0},
            resultTotals: {hours: 0, brain:0, muscle:0, heart: 0},
            //c_1: { hours: 0, isBlankHours: false, brain: 0, muscle: 0, heart: 0 , strike: false},
            //c_1_constants: {name: "", brainMultiplier: 0, muscleMultiplier: 0, heartMultiplier: 0}
        }
        this.timer = undefined
        // stack to determine set the saved status only after the most recent request is successful
        // incremented in GameRow
        this.sentStack = 0;
        this.pendingRows = {}
        this.pendingAvailableResources = {}
        this.savingMessage = "Saving..."
    }

    componentDidMount() {
        fetch('/api/getGameFormData')
            .then(res => {
                return res.json();
            }).then(data => {
                const tempState = {}
                const len = data.rows.length
                this.initializeGameValues(data)
                tempState.submitted = data.submitted
                tempState.week = data.week
                tempState.isLoaded = true
                tempState.numRows = len
                tempState.username = data.username
                tempState.totalProfit = data.total_profit
                tempState.weekProfit = data.week_profit
                this.setState(tempState)
            }, (error) => {
                console.log("Error fetching companies: " + error)
            })
    }

    initializeGameValues(data) {
        const gameRows = data.rows
        const initialGameValues = {}
        const initialResultTotals = {hours: 0, brain: 0, muscle: 0, heart: 0}
        initialGameValues.companyIDs = []
        gameRows.forEach(row => {
            const id = row.id
            const hours = row.hours
            const brainCost = row.brainMultiplier * hours
            const muscleCost = row.muscleMultiplier * hours
            const heartCost = row.heartMultiplier * hours
            initialGameValues.companyIDs.push(id)
            initialGameValues["c_" + id] = {
                hours: hours,
                isBlankHours: false,
                brain: brainCost,
                muscle: muscleCost,
                heart: heartCost,
                strike: row.strike > 0
            }

            initialGameValues["c_" + id + "_constants"] = {
                name: row.name,
                brainMultiplier: row.brainMultiplier, 
                muscleMultiplier: row.muscleMultiplier, 
                heartMultiplier: row.heartMultiplier
            }
            
            // Adding each row's cost to the total to initialize
            initialResultTotals.hours += hours
            initialResultTotals.brain += brainCost
            initialResultTotals.muscle += muscleCost
            initialResultTotals.heart += heartCost
        });
        initialGameValues.resultTotals = initialResultTotals

        const availableBrain = data.available_brain
        const availableMuscle = data.available_muscle
        const availableHeart = data.available_heart
        //IMPORTANT: assuming that all parts are the same value (eg: 30)
        if(data.week === 1) {
            initialGameValues.initialDist = data.distributablePoints
            initialGameValues.remainingDist = (data.distributablePoints * 4) - availableBrain - availableMuscle- availableHeart
        }
        initialGameValues.totalAvailableResources = 
                                    {
                                        brain: availableBrain, 
                                        muscle: availableMuscle,
                                        heart: availableHeart
                                    }
        this.setState(initialGameValues)
    }

    updateCompanyHours(newHours, companyID) {
        const isEmptyText = newHours.length === 0
        let parsedHours = isEmptyText ? 0 : parseInt(newHours)
        const constants = this.state["c_" + companyID + "_constants"]
        const companyRow = "c_" + companyID
        const oldRow = this.state[companyRow]
        const newRow = 
                    {   
                        hours: parsedHours,
                        isBlankHours: isEmptyText,
                        brain: (parsedHours * constants.brainMultiplier), 
                        muscle: (parsedHours * constants.muscleMultiplier), 
                        heart: (parsedHours * constants.heartMultiplier),
                        strike: oldRow.strike
                    }
        const newState = {}
        newState[companyRow] = newRow
        
        this.setState(newState)
        this.updateTotalResults(
                        newRow.hours - oldRow.hours,
                        newRow.brain - oldRow.brain,
                        newRow.muscle - oldRow.muscle,
                        newRow.heart - oldRow.heart
        )
        this.startRowUpdate(newRow, companyID)
    }

    updateTotalResults(hoursDelta, brainDelta, muscleDelta, heartDelta) {
        const oldTotals = this.state.resultTotals
        const newTotals = 
                    {
                        hours: oldTotals.hours + hoursDelta,
                        brain: oldTotals.brain + brainDelta,
                        muscle: oldTotals.muscle + muscleDelta,
                        heart: oldTotals.heart + heartDelta
                    }
        this.setState({resultTotals: newTotals})
    }

    updateCompanyStrike(strike, companyID) {
        const newState = {}
        const companyRow = "c_" + companyID
        let oldRow;
        const pendingRow = this.pendingRows[companyID]
        if(pendingRow) {
            oldRow = pendingRow
        }
        else {
            oldRow = this.state[companyRow]
        }
        const newRow = { ...oldRow }
        newRow.strike = strike
        newState[companyRow] = newRow
        this.setState(newState)
        this.startRowUpdate(newRow, companyID)
        
        
    }

    startRowUpdate(newRow, companyID) {
        
        if(this.timer) {
            clearTimeout(this.timer)
            this.sentStack--;
        }
        this.pendingRows[companyID] = {hours: newRow.hours, strike: newRow.strike}
        this.timer = setTimeout(() => {this.sendBatchedUpdate()}, 3000)
        this.sentStack++;
        this.setState({saveStatus: this.savingMessage})
    }

    sendBatchedUpdate() {
        if(Object.keys(this.pendingRows).length < 1) {
            return;
        }
        const data = {
            update: this.pendingRows, // {COMPANY_ID: {hours: ... , strike: ...}, ...}
            week: this.state.week,
        }
        console.log("Sending hours: ", data)
        fetch('/api/updateSelection', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => {
            this.sentStack--
            const status = res.status
            if (status === 200) {
                this.pendingRows = {}
                if(this.sentStack === 0) {
                    const newState = {}
                    newState.saveStatus = this.getLastSavedMessage();
                    this.setState(newState)
                }
            }
            this.timer = null
        })
    }

    getLastSavedMessage() {
        return "Last Saved " + new Date().toLocaleTimeString()
    }

    setNotSaved() {
        if (this.state.saveStatus !== this.savingMessage) {
            const newState = { ...this.state }
            newState.saveStatus = this.savingMessage;
            this.setState(newState)
        }
    }

    canTakeAvailablePoint() {
        return this.state.remainingDist > 0
    }

    canReturnAvailablePoint(part) {
        let minimum = this.state.initialDist
        let current;
        if(part === "brain") {
            current = this.state.totalAvailableResources.brain
        }
        else if(part === "muscle") {
            current = this.state.totalAvailableResources.muscle
        }
        else {
            current = this.state.totalAvailableResources.heart
        }
        return current > minimum
    }

    incrementAvailable(part) {
        if(this.canTakeAvailablePoint()) {
            const newState = {}
            newState.remainingDist = this.state.remainingDist - 1
            const newAvailable = { ...this.state.totalAvailableResources}
            newAvailable[part] += 1
            newState.totalAvailableResources = newAvailable
            this.startAvailablePointsUpdate(newState.totalAvailableResources)
            this.setState(newState)
        }
    }

    decrementAvailable(part) {
        const newState = {}
        if(this.canReturnAvailablePoint(part)) {
            newState.remainingDist = this.state.remainingDist + 1
            const newAvailable = { ...this.state.totalAvailableResources}
            newAvailable[part] -= 1
            newState.totalAvailableResources = newAvailable
            this.startAvailablePointsUpdate(newState.totalAvailableResources)
            this.setState(newState)
        }
    }

    startAvailablePointsUpdate(totalAvailableResources) {
        if(this.resourcesTimer) {
            clearTimeout(this.resourcesTimer)
            this.sentStack--;
        }
        this.pendingAvailableResources = totalAvailableResources
        this.resourcesTimer = setTimeout(() => {this.sendBatchedAvailablePointsUpdate()}, 5000)
        this.sentStack++;
        this.setState({saveStatus: this.savingMessage})
    }

    sendBatchedAvailablePointsUpdate() {
        if(Object.keys(this.pendingAvailableResources).length < 1) {
            return;
        }
        const data = {
            week: this.state.week,
            available: this.pendingAvailableResources
        }
        fetch('/api/updateAvailablePoints', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => {
            this.sentStack--
            this.pendingAvailableResources = {}
            if(this.sentStack === 0) {
                if(res.status === 200) {
                    const saveMessage = this.getLastSavedMessage()
                    const newState = {}
                    newState.saveStatus = saveMessage
                    this.setState(newState)
                } 
            }
            this.resourcesTimer = null
        })
    }
    
    submitSelection() {
        let canSubmit = true;
        if((this.state.totalAvailableResources.brain - this.state.resultTotals.brain) < 0) {
            canSubmit = false;
        }
        if(canSubmit && (this.state.totalAvailableResources.muscle - this.state.resultTotals.muscle) < 0) {
            canSubmit = false;
        }
        if(canSubmit && (this.state.totalAvailableResources.heart - this.state.resultTotals.heart) < 0) {
            canSubmit = false;
        }

        if(!canSubmit) {
            return;
        }

        // Send all pending changes to server
        clearTimeout(this.timer)
        clearTimeout(this.resourcesTimer)
        this.sendBatchedUpdate()
        this.sendBatchedAvailablePointsUpdate()
        
        fetch('/api/submitGameForm', {
            method: 'POST',
            body: JSON.stringify({week: this.state.week}),
            headers: {
                'Content-Type': 'application/json'
            }}).then((res) => {
            if(res.status === 200) {
                const newState = {}
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
                            Available Points {this.state.week === 1 ? '(Distributable Points: '+this.state.remainingDist+')' : null}
                        </Box>
                        <Box className="col-md-6 p-0" display="flex">
                            <AvailablePoints parent={this} disable={this.state.submitted} week={this.state.week} part="brain" available={this.state.totalAvailableResources.brain - this.state.resultTotals.brain}/>
                            <AvailablePoints parent={this} disable={this.state.submitted} week={this.state.week} part="muscle" available={this.state.totalAvailableResources.muscle - this.state.resultTotals.muscle}/>
                            <AvailablePoints parent={this} disable={this.state.submitted} week={this.state.week} part="heart" available={this.state.totalAvailableResources.heart - this.state.resultTotals.heart}/>
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
                
                {this.state.companyIDs.map((id, index) => {
                    return (
                        <GameRow 
                                key={id}
                                id={id}
                                index={index} 
                                dynamic={this.state["c_" + id]} 
                                constants={this.state["c_" + id + "_constants"]} 
                                submitted={this.state.submitted}
                                numRows={this.state.numRows}
                                updateCompanyHours={this.updateCompanyHours}
                                updateCompanyStrike={this.updateCompanyStrike}
                        />
                    );
                })}
                <GameTotals totals={this.state.resultTotals}/>

            </Box>
        );
    }
}

export default styles(GameForm)