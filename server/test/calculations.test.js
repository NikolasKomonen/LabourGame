const SQL = require('../database/sqliteIndex')
const path = require('path')
const Calculations = require('../calculations')
const fs = require('fs')

describe("Calculate Wages", () => {
   let db = new SQL();
   let c = new Calculations(null);
   beforeAll(async () => {
      fs.mkdir(path.join(__dirname, "temp"), 777, (err) => {
      })
      fs.copyFileSync(path.join(__dirname, "testDBFileTemplate.sqlite"), path.join(__dirname, "temp/testDBFile.sqlite"))
      db = new SQL(path.join(__dirname, "temp/testDBFile.sqlite"))
      await db.startDB()
      c = new Calculations(db)
   })

   afterAll(() => {
      db.close()
   })

   /**
    * If this passes:
    *  We know we are calculating the correct hourly rates for the given player hours.
    *  
    */
   test("Test Wage Calculation", () => {
      return c.calculateWagesForWeek(1, 1).then((data) => {
         return expect(data).toMatchObject(
            [{ "companies_id": 2, "hourlyRate": 24 },
            { "companies_id": 3, "hourlyRate": 12 },
            { "companies_id": 10, "hourlyRate": 20.563343548754286 },
            { "companies_id": 4, "hourlyRate": 14.387841856637072 },
            { "companies_id": 5, "hourlyRate": 5.510526293451299 },
            { "companies_id": 6, "hourlyRate": 8 },
            { "companies_id": 1, "hourlyRate": 13.422589752215547 },
            { "companies_id": 7, "hourlyRate": 8 },
            { "companies_id": 8, "hourlyRate": 12 },
            { "companies_id": 9, "hourlyRate": 8 }]
         )
      })
   })
})


