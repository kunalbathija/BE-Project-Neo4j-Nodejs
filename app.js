if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session1 = require('express-session');
const methodOverride = require('method-override');
const uuid = require('uuid/v1')
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'vestudizteam@gmail.com',
      pass: 'lebrqyloiectreud'
    }
  });
var app = express();

const Blockchain = require('./block/blockchain')
const blockchain = new Blockchain()

const initializePassport = require('./passport-config')
initializePassport(
    passport, 
    email => users.find(user => user.email === email), 
    id => users.find(user => user.id === id)
)

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/views'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false}));
app.use(flash())
app.use(session1({
    secret: 'dev',
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "123456"))
var session = driver.session()

var users = [
    { id: '1613226927108', name: 'Central Government', email: 'central_gvt@yopmail.com', password: '123456', type: 'C_Gvt'}
    // { id: '1613226927109', name: 'Maharashtra State Government', email: 'maha_state_government', password: '123456', type: 'S_Gvt'},
    // { id: '1613226927110', name: 'Mumbai District Government', email: 'mumbai_district_government', password: '123456', type: 'D_Gvt'},
    // { id: '1613226927111', name: 'ABC School', email: 'ABC_School', password: '123456', type: 'School'},
    // { id: '1613226927112', name: 'PQR School', email: 'PQR_School', password: '123456', type: 'School'}
]

var blockchain_transactions = blockchain.getAllBlocks();

app.get('/', checkNotAuthenticated, function(req, res){
    console.log(blockchain.getLastBlock());
    res.redirect('index');
});

app.get('/login', checkNotAuthenticated, function(req, res){
    res.render('login')
});

app.get('/register', checkNotAuthenticated, function(req, res){
    res.render('register')
});

app.post('/register', checkNotAuthenticated, async function(req, res){
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            type: req.body.type
        })
        console.log(users)
        res.redirect('/login')
    }catch(e){
        console.log(e)
        res.redirect('/register')
    }
});

app.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
      if (err) { return next(err); }
      if (!user) { return res.redirect('/login'); }
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        else {
            if(req.user.type==='C_Gvt'){ //State and allocate 
                console.log(req.user.type)
                return res.redirect('/index');
            }
            else if(req.user.type==='S_Gvt'){ //District and allocate -> 
                console.log(req.user.type)
                return  res.redirect('indexDistrict');
            }
            else if(req.user.type==='D_Gvt'){ // Schools and vendors 
                console.log(req.user.type)
                return  res.redirect('indexSchool');
            }
            else if(req.user.type==='School'){ //Allocate to vendor
                console.log(req.user.type)
                return  res.redirect('indexVendor');
            }
        }
      });
    })(req, res, next);
});

app.get('/transactions', checkAuthenticated, function(req, res){

    blockchain_transactions = blockchain.getAllBlocks();
    console.log(blockchain_transactions);
    res.render('transactions', {
        username: req.user.name,
        blockchain_transactions: blockchain_transactions
    }); 
});

//Home Route
app.get('/index', checkAuthenticated, function(req, res){
    console.log(blockchain.getUserData('Central Government'));
    session
        .run("MATCH (n: Project) RETURN n")
        .then(function(result){            
            var projArr = [];    
            result.records.forEach(function(record){
                projArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
                //console.log(record._fields[0]);
            });                    
            session
                .run("MATCH (n: State_Gvt) RETURN n")
                .then(function(result1){    
                    var stateArr = [];        
                    result1.records.forEach(function(record){
                        stateArr.push({
                            id: record._fields[0].identity.low,
                            name: record._fields[0].properties.name
                        });
                        //console.log(stateArr);
                    }); 
                    res.render('index', {
                        states: stateArr,
                        projects: projArr,
                        username: req.user.name,
                        blockchain_transactions: blockchain_transactions
                    });                   
                })                
        })
        .catch(function(error){
            console.log(error);
        }); 
});

