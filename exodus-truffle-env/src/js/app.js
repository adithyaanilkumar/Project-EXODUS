App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  Booked : false,
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
    var content = $("#searchride");
    var ridedetails = $("#ridedetails");
    
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    var uberInstance = await App.contracts.Uber.deployed();
     // uberInstance.removeRequest(1,{from:App.account});

    try {
      var driverId = await uberInstance.getDriverId(App.account);
      var isValid = await uberInstance.getDriverValid(driverId);
      var custaddr=0;
      try{
      custaddr = await uberInstance.getCustomer({from:App.account});
      console.log(custaddr.toNumber());
      }
      catch(err){
        console.log("dsfd");
      }
      var incomplete = await uberInstance.isIncompletePayment({from:App.account});
      console.log(incomplete);
      if(custaddr.toNumber()!=0 ){
        alert("Cab Booked");
        loader.hide();
        var driverDetails = await uberInstance.getDriverDetails(custaddr);
        
        ridedetails.append("<center><div class='well well-sm'><h4>Driver Name : "+driverDetails[0]+"</h4></div></center>");
        ridedetails.append("<center><div class='well well-sm'><h4>Contact No : "+driverDetails[2]+"</h4></div></center>");
        ridedetails.append("<center><div class='well well-sm'><h4>Amount to Pay : "+driverDetails[1]*8+" wei</h4></div></center>");
        ridedetails.append("<center><div class='well well-sm'><h4>Estimated Arrival : 30 min</h4></div></center>");
        ridedetails.append("<center><button type='button' class='btn btn-success' onclick='App.payDriver();'>Pay</button></center>");      
                  
        ridedetails.show();
      }
      else if(incomplete){
        loader.hide();
        ridedetails.empty();
        ridedetails.append("<center><h4>Complete your previous Payment</h4></div></center>");
        ridedetails.append("<center><button type='button' class='btn btn-success' onclick='App.payDriver();'>Pay</button></center>");      
                  
        ridedetails.show(); 
      }
      else if(!isValid){
        loader.hide();
        content.show();
      }
      else{
        alert('Login from user account');
      }

    }
    catch(err){
      alert('Connect to Metamask');
    }
    // Load account data
  },

  estimateFare : async function(){
    var ridedetails = $("#ridedetails");
    var content = $("#searchride");
    var loader = $("#loader");  
    var curlat = $("#fromlat").val();
    var curlon = $("#fromlon").val();
    var tolat = $("#tolat").val();
    var tolon = $("#tolon").val();
    
    var uberInstance = await App.contracts.Uber.deployed();
    var fare = await uberInstance.getEstimatedFare(curlat,curlon,{from:App.account});
    var estimatedcost = (Math.pow(tolat-curlat,2)+Math.pow(tolon-curlon,2))*fare.toNumber();
    loader.empty();
    if(fare.toNumber()==0)
      loader.append("<center><h2>Could not find estimate.No cabs available right now</h2></center>");
    else
      loader.append("<center><h2>Your estimated cost : "+estimatedcost+" wei</h2></center>");
    loader.show();
  },

  payDriver : async function(){
    var ridedetails = $("#ridedetails");
    var loader = $("#loader");  

    var uberInstance = await App.contracts.Uber.deployed();
    var payDetails = await uberInstance.getCustomerDetails({from:App.account});
    try{
      console.log(payDetails[1].toNumber());
      web3.eth.sendTransaction({to:payDetails[0],from:App.account,value:payDetails[1].toNumber()}, function(err, transactionHash){
      if (!err){
        uberInstance.payDriver({from:App.account});
        console.log(transactionHash);
        alert("Paid to Driver");
        App.render();
        }
      });
      // uberInstance.payDriver({from:App.account});
    }
    catch(err){
      console.log("err");
      console.log(err);
    }
  },

  searchDriver : async function(){
    var ridedetails = $("#ridedetails")
    var content = $("#searchride");
    var loader = $("#loader");  
    var curlat = $("#fromlat").val();
    var curlon = $("#fromlon").val();
    var tolat = $("#tolat").val();
    var tolon = $("#tolon").val();

    var uberInstance = await App.contracts.Uber.deployed();
    loader.hide();
    loader.empty();
    loader.append("<center><h2>Searching For Nearby Cabs...</h2></center>");
    loader.append("<center><div class='loading'></div></center>");

    content.hide();
    loader.show();
    const delay = ms => new Promise(res => setTimeout(res, ms));
    await delay(3000);
    var id = await uberInstance.searchDrivers(curlat,curlon,{from:App.account});
    if(id[0]==0){
      loader.empty();
      loader.append("<center><h2>Sorry No Cabs available now.Please try gain later</h2></center>");
    }
    else{
      //send request message to all driver id's
      ridedetails.append("<p>Sorry all drivers are busy right now.Please try again later.</p>");
      for(var i=0;i<id.length;i++){
        if(id[i]==0)
          break;
        //send req to available driver
        try{
        await uberInstance.sendRequest(id[i],curlat,curlon,tolat,tolon,{from:App.account});
        }
        //If req cannot be send then send to next driver 
        catch(err){
          console.log(err);
          continue;
        }
        //       wait for response from driver id[i]
        var timerId = setInterval(async function(){
         // call your function here
         try{
              var isreject = await uberInstance.isRejected(id[i],{from:App.account});
              if(isreject){
                  clearInterval(timerId);
                  console.log("rejected");
              }
              var res = await uberInstance.getResponse(id[i],{from:App.account});
              clearInterval(timerId);
              if(res){
                  loader.hide();
                  content.hide();
                  ridedetails.empty();
                  App.Booked=true;
                  uberInstance.removeRequest(id[i],{from:App.account});
                  App.render();
                }
                else{
                  uberInstance.removeRequest(id[i],{from:App.account});
                  console.log("False");
                }
         }
         catch(err){
            console.log("No response");
         }
        }, 500);

        setTimeout(() => {
          clearInterval(timerId);
          console.log(App.Booked);
          if(App.Booked==false)
            uberInstance.removeRequest(id[i],{from:App.account});
        },20000);

        if(i!=id.length-1)
          await delay(20000);
      }

      if(App.Booked==false){
        loader.hide();
        alert("No cabs available");
        ridedetails.show();
      }
    }
  },
  
  
};

$(function() {
  $(window).load(function() {
      App.init();
  });
});