describe("Testing whole calculation for week 1 and 2", () => {
   let c1 = new Calculations(null)
   let db1 = new SQL();

   beforeAll(async () => {
      const testDBPath = path.join(__dirname, "temp/testDBFileWeek2.sqlite")
      fs.copyFileSync(path.join(__dirname, "testDBFileWeek2Template.sqlite"), testDBPath)
      db1 = new SQL(testDBPath)
      await db1.startDB()
      c1 = new Calculations(db1)
   })

   afterAll(() => {
      db1.close()
   })

   test("Test Calculation for Week 1", () => {
      return c1.calculateTotalProfitsVerified(1, 2).then(() => {
         const queries = []

         queries.push(c1.getMultipliers(1, 1).then(multipliers => {
            expect(multipliers).toMatchObject(
               [
                  [
                     {
                        "companies_id": 4,
                        "description": "Black Tuesday! Sales are hot today. Dim’s has a special offer with new potato chip flavours and discounted cigarettes. Pay goes up 20% for all DimBits.",
                        "event_data": 0.2,
                        "event_types_id": 1
                     }
                  ],
                  {
                     "companies_id": 2,
                     "description": "Hackers have breached into CWB’s database and outed all Cammers (and customers) by publishing their names and addresses. If you are working for CWB this week your income drops 20% as some customers move to a 'more secure' camming sites.",
                     "event_data": 0.2,
                     "event_types_id": 1,
                     "id": 2
                  },
                  [
                     {
                        "companies_id": 1,
                        "total_workers": 4,
                        "workers_striked": 3
                     }
                  ],
                  [

                  ]
               ]
            )
         }))

         queries.push(db1.all(`SELECT * FROM user_profit_weeks WHERE weeks_week=1 ORDER BY accounts_username ASC`)
            .then(results => {
               expect(results).toMatchObject(
                  [
                     {
                        "accounts_username":"dobby",
                        "total_profit":0,
                        "week_profit":0,
                        "weeks_week":1
                     },
                     {
                        "accounts_username":"draco",
                        "total_profit":0,
                        "week_profit":0,
                        "weeks_week":1
                     },
                     {
                        "accounts_username":"dumbledore",
                        "total_profit":269.97299446620866,
                        "week_profit":269.97299446620866,
                        "weeks_week":1
                     },
                     {
                        "accounts_username":"hagrid",
                        "total_profit":185.8327344362342,
                        "week_profit":185.8327344362342,
                        "weeks_week":1
                     },
                     {
                        "accounts_username":"harry",
                        "total_profit":129.88469631131608,
                        "week_profit":129.88469631131608,
                        "weeks_week":1
                     },
                     {
                        "accounts_username":"hermione",
                        "total_profit":208,
                        "week_profit":208,
                        "weeks_week":1
                     },
                     {
                        "accounts_username":"ron",
                        "total_profit":214.4700044974589,
                        "week_profit":214.4700044974589,
                        "weeks_week":1
                     },
                     {
                        "accounts_username":"snape",
                        "total_profit":120.34399452539255,
                        "week_profit":120.34399452539255,
                        "weeks_week":1
                     },
                     {
                        "accounts_username":"voldemort",
                        "total_profit":294.1758736768162,
                        "week_profit":294.1758736768162,
                        "weeks_week":1
                     }
                  ]
               )
                  
            })
         )

         queries.push(db1.all(`SELECT * FROM user_game_weeks WHERE weeks_week=2 ORDER BY accounts_username ASC`).then(results => {
            expect(results).toMatchObject(
               [
                  {
                     "accounts_username": "dobby",
                     "available_brain": 30,
                     "available_heart": 30,
                     "available_muscle": 30,
                     "submitted": 1,
                     "weeks_week": 2
                  },
                  {
                     "accounts_username": "draco",
                     "available_brain": 35,
                     "available_heart": 35,
                     "available_muscle": 35,
                     "submitted": 1,
                     "weeks_week": 2
                  },
                  {
                     "accounts_username": "dumbledore",
                     "available_brain": 45,
                     "available_heart": 33,
                     "available_muscle": 45,
                     "submitted": 1,
                     "weeks_week": 2
                  },
                  {
                     "accounts_username": "hagrid",
                     "available_brain": 30,
                     "available_heart": 60,
                     "available_muscle": 30,
                     "submitted": 1,
                     "weeks_week": 2
                  },
                  {
                     "accounts_username": "harry",
                     "available_brain": 37,
                     "available_heart": 42,
                     "available_muscle": 37,
                     "submitted": 1,
                     "weeks_week": 2
                  },
                  {
                     "accounts_username": "hermione",
                     "available_brain": 65,
                     "available_heart": 30,
                     "available_muscle": 30,
                     "submitted": 1,
                     "weeks_week": 2
                  },
                  {
                     "accounts_username": "ron",
                     "available_brain": 32,
                     "available_heart": 48,
                     "available_muscle": 38,
                     "submitted": 1,
                     "weeks_week": 2
                  },
                  {
                     "accounts_username": "snape",
                     "available_brain": 31,
                     "available_heart": 31,
                     "available_muscle": 31,
                     "submitted": 1,
                     "weeks_week": 2
                  },
                  {
                     "accounts_username": "voldemort",
                     "available_brain": 30,
                     "available_heart": 63,
                     "available_muscle": 33,
                     "submitted": 1,
                     "weeks_week": 2
                  }
               ]
            )
         }))

         queries.push(db1.all(`SELECT * FROM company_wage_history WHERE weeks_week=1 ORDER BY companies_id ASC`).then(results => {
            expect(results).toMatchObject(
               [
                  {
                     "campaigns_id": 1,
                     "companies_id": 1,
                     "wage": 13.108992276663098,
                     "weeks_week": 1
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 2,
                     "wage": 24,
                     "weeks_week": 1
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 3,
                     "wage": 12,
                     "weeks_week": 1
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 4,
                     "wage": 14.072470103176107,
                     "weeks_week": 1
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 5,
                     "wage": 5.405689969260078,
                     "weeks_week": 1
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 6,
                     "wage": 8,
                     "weeks_week": 1
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 7,
                     "wage": 8,
                     "weeks_week": 1
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 8,
                     "wage": 12,
                     "weeks_week": 1
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 9,
                     "wage": 8,
                     "weeks_week": 1
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 10,
                     "wage": 20.14234815565804,
                     "weeks_week": 1
                  }
               ]
            )
         }))

         // ******************************************** WEEK 2 *******************************************************

         // Test Multipliers
         queries.push(c1.getMultipliers(2, 1).then(multipliers => {
            expect(multipliers).toMatchObject(
               [
                  [
                     {
                        "companies_id": 2,
                        "description": "Singles buy lots of love from CWB and Cammers’ pay goes up 20%.",
                        "event_data": 0.2,
                        "event_types_id": 1
                     },
                     {
                        "companies_id": 6,
                        "description": "Valentine’s Day is coming up. Lovers order tons of heart-shaped donuts from High Sugar, and pay goes up 20%.",
                        "event_data": 0.2,
                        "event_types_id": 1
                     }
                  ],
                  {
                     "companies_id": 8,
                     "description": "The province has changed its policy for pot commerce. From now on, only a newly formed company owned by the Premier’s family can operate home delivery apps. Skip the Pusher disconnects all its workers and moves to P.E.I. ",
                     "event_data": null,
                     "event_types_id": 2,
                     "id": 14
                  },
                  [
                     {
                        "companies_id": 3,
                        "total_workers": 4,
                        "workers_striked": 1
                     }
                  ],
                  [

                  ]
               ]
            )
         }))

         // Test user profits
         queries.push(db1.all(`SELECT * FROM user_profit_weeks WHERE weeks_week=2 ORDER BY accounts_username ASC`)
            .then(results => {
               expect(results).toMatchObject(
                  [
                     {
                        "accounts_username":"dobby",
                        "total_profit":0,
                        "week_profit":0,
                        "weeks_week":2
                     },
                     {
                        "accounts_username":"draco",
                        "total_profit":108.80000000000001,
                        "week_profit":108.80000000000001,
                        "weeks_week":2
                     },
                     {
                        "accounts_username":"dumbledore",
                        "total_profit":405.4406390279639,
                        "week_profit":135.46764456175524,
                        "weeks_week":2
                     },
                     {
                        "accounts_username":"hagrid",
                        "total_profit":463.4932478602398,
                        "week_profit":277.6605134240056,
                        "weeks_week":2
                     },
                     {
                        "accounts_username":"harry",
                        "total_profit":380.6463081356428,
                        "week_profit":250.7616118243267,
                        "weeks_week":2
                     },
                     {
                        "accounts_username":"hermione",
                        "total_profit":412.8,
                        "week_profit":204.8,
                        "weeks_week":2
                     },
                     {
                        "accounts_username":"ron",
                        "total_profit":339.8508104096222,
                        "week_profit":125.38080591216335,
                        "weeks_week":2
                     },
                     {
                        "accounts_username":"snape",
                        "total_profit":188.48409721019368,
                        "week_profit":68.14010268480112,
                        "weeks_week":2
                     },
                     {
                        "accounts_username":"voldemort",
                        "total_profit":502.9648677686946,
                        "week_profit":208.7889940918784,
                        "weeks_week":2
                     }
                  ]
               )
            })
         )

         // Test available resources
         queries.push(db1.all(`SELECT * FROM user_game_weeks WHERE weeks_week=3 ORDER BY accounts_username ASC`).then(results => {
            expect(results).toMatchObject(
               [
                  {
                     "accounts_username": "dobby",
                     "available_brain": 30,
                     "available_heart": 30,
                     "available_muscle": 30,
                     "submitted": 0,
                     "weeks_week": 3
                  },
                  {
                     "accounts_username": "draco",
                     "available_brain": 40,
                     "available_heart": 35,
                     "available_muscle": 36,
                     "submitted": 0,
                     "weeks_week": 3
                  },
                  {
                     "accounts_username": "dumbledore",
                     "available_brain": 50,
                     "available_heart": 33,
                     "available_muscle": 47,
                     "submitted": 0,
                     "weeks_week": 3
                  },
                  {
                     "accounts_username": "hagrid",
                     "available_brain": 30,
                     "available_heart": 62,
                     "available_muscle": 30,
                     "submitted": 0,
                     "weeks_week": 3
                  },
                  {
                     "accounts_username": "harry",
                     "available_brain": 37,
                     "available_heart": 42,
                     "available_muscle": 37,
                     "submitted": 0,
                     "weeks_week": 3
                  },
                  {
                     "accounts_username": "hermione",
                     "available_brain": 67,
                     "available_heart": 30,
                     "available_muscle": 30,
                     "submitted": 0,
                     "weeks_week": 3
                  },
                  {
                     "accounts_username": "ron",
                     "available_brain": 33,
                     "available_heart": 49,
                     "available_muscle": 39,
                     "submitted": 0,
                     "weeks_week": 3
                  },
                  {
                     "accounts_username": "snape",
                     "available_brain": 32,
                     "available_heart": 32,
                     "available_muscle": 32,
                     "submitted": 0,
                     "weeks_week": 3
                  },
                  {
                     "accounts_username": "voldemort",
                     "available_brain": 35,
                     "available_heart": 68,
                     "available_muscle": 38,
                     "submitted": 0,
                     "weeks_week": 3
                  }
               ]
            )
         }))

         // Test company wages
         queries.push(db1.all(`SELECT * FROM company_wage_history WHERE weeks_week=2 ORDER BY companies_id ASC`).then(results => {
            expect(results).toMatchObject(
               [
                  {
                     "campaigns_id": 1,
                     "companies_id": 1,
                     "wage": 13.386911140438809,
                     "weeks_week": 2
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 2,
                     "wage": 28.799999999999997,
                     "weeks_week": 2
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 3,
                     "wage": 14.399999999999999,
                     "weeks_week": 2
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 4,
                     "wage": 16.886964123811328,
                     "weeks_week": 2
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 5,
                     "wage": 6.486827963112094,
                     "weeks_week": 2
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 6,
                     "wage": 6.4,
                     "weeks_week": 2
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 7,
                     "wage": 6.4,
                     "weeks_week": 2
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 8,
                     "wage": 12.254407531480936,
                     "weeks_week": 2
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 9,
                     "wage": 6.4,
                     "weeks_week": 2
                  },
                  {
                     "campaigns_id": 1,
                     "companies_id": 10,
                     "wage": 19.180102684801124,
                     "weeks_week": 2
                  }
               ]
            )
         }))

         return Promise.all(queries)
      })
   })
})