//Get Add
app.get('/add', checkAuthenticated, function(req, res){
    console.log(blockchain.getUserData('Central Government'));
    var isAdded = req.query.success;
    if(isAdded){
        isAdded = true;
    }else{
        isAdded = false;
    }

    session
        .run("MATCH (n: State_Gvt) RETURN n")
        .then(function(result){            
            var governArr = [];    
            result.records.forEach(function(record){
                governArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
                //console.log(record._fields[0]);
            });                    
            session
                .run("MATCH (n: Project) RETURN n")
                .then(function(result1){    
                    var projArr = [];        
                    result1.records.forEach(function(record){
                        projArr.push({
                            id: record._fields[0].identity.low,
                            name: record._fields[0].properties.name
                        });
                        //console.log(record._fields[0]);
                    }); 
                    session
                        .run("MATCH (n: Central_Gvt) RETURN n")
                        .then(function(result1){    
                            var centralArr = [];        
                            result1.records.forEach(function(record){
                                centralArr.push({
                                    id: record._fields[0].identity.low,
                                    name: record._fields[0].properties.name,
                                    balance: record._fields[0].properties.balance
                                });
                                //console.log(centralArr[0].balance);
                            }); 
                            res.render('add', {
                                governs: governArr,
                                centralGvt: centralArr,
                                projects: projArr,
                                isAdded : isAdded,
                                username: req.user.name
                            });                   
                        })                    
                })                
        })
        .catch(function(error){
            console.log(error);
        });    
});



app.get('/indexDistrict', checkAuthenticated, function(req, res){
    session
        .run("MATCH (n: District_Gvt) RETURN n")
        .then(function(result){
            var districtsArr = [];
            result.records.forEach(function(record){
                districtsArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            });

        res.render('indexDistrict', {
            districts: districtsArr,
            username: req.user.name,
        });    
            
        })
        .catch(function(error){
            console.log(error);
        });
});

app.get('/addDistrict', checkAuthenticated, function(req, res){
    var isAdded = req.query.success;
    if(isAdded){
        isAdded = true;
    }else{
        isAdded = false;
    }
    session
        .run("MATCH (n: District_Gvt) RETURN n")
        .then(function(result){
            var districtsArr = [];
            result.records.forEach(function(record){
                districtsArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            });

            session
                .run("MATCH (n: Project) RETURN n")
                .then(function(result1){
                    var projArr = [];
                    result1.records.forEach(function(record){
                        projArr.push({
                            id: record._fields[0].identity.low,
                            name: record._fields[0].properties.name
                        });
                    });
                    session
                    .run("MATCH (n: State_Gvt {name: $State_name}) RETURN n",{State_name: req.user.name})
                    .then(function(result1){
                        result1.records.forEach(function(record){
                            stateBalance = record._fields[0].properties.balance
                        });
                        res.render('addDistrict', {
                            projects: projArr,
                            districts: districtsArr,
                            isAdded : isAdded,
                            username: req.user.name,
                            stateBalance: stateBalance
                        });    
                    })  
                })            
        })
        .catch(function(error){
            console.log(error);
        });    
});

app.get('/indexSchool', checkAuthenticated, function(req, res){
    session
    .run("MATCH (n: School) RETURN n")
        .then(function(result){
            var schoolsArr = [];
            result.records.forEach(function(record){
                schoolsArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            });

            session
                .run("MATCH (n: Vendor) RETURN n")
                .then(function(result2){
                    var vendorsArr = [];
                    result2.records.forEach(function(record){
                        vendorsArr.push({
                            id: record._fields[0].identity.low,
                            name: record._fields[0].properties.name
                        });
                    });

                    res.render('indexSchool', {
                        schools: schoolsArr,
                        vendors: vendorsArr,
                        username: req.user.name,
                    });
                })
            
        })
        .catch(function(error){
            console.log(error);
        });
});

app.get('/addSchool', checkAuthenticated, function(req, res){
    var isAdded = req.query.success;
    if(isAdded){
        isAdded = true;
    }else{
        isAdded = false;
    }

    session
        .run("MATCH (n: School) RETURN n")
        .then(function(result){
            var schoolsArr = [];
            result.records.forEach(function(record){
                schoolsArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            });
            session
                .run("MATCH (n: Project) RETURN n")
                .then(function(result1){
                    var projArr = [];
                    result1.records.forEach(function(record){
                        projArr.push({
                            id: record._fields[0].identity.low,
                            name: record._fields[0].properties.name
                        });
                    });
                    session
                        .run("MATCH (n: District_Gvt {name: $District_name}) RETURN n",{District_name: req.user.name})
                        .then(function(result1){
                            result1.records.forEach(function(record){
                                districtBalance = record._fields[0].properties.balance
                            });
                            res.render('addSchool', {
                                projects: projArr,
                                schools: schoolsArr,
                                isAdded : isAdded,
                                username: req.user.name,
                                districtBalance: districtBalance
                            });     
                        })
                    
                })                                   
        })
        .catch(function(error){
            console.log(error);
        });
});

