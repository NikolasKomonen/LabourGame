import React from 'react'
import Typography from '@material-ui/core/Typography'
import { Box, TextField, FormControl, FormControlLabel, FormGroup, Checkbox, InputAdornment } from '@material-ui/core';
import { BRAIN_ID, MUSCLE_ID, HEART_ID, STRIKE_ID } from './GameForm'

export default class GameRow extends React.Component {
    constructor(props) {
        super(props);
        this.timer = undefined
        this.onToggleStrike = this.onToggleStrike.bind(this)
    }

    onChangedHours(hoursEntered, isResource) {
        const parsedInt = parseInt(hoursEntered)
        const companyID = this.props.id
        if (!isNaN(parsedInt) && parsedInt >= 0) {
            if(isResource && parsedInt > 5) { // limit of 5 to 'Resource' hours
                return;
            }
            this.props.updateCompanyHours(hoursEntered, companyID)
        }
        else if (hoursEntered === undefined || hoursEntered === null || hoursEntered.length === 0) {
            this.props.updateCompanyHours(hoursEntered, companyID)
        }
    }

    onToggleStrike(checked) {
        const companyID = this.props.id
        this.props.updateCompanyStrike(checked, companyID)
    }

    render() {
        const dynamic = this.props.dynamic
        const constants = this.props.constants
        const id = this.props.id
        const index = this.props.index
        const submitted = this.props.submitted
        const isCompany = !["MEDITATION", "GYM", "TUTORIAL"].includes(constants.name)
        const hoursValue = dynamic.isBlankHours ? "" : dynamic.hours
        const strike = dynamic.strike
        return (
            <Box className="col-12 " px={0} borderBottom={ index >= (this.props.numRows-1) ? 0 : 0.2}>
                <FormControl className="col-12">
                    <FormGroup row>
                        <Box className="col-md-2" display="flex" marginY={!isCompany ? 1 : 0} bgcolor={!isCompany ? "secondary.main" : null}>
                            <Box className="my-auto mx-auto" >
                                <Typography>{constants.name}</Typography>
                            </Box>
                        </Box>
                        <Box className="col-md-3 col-6" display="flex" >
                            <Box className="my-auto mx-auto">
                                <TextField disabled={submitted} value={hoursValue}  id={"game-hours-" + id} name="hours" variant="outlined" size="small"
                                    InputProps={{ endAdornment: <InputAdornment position="end">Hrs</InputAdornment>, }}
                                    onChange={(e) => this.onChangedHours(e.target.value, !isCompany)} />
                            </Box >
                        </Box>
                        <Box className="col-md-2 col-2" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id={BRAIN_ID + id}
                                    label={String(constants.brainMultiplier)}
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    value={dynamic.brain}
                                />
                            </Box>
                        </Box>
                        <Box className="col-md-2 col-2" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id={MUSCLE_ID + id}
                                    label={String(constants.muscleMultiplier)}
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    value={dynamic.muscle}
                                />
                            </Box>
                        </Box>
                        <Box className="col-md-2 col-2" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id={HEART_ID + id}
                                    label={String(constants.heartMultiplier)}
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    value={dynamic.heart}
                                />
                            </Box>
                        </Box>
                        {
                            isCompany ?

                                <Box className="col-md-1" display="flex">
                                    <FormControlLabel
                                        hidden={!dynamic.hours > 0}
                                        className="my-auto mx-auto"
                                        value="end"
                                        control={<Checkbox checked={strike} color="primary" id={STRIKE_ID + id} onChange={(e) => this.onToggleStrike(e.target.checked)} />}
                                        label="Strike"
                                        labelPlacement="top"
                                        disabled={submitted || !dynamic.hours > 0}
                                    />
                                </Box>
                                : null
                        }

                    </FormGroup>
                </FormControl>

            </Box>
        )
    }
}