describe("Test careers", () => {
   let c = new Calculations(null)
   let db = new SQL();

   beforeAll(async () => {
      const testDBPath = path.join(__dirname, "temp/testDBFileCareers.sqlite")
      fs.copyFileSync(path.join(__dirname, "testDBFileCareersTemplate.sqlite"), testDBPath)
      db = new SQL(testDBPath)
      await db.startDB()
      c = new Calculations(db)
   })

   afterAll(() => {
      db.close()
   })
   test("Test the careers", async () => {
      
      for (let i = 0; i < 5; i++) {
         await helper()
      }

   })

   async function helper() {
      return c.dbUpdateTotalHours(1, 1)
         .then(() => {
            return c.dbUpdateCareersTable(1, 1)
         })
         .then(() => {
            return c.getCareers(1, 2)
         })
         .then(careers => {
            expect(careers).toMatchObject(
               [
                  {
                     "accounts_username": "harry",
                     "companies_id": 2,
                     "company_name": "Cam with Benefits",
                     "is_supervisor": 0,
                     "week": 2
                  },
                  {
                     "accounts_username": "harry",
                     "companies_id": 1,
                     "company_name": "Poopora",
                     "is_supervisor": 0,
                     "week": 2
                  },
                  {
                     "accounts_username": "ron",
                     "companies_id": 2,
                     "company_name": "Cam with Benefits",
                     "is_supervisor": 0,
                     "week": 2
                  },
                  {
                     "accounts_username": "ron",
                     "companies_id": 3,
                     "company_name": "Cheesewagon",
                     "is_supervisor": 1,
                     "week": 2
                  },
                  {
                     "accounts_username": "snape",
                     "companies_id": 2,
                     "company_name": "Cam with Benefits",
                     "is_supervisor": 0,
                     "week": 2
                  },
                  {
                     "accounts_username": "snape",
                     "companies_id": 3,
                     "company_name": "Cheesewagon",
                     "is_supervisor": 0,
                     "week": 2
                  },
                  {
                     "accounts_username": "voldemort",
                     "companies_id": 3,
                     "company_name": "Cheesewagon",
                     "is_supervisor": 0,
                     "week": 2
                  }
               ]
            )

         })
   }

})

