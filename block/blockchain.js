const crypto = require('crypto')
const uuid = require('uuid/v1')

class Blockchain {
	constructor() {
		this.chain = [];
		this.users = [];
		this.pendingTransactions = [];
		// this.currentNodeUrl = currentNodeUrl;
		this.networkNodes = [];	
		this.createnewUser('Central Government', 10000)
		this.createNewBlock(100, '0', '0'); // Genesis Block
	}

	createnewUser(name, balance){
		const newUser = {			
			name: name,						
			balance: balance
		};
		this.users.push(newUser);		
	}

	getUserData(name){
		for (var i = 0; i < this.users.length; i++) {
			var obj = this.users[i];
			if(obj.name == name){
				return obj;
			}
		}
		return null;
	}

	updateUserSender(name, amount){
		for (var i = 0; i < this.users.length; i++) {
			var obj = this.users[i];
			if(obj.name == name){
				var curr = obj.balance
				obj.balance = curr - amount;
			}
		}		
	}

	updateUserReceiver(name, amount){
		for (var i = 0; i < this.users.length; i++) {
			var obj = this.users[i];
			if(obj.name == name){
				var curr = obj.balance
				obj.balance = curr + amount;				
			}
		}		
	}

	createNewBlock(nonce, previousBlockHash, hash) {
		const newBlock = {
			index: this.chain.length + 1,
			timestamp: Date.now(),
			transactions: this.pendingTransactions,
			nonce,
			hash,
			previousBlockHash
		};

		this.pendingTransactions = [];
		this.chain.push(newBlock);

		return newBlock;
	}

	getLastBlock() {
		return this.chain[this.chain.length - 1];
	}

	getAllBlocks(){
		return this.chain;
	}

	createNewTransaction(amount, sender, recipient, project) {
		const newTransaction = {
			amount,
			sender,
			recipient,
			project,
			transactionId: uuid().split('-').join('')
		};

		return newTransaction;
	}

	addTransactionToPendingTransactions(transactionObj) {
		this.pendingTransactions.push(transactionObj);
		return this.getLastBlock()['index'] + 1;
	}

	hashBlock(previousBlockHash, currentBlockData, nonce) {
		const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);

		const hash = crypto.createHash('sha256');
		hash.update(dataAsString);

		return hash.digest('hex');
	}

	proofOfWork(previousBlockHash, currentBlockData) {
		let nonce = 0;
		let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);

		while(hash.substring(0, 4) !== '0000') {
			nonce += 1;
			hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
		}

		return nonce;
	}

	chainIsValid(blockchain) {
		for(let i = 1; i < blockchain.length; i++) {
			const currentBlock = blockchain[i];
			const previousBlock = blockchain[i - 1];
			const blockHash = this.hashBlock(previousBlock['hash'], { transactions: currentBlock['transactions'], index: currentBlock['index'] }, currentBlock['nonce']);

			if(blockHash.substring(0, 4) !== '0000') {
				return false;
			}

			if(currentBlock['previousBlockHash'] !== previousBlock['hash']) {
				return false;
			}
		}

		const genesisBlock = blockchain[0];
		// Check for genesis block
		const correctNonce = genesisBlock['nonce'] === 100;
		const correctPreviousBlockHash = genesisBlock['previousBlockHash'] === '0';
		const correctHash = genesisBlock['hash'] === '0';
		const correctTransactions = genesisBlock['transactions'].length === 0;

		return correctNonce && correctPreviousBlockHash && correctHash && correctTransactions;
	}

	getBlock(blockHash) {
		this.chain.forEach(block => {
			if(block['hash'] === blockHash) {
				return block;
			}
		});

		return null;
	}

	getTransaction(transactionId) {
		this.chain.forEach(block => {
			block.transactions.forEach(transaction => {
				if(transaction['transactionId'] === transactionId) {
					return { transaction, block };
				}
			});
		});

		return null;
	}

	getAddressData(address) {
		const addressTransactions = [];

		this.chain.forEach(block => {
			block.transactions.forEach(transaction=> {
				if(transaction['sender'] === address || transaction['recipient'] === address) {
					addressTransactions.push(transaction);
				}
			});
		});

		let balance = 0;

		addressTransactions.forEach(transaction => {
			if(transaction['recipient'] === address) balance += transaction['amount'];
			else if(transaction['sender'] === address) balance -= transaction['amount'];
		});

		return {
			addressTransactions,
			balance
		};
	}
}

module.exports = Blockchain;