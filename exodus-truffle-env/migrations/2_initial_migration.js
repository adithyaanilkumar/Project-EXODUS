var Uber = artifacts.require("./Uber.sol");

module.exports = function(deployer) {
  deployer.deploy(Uber,10);
};