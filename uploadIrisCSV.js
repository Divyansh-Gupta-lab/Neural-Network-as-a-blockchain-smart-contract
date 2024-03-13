/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const csv = require('csvtojson');
const path = require('path');
const { buildCCPOrg1, buildCCPOrg2, buildWallet} = require('../../test-application/javascript/AppUtil.js');

const myChannel = 'mychannel';
const myChaincodeName = 'basic';

async function endAuction(ccp,wallet,user) {
	try {

		const gateway = new Gateway();

		// Connect using Discovery enablednpm install
		await gateway.connect(ccp,
			{ wallet: wallet, identity: user, discovery: { enabled: true, asLocalhost: true } });

		const network = await gateway.getNetwork(myChannel);
		const contract = network.getContract(myChaincodeName);

		const irisDataPath = '../../../iris.csv';
		const irisData = await csv().fromFile(irisDataPath);
		for (let data of irisData) {
			console.log(data);
			let statefulTxn = contract.createTransaction('CreateAsset');
			const transaction_id  = statefulTxn.submit(data.sepal_length, data.sepal_width,data.petal_length, data.petal_width, data.species);
			console.log("Transaction successful");
			await sleep(250);
		}
		console.log("All data uploaded");
		gateway.disconnect();
		process.exit(1);
	} catch (error) {
		console.error(`******** FAILED to submit bid: ${error}`);
		process.exit(1);
	}
}

function sleep(ms) {
	return new Promise((resolve) => {
	  setTimeout(resolve, ms);
	});
  }

async function main() {
	try {

		if (process.argv[2] === undefined || process.argv[3] === undefined ) {
			console.log('Usage: node endAuction.js org userID');
			process.exit(1);
		}

		const org = process.argv[2];
		const user = process.argv[3];

		if (org === 'Org1' || org === 'org1') {
			const ccp = buildCCPOrg1();
			const walletPath = path.join(__dirname, 'wallet/org1');
			const wallet = await buildWallet(Wallets, walletPath);
			await endAuction(ccp,wallet,user);
		}
		else if (org === 'Org2' || org === 'org2') {
			const ccp = buildCCPOrg2();
			const walletPath = path.join(__dirname, 'wallet/org2');
			const wallet = await buildWallet(Wallets, walletPath);
			await endAuction(ccp,wallet,user);
		}  else {
			console.log('Usage: node endAuction.js org userID');
			console.log('Org must be Org1 or Org2');
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
		if (error.stack) {
			console.error(error.stack);
		}
		process.exit(1);
	}
}


main();