//Get AddVendor
app.get('/addVendor', checkAuthenticated, function(req, res){

    var isAdded = req.query.success;
    if(isAdded){
        isAdded = true;
    }else{
        isAdded = false;
    }
    session
        .run("MATCH (n: Vendor) RETURN n")
        .then(function(result2){
            var vendorsArr = [];
            result2.records.forEach(function(record){
                vendorsArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            });
            session
                .run("MATCH (n: Project) RETURN n")
                .then(function(result1){
                    var projArr = [];
                    result1.records.forEach(function(record){
                        projArr.push({
                            id: record._fields[0].identity.low,
                            name: record._fields[0].properties.name
                        });
                    });
                    session
                    .run("MATCH (n: School {name: $School_name}) RETURN n",{School_name: req.user.name})
                    .then(function(result1){
                        result1.records.forEach(function(record){
                            schoolBalance = record._fields[0].properties.balance
                        });
                        res.render('addVendor', {
                            projects: projArr,
                            isAdded : isAdded,
                            username: req.user.name,
                            vendors: vendorsArr,
                            schoolBalance: schoolBalance
                        });  
                    })  
                })   
            
        })
        .catch(function(error){
            console.log(error);
        });

});


app.get('/indexVendor', checkAuthenticated, function(req, res){
    session
        .run("MATCH (n: Vendor) RETURN n")
        .then(function(result){
            var vendorsArr = [];
            result.records.forEach(function(record){
                vendorsArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
                //console.log(record._fields[0]);
            });

        res.render('indexVendor', {
            vendors: vendorsArr,
            username: req.user.name,
        });    
            
        })
        .catch(function(error){
            console.log(error);
        });
});

//Add Project
app.post('/project/add', checkAuthenticated, function(req, res){
    var name = req.body.name;
    if(name){
        session
        .run("CREATE (n: Project{name: $nameParam}) RETURN n.name",{nameParam: name})
        .then(function(result){
            res.redirect('/index');
        })
        .catch(function(error){
            console.log(error);
        });
    }    
    else{
        res.redirect('/index');
    }
});

//Add Government Route
app.post('/state/add', checkAuthenticated, function(req, res){
    var name = req.body.name;
    var email = req.body.email;
    var identity = req.body.identity;
    // Add error handling for identity check
    var password = uuid().split('-').join('').substr(0,8);
    console.log("password",password)
    const found = users.some(el => el.email === email);
    if(!found){
        users.push({
            id: uuid().split('-').join('').substr(0, 12), 
            name: name, 
            email: email, 
            password: '123456', 
            type: 'S_Gvt'
        });
        blockchain.createnewUser(name, 0);
    }    
    console.log(users);
    session
        .run("CREATE (n: State_Gvt{name: $nameParam, balance: 0}) RETURN n.name",{nameParam: name})
        .then(function(result){
            var mailOptions = {
                from: 'test.sparrow.8688@gmail.com',
                to: email,
                subject: 'Credentials for using Blockchain Network',
                html: '<p>Following are the credentials for login:</p><br/><p>Email: ' + email + '</p><br/><p>Password: ' + password + '</p>',
            };
              
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
            });
            res.redirect('/index');
        })
        .catch(function(error){
            console.log(error);
        });
});

