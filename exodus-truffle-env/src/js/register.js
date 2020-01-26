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
    var uberInstance;
    var loader = $("#loader");  
    var content = $("#regdriver");
    var registered = $("#registered")
    
    // loader.hide();
    // content.show();
    loader.show();
    
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
    if(!isValid){
      loader.hide();
      content.show();
    }
    else{
      loader.hide();
      content.hide();
      registered.show();
    }
    }
    catch(err){
      alert('Connect to Metamask');
    }
    
    // Load account data
  },

  regDriver : async function(){
    
    var loader = $("#loader");  
    var content = $("#regdriver");
    var registered = $("#registered");
    var name = $("#drivername").val();
    var phno = $("#phno").val();
    var license = $("#license").val();
    var uberInstance = await App.contracts.Uber.deployed();

    try{
      var fee = await uberInstance.regFee.call();
      await uberInstance.registerDriver(name,license,phno,{from:App.account,value:fee});
      content.hide();
      registered.show();
    }
    catch(err){
      alert("Insufficient Fee");  
     }
  },
  
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});