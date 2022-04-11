'use strict';

//import Hyperledger Fabric 1.4 SDK
const { Contract } = require('fabric-contract-api');
const path = require('path');
const fs = require('fs');

// connect to the election data file
const electionDataPath = path.join(process.cwd(), './lib/data/electionData.json');
const electionDataJson = fs.readFileSync(electionDataPath, 'utf8');
const electionData = JSON.parse(electionDataJson);

// connect to the pres election file
const ballotDataPath = path.join(process.cwd(), './lib/data/presElection.json');
const ballotDataJson = fs.readFileSync(ballotDataPath, 'utf8');
const ballotData = JSON.parse(ballotDataJson);

//import our file which contains our constructors and auxiliary function
let Ballot = require('./Ballot.js');
let Election = require('./Election.js');
let Voter = require('./Voter.js');
let VotableItem = require('./VotableItem.js');

let HelperFunctions = require('./HelperFunctions.js');
let helperFunctions = new HelperFunctions();
let Query = require('./query.js');
let query = new Query();

let firstChoice = 0;
let secondChoice = 1;

const util = require('util');

class MyAssetContract extends Contract {

  /** init
   *
   * This function does most of the heavy lifting of the application. It registers 
   * voters, makes sure they are ok to vote, creates the election, creates the 
   * ballots for the election, and then assigns the ballots to the voters.
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
      let electionStartDate = await new Date(2022, 11, 8);
      let electionEndDate = await new Date(2022, 11, 9);
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
    let repVotable = await new VotableItem(ctx, 'Republican', ballotData.fedDemocratBrief);

    let demVotable = await new VotableItem(ctx, 'Democrat', ballotData.republicanBrief);

    let indVotable = await new VotableItem(ctx, 'Green', ballotData.greenBrief);

    let grnVotable = await new VotableItem(ctx, 'Independent', ballotData.independentBrief);

    let libVotable = await new VotableItem(ctx, 'Libertarian', ballotData.libertarianBrief);

    //populate choices array so that the ballots can have all of these choices 
    votableItems.push(repVotable);
    votableItems.push(demVotable);
    votableItems.push(indVotable);
    votableItems.push(grnVotable);
    votableItems.push(libVotable);

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
  
  async updateMyAsset(ctx, myAssetId, newValue) {
    const buffer = Buffer.from(JSON.stringify(newValue));

    console.log(`putState in updateMyAsset with key ${myAssetId} 
      and value ${buffer}`);
    await ctx.stub.putState(myAssetId, buffer);
  }

  /** deleteMyAsset
   *
   * Deletes a key-value pair from the world state, based on the key given.
   *  
   * @param myAssetId - the key of the asset to delete
   * @returns - void; but deletes the value in the world state
   */
  async deleteMyAsset(ctx, myAssetId) {

    const exists = await this.myAssetExists(ctx, myAssetId);
    if (!exists) {
      throw new Error(`The my asset ${myAssetId} does not exist`);
    }

    await ctx.stub.deleteState(myAssetId);

  }

  /** readMyAsset
   *
   * Reads a key-value pair from the world state, based on the key given.
   *  
   * @param myAssetId - the key of the asset to read
   * @returns - void; reads the value in the world state
   */
  async readMyAsset(ctx, myAssetId) {

    const exists = await this.myAssetExists(ctx, myAssetId);

    if (!exists) {
      throw new Error(`The my asset ${myAssetId} does not exist`);
    }

    const buffer = await ctx.stub.getState(myAssetId);
    const asset = JSON.parse(buffer.toString());
    return asset;
  }

  /** createMyAsset
   *
   * Creates a key-value pair from the world state, based on the key given. 
   * Checks if the asset exists first, and if so, throws an error. 
   *  
   * @param myAssetId - the key of the asset to read
   * @returns - void; creates the value in the world state
   */
  async createMyAsset(ctx, myAssetId, value) {
    const exists = await this.myAssetExists(ctx, myAssetId);

    if (exists) {
      console.log(`The my asset ${myAssetId} already exists, will update instead`);
      throw new Error(`The my asset ${myAssetId} already exists`);
    } else {
      const asset = { value };
      const buffer = Buffer.from(JSON.stringify(asset));

      console.log(`about to put this assetId ${myAssetId} with the following value: ${value}`);
      await ctx.stub.putState(myAssetId, buffer);
    }
  }