describe("Test careers", () => {
   let c = new Calculations(null)
   let db = new SQL();

   beforeAll(async () => {
      const testDBPath = path.join(__dirname, "temp/testDBFileWeek2Careers.sqlite")
      fs.copyFileSync(path.join(__dirname, "testDBFileWeek2CareersTemplate.sqlite"), testDBPath)
      db = new SQL(testDBPath)
      await db.startDB()
      c = new Calculations(db)
   })

   afterAll(() => {
      db.close()
   })
   test("Test the careers", async () => {
      
      for (let i = 0; i < 5; i++) {
         await helper()
      }

   })

   async function helper() {
      return c.dbUpdateTotalHours(1, 1)
         .then(() => {
            return c.dbUpdateCareersTable(1, 1)
            .then(() => {
               return c.dbUpdateTotalHours(1, 2)
            })
            .then(() => {
               return c.dbUpdateCareersTable(1, 2)
            })
         })
         .then(() => {
            return c.getCareers(1, 2)
         })
         .then(careers => {
            return expect(careers).toMatchObject(
               [
                  {
                     "accounts_username":"ron",
                     "companies_id":3,
                     "company_name":"Cheesewagon",
                     "is_supervisor":0,
                     "week":2
                  },
                  {
                     "accounts_username":"snape",
                     "companies_id":3,
                     "company_name":"Cheesewagon",
                     "is_supervisor":0,
                     "week":2
                  }
               ]
            )

         })
         .then(() => {
            return c.getCareers(1, 3)
         })
         .then(careers => {
            return expect(careers).toMatchObject(
               [
                  {
                     "accounts_username":"harry",
                     "companies_id":3,
                     "company_name":"Cheesewagon",
                     "is_supervisor":0,
                     "week":3
                  },
                  {
                     "accounts_username":"ron",
                     "companies_id":3,
                     "company_name":"Cheesewagon",
                     "is_supervisor":1,
                     "week":3
                  },
                  {
                     "accounts_username":"snape",
                     "companies_id":3,
                     "company_name":"Cheesewagon",
                     "is_supervisor":0,
                     "week":2
                  }
               ]
            )

         })
   }

})

