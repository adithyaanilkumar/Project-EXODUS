pragma solidity >=0.4.24 < 0.7.0;

contract Uber {

  address public owner;
  
  struct Driver {
    string name;
    address customerAddr;
    string license;
    uint farePerKm;
    int latitude;
    int longitude;
    uint phoneNo;
    bool valid;
  }

  struct Reqlist {
    address customerAddr;
    int fromLatitude;
    int fromLongitude;
    int toLatitude;
    int toLongitude;
  }
  //one struct for customer needed for payments and assigned driver(No location details)
  struct Customer {
    address driverAddr;
    uint amountToPay;
    bool isBusy;
  }
  
  mapping(uint => Driver)  driverList;
  mapping (address => uint) mapDriver;
  mapping(uint => Reqlist) reqList;
  mapping (address => Customer) customer;

  event Collected(address sender,uint amount);

  uint public numDrivers;
  uint public regFee;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  constructor(uint _regFee) public {
    owner = msg.sender;
    regFee = _regFee;
  }

  function registerDriver(string memory _name,string memory _license,uint _phoneno) public payable {
      require (!driverList[mapDriver[msg.sender]].valid,"Not a valid address");
      require (msg.value >= regFee,"Insufficient Registration Fee");
            
      numDrivers = numDrivers + 1;
      mapDriver[msg.sender] = numDrivers;
      driverList[numDrivers] = Driver({
        name : _name,
        customerAddr : address(0),
        license : _license,
        farePerKm : 0,
        latitude : 0,
        longitude : 0,
        phoneNo : _phoneno,
        valid  : true
      });
  }
  //Getters
  function getDriverId (address _addr) public view returns(uint res)  {
    return mapDriver[_addr];
  }
  
  function getDriverValid (uint _id) public view returns(bool res)  {
    return driverList[_id].valid;
  }

  function getDriverFare () public view returns(uint res)  {
    require (driverList[mapDriver[msg.sender]].valid,"Not a driver address");

    return driverList[mapDriver[msg.sender]].farePerKm;
  }

  function getDriverDetails (uint id) public view returns(string memory,uint,uint)  {
    require (id >0 && id <=numDrivers,"Invalid id of driver");

    return (driverList[id].name,driverList[id].farePerKm,driverList[id].phoneNo);
  }
  

  function getCustomer() public view returns(uint res)  {
    for(uint i=1;i<=numDrivers;i++){
      if(driverList[i].customerAddr==msg.sender){
        return i;
      }
    }
    return 0;
  }

  
  function max(uint a, uint b) private view returns (uint) {
        return a > b ? a : b;
  }

  function getEstimatedFare (int _latitude,int _longitude) public view returns(uint res)  {
    require (!driverList[mapDriver[msg.sender]].valid,"Cannot use from driver address");
    
    uint fare;
    for(uint i=1;i<=numDrivers;i++){
        int disLat = (_latitude - driverList[i].latitude) * (_latitude - driverList[i].latitude);
        int disLon = (_longitude - driverList[i].longitude) * (_longitude - driverList[i].longitude);
        if(disLat + disLon < 100)
          {
            fare = max(fare,driverList[i].farePerKm);
          }
      }
    return fare;  
  }
  

  function searchDrivers(int _latitude,int _longitude) public view returns(uint[] memory){
      require (!driverList[mapDriver[msg.sender]].valid,"Cannot use from driver address");
      //returns driver id
      uint[] memory requestList = new uint[](5);
      uint count = 0;
      for(uint i=1;i<=numDrivers;i++){
        int disLat = (_latitude - driverList[i].latitude) * (_latitude - driverList[i].latitude);
        int disLon = (_longitude - driverList[i].longitude) * (_longitude - driverList[i].longitude);
        if(disLat + disLon < 100 && driverList[i].customerAddr==address(0))
          {
            requestList[count] = i;
            count++;
            if(count==3)
              break;
          }
      } 
      return requestList;
  }

  function sendRequest (uint id,int fromlat,int fromlon,int tolat,int tolon) public {
    require (!driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    require (reqList[id].customerAddr==address(0),"Cannot send to this driver");
      
     reqList[id] = Reqlist({
        customerAddr : msg.sender,
        fromLatitude : fromlat,
        fromLongitude : fromlon,
        toLatitude : tolat,
        toLongitude: tolon
      });
  }

  function getResponse (uint id) public view returns(bool res)  {
    require (!driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    require (reqList[id].customerAddr!=address(0),"Rejected");
    require (driverList[id].customerAddr!=address(0),"Not accepted");
    
    if(driverList[id].customerAddr==msg.sender)
      return true;
    else
      return false;  
  }

  function isRejected (uint id) public view returns(bool res)  {
    require (!driverList[mapDriver[msg.sender]].valid,"Not a valid address");

    if(reqList[id].customerAddr==address(0))
      return true;
    else
      return false;  
  }

  function isAccepted() public view returns(bool res)  {
    require (driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    
    if(driverList[mapDriver[msg.sender]].customerAddr!=address(0))
      return true;
    else
      return false;  
  }

  function isIncompletePayment() public view returns(bool res)  {
    require (!driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    if(customer[msg.sender].amountToPay>0)
      return true;
    else
      return false;      
  }

  function removeRequest (uint id) public  {
    // require (driverList[id].customerAddr!=address(0),"Not accepted");
    require (!driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    
    reqList[id].customerAddr = address(0); 
  }
  

  function getRequest() public view returns(int fromlat,int fromlon,int tolat,int tolon)  {
    require (driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    require (driverList[mapDriver[msg.sender]].customerAddr==address(0),"Cannot request while driving");
    require (reqList[mapDriver[msg.sender]].customerAddr!=address(0),"No requests");
    
    return (reqList[mapDriver[msg.sender]].fromLatitude,reqList[mapDriver[msg.sender]].fromLatitude,reqList[mapDriver[msg.sender]].toLatitude,reqList[mapDriver[msg.sender]].toLongitude);
  }

  function acceptRequest(uint cost) public {
    require (driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    require (driverList[mapDriver[msg.sender]].customerAddr==address(0),"Cannot request while driving");

    driverList[mapDriver[msg.sender]].customerAddr = reqList[mapDriver[msg.sender]].customerAddr;
    customer[reqList[mapDriver[msg.sender]].customerAddr].driverAddr = msg.sender;
    customer[reqList[mapDriver[msg.sender]].customerAddr].isBusy = true; 
    customer[reqList[mapDriver[msg.sender]].customerAddr].amountToPay = cost; 
  }

  function rejectRequest() public {
    require (driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    require (driverList[mapDriver[msg.sender]].customerAddr==address(0),"Cannot request while driving");

    reqList[mapDriver[msg.sender]].customerAddr = address(0);
  }
  function getCustomerDetails() public view returns(address,uint)  {
    require(customer[msg.sender].driverAddr!=address(0));      
    require (!driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    
    return (customer[msg.sender].driverAddr,customer[msg.sender].amountToPay);      
  }
      
  //setters
  
  function updateDriverDetails(uint _fareperkm,int _latitude,int _longitude) public {
    require (driverList[mapDriver[msg.sender]].valid,"Not a valid address");

    driverList[mapDriver[msg.sender]].latitude = _latitude;
    driverList[mapDriver[msg.sender]].longitude = _longitude;
    driverList[mapDriver[msg.sender]].farePerKm = _fareperkm;
  }
  
  // function startTrip() {
  
  // }
  
  function endTrip() public {
    require (driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    require (driverList[mapDriver[msg.sender]].customerAddr!=address(0),"Cannot end now");
    
    driverList[mapDriver[msg.sender]].customerAddr = address(0);
  }

  function payDriver () public {
    require (!driverList[mapDriver[msg.sender]].valid,"Not a valid address");
    require (customer[msg.sender].driverAddr!=address(0),"Cannot pay");
    
    // uint amount = customer[msg.sender].amountToPay; 
    // address driverAddr = customer[msg.sender].driverAddr;
    customer[msg.sender].amountToPay = 0;
    customer[msg.sender].driverAddr = address(0);
    customer[msg.sender].isBusy = false; 
    // if(amount>0){
    // emit Collected(customer[msg.sender].driverAddr,amount);
    // driverAddr.transfer(amount);  
    // }
    
  }
  


}