  /** myAssetExists
   *
   * Checks to see if a key exists in the world state. 
   * @param myAssetId - the key of the asset to read
   * @returns boolean indicating if the asset exists or not. 
   */
  async myAssetExists(ctx, myAssetId) {

    const buffer = await ctx.stub.getState(myAssetId);
    return (!!buffer && buffer.length > 0);

  }

  /** sort
   *
   * Checks to see if a key exists in the world state. 
   * @param dictToSort - the dictionary of values to sort on the ballot
   * @returns an array which has the winning briefs of the ballot. 
   */
  async sort(dictToSort) {

    let winningChoices = [];

    for (let i = 0; i < dictToSort.length; i++) {
      console.log('inside for loopp');
      if (dictToSort[i].choices[firstChoice].count > dictToSort[i].choices[secondChoice].count) {
        console.log('in if');
        winningChoices.push(dictToSort[i].choices[firstChoice].brief);
      } else {
        console.log('in else');
        winningChoices.push(dictToSort[i].choices[secondChoice].brief);
      }
    }
    return winningChoices;

  }

  /** sort
   *
   * Checks to see if a key exists in the world state. 
   * @param electionId - the electionId of the election we want to vote in
   * @param voterId - the voterId of the voter that wants to vote
   * @returns an array which has the winning briefs of the ballot. 
   */
  async castVote(ctx, electionId, voterId) {
    //check to make sure the election exists
    let electionExists = await this.myAssetExists(ctx, electionId);
    let voterExists = await this.myAssetExists(ctx, voterId);

    if (electionExists && voterExists) {
      console.log('inside exists...');
      //make sure we have an election
      let electionAsBytes = await ctx.stub.getState(electionId);
      let election = await JSON.parse(electionAsBytes);
      let voterAsBytes = await ctx.stub.getState(voterId);
      let voter = await JSON.parse(voterAsBytes);

      if (!voter.ballot) 
        throw new Error('this voter does not have a ballot! ');

      if (voter.ballotCast) 
        throw new Error('this voter has already cast this ballot!');
      
      console.log(`voter ${voter}, and voters ballot ${voter.ballot}`);

      //check the date of the election, to make sure the election is still open
      let currentTime = await new Date(2020, 11, 3);

      console.log('election: ');
      console.log(election);

      //parse date objects
      let parsedCurrentTime = await Date.parse(currentTime);
      let electionStart = await Date.parse(election.startDate);
      let electionEnd = await Date.parse(election.endDate);

      console.log(`parsedCurTime ${parsedCurrentTime}, electionStart: ${electionStart},
        and electionEnd: ${electionEnd}`);


      if (parsedCurrentTime >= electionStart && parsedCurrentTime < electionEnd) {
        for (let i = 0; i < voter.ballot.votableItems.length; i++) {
          console.log('util.inspect');
          console.log(util.inspect(voter.ballot.votableItems[i].choices[firstChoice]));
          await voter.ballot.votableItems[i].choices[firstChoice].count++;
        }

        let results = await this.sort(voter.ballot.votableItems);

        for (let i = 0; i < results; i++) {
          console.log(`winning results ${results[i]}`);
        }
        return results;

      } else 
        throw new Error('the election is not open now!');
      
    } else 
      throw new Error('the election or the voter does not exist!');
    }


  async queryAll(ctx) {

    let queryString = {
      selector: {}
    };

    let queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
    return queryResults;

  }

  /** Evaluate a queryString
     *
     * @param {Context} ctx the transaction context
     * @param {String} queryString the query string to be evaluated
    */
  async queryWithQueryString(ctx, queryString) {
    console.log('query String');
    console.log(JSON.stringify(queryString));

    let resultsIterator = await ctx.stub.getQueryResult(queryString);

    let allResults = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let res = await resultsIterator.next();

      if (res.value && res.value.value.toString()) {
        let jsonRes = {};

        console.log(res.value.value.toString('utf8'));

        jsonRes.Key = res.value.key;

        try {
          jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
        } catch (err) {
          console.log(err);
          jsonRes.Record = res.value.value.toString('utf8');
        }

        allResults.push(jsonRes);
      }
      if (res.done) {
        console.log('end of data');
        await resultsIterator.close();
        console.info(allResults);
        console.log(JSON.stringify(allResults));
        return JSON.stringify(allResults);
      }
    }
  }

  /** Evaluate a queryString
  *
  * @param {Context} ctx the transaction context
  * @param {String} queryString the query string to be evaluated
  */
  async queryByObjectType(ctx, objectType) {
    let queryString = {
      selector: {
        type: objectType
      }
    };

    let queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
    return queryResults;
  }
}

module.exports = MyAssetContract;