describe("Test Incorrect Supervisor", () => {
   let c = new Calculations(null)
   let db = new SQL();

   beforeAll(async () => {
      const testDBPath = path.join(__dirname, "temp/testDBFileWeek2CareerChange.sqlite")
      fs.copyFileSync(path.join(__dirname, "testDBFileWeek2CareerChangeTemplate.sqlite"), testDBPath)
      db = new SQL(testDBPath)
      await db.startDB()
      c = new Calculations(db)
   })

   afterAll(() => {
      db.close()
   })
   test("Test the incorrect careers", async () => {
      return helper()
   })

   function helper() {
      return c.dbUpdateTotalHours(1, 1)
         .then(() => {
            return c.dbUpdateCareersTable(1, 1)
            .then(() => {
               return c.dbUpdateTotalHours(1, 2)
            })
            .then(() => {
               return c.dbUpdateCareersTable(1, 2)
            })
         })
         .then(() => {
            return c.getCareers(1, 3)
         })
         .then(careers => {
            return expect(careers).toMatchObject(
               [
                  {
                     "accounts_username":"ron",
                     "companies_id":3,
                     "company_name":"Cheesewagon",
                     "is_supervisor":0,
                     "week":2
                  },
                  {
                     "accounts_username":"snape",
                     "companies_id":3,
                     "company_name":"Cheesewagon",
                     "is_supervisor":1,
                     "week":3
                  }
               ]
            )

         })
   }

})

