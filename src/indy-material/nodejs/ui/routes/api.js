const express = require('express');
const router = express.Router();
const indy = require('../../indy/index');
const auth = require('../authentication');
const did = require('../../indy/src/did');

router.get('/', function (req, res, next) {
    res.send("Success");
});

router.post('/send_message', auth.isLoggedIn, async function (req, res) {
    let message = JSON.parse(req.body.message);
    message.did = req.body.did;

    console.log('DID:' + did);
    console.log('req.body.message' + req.body.message);
    

    await indy.crypto.sendAnonCryptedMessage(req.body.did, message);
    res.redirect('/#messages');
});

router.post('/send_connection_request', auth.isLoggedIn, async function (req, res) {
    let theirEndpointDid = req.body.did;
    let connectionRequest = await indy.connections.prepareRequest(theirEndpointDid);

    await indy.crypto.sendAnonCryptedMessage(theirEndpointDid, connectionRequest);
    res.redirect('/#relationships');
});

router.post('/issuer/create_schema', auth.isLoggedIn, async function (req, res) {
    await indy.issuer.createSchema(req.body.name_of_schema, req.body.version, req.body.attributes);
    console.log('\n=========== POST /issuer/create_schema ===================\n');
    console.log('req.body.name_of_schame: '+ req.body.name_of_schema); 
    console.log('\n');
    console.log('req.body.version: '+ req.body.version);
    console.log('\n');
    console.log('req.body.attributes: '+ req.body.attributes);
    console.log('\n=========================================================\n');
    res.redirect('/#issuing');
});

router.post('/issuer/create_cred_def', auth.isLoggedIn, async function (req, res) {
    await indy.issuer.createCredDef(req.body.schema_id, req.body.tag);
    res.redirect('/#issuing');
});

router.post('/issuer/send_credential_offer', auth.isLoggedIn, async function (req, res) {
    await indy.credentials.sendOffer(req.body.their_relationship_did, req.body.cred_def_id);
    res.redirect('/#issuing');
});

router.post('/credentials/accept_offer', auth.isLoggedIn, async function(req, res) {
    let message = indy.store.messages.getMessage(req.body.messageId);
    indy.store.messages.deleteMessage(req.body.messageId);
    await indy.credentials.sendRequest(message.message.origin, message.message.message);
    res.redirect('/#messages');
});

router.post('/credentials/reject_offer', auth.isLoggedIn, async function(req, res) {
    indy.store.messages.deleteMessage(req.body.messageId);
    res.redirect('/');
});

router.put('/connections/request', auth.isLoggedIn, async function (req, res) {
    let name = req.body.name;
    let messageId = req.body.messageId;
    let message = indy.store.messages.getMessage(messageId);
    indy.store.messages.deleteMessage(messageId);
    await indy.connections.acceptRequest(name, message.message.message.endpointDid, message.message.message.did, message.message.message.nonce);
    res.redirect('/#relationships');
});

router.delete('/connections/request', auth.isLoggedIn, async function (req, res) {
    // FIXME: Are we actually passing in the messageId yet?
    if (req.body.messageId) {
        indy.store.messages.deleteMessage(req.body.messageId);
    }
    res.redirect('/#relationships');
});

router.post('/messages/delete', auth.isLoggedIn, function(req, res) {
    indy.store.messages.deleteMessage(req.body.messageId);
    res.redirect('/#messages');
});

router.post('/proofs/accept', auth.isLoggedIn, async function(req, res) {
        console.log("\n==================== POST api/proofs/accept ===================");
        console.log("messageId:"+req.body.messageId);
        console.log("\n===============================================================");
        await indy.proofs.acceptRequest(req.body.messageId);
        res.redirect('/#messages');
});

router.post('/proofs/send_request', auth.isLoggedIn, async function(req, res) {
    let myDid = await indy.pairwise.getMyDid(req.body.their_relationship_did);
    await indy.proofs.sendRequest(myDid, req.body.their_relationship_did, req.body.proof_request_id, req.body.manual_entry);
    res.redirect('/#proofs');
});

router.post('/proofs/validate', auth.isLoggedIn, async function(req, res) {
    try {
        let proof = req.body;
        if (await indy.proofs.validate(proof)) {
            res.status(200).send();
        } else {
            res.status(400).send();
        }
    } catch(err) {
        res.status(500).send();
    }
});

router.get('/proofs/reqtype', async function(req, res, next) {
    let proofRequests = await indy.proofs.getProofRequests(true);
    console.log(proofRequests);
    res.send(proofRequests['Face-Data']);
});

router.get('/proofs/theirdid', async function(req, res, next) {
    let relationships = await indy.pairwise.getAll();
    console.log(relationships);
    res.send(relationships[0].their_did);
});

router.get('/proofs/jitsidid', async function(req, res, next) {
    let endpointDid = await did.getEndpointDid(); // Creates it if it doesn't exist
    res.send(endpointDid);
});

router.get('/proofs/data', async function(req, res, next) {
    let relationships = await indy.pairwise.getAll();
    console.log(relationships[0].metadata.proofs[1]);
    res.send(relationships[0].metadata.proofs[1].requested_proof.revealed_attrs.attr1_referent.raw);
});


module.exports = router;