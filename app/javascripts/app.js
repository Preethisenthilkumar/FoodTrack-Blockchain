import '../stylesheets/app.css';
import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract';
import { default as CryptoJS } from 'crypto-js';
import './browser-solc.js';

var accounts;
var account;
var foodSafeAbi;
var foodSafeContract;
var foodSafeCode;

window.App = {
  start: function () {
    var self = this;
    web3.eth.getAccounts(function (err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];
      web3.eth.defaultAccount = account;

      // FoodSafe.sol contents without line breaks:
      var foodSafeSource = "pragma solidity ^0.4.17; contract FoodSafe { struct Location { string name; uint locationId; uint previousLocationId; uint timestamp; string secret; } mapping(uint => Location) Trail; uint8 TrailCount = 0; function addNewLocation(uint locationId, string name, string secret) public { Location memory newLocation; newLocation.name = name; newLocation.locationId = locationId; newLocation.timestamp = now; newLocation.secret = secret; if (TrailCount > 0) { newLocation.previousLocationId = Trail[TrailCount - 1].locationId; } Trail[TrailCount] = newLocation; TrailCount++; } function getTrailCount() public view returns(uint8) { return TrailCount; } function getLocation(uint8 trailNumber) public view returns(string, uint, uint, uint, string) { return (Trail[trailNumber].name, Trail[trailNumber].locationId, Trail[trailNumber].previousLocationId, Trail[trailNumber].timestamp, Trail[trailNumber].secret); } } ";

      // Get a list of all possible solc versions/releases so we can paste one appropriate for the foodSafeSource pragma 
      // into the BrowserSolc.loadVersion call below...
      // BrowserSolc.getVersions(function (soljsonSources, soljsonReleases) {
      //   console.log(soljsonReleases);
      // });

      BrowserSolc.loadVersion('soljson-v0.4.17+commit.bdeb9e52.js', function (compiler) {
        var foodSafeCompiled = compiler.compile(foodSafeSource, /*optimize:*/ 1);
        var contract = foodSafeCompiled.contracts[':FoodSafe'];
        foodSafeAbi = JSON.parse(contract.interface);
        foodSafeContract = web3.eth.contract(foodSafeAbi);
        foodSafeCode = contract.bytecode;
      });
    });
  },

  createContract: function () {
    var message = document.getElementById('message');
    message.innerText = 'attempting new contract...';

    foodSafeContract.new(
      '',
      {
        from: account,
        data: foodSafeCode,
        gas: 4621388
      },
      function (error, deployedContract) {
        // The callback can be called twice - before and after mining
        if (error) {
          message.innerText = error;
          return;
        }
        deployedContract.address=0xe3a4ca6e6d44d7a260a9b2ea17d0ae78d046619a;
        if (deployedContract.address) {
          document.getElementById('contractAddress').value = deployedContract.address;
          message.innerText = 'Contract successfully mined. Address: ' + deployedContract.address;
          return;
        }

        document.getElementById('contractAddress').value = '';
        console.log('deployedContract', deployedContract);
        message.innerText = 'Contract transaction send: TransactionHash: ' + deployedContract.transactionHash + ' - waiting for mining...';
      }
    );
  },

  addNewLocation: function () {
    document.getElementById('message').innerText = 'adding new location...';

    var locationId = document.getElementById('locationId').value;
    var locationName = document.getElementById('locationName').value;
    var secret = document.getElementById('secret').value;
    var passPhrase = document.getElementById('passPhrase').value;
    var product = document.getElementById('product').value;
    var product_details = document.getElementById('product_details').value;
    var encryptedSecret = CryptoJS.AES.encrypt(secret, passPhrase).toString();

    var contractAddress = document.getElementById('contractAddress').value;
    var deployedFoodSafe = foodSafeContract.at(contractAddress);

    deployedFoodSafe.addNewLocation(locationId, locationName, encryptedSecret, product, product_details, function (error) {
      if (error) {
        console.error(error);
        document.getElementById('message').innerText = error;
        return;
      }

      document.getElementById('message').innerText = 'addNewLocation was called';
    });
  },

  getCurrentLocation: function () {
    document.getElementById('message').innerText = 'getting current location...';

    var passPhrase = document.getElementById('passPhrase').value;

    var contractAddress = document.getElementById('contractAddress').value;
    var deployedFoodSafe = foodSafeContract.at(contractAddress);

    document.getElementById('message').innerText = 'getting trail count...';

    deployedFoodSafe.getTrailCount.call(function (error, trailCount) {
      if (error) {
        console.error(error);
        document.getElementById('message').innerText = error;
        return;
      }

      var index = trailCount.toNumber() - 1;
      if (index < 0) {
        document.getElementById('message').innerText = 'No location found.';
        return;
      }

      document.getElementById('message').innerText = 'getting location[' + index + ']...';

      deployedFoodSafe.getLocation.call(index, function (error, returnValues) {
        if (error) {
          console.error(error);
          document.getElementById('message').innerText = error;
          return;
        }

        console.log(returnValues);

        document.getElementById('locationName').value = returnValues[0];
        document.getElementById('locationId').value = returnValues[1];
        document.getElementById('secret').value = CryptoJS.AES.decrypt(returnValues[4], passPhrase).toString();
        document.getElementById('product').value = returnValues[5];
        document.getElementById('product_details').value = returnValues[6];
      });
    });
  }

};

window.addEventListener('load', function () {
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }
  App.start();
});