//Add District Government Route
app.post('/district/add', checkAuthenticated, function(req, res){
    var name = req.body.name;
    var email = req.body.email;
    var identity = req.body.identity;
    // Add error handling for identity check
    var password = uuid().split('-').join('').substr(0,8);
    console.log(password)
    const found = users.some(el => el.email === email);
    if(!found){
        users.push({
            id: uuid().split('-').join('').substr(0, 12), 
            name: name, 
            email: email, 
            password: '123456', 
            type: 'D_Gvt'
        });
        blockchain.createnewUser(name, 0);
    }
    session
        .run("CREATE (n: District_Gvt{name: $nameParam, balance: 0}) RETURN n.name",{nameParam: name})
        .then(function(result){
            var mailOptions = {
                from: 'test.sparrow.8688@gmail.com',
                to: email,
                subject: 'Credentials for using Blockchain Network',
                html: '<p>Following are the credentials for login:</p><br/><p>Email: ' + email + '</p><br/><p>Password: ' + password + '</p>',
            };
              
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
            });
            res.redirect('/indexDistrict');
        })
        .catch(function(error){
            console.log(error);
        });
});

app.post('/school/add', checkAuthenticated, function(req, res){
    var name = req.body.name;
    var email = req.body.email;
    var identity = req.body.identity;
    // Add error handling for identity check
    var password = uuid().split('-').join('').substr(0,8);
    const found = users.some(el => el.email === email);
    if(!found){
        users.push({
            id: uuid().split('-').join('').substr(0, 12), 
            name: name, 
            email: email, 
            password: '123456', 
            type: 'School'
        });
        blockchain.createnewUser(name, 0);
    }
    session
        .run("CREATE (n: School{name: $nameParam, balance: 0}) RETURN n.name",{nameParam: name})
        .then(function(result){
            var mailOptions = {
                from: 'test.sparrow.8688@gmail.com',
                to: email,
                subject: 'Credentials for using Blockchain Network',
                html: '<p>Following are the credentials for login:</p><br/><p>Email: ' + email + '</p><br/><p>Password: ' + password + '</p>',
            };
              
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
            });
            res.redirect('/indexSchool');
        })
        .catch(function(error){
            console.log(error);
        });
});

//Add vendor 
app.post('/vendor/add', checkAuthenticated, function(req, res){
    var name = req.body.name;
    // var email = req.body.email;
    // var identity = req.body.identity;
    // // Add error handling for identity check
    // var password = uuid().split('-').join('').substr(0,8);
    // const found = users.some(el => el.email === email);
    // if(!found){
    //     users.push({
    //         id: uuid().split('-').join('').substr(0, 12), 
    //         name: name, 
    //         email: email, 
    //         password: '123456', 
    //         type: 'Vendor'
    //     });
    //     
    // }

    blockchain.createnewUser(name, 0);

    session
        .run("CREATE (n: Vendor{name: $nameParam, balance: 0}) RETURN n.name",{nameParam: name})
        .then(function(result){
            // var mailOptions = {
            //     from: 'test.sparrow.8688@gmail.com',
            //     to: email,
            //     subject: 'Credentials for using Blockchain Network',
            //     html: '<p>Following are the credentials for login:</p><br/><p>Email: ' + email + '</p><br/><p>Password: ' + password + '</p>',
            // };
              
            // transporter.sendMail(mailOptions, function(error, info){
            //     if (error) {
            //       console.log(error);
            //     } else {
            //       console.log('Email sent: ' + info.response);
            //     }
            // });
            res.redirect('/indexSchool');
        })
        .catch(function(error){
            console.log(error);
        });
});

//Allocate Central to State
app.post('/allocate/ctos', checkAuthenticated, function(req, res){    
    var sen = blockchain.getUserData(req.body.name1);    
    // console.log(sen);
    if(sen.balance < req.body.amount){
        // Add error (Insufficient Balance)
        console.log('Sender has Insufficient Balance');
    }
    
    const newTrans = blockchain.createNewTransaction(req.body.amount, req.body.name1, req.body.name2, req.body.project);
    blockchain.addTransactionToPendingTransactions(newTrans);
    const lastBlock = blockchain.getLastBlock();
	const previousBlockHash = lastBlock['hash'];
	const currentBlockData = {
		transactions: blockchain.pendingTransactions,
		index: lastBlock['index'] + 1
	};
	const nonce = blockchain.proofOfWork(previousBlockHash, currentBlockData);
	const blockHash = blockchain.hashBlock(previousBlockHash, currentBlockData, nonce);
	const newBlock = blockchain.createNewBlock(nonce, previousBlockHash, blockHash);
    console.log(blockchain.getLastBlock());
    
    var name1 = req.body.name1;
    var name2 = req.body.name2;
    var amount = req.body.amount;
    var project = req.body.project;

    blockchain.updateUserSender(name1, amount);
    blockchain.updateUserReceiver(name2, amount);
    const sender = blockchain.getUserData(name1);
    const receiver = blockchain.getUserData(name2);
    session
        .run("MATCH(a:Central_Gvt{name:$nameParam1}) SET a.balance = $senderBalance",{nameParam1: name1, senderBalance: sender.balance})
        .then(function(result){            
            session
                .run("MATCH(a:State_Gvt{name:$nameParam2}) SET a.balance = $receiverBalance",{nameParam2: name2, receiverBalance: receiver.balance})    
                .then(function(result1){
                    session
                    .run("MATCH(a:Central_Gvt{name:$nameParam1}), (b:State_Gvt{name:$nameParam2}) MERGE (a)-[r:" + project + "{amount: $amountPara}]->(b) RETURN a,b ",{nameParam1: name1, nameParam2: name2, amountPara: amount})
                    .then(function(result2){
                        res.redirect('/add?success=true');
                    })
                })
        })        
        .catch(function(error){
            console.log(error);
        });
});

//Allocate G to G
app.post('/allocate/stod', checkAuthenticated, function(req, res){
    var sen = blockchain.getUserData(req.body.name1);    
    // console.log(sen);
    if(sen.balance < req.body.amount){
        // Add error (Insufficient Balance)
        console.log('Sender has Insufficient Balance');
    }
    
    const newTrans = blockchain.createNewTransaction(req.body.amount, req.body.name1, req.body.name2, req.body.project);
    blockchain.addTransactionToPendingTransactions(newTrans);
    const lastBlock = blockchain.getLastBlock();
	const previousBlockHash = lastBlock['hash'];
	const currentBlockData = {
		transactions: blockchain.pendingTransactions,
		index: lastBlock['index'] + 1
	};
	const nonce = blockchain.proofOfWork(previousBlockHash, currentBlockData);
	const blockHash = blockchain.hashBlock(previousBlockHash, currentBlockData, nonce);
	const newBlock = blockchain.createNewBlock(nonce, previousBlockHash, blockHash);
    console.log(blockchain.getLastBlock());

    var name1 = req.body.name1;
    var name2 = req.body.name2;
    var amount = req.body.amount;
    var project = req.body.project;

    blockchain.updateUserSender(name1, amount);
    blockchain.updateUserReceiver(name2, amount);
    const sender = blockchain.getUserData(name1);
    const receiver = blockchain.getUserData(name2);

    session
        .run("MATCH(a:State_Gvt{name:$nameParam1}) SET a.balance = $senderBalance",{nameParam1: name1, senderBalance: sender.balance})
        .then(function(result){
            session
                .run("MATCH(a:District_Gvt{name:$nameParam2}) SET a.balance = $receiverBalance",{nameParam2: name2, receiverBalance: receiver.balance})    
                .then(function(result1){
                    session
                        .run("MATCH(a:State_Gvt{name:$nameParam1}), (b:District_Gvt{name:$nameParam2}) MERGE (a)-[r:" + project + "{amount: $amountPara}]->(b) RETURN a,b ",{nameParam1: name1, nameParam2: name2, amountPara: amount})
                        .then(function(result){
                            res.redirect('/addDistrict?success=true');
                        })
                })
        })        
        .catch(function(error){
            console.log(error);
        });
});

