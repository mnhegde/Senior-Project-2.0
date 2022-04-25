# Senior-Project-2.0


Dpendencies and Tools:
- VSCode
- IBM Hyperledger Fabric - IBM Blockchain VSCode extension
- Node and npm
- Vue (frontend)
- Docker (used for Fabric server by IBM extension)
- OpenSSL (should be automatically installed with Git)


Instructions to run locally:
1. Clone this repository by copying the link (click the green "Code" dropdown and copy the link under "HTTPS") and running `git clone [Repo URL]` in your command line/terminal
2. Go to the IBM extension logo and click on `1 Org Local Fabric` on the left-hand panel
   1. This will take some time, and it will also confirm that the above dependencies were installed properly
3. Locate the contract file in the contract folder (voterContract@8.0.0.tar.gz) and import this in the smart contracts panel
4. In the Fabric Environments Panel, select the New Smart Contract Button and select the voterContract@8.0.0.tar.gz file and deploy the contract (leave default options)
5. Click on `1 Org Local Fabric` and select admin to connect this with the gateway
6. Export Connection Profile from the Gateways panel and save this in the fabric_connection.json
7. Under Fabric Walltes, right click on `1 Org Local Fabric` and export and save it as wallet to the server folder
8. Go to `config.json` and edit it using the example below:
```
{
  "connection_file": "fabric_connection.json",
  "appAdmin": "admin",
  "appAdminSecret": "adminpw",
  "orgMSPID": "Org1MSP",
  "caName": "ca.org1.example.com",
  "userName": "V1",
  "gatewayDiscovery": { "enabled": true, "asLocalhost": true }
}
```
9. To run the app, the dependencies will need to be installed. For the frontend, run `cd web-app/server`, `npom install`, and `npm start` to start the server. Then run `cd ../client`, `npm install`, and `npm run serve`
10. From here, go to http://localhost:8080/ and the app should appear in your browser to use

**NOTE: Will edit these steps, as have run into problems when trying to follow this**


Demo:


https://user-images.githubusercontent.com/54085487/165019445-b544f2a4-b7e4-4ead-b970-312af930eb0f.mp4


