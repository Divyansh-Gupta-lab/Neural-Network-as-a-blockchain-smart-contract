# Neural Network in a SmartContract

## Purpose
How to deploy a neural network as a smart contract in a Hyperledger fabric blockchain network

## Pre-requisites

- [x] Docker and Docker compose
- [x] Node.js

## Steps
- Install a fabric samples repository using the following command:  `curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh`
- Run the installed script:`./install-fabric.sh --fabric-version 2.5.2 docker samples binary`
- (Optional) Skip this step if you have worked with hyperledger fabric before. Add hyperledger fabric binary files to bin directory using the command: `sudo cp ./fabric-samples/bin/* /usr/local/bin/`
- Navigate to test-network folder: `cd fabric-samples/test-network`
- Run the test network using the command: `./network.sh up createChannel -ca -c mychannel -s couchdb`
- Deploy the chaincode on the network using the command: `./network.sh deployCCAAS -ccn basic -ccp ../../chaincode-typescript -ccep "OR('Org1MSP.member','Org2MSP.member')"`
- Navigate to **auction-simple** directory: `cd ../auction-simple/application-javascript`
- Install the required packages: `npm install`
- Install another required library: `npm install csvtojson`
- Copy **uploadIrisCSV.js** file to current directory: `cp ../../../uploadIrisCSV.js .`
- Enroll Org1 CA admin: `node enrollAdmin.js Org1`
- Register Org1 user: `node registerEnrollUser.js Org1 user1`
- Upload Data: `node uploadIrisCSV.js Org1 user1`
- Navigate to test network directory: `cd ../../test-network`
- Copy **train.sh** script in current directory:`cp ../../train.sh .` 
- Copy **test.sh** script in current directory:`cp ../../test.sh .`
- Run **train.sh** script:`./train.sh` 
- Run **test.sh** script:`./test.sh`
- Make changes to the values in **test.sh** if you want to test with a different value in the neural network