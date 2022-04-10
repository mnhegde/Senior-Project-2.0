/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

//import Hyperledger Fabric 1.4 SDK
const { Contract } = require('fabric-contract-api');
const path = require('path');
const fs = require('fs');

// connect to the election data file
const electionDataPath = path.join(process.cwd(), './lib/data/electionData.json');
const electionDataJson = fs.readFileSync(electionDataPath, 'utf8');
const electionData = JSON.parse(electionDataJson);

// connect to the ballot data
const ballotDataPath = path.join(process.cwd(), './lib/data/ballotData.json');
const ballotDataJson = fs.readFileSync(ballotDataPath, 'utf8');
const ballotData = JSON.parse(ballotDataJson);

// import constructors
let Ballot = require('./Ballot.js');
let Election = require('./Election.js');
let Voter = require('./Voter.js');
let VotableItem = require('./VotableItem.js');

let HelperFunctions = require('./HelperFunctions.js');
let helperFunctions = new HelperFunctions();
let Query = require('./query.js');
let query = new Query();

const util = require('util');

class MyAssetContract extends Contract {

  /** init
   *
   * This function does most of the heavy lifting of the application. It registers 
   * voters, makes sure they are ok to vote, creates the election, creates the 
   * ballots for the election, and then assigns the ballots to the voters, after doing 
   * some error checks. After that, the voters are ready with their ballots to cast 
   * a vote. 
   * @param ctx - the context of the transaction
   * @returns the voters which are registered and ready to vote in the election
   */
  async init(ctx) {

    console.log('instantiate was called!');

    let voters = [];
    let votableItems = [];
    let elections = [];
    let election;

    //create voters
    let voter1 = await new Voter('V1', '234', 'Horea', 'Porutiu');
    let voter2 = await new Voter('V2', '345', 'Duncan', 'Conley');
    let voter3 = await new Voter('V3', '456', 'Mark', 'Ashla');
    let voter4 = await new Voter('V4', '567', 'Danny', 'Powell');
    //update voters array
    voters.push(voter1);
    voters.push(voter2);
    voters.push(voter3);
    voters.push(voter4);

    //add the voters to the world state, the election class checks for registered voters 
    await helperFunctions.updateMyAsset(ctx, voter1.voterId, voter1);
    await helperFunctions.updateMyAsset(ctx, voter2.voterId, voter2);
    await helperFunctions.updateMyAsset(ctx, voter3.voterId, voter3);
    await helperFunctions.updateMyAsset(ctx, voter4.voterId, voter4);

    //query for election first before creating one.
    let currElections = JSON.parse(await query.queryByObjectType(ctx, 'election'));
    console.log(util.inspect('currElections: '));
    console.log(util.inspect(currElections));

    if (currElections.length === 0) {    
      //create the election
      //election day is always on a tuesday, and lasts a full day
      let electionStartDate = await new Date(2020, 11, 3);
      let electionEndDate = await new Date(2020, 11, 4);
      election = await new Election(electionData.electionName, electionData.electionCountry,
        electionData.electionYear, electionStartDate, electionEndDate);
      console.log('util inspect voters: ');
      console.log(util.inspect(voters));
  
      //update elections array
      elections.push(election);
      console.log(`***************************************************
        election.electionId: ${election.electionId} and election: ${election}`);
      await helperFunctions.updateMyAsset(ctx, election.electionId, election);
    } else {
      election = currElections[0];
    }

    //create votableItems for the ballots
    let presVotable = await new VotableItem(ctx, 'VI1', ballotData.presidentialRaceTitle,
      ballotData.presidentialRaceDescription, false);
    let governorVotable = await new VotableItem(ctx, 'VI2', ballotData.governorRaceTitle,
      ballotData.governorRaceDescription, false);
    let mayorVotable = await new VotableItem(ctx, 'VI3', ballotData.mayorRaceTitle,
      ballotData.mayorRaceDescription, false);
    let propVotable = await new VotableItem(ctx, 'VI4', ballotData.propositionTitle,
      ballotData.propositionDescription, true);

    //populate choices array so that the ballots can have all of these choices 
    votableItems.push(presVotable);
    votableItems.push(governorVotable);
    votableItems.push(mayorVotable);
    votableItems.push(propVotable);

    //save choices in world state
    for (let i = 0; i < votableItems.length; i++) {
      await helperFunctions.updateMyAsset(ctx, votableItems[i].votableId, votableItems[i]);
    }

    //generate ballots for all voters
    for (let i = 0; i < voters.length; i++) {
      if (!voters[i].ballot) {
        console.log('inside !voters[i].ballot');

        //give each registered voter a ballot
        voters[i].ballot = await new Ballot(ctx, votableItems, election, voters[i].voterId);
        voters[i].ballotCreated = true;

        //update state with ballots
        await helperFunctions.updateMyAsset(ctx, voters[i].ballot.ballotId, voters[i].ballot);
        await helperFunctions.updateMyAsset(ctx, voters[i].voterId, voters[i]);
      } else {
        console.log('these voters already have ballots');
        break;
      }
    }
    return voters;
  }
}

module.exports = MyAssetContract;
