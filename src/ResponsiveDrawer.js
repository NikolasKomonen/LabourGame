import React from 'react';
import AppBar from '@material-ui/core/AppBar';
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer';
import Hidden from '@material-ui/core/Hidden';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import MenuIcon from '@material-ui/icons/Menu';
import CloseIcon from '@material-ui/icons/Close';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button'
import { makeStyles, useTheme } from '@material-ui/core/styles';
import { withRouter, Redirect } from 'react-router-dom'

const drawerWidth = 240;
const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
  },
  drawer: {
    [theme.breakpoints.up('lg')]: {
      width: drawerWidth,
      flexShrink: 0,
    },
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
    [theme.breakpoints.up('lg')]: {
      display: 'none',
    },
  },
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  closeMenuButton: {
    marginRight: 'auto',
    marginLeft: 0,
  },
}));
export const ResponsiveDrawer = withRouter((props) => {
  const dummyCategories = ['Game', 'Results']
  const classes = useStyles();
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [site, setSite] = React.useState({
    isLoggedIn: false,
    isLoaded: false
  });
  const [redirectToResults, setResultsRedirect] = React.useState(false)
  const [redirectToGame, setGameRedirect] = React.useState(false)
  
  function handleDrawerToggle() {
    setMobileOpen(!mobileOpen)
  }
  function handleDrawerPageClick(text) {
    if(text === dummyCategories[0]) { // game
      setGameRedirect(true)
      
    }
    else if(text === dummyCategories[1]) { // results
      setResultsRedirect(true)
    }
  }
  function logout(props) {
    fetch('/api/logout', { method: "POST" }).then(() => { setSite({isLoggedIn: false, isLoaded: true}) }).catch(() => { console.log("Couldn't log out") })
  }
  function checkIsLoggedIn() {
    if(site.isLoaded) { // on each re-render this function is triggered. So we don't want to ask again.
      return;
    }
    fetch('/api/isLoggedIn').then((data) => (
      data.json()
    ))
      .then((data) => {
        setSite({
          isLoaded: true,
          isLoggedIn: data.isLoggedIn
        })
      })
  }
  const drawer = (
    <div>
      <List>
        {dummyCategories.map((text, index) => (
          <ListItem button key={text} onClick={(e) => {handleDrawerPageClick(e.target.outerText)}}>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List>
    </div>
  );

  checkIsLoggedIn()

  if (!site.isLoaded) {
    return (<div></div>)
  }

  if(redirectToResults && props.location.pathname !== "/results") {
    return (<Redirect to="/results" />)
  }

  if(redirectToGame && props.location.pathname !== "/game") {
    return (<Redirect to="/game" />)
  }
  
  if (!site.isLoggedIn) {
    return (<Redirect to="/login" />)
  }
  else {
    return (
      <div className={classes.root}>
        <CssBaseline />
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="Open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              className={classes.menuButton}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap style={{ flex: 1 }}>
              Gig Economy Game
          </Typography>
            <div>
              <Button variant="contained" onClick={() => { logout(props) }}>Logout</Button>
            </div>
          </Toolbar>
        </AppBar>

        <nav className={classes.drawer}>
          {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
          <Hidden smUp implementation="css">
            <Drawer
              variant="temporary"
              anchor={theme.direction === 'rtl' ? 'right' : 'left'}
              open={mobileOpen}
              onClose={handleDrawerToggle}
              classes={{
                paper: classes.drawerPaper,
              }}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile.
              }}
            >
              <IconButton onClick={handleDrawerToggle} className={classes.closeMenuButton}>
                <CloseIcon />
              </IconButton>
              {drawer}
            </Drawer>
          </Hidden>
          <Hidden mdDown implementation="css">
            <Drawer
              className={classes.drawer}
              variant="permanent"
              classes={{
                paper: classes.drawerPaper,
              }}
            >
              <div className={classes.toolbar} />
              {drawer}
            </Drawer>
          </Hidden>
        </nav>
        <div className={classes.content}>
          <div className={classes.toolbar} />
          {props.main}
        </div>
      </div>
    );
  }
})

export default ResponsiveDrawer;