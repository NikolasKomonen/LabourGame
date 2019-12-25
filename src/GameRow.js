import React from 'react'
import Typography from '@material-ui/core/Typography'
import { Box, TextField, FormControl, FormControlLabel, FormGroup, Checkbox, InputAdornment } from '@material-ui/core';
import { HOURS_ID, BRAIN_ID, MUSCLE_ID, HEART_ID, STRIKE_ID} from './GameForm'
import $ from 'jquery'


export default class GameForm extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            strikeEnabled: false,
        }
    }

    onChangedHours(event, index) {
        const hoursEntered = $('#'+HOURS_ID+index).val()
        if(isNaN(hoursEntered) || hoursEntered <= 0) {
            this.updateBodyPart(BRAIN_ID, index, 0)
            this.updateBodyPart(MUSCLE_ID, index, 0)
            this.updateBodyPart(HEART_ID, index, 0)
            this.setState({strikeEnabled: false})
            this.props.parent.sendSelection()
            return;
        }
        this.updateBodyPart(BRAIN_ID, index, hoursEntered)
        this.updateBodyPart(MUSCLE_ID, index, hoursEntered)
        this.updateBodyPart(HEART_ID, index, hoursEntered)
        this.setState({strikeEnabled: true})
        this.props.parent.sendSelection()
    }

    onToggleStrike(index) {
        this.props.parent.sendSelection()
    }
    
    updateBodyPart(partID, index, hoursEntered) {
        const part = $('#'+partID+index+"-label") //#game-brain-0-label (found in 'inspect')
        const bodyLabel = part.text()
        $('#'+partID+index).val(bodyLabel * hoursEntered)
    }

    render() {
        const company = this.props.company
        const index = this.props.index
        const gameForm = this.props.parent
        const name = company.companies_name
        const isCompany = !["MEDITATION", "GYM", "TUTORIAL"].includes(name)
        return (
            <Box className="row col-12 mt-3" borderBottom={0.2}>
                <FormControl className="col-12">
                    <FormGroup row>
                        <Box className="col-md-2" display="flex" bgcolor={!isCompany ? "secondary.main" : null}>
                            <Box className="my-auto mx-auto" >
                                <Typography>{company.companies_name}</Typography>
                            </Box>
                        </Box>
                        <Box className="col-md-3" display="flex" >
                            <Box className="my-auto mx-auto">
                                <TextField disabled={gameForm.state.disableAll} defaultValue="0" style={{ width: 150 }} id={"game-hours-" + index} name="hours" variant="outlined" size="small"
                                    InputProps={{ endAdornment: <InputAdornment position="end">Hrs</InputAdornment>, }}
                                   onChange={(e) => this.onChangedHours(e, index)}/>
                            </Box >
                        </Box>
                        <Box className="col-md-2 col-4" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id={BRAIN_ID + index}
                                    label={String(company.brain)}
                                    defaultValue="0"
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                />
                            </Box>
                        </Box>
                        <Box className="col-md-2 col-4" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id={MUSCLE_ID + index}
                                    label={String(company.muscle)}
                                    defaultValue="0"
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                />
                            </Box>
                        </Box>
                        <Box className="col-md-2 col-4" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id={HEART_ID + index}
                                    label={String(company.heart)}
                                    defaultValue="0"
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}

                                />
                            </Box>
                        </Box>
                        {
                            isCompany ? 
                                
                                        <Box className="col-md-1" display="flex">
                                            <FormControlLabel
                                                className="my-auto mx-auto"
                                                value="end"
                                                control={<Checkbox color="primary" id={STRIKE_ID + index} onClick={() => this.onToggleStrike(index)} />}
                                                label="Strike"
                                                labelPlacement="top"
                                                disabled={gameForm.state.disableAll || !this.state.strikeEnabled}
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