//Allocate G to S
app.post('/allocate/dtos', checkAuthenticated, function(req, res){
    var sen = blockchain.getUserData(req.body.name1);    
    // console.log(sen);
    if(sen.balance < req.body.amount){
        // Add error (Insufficient Balance)
        console.log('Sender has Insufficient Balance');
    }
    
    const newTrans = blockchain.createNewTransaction(req.body.amount, req.body.name1, req.body.name2, req.body.project);
    blockchain.addTransactionToPendingTransactions(newTrans);
    const lastBlock = blockchain.getLastBlock();
	const previousBlockHash = lastBlock['hash'];
	const currentBlockData = {
		transactions: blockchain.pendingTransactions,
		index: lastBlock['index'] + 1
	};
	const nonce = blockchain.proofOfWork(previousBlockHash, currentBlockData);
	const blockHash = blockchain.hashBlock(previousBlockHash, currentBlockData, nonce);
	const newBlock = blockchain.createNewBlock(nonce, previousBlockHash, blockHash);
    console.log(blockchain.getLastBlock());

    var name1 = req.body.name1;
    var name2 = req.body.name2;
    var amount = req.body.amount;
    var project = req.body.project;

    blockchain.updateUserSender(name1, amount);
    blockchain.updateUserReceiver(name2, amount);
    const sender = blockchain.getUserData(name1);
    const receiver = blockchain.getUserData(name2);

    session
        .run("MATCH(a:District_Gvt{name:$nameParam1}) SET a.balance = $senderBalance",{nameParam1: name1, senderBalance: sender.balance})
        .then(function(result){
            session
                .run("MATCH(a:School{name:$nameParam2}) SET a.balance = $receiverBalance",{nameParam2: name2, receiverBalance: receiver.balance})    
                .then(function(result1){
                    session
                        .run("MATCH(a:District_Gvt{name:$nameParam1}), (b:School{name:$nameParam2}) MERGE (a)-[r:" + project + "{amount: $amountPara}]->(b) RETURN a,b ",{nameParam1: name1, nameParam2: name2, amountPara: amount})
                        .then(function(result2){
                            res.redirect('/addSchool?success=true');
                        })
                })
        })                
        .catch(function(error){
            console.log(error);
        });
});

//School to vendor 
app.post('/school/vendor', checkAuthenticated, function(req, res){
    var sen = blockchain.getUserData(req.body.name1);    
    // console.log(sen);
    if(sen.balance < req.body.amount){
        // Add error (Insufficient Balance)
        console.log('Sender has Insufficient Balance');
    }
    
    const newTrans = blockchain.createNewTransaction(req.body.amount, req.body.name1, req.body.name2, req.body.project);
    blockchain.addTransactionToPendingTransactions(newTrans);
    const lastBlock = blockchain.getLastBlock();
	const previousBlockHash = lastBlock['hash'];
	const currentBlockData = {
		transactions: blockchain.pendingTransactions,
		index: lastBlock['index'] + 1
	};
	const nonce = blockchain.proofOfWork(previousBlockHash, currentBlockData);
	const blockHash = blockchain.hashBlock(previousBlockHash, currentBlockData, nonce);
	const newBlock = blockchain.createNewBlock(nonce, previousBlockHash, blockHash);
    console.log(blockchain.getLastBlock());
    
    var name1 = req.body.name1;
    var name2 = req.body.name2;
    var project = req.body.project;
    var amount = req.body.amount;
    blockchain.updateUserSender(name1, amount);
    blockchain.updateUserReceiver(name2, amount);
    const sender = blockchain.getUserData(name1);
    const receiver = blockchain.getUserData(name2);
    const users = blockchain.getAllUsers();
    console.log(users);
    console.log(receiver);

    session
        .run("MATCH(a:School{name:$nameParam1}) SET a.balance = $senderBalance",{nameParam1: name1, senderBalance: sender.balance})
        .then(function(result){
            session
                .run("MATCH(a:Vendor{name:$nameParam2}) SET a.balance = $receiverBalance",{nameParam2: name2, receiverBalance: receiver.balance})    
                .then(function(result1){
                    session
                    .run("MATCH(a:School{name:$nameParam1}), (b:Vendor{name:$nameParam2}) MERGE (a)-[r:" + project + "{amount: $amountPara}]->(b) RETURN a,b ",{nameParam1: name1, nameParam2: name2, amountPara: amount})
                        .then(function(result2){
                            res.redirect('/addVendor?success=true');
                        })
                })
        })                
        .catch(function(error){
            console.log(error);
        });        
});

app.get('/graph', checkAuthenticated,  function(req, res){
    res.render('neo4j_graph')
});


function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next()
    }

    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return res.redirect('/')
    }

    next()
}

app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/login')
})

app.listen(3000);

console.log('Server Started on port 3000');

module.exports = app;


