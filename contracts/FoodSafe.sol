pragma solidity ^0.4.17;

contract FoodSafe {

  struct Location {
    string name;
    uint locationId;
    uint previousLocationId;
    uint timestamp;
    string secret;
  }

  mapping(uint => Location) Trail;
  uint8 TrailCount = 0;

  function addNewLocation(uint locationId, string name, string secret) public {
    Location memory newLocation;
    newLocation.name = name;
    newLocation.locationId = locationId;
    newLocation.timestamp = now;
    newLocation.secret = secret;

    if (TrailCount > 0) {
      newLocation.previousLocationId = Trail[TrailCount - 1].locationId;
    }

    Trail[TrailCount] = newLocation;
    TrailCount++;
  }

  function getTrailCount() public view returns(uint8) {
    return TrailCount;
  }

  function getLocation(uint8 trailNumber) public view returns(string, uint, uint, uint, string) {
    return (Trail[trailNumber].name, Trail[trailNumber].locationId, Trail[trailNumber].previousLocationId, Trail[trailNumber].timestamp, Trail[trailNumber].secret);
  }
}