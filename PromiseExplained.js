function ass(){
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("ass() method")
            resolve()
        }, 3000);
    })
}

ass().then(() => 
        {
            return new Promise((resolve, reject) => 
                {
                    setTimeout(() => 
                        {
                            console.log("4 seconds bitch")
                            resolve()
                        }, 1000)
                }
            )
        }
    ).then(() => {console.log("Last Things")})


ass().then(() => 
    {   //Notice we dont return this promise, go to {1}
        new Promise((resolve, reject) => 
            {
                setTimeout(() => 
                    {
                        console.log("4 seconds bitch")
                        resolve()
                    }, 1000)
            }
        )
    }

)
// {1} now this 'then' does not respect the '4 seconds bitch' Promise timeout. This is because 
//of https://developers.google.com/web/fundamentals/primers/promises#queuing_asynchronous_actions
// which indicates that the Promise from above will be passed as the parameter to the anonymous function (Go to {2})
.then(() => {console.log("Last Things")})

// {2} if the above '.then' statement looked like
// .then((THE_PROMISE_PASSED_IN) => {console.log("Last Things")})
// We would get the promise as the parameter
// Running the following shows this
Promise.resolve(3).then((number) => console.log("The following should be 3: " + number))
//This is because Promise.resolve(3) is a Promise object that called resolve of 3
//this also looks like
new Promise((resolve, reject) => {
    resolve(3)
}).then((number) => console.log("The following should be 3: " + number))
// implying
// Promise.resolve(3) == new Promise((resolve, reject) => {resolve(3)})

ass().then(() => 
    {   //Notice we dont return a promise, and because 'setTimeout' is an 'async' function it continues to
        //the 'then' that prints 'yagga' before the 1 second is up. To fix this you need to wrap the 'setTimeout'
        //in a promise and to make sure the timeout 'resolves()' after printing '4 seconds bitch'
        setTimeout(() => 
            {
                console.log("4 seconds bitch")
            }, 1000)
    }

).then(() => console.log("Yagga"))




