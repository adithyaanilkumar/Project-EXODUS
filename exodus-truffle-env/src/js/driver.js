App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    // TODO: refactor conditional
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Uber.json", function(uber) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Uber = TruffleContract(uber);
      // Connect provider to interact with contract
      App.contracts.Uber.setProvider(App.web3Provider);

      // App.listenForEvents();

      return App.render();
    });
  },
  render: async function() {
    var loader = $("#loader");  
        
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddr").html("Your Account: " + account);
      }
    });
    var uberInstance = await App.contracts.Uber.deployed();
    try {
      var driverId = await uberInstance.getDriverId(App.account);
      var isValid = await uberInstance.getDriverValid(driverId);
      var reqDetails = $("#requestdetails");
      if(isValid){
        loader.hide();
        //process here request list and show
        var res,fare,cost; 
        try{
           res = await uberInstance.getRequest({from:App.account});
           fare = await uberInstance.getDriverFare({from:App.account});
           cost = (Math.pow(res[2].toNumber()-res[0].toNumber(),2)+Math.pow(res[3].toNumber()-res[1].toNumber(),2))*fare.toNumber();

          reqDetails.append("<center><h1>Ride Request</h1></center>");
          reqDetails.append("<center><h4>Pickup-Latitude : "+res[0].toNumber()+"</h4></center>");
          reqDetails.append("<center><h4>Pickup-Longitude : "+res[1].toNumber()+"</h4></center>");
          reqDetails.append("<center><h4>Drop-Latitude : "+res[2].toNumber()+"</h4></center>");
          reqDetails.append("<center><h4>Drop-Longitude : "+res[3].toNumber()+"</h4></center>");
          reqDetails.append("<center><h4>Cost : "+cost+"</h4></center>");
          reqDetails.append("<center><button type='button' class='btn btn-success' onclick='App.acceptRide("+cost+");'>Accept</button></center>");
          reqDetails.append("<center><button type='button' class='btn btn-danger' onclick='App.rejectRide();'>Reject</button></center>");
          reqDetails.show();
        }
        catch(err){
          console.log(err.message);
          reqDetails.empty();  
          var isaccept = await uberInstance.isAccepted({from:App.account});
          if(isaccept){
          reqDetails.append("<center><h1>Current Ride</h1></center>");
          reqDetails.append("<center><button type='button' class='btn btn-success' onclick='App.startTrip();'>Start Trip</button></center>");
          reqDetails.show();
          }
          else{
          reqDetails.append("<h1>No Ride Requests</h1>");
          reqDetails.show();
          }
        }
      }
      else{
        loader.show();
      }
    }
    catch(err){
      alert('Connect to Metamask');
    }
    // Load account data
  },
  acceptRide: async function(cost){
    var uberInstance = await App.contracts.Uber.deployed();
    try{
    console.log(cost);  
    await uberInstance.acceptRequest(cost,{from:App.account});
    App.render();
    //start trip and end trip
    }
    catch(err){
      App.render();
    }
  },
  rejectRide: async function(){
    var uberInstance = await App.contracts.Uber.deployed();
    try{
    await uberInstance.rejectRequest({from:App.account});
    App.render();
    //start trip and end Trip
    }
    catch(err){
      App.render();
    }
  },
  startTrip: async function(){
    var reqDetails = $("#requestdetails");
    var uberInstance = await App.contracts.Uber.deployed();
    try{
    // await uberInstance.startTrip({from:App.account});
    reqDetails.empty();
    reqDetails.append("<center><h1>Current Ride</h1></center>");
    reqDetails.append("<center><button type='button' class='btn btn-success' onclick='App.endTrip();'>End Trip</button></center>");      
    reqDetails.show();
    // App.render();
    //start trip and end trip
    }
    catch(err){
      App.render();
    }
  },
  endTrip: async function(){
    var reqDetails = $("#requestdetails");
    var uberInstance = await App.contracts.Uber.deployed();
    try{
    await uberInstance.endTrip({from:App.account});
    reqDetails.empty();
    reqDetails.append("<center><h1>Ride Finished.Collect amount</h1></center>");
    reqDetails.show();
    // App.render();
    //start trip and end trip
    }
    catch(err){
      App.render();
    }
  